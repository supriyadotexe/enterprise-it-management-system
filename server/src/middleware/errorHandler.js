import { env } from '../config/env.js';

export function errorHandler(error, req, res, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  }

  const message =
    isServerError && env.isProduction ? 'An unexpected error occurred.' : error.message;

  res.status(status).json({
    success: false,
    error: {
      code: error.code ?? (isServerError ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      message,
      details: Array.isArray(error.details) ? error.details : [],
    },
  });
}
