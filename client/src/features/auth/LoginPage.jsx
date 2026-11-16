import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Brand from '../../components/layout/Brand.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Form.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeForRole } from '../../router/routeMeta.js';
import { getErrorSummary } from '../../utils/errors.js';
import { required } from '../../utils/validation.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

const ROLE_BASE = {
  admin: '/admin',
  employee: '/me',
  technician: '/tech',
};

/**
 * Only resume a path the signed-in role can actually open. Location state can
 * outlive a logout, so a stale admin URL must not send an employee to /403.
 */
function resolveTarget(from, role) {
  const home = homeForRole(role);
  if (typeof from !== 'string' || !from.startsWith('/') || from === '/login') return home;
  if (from === '/profile' || from === '/change-password') return from;
  const base = ROLE_BASE[role];
  if (base && (from === base || from.startsWith(`${base}/`))) return from;
  return home;
}

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { status, user, login, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const expired = Boolean(location.state?.sessionExpired || sessionExpired);

  if (status === 'authenticated' && user) {
    return <Navigate to={resolveTarget(location.state?.from, user.role)} replace />;
  }

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError(null);
  }

  async function onSubmit(event) {
    event.preventDefault();
    const nextErrors = {
      username: required(values.username, 'Username'),
      password: required(values.password, 'Password'),
    };
    if (nextErrors.username || nextErrors.password) {
      setErrors(nextErrors);
      setFormError('Enter your username and password.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const signedIn = await login({
        username: values.username.trim(),
        password: values.password,
      });
      clearSessionExpired();
      navigate(resolveTarget(location.state?.from, signedIn.role), { replace: true });
    } catch (error) {
      setFormError(getErrorSummary(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#101C32] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(99,102,241,.35), transparent 42%), radial-gradient(circle at 80% 80%, rgba(14,165,233,.25), transparent 45%)',
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5">
            <img
              src="/branding/logo.png"
              alt="Nexora logo"
              className="h-10 w-auto shrink-0 object-contain"
            />
            <span>
              <span className="block text-sm font-semibold tracking-wide">Nexora</span>
              <span className="block text-[11px] text-slate-300">
                IT Operations Suite
              </span>
            </span>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Asset and service operations
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
            One operational view of the IT estate.
          </h1>
          <p className="mt-5 text-sm leading-7 text-slate-300">
            Track every asset from registration to retirement, keep allocations consistent, and
            connect employee service requests with technician maintenance work.
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-slate-300">
            {[
              'Derived asset status from allocation and maintenance facts',
              'Role-scoped service requests with a recorded status history',
              'Scheduled and immediate maintenance with explicit outcomes',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-slate-400">
          Academic prototype · Synthetic demonstration data only
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Sign in
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Access your workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use the credentials issued by your IT administrator.
          </p>

          <div className="mt-6 space-y-4">
            {expired && (
              <InlineAlert tone="warning" title="Your session has expired">
                Sign in again to continue. Any unsaved changes were not submitted.
              </InlineAlert>
            )}

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800"
                >
                  {formError}
                </div>
              )}

              <Field
                label="Username"
                htmlFor="login-username"
                error={errors.username}
                required
              >
                <Input
                  id="login-username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={values.username}
                  onChange={(event) => update('username', event.target.value)}
                  error={errors.username}
                  placeholder="e.g. admin"
                />
              </Field>

              <Field label="Password" htmlFor="login-password" error={errors.password} required>
                <div className="relative">
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={values.password}
                    onChange={(event) => update('password', event.target.value)}
                    error={errors.password}
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-xs font-medium text-slate-500 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>

              <Button type="submit" size="lg" className="w-full" loading={submitting}>
                Sign in
              </Button>
            </form>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm">
            <p className="font-semibold text-slate-700">Prototype security notice</p>
            <p className="mt-1">
              The bearer token is stored in this browser&apos;s local storage for the academic
              demonstration. Production deployments should use short-lived HttpOnly cookies with
              refresh-token rotation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
