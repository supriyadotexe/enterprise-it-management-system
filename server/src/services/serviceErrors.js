import { ApiError } from '../utils/ApiError.js';

export function isDuplicateError(error) {
  return error?.code === 'ER_DUP_ENTRY';
}

export function isForeignKeyError(error) {
  return error?.code === 'ER_NO_REFERENCED_ROW_2' || error?.code === 'ER_ROW_IS_REFERENCED_2';
}

/**
 * Map a MySQL duplicate-key error to a stable API code. The message includes
 * the table-qualified index name on MySQL 8, so matching the index name is
 * tolerant of value formatting in the rest of the message.
 */
export function mapDuplicateError(error, mappings) {
  if (!isDuplicateError(error)) return;
  const message = `${error.sqlMessage ?? ''} ${error.message ?? ''}`;
  for (const mapping of mappings) {
    if (message.includes(mapping.index)) {
      throw new ApiError(409, mapping.code, mapping.message);
    }
  }
  throw new ApiError(409, 'DUPLICATE_VALUE', 'A unique field already exists.');
}

export function assertFound(row, code, message) {
  if (!row) throw new ApiError(404, code, message);
  return row;
}
