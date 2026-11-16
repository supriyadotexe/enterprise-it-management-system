import { useEffect, useState } from 'react';
import { getHealth } from '../api/health.js';

const badgeStyles = {
  checking: 'border-amber-200 bg-amber-50 text-amber-700',
  online: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  offline: 'border-rose-200 bg-rose-50 text-rose-700',
};

const badgeLabels = {
  checking: 'Checking',
  online: 'Online',
  offline: 'Offline',
};

function formatCheckedAt(timestamp, timezone) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: timezone,
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
}

export default function ApiStatusCard() {
  const [attempt, setAttempt] = useState(0);
  const [health, setHealth] = useState({ kind: 'checking' });

  useEffect(() => {
    const controller = new AbortController();

    getHealth(controller.signal)
      .then((data) => setHealth({ kind: 'online', data }))
      .catch((error) => {
        if (error.code === 'ERR_CANCELED') return;
        setHealth({
          kind: 'offline',
          message: error.response?.data?.error?.message ?? error.message,
        });
      });

    return () => controller.abort();
  }, [attempt]);

  const isOnline = health.kind === 'online';

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60"
      aria-labelledby="api-status-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="api-status-heading" className="text-base font-semibold text-slate-900">
            API connection
          </h2>
          <p className="mt-1 text-sm text-slate-500">Live check of the Express health endpoint.</p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${badgeStyles[health.kind]}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              health.kind === 'online'
                ? 'bg-emerald-500'
                : health.kind === 'offline'
                  ? 'bg-rose-500'
                  : 'animate-pulse bg-amber-500'
            }`}
            aria-hidden="true"
          />
          {badgeLabels[health.kind]}
        </span>
      </div>

      <div className="mt-5 rounded-xl bg-slate-950 px-4 py-3 font-mono text-xs text-slate-300">
        <span className="text-emerald-400">GET</span> <span className="text-sky-300">/health</span>
        <span className="ml-2 text-slate-500">{isOnline ? '200 OK' : ''}</span>
      </div>

      <div className="mt-4 min-h-24" role="status" aria-live="polite">
        {health.kind === 'checking' && (
          <p className="text-sm text-slate-500">Waiting for the API to respond…</p>
        )}

        {isOnline && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Environment
              </dt>
              <dd className="mt-0.5 font-medium text-slate-800">{health.data.environment}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Version
              </dt>
              <dd className="mt-0.5 font-medium text-slate-800">{health.data.version}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                App timezone
              </dt>
              <dd className="mt-0.5 font-medium text-slate-800">{health.data.timezone}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Checked at
              </dt>
              <dd className="mt-0.5 font-medium text-slate-800">
                {formatCheckedAt(health.data.timestamp, health.data.timezone)}
              </dd>
            </div>
          </dl>
        )}

        {health.kind === 'offline' && (
          <div>
            <p className="text-sm font-medium text-rose-700">The API did not respond.</p>
            <p className="mt-1 break-words text-sm text-slate-500">{health.message}</p>
            <p className="mt-2 text-xs text-slate-400">
              Start both services with <code className="font-mono">npm run dev</code>.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setHealth({ kind: 'checking' });
          setAttempt((value) => value + 1);
        }}
        className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        Re-check
      </button>
    </section>
  );
}
