/**
 * Express 5 forwards rejected promises from async handlers automatically.
 * Keeping this wrapper makes the intent explicit and keeps controllers
 * compatible if the project is later pinned to Express 4.
 */
export function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
