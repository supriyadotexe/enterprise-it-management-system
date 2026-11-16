import { Link } from 'react-router-dom';
import ApiStatusCard from '../components/ApiStatusCard.jsx';

const modules = [
  'Employees & departments',
  'Asset registry',
  'Allocation & returns',
  'Service requests',
  'Technician & maintenance',
  'Dashboards & reports',
];

const stack = ['React + Vite', 'Tailwind CSS', 'Node.js + Express', 'MySQL 8', 'JWT + bcrypt'];

const phases = [
  {
    name: 'Phase 1',
    status: 'In progress',
    detail: 'Workspaces, API and UI shell',
    tone: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  {
    name: 'Phase 2',
    status: 'Queued',
    detail: 'Schema, seed data and invariants',
    tone: 'border-slate-200 bg-slate-50 text-slate-600',
  },
  {
    name: 'Phase 3',
    status: 'Queued',
    detail: 'Authentication and module APIs',
    tone: 'border-slate-200 bg-slate-50 text-slate-600',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 shadow-sm">
              <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
                <path d="M18 24.5 32 17l14 7.5L32 32 18 24.5Z" fill="#e0e7ff" />
                <path
                  d="M18 32.5 32 40l14-7.5M18 40 32 47.5 46 40"
                  fill="none"
                  stroke="#c7d2fe"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-slate-900">
                Nexora
              </span>
              <span className="block text-xs text-slate-500">IT Operations Suite</span>
            </span>
          </Link>

          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Phase 1 · Application shell
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6 lg:py-16">
        <section className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
              Academic prototype
            </p>

            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              One system for IT assets, allocations and service work.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              The Enterprise IT Asset & Service Management System brings the asset lifecycle,
              employee hand-offs, service requests and maintenance into a single role-based
              application.
            </p>

            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Technology stack">
              {stack.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
                >
                  {item}
                </li>
              ))}
            </ul>

            <dl className="mt-10 grid grid-cols-3 gap-3 sm:max-w-md">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Modules
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900">6</dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Roles
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900">3</dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Tables
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900">
                  12
                  <span className="ml-1.5 align-middle text-xs font-normal text-slate-400">
                    Phase 2
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <ApiStatusCard />
        </section>

        <section className="mt-16 grid gap-5 md:grid-cols-3" aria-label="Project scope">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Modules in scope</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              {modules.map((module) => (
                <li key={module} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400"
                    aria-hidden="true"
                  />
                  {module}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Access model</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Permissions are enforced by the API, not only hidden in the interface. Employees see
              their own assets and requests; technicians see assigned work; administrators manage
              the estate.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Admin', 'Employee', 'Technician'].map((role) => (
                <span
                  key={role}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {role}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Delivery guardrails</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Raw SQL with parameterised queries only.</li>
              <li>Transactions for multi-step lifecycle changes.</li>
              <li>One recompute path for derived asset status.</li>
              <li>Synthetic demonstration data only.</li>
            </ul>
          </article>
        </section>

        <section
          className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          aria-labelledby="phase-plan-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="phase-plan-heading" className="text-base font-semibold text-slate-900">
                Delivery sequence
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                The shell is verified before database objects are created.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">Approved plan · Revision 5</span>
          </div>

          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {phases.map((phase, index) => (
              <li key={phase.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Step {index + 1}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${phase.tone}`}
                  >
                    {phase.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{phase.name}</p>
                <p className="mt-1 text-sm text-slate-500">{phase.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Enterprise IT Asset & Service Management System — academic prototype.</p>
          <p>Phase 1 shell · no database objects created yet.</p>
        </div>
      </footer>
    </div>
  );
}
