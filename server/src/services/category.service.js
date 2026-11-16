import { execute, query } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { mapDuplicateError } from './serviceErrors.js';

const CATEGORY_TABLES = Object.freeze({
  asset: {
    table: 'asset_categories',
    id: 'category_id',
    name: 'category_name',
    unique: 'uq_asset_categories_name',
    code: 'DUPLICATE_ASSET_CATEGORY',
    label: 'asset category',
  },
  service: {
    table: 'service_categories',
    id: 'service_category_id',
    name: 'name',
    unique: 'uq_service_categories_name',
    code: 'DUPLICATE_SERVICE_CATEGORY',
    label: 'service category',
  },
});

function definition(type) {
  const found = CATEGORY_TABLES[type];
  if (!found) throw new ApiError(500, 'INVALID_CATEGORY_TYPE', 'Invalid category type.');
  return found;
}

export async function listCategories(type, { includeInactive = false } = {}) {
  const meta = definition(type);
  const where = includeInactive ? '' : 'WHERE is_active = 1';
  const [rows] = await query(
    `SELECT ${meta.id} AS id, ${meta.name} AS name, description, is_active
     FROM ${meta.table}
     ${where}
     ORDER BY ${meta.name}`,
  );
  return rows;
}

export async function getCategory(type, id) {
  const meta = definition(type);
  const [rows] = await query(
    `SELECT ${meta.id} AS id, ${meta.name} AS name, description, is_active
     FROM ${meta.table}
     WHERE ${meta.id} = ?`,
    [id],
  );
  if (!rows[0]) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', `The ${meta.label} was not found.`);
  }
  return rows[0];
}

export async function createCategory(type, { name, description, is_active = true }) {
  const meta = definition(type);
  try {
    const [result] = await execute(
      `INSERT INTO ${meta.table} (${meta.name}, description, is_active)
       VALUES (?, ?, ?)`,
      [name, description ?? null, is_active ? 1 : 0],
    );
    return getCategory(type, result.insertId);
  } catch (error) {
    mapDuplicateError(error, [
      {
        index: meta.unique,
        code: meta.code,
        message: `A ${meta.label} with that name already exists.`,
      },
    ]);
    throw error;
  }
}

export async function updateCategory(type, id, input) {
  const meta = definition(type);
  await getCategory(type, id);

  const fields = [];
  const params = [];
  if (input.name !== undefined) {
    fields.push(`${meta.name} = ?`);
    params.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description);
  }
  if (input.is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(input.is_active ? 1 : 0);
  }

  if (fields.length > 0) {
    params.push(id);
    try {
      await execute(`UPDATE ${meta.table} SET ${fields.join(', ')} WHERE ${meta.id} = ?`, params);
    } catch (error) {
      mapDuplicateError(error, [
        {
          index: meta.unique,
          code: meta.code,
          message: `A ${meta.label} with that name already exists.`,
        },
      ]);
      throw error;
    }
  }

  return getCategory(type, id);
}
