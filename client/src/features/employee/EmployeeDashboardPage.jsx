import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard.js';
import { employeesApi } from '../../api/employees.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ButtonLink from '../../components/ui/ButtonLink.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { EmptyState, ErrorState, InlineAlert, PageLoader } from '../../components/ui/States.jsx';
import {
  AssetStatusBadge,
  ConditionBadge,
  PriorityBadge,
  RequestStatusBadge,
} from '../../components/ui/Badge.jsx';
import { TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { formatDate, formatDateTime, formatNumber } from '../../utils/format.js';

export default function EmployeeDashboardPage() {
  useDocumentTitle('My dashboard');
  const { user } = useAuth();
  const query = useApiQuery(async () => {
    const [summary, assets, requests] = await Promise.all([
      dashboardApi.employee(),
      employeesApi.assets(user.employee_id, { limit: 5 }),
      employeesApi.requests(user.employee_id, { limit: 5 }),
    ]);
    return { summary, assets, requests };
  }, `employee-dashboard-${user.employee_id}`);

  if (query.loading) return <PageLoader label="Loading your workspace…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />;

  const { summary, assets, requests } = query.data;
  const openRequests =
    Number(summary.requests.pending ?? 0) +
    Number(summary.requests.assigned ?? 0) +
    Number(summary.requests.in_progress ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user.full_name.split(' ')[0]}`}
        description="Your assigned equipment and service activity, based on your employee record."
        actions={<ButtonLink to="/me/requests/new">Raise a service request</ButtonLink>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assigned assets"
          value={formatNumber(summary.assigned_assets)}
          hint="Open allocations currently held by you"
          tone="sky"
          to="/me/assets"
        />
        <StatCard
          label="Open requests"
          value={formatNumber(openRequests)}
          hint="Pending, assigned or in progress"
          tone="amber"
          to="/me/requests"
        />
        <StatCard
          label="Resolved requests"
          value={formatNumber(summary.requests.resolved)}
          hint="Awaiting your confirmation to close"
          tone="emerald"
          to="/me/requests?status=resolved"
        />
        <StatCard
          label="Closed requests"
          value={formatNumber(summary.requests.closed)}
          hint="Completed service history"
          tone="slate"
          to="/me/requests?status=closed"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="My current assets"
            description="Equipment allocated to you and not yet returned."
            actions={<Link to="/me/assets" className="text-xs font-medium text-blue-700 hover:text-blue-800">View all</Link>}
          />
          {assets.items.length === 0 ? (
            <EmptyState
              title="No assets allocated"
              description="Assets allocated by IT will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {assets.items.map((asset) => (
                <li key={asset.assignment_id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {asset.asset_code}{' '}
                        <span className="font-normal text-slate-500">· {asset.asset_name}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {asset.category_name} · allocated {formatDate(asset.assigned_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <AssetStatusBadge status={asset.asset_status} />
                      <ConditionBadge condition={asset.asset_condition} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent requests"
            description="Track progress and review resolution notes."
            actions={<Link to="/me/requests" className="text-xs font-medium text-blue-700 hover:text-blue-800">View all</Link>}
          />
          {requests.items.length === 0 ? (
            <EmptyState
              title="No service requests yet"
              description="Raise a request when you need help with an assigned asset or another IT service."
              action={<ButtonLink to="/me/requests/new" size="sm">Raise a request</ButtonLink>}
            />
          ) : (
            <TableFrame>
              <thead>
                <tr>
                  <Th>Request</Th>
                  <Th>Status</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.items.map((request) => (
                  <tr key={request.request_id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        to={`/me/requests/${request.request_id}`}
                        className="font-medium text-slate-900 hover:text-blue-800"
                      >
                        {request.request_code}
                      </Link>
                      <p className="mt-0.5 max-w-[16rem] truncate text-xs text-slate-500">
                        {request.title}
                      </p>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        <RequestStatusBadge status={request.status} />
                        <PriorityBadge priority={request.priority} />
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-xs">{formatDateTime(request.updated_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
          )}
        </Card>
      </div>

      <InlineAlert tone="info" title="Need to reference an asset?">
        When you raise a request, you can only link an asset that is currently allocated to you. This
        keeps the service history attached to the right equipment.
      </InlineAlert>
    </div>
  );
}
