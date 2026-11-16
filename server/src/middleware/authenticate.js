import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { getCurrentUser } from '../services/auth.service.js';

export async function authenticate(req, _res, next) {
  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'A bearer token is required.'));
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'A bearer token is required.'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new ApiError(401, 'INVALID_TOKEN', 'The access token is invalid or expired.'));
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId < 1) {
    return next(new ApiError(401, 'INVALID_TOKEN', 'The access token is invalid.'));
  }

  try {
    const user = await getCurrentUser(userId);
    if (!user) {
      return next(
        new ApiError(401, 'ACCOUNT_INACTIVE', 'The account is inactive or no longer exists.'),
      );
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function authorize(...roles) {
  const allowed = new Set(roles);
  return function authorizeRoles(req, _res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
    }
    if (!allowed.has(req.user.role)) {
      return next(
        new ApiError(403, 'FORBIDDEN', 'Your role is not permitted to perform this action.'),
      );
    }
    return next();
  };
}

/** Convenience middleware that trusts no client-supplied role claim. */
export function isAdmin(req, _res, next) {
  if (!req.user) return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'FORBIDDEN', 'Administrator access is required.'));
  }
  return next();
}

export function isTechnician(req, _res, next) {
  if (!req.user) return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
  if (req.user.role !== 'technician') {
    return next(new ApiError(403, 'FORBIDDEN', 'Technician access is required.'));
  }
  return next();
}

export function isEmployee(req, _res, next) {
  if (!req.user) return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
  if (req.user.role !== 'employee') {
    return next(new ApiError(403, 'FORBIDDEN', 'Employee access is required.'));
  }
  return next();
}


