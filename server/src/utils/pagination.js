import { ApiError } from './ApiError.js';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Normalise validated page/limit values and create the response meta block. */
export function paginationMeta({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, total = 0 }) {
  const safePage = Number.isInteger(page) && page > 0 ? page : DEFAULT_PAGE;
  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;
  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
  };
}

export function paginationSql({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT }) {
  const safePage = Number.isInteger(page) && page > 0 ? page : DEFAULT_PAGE;
  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;
  return {
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    page: safePage,
  };
}

/** Throw a 404 with a resource-specific code. */
export function notFound(resource, id) {
  throw new ApiError(404, `${resource.toUpperCase()}_NOT_FOUND`, `${resource} ${id} was not found.`);
}
