import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard.js';
import { requestsApi } from '../../api/requests.js';
import { maintenanceApi } from '../../api/maintenance.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ButtonLink from '../../components/ui/ButtonLink.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/States.jsx';
import {
  MaintenanceStatusBadge,
  MaintenanceTypeBadge,
  PriorityBadge,
  RequestStatusBadge,
} from '../../components/ui/Badge.jsx';
import { TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { formatDate, formatDateTime, formatNumber } from '../../utils/format.js';

export default function TechnicianDashboardPage() {
  useDocumentTitle('Technician dashboard');
  const { user } = useAuth();
  const query = useApiQuery(async () => {
    const [summary, requests, scheduled, inProgress] = await Promise.all([
      dashboardApi.technician(),
      requestsApi.list({ limit: 6 }),
      maintenanceApi.list({ status: 'scheduled', limit: 6 }),
      maintenanceApi.list({ status: 'in_progress', limit: 6 }),
    ]);
    return { summary, requests, scheduled, inProgress };
  }, `technician-dashboard-${user.user_id}`);

  if (query.loading) return <PageLoader label="Loading your work queue…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />;

  const { summary, requests, scheduled, inProgress } = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Work queue for ${user.full_name.split(' ')[0]}`}
        description="Only service requests and maintenance records assigned to you are shown here."
        actions={
          <>
            <ButtonLink to="/tech/requests" variant="secondary">Assigned requests</ButtonLink>
            <ButtonLink to="/tech/maintenance?create=1">Create maintenance</ButtonLink>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assigned requests"
          value={formatNumber(summary.requests.assigned)}
          hint="Waiting to be started"
          tone="sky"
          to="/tech/requests?status=assigned"
        />
        <StatCard
          label="Requests in progress"
          value={formatNumber(summary.requests.in_progress)}
          hint="Work currently underway"
          tone="indigo"
          to="/tech/requests?status=in_progress"
        />
        <StatCard
          label="Resolved by me"
          value={formatNumber(summary.requests.resolved)}
          hint="Completed service requests"
          tone="emerald"
          to="/tech/requests?status=resolved"
        />
        <StatCard
          label="Maintenance in progress"
          value={formatNumber(summary.maintenance.in_progress)}
          hint={`${summary.maintenance.scheduled} scheduled ahead`}
          tone="amber"
          to="/tech/maintenance?status=in_progress"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Assigned service requests"
            description="Start, resolve or review the request history."
            actions={<Link to="/tech/requests" className="text-xs font-medium text-blue-700 hover:text-blue-800">View all</Link>}
          />
          {requests.items.length === 0 ? (
            <EmptyState title="No assigned requests" description="Requests assigned to you will appear here." />
          ) : (
            <TableFrame>
              <thead>
                <tr>
                  <Th>Request</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.items.map((request) => (
                  <tr key={request.request_id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        to={`/tech/requests/${request.request_id}`}
                        className="font-medium text-slate-900 hover:text-blue-800"
                      >
                        {request.request_code}
                      </Link>
                      <p className="mt-0.5 max-w-[16rem] truncate text-xs text-slate-500">
                        {request.title}
                      </p>
                      <p className="text-xs text-slate-400">{request.requester_name}</p>
                    </Td>
                    <Td><PriorityBadge priority={request.priority} /></Td>
                    <Td><RequestStatusBadge status={request.status} /></Td>
                    <Td className="whitespace-nowrap text-xs">{formatDateTime(request.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Active maintenance"
            description="Scheduled jobs are not yet holding the asset; in-progress work is."
            actions={<Link to="/tech/maintenance" className="text-xs font-medium text-blue-700 hover:text-blue-800">Open board</Link>}
          />
          {inProgress.items.length === 0 && scheduled.items.length === 0 ? (
            <EmptyState title="No active maintenance" description="Scheduled and in-progress jobs appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...inProgress.items, ...scheduled.items].slice(0, 7).map((record) => (
                <li key={record.maintenance_id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/tech/maintenance/${record.maintenance_id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-800"
                      >
                        {record.asset_code}
                      </Link>
                      <p className="truncate text-xs text-slate-500">{record.asset_name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Planned {formatDate(record.scheduled_date)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <MaintenanceStatusBadge status={record.status} />
                      <MaintenanceTypeBadge type={record.maintenance_type} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
