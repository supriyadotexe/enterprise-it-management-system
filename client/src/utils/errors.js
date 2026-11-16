const STATUS_MESSAGES = {
  400: 'Some of the submitted details are invalid. Review the highlighted fields and try again.',
  401: 'Your session has expired. Sign in again to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested record could not be found. It may have been removed or is outside your access.',
  409: 'This action conflicts with the current state of the record. Refresh the page and try again.',
  422: 'The request was understood but could not be accepted with the selected values.',
  500: 'The server could not complete the request. Try again, and contact an administrator if it persists.',
};

export function getApiError(error) {
  const response = error?.response;
  const payload = response?.data?.error;
  return {
    status: response?.status ?? null,
    code: payload?.code ?? (error?.code === 'ERR_NETWORK' ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR'),
    message:
      payload?.message ??
      (error?.code === 'ERR_NETWORK'
        ? 'The API could not be reached. Check that the server is running.'
        : error?.message) ??
      'Something went wrong.',
    details: Array.isArray(payload?.details) ? payload.details : [],
  };
}

export function getErrorMessage(error, fallback) {
  const parsed = getApiError(error);
  if (parsed.status && !parsed.message) return STATUS_MESSAGES[parsed.status] ?? fallback;
  return parsed.message || fallback || STATUS_MESSAGES[parsed.status] || 'Something went wrong.';
}

export function getFieldErrors(error) {
  const parsed = getApiError(error);
  const fieldErrors = {};
  for (const detail of parsed.details) {
    if (!detail?.field) continue;
    if (!fieldErrors[detail.field]) fieldErrors[detail.field] = detail.message;
  }
  return fieldErrors;
}

export function getErrorSummary(error) {
  const parsed = getApiError(error);
  if (parsed.status && parsed.status >= 500) {
    return parsed.message || STATUS_MESSAGES[parsed.status];
  }
  return parsed.message || STATUS_MESSAGES[parsed.status] || 'Something went wrong.';
}
