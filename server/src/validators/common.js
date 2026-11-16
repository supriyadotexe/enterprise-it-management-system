import { ApiError } from '../utils/ApiError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function addError(details, field, message) {
  details.push({ field, message });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateString(name, rule, raw, details) {
  if (typeof raw !== 'string') {
    addError(details, name, 'Must be a string.');
    return undefined;
  }

  let value = rule.trim === false ? raw : raw.trim();
  if (rule.lowercase) value = value.toLowerCase();

  if (value === '') {
    if (rule.required) {
      addError(details, name, 'Is required.');
      return undefined;
    }
    if (rule.nullable !== false) return null;
    return undefined;
  }

  if (rule.min !== undefined && value.length < rule.min) {
    addError(details, name, `Must be at least ${rule.min} characters.`);
  }
  if (rule.max !== undefined && value.length > rule.max) {
    addError(details, name, `Must be at most ${rule.max} characters.`);
  }
  if (rule.pattern && !rule.pattern.test(value)) {
    addError(details, name, rule.message ?? 'Has an invalid format.');
  }
  if (rule.enum && !rule.enum.includes(value)) {
    addError(details, name, `Must be one of: ${rule.enum.join(', ')}.`);
  }
  return value;
}

function validateBoolean(name, rule, raw, details) {
  if (typeof raw === 'boolean') return raw;
  if (raw === 0 || raw === '0' || raw === 'false') return false;
  if (raw === 1 || raw === '1' || raw === 'true') return true;
  addError(details, name, 'Must be a boolean.');
  return undefined;
}

function validateInteger(name, rule, raw, details) {
  if (raw === '' || raw === null) {
    addError(details, name, 'Must be an integer.');
    return undefined;
  }
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(value)) {
    addError(details, name, 'Must be an integer.');
    return undefined;
  }
  if (rule.min !== undefined && value < rule.min) {
    addError(details, name, `Must be at least ${rule.min}.`);
  }
  if (rule.max !== undefined && value > rule.max) {
    addError(details, name, `Must be at most ${rule.max}.`);
  }
  return value;
}

function validateDecimal(name, rule, raw, details) {
  if (raw === '' || raw === null) {
    addError(details, name, 'Must be a number.');
    return undefined;
  }
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    addError(details, name, 'Must be a number.');
    return undefined;
  }
  if (rule.min !== undefined && value < rule.min) {
    addError(details, name, `Must be at least ${rule.min}.`);
  }
  if (rule.max !== undefined && value > rule.max) {
    addError(details, name, `Must be at most ${rule.max}.`);
  }
  return value;
}

function validateField(name, rule, raw, details) {
  if (raw === undefined) {
    if (rule.required) {
      addError(details, name, 'Is required.');
      return undefined;
    }
    if (Object.prototype.hasOwnProperty.call(rule, 'default')) {
      return typeof rule.default === 'function' ? rule.default() : rule.default;
    }
    return undefined;
  }

  if (raw === null) {
    if (rule.required) {
      addError(details, name, 'Is required.');
      return undefined;
    }
    if (rule.nullable === false) {
      addError(details, name, 'Must not be null.');
      return undefined;
    }
    return null;
  }

  switch (rule.type) {
    case 'string':
      return validateString(name, rule, raw, details);
    case 'boolean':
      return validateBoolean(name, rule, raw, details);
    case 'integer':
      return validateInteger(name, rule, raw, details);
    case 'decimal':
      return validateDecimal(name, rule, raw, details);
    case 'date':
      if (!validateDate(raw)) {
        addError(details, name, 'Must be a valid YYYY-MM-DD date.');
        return undefined;
      }
      return raw;
    case 'email': {
      const value = validateString(name, rule, raw, details);
      if (value && !EMAIL_PATTERN.test(value)) {
        addError(details, name, 'Must be a valid email address.');
      }
      return value;
    }
    case 'object': {
      if (!isPlainObject(raw)) {
        addError(details, name, 'Must be an object.');
        return undefined;
      }
      return validateObject(rule.schema ?? {}, raw, details, `${name}.`);
    }
    case 'array': {
      if (!Array.isArray(raw)) {
        addError(details, name, 'Must be an array.');
        return undefined;
      }
      return raw.map((item, index) =>
        validateField(`${name}[${index}]`, rule.items ?? { type: 'string' }, item, details),
      );
    }
    default:
      addError(details, name, 'Unsupported validation rule.');
      return undefined;
  }
}

function validateObject(schema, input, details, prefix = '') {
  const output = {};
  for (const [name, rule] of Object.entries(schema)) {
    const qualified = `${prefix}${name}`;
    const value = validateField(qualified, rule, input[name], details);
    if (value !== undefined) output[name] = value;
  }

  for (const key of Object.keys(input)) {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      addError(details, `${prefix}${key}`, 'Unknown field.');
    }
  }
  return output;
}

function validateSource(schema, source, target, options = {}) {
  return function validationMiddleware(req, _res, next) {
    const input = req[source];
    const details = [];

    if (input !== undefined && input !== null && !isPlainObject(input)) {
      return next(
        new ApiError(400, 'VALIDATION_ERROR', 'Validation failed.', [
          { field: source, message: 'Must be an object.' },
        ]),
      );
    }

    const output = validateObject(schema, input ?? {}, details, options.prefix ?? '');

    if (details.length > 0) {
      return next(new ApiError(400, 'VALIDATION_ERROR', 'Validation failed.', details));
    }

    req[target] = output;
    return next();
  };
}

/** Validate and trim the JSON body, rejecting unknown fields. */
export function validateBody(schema) {
  return validateSource(schema, 'body', 'body');
}

/** Validate query parameters and store the normalised object on req.validatedQuery. */
export function validateQuery(schema) {
  return validateSource(schema, 'query', 'validatedQuery');
}

/** Validate path parameters and store the normalised object on req.validatedParams. */
export function validateParams(schema) {
  return validateSource(schema, 'params', 'validatedParams');
}

/** Common path-parameter schema for numeric primary keys. */
export const idParams = Object.freeze({
  id: { type: 'integer', required: true, min: 1 },
});

/** Common pagination and search fields used by list endpoints. */
export const listQuery = Object.freeze({
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 20 },
  search: { type: 'string', max: 100, nullable: false },
});

/** Optional active-state filter. */
export function activeFilterRule() {
  return { type: 'boolean', nullable: false };
}
