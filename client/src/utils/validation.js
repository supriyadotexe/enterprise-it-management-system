const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function required(value, label = 'This field') {
  if (typeof value === 'string' ? value.trim() === '' : value === null || value === undefined) {
    return `${label} is required.`;
  }
  return null;
}

export function minLength(value, length, label = 'This field') {
  if (!value || String(value).trim().length < length) {
    return `${label} must be at least ${length} characters.`;
  }
  return null;
}

export function email(value, label = 'Email') {
  if (!value) return null;
  return EMAIL.test(String(value).trim()) ? null : `${label} must be a valid email address.`;
}

export function date(value, label = 'Date') {
  if (!value) return null;
  if (!DATE.test(value)) return `${label} must use the YYYY-MM-DD format.`;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? `${label} is not a valid date.` : null;
}

export function numeric(value, label = 'Value', { min = 0 } = {}) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return `${label} must be a number.`;
  if (number < min) return `${label} must be at least ${min}.`;
  return null;
}

export function collectErrors(checks) {
  const errors = {};
  for (const check of checks) {
    if (check?.field && check.message) errors[check.field] = check.message;
  }
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

/** Merge client-side field errors with the API's `details` payload. */
export function mergeErrors(clientErrors, serverErrors) {
  return { ...clientErrors, ...serverErrors };
}
