import { useCallback, useMemo, useState } from 'react';
import { getFieldErrors, getErrorSummary } from '../utils/errors.js';

/**
 * Controlled form state with server field errors and a duplicate-submit guard.
 * Client-side validation stays in the page; this hook only centralises the
 * repetitive submit/error lifecycle.
 */
export function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback((name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  const reset = useCallback(
    (nextValues = initialValues) => {
      setValues(nextValues);
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    },
    [initialValues],
  );

  const handleSubmit = useCallback(async (clientErrors, action) => {
    const errors = clientErrors ?? {};
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError('Please correct the highlighted fields.');
      return undefined;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      return await action();
    } catch (error) {
      setFieldErrors(getFieldErrors(error));
      setFormError(getErrorSummary(error));
      return undefined;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return useMemo(
    () => ({
      values,
      setValues,
      setValue,
      fieldErrors,
      setFieldErrors,
      formError,
      setFormError,
      submitting,
      reset,
      handleSubmit,
    }),
    [values, setValue, fieldErrors, formError, submitting, reset, handleSubmit],
  );
}
