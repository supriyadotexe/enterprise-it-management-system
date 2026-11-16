import { Link } from 'react-router-dom';
import { dashboardApi, reportsApi, lookupsApi } from '../../api/dashboard.js';
import { assetsApi } from '../../api/assets.js';
import { requestsApi } from '../../api/requests.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ButtonLink from '../../components/ui/ButtonLink.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { BarList, DonutChart, StackedBar } from '../../components/ui/Charts.jsx';
import { ErrorState, PageLoader, EmptyState } from '../../components/ui/States.jsx';
import {
  MaintenanceStatusBadge,
  RequestStatusBadge,
  AssetStatusBadge,
  PriorityBadge,
} from '../../components/ui/Badge.jsx';
import { TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { daysUntil, formatDate, formatDateTime, formatNumber } from '../../utils/format.js';

const STATUS_SEGMENTS = [
  { key: 'available', label: 'Available', color: '#10b981' },
  { key: 'allocated', label: 'Allocated', color: '#0ea5e9' },
  { key: 'under_maintenance', label: 'Under maintenance', color: '#f59e0b' },
  { key: 'unavailable', label: 'Unavailable', color: '#f43f5e' },
  { key: 'retired', label: 'Retired', color: '#64748b' },
];

export default function AdminDashboardPage() {
  useDocumentTitle('Administrator dashboard');
  const query = useApiQuery(async () => {
    const [summary, byDepartment, workload, recentRequests, assets, lookups] = await Promise.all([
      dashboardApi.admin(),
      reportsApi.assetsByDepartment(),
      reportsApi.technicianWorkload(),
      requestsApi.list({ limit: 6 }),
      assetsApi.list({ limit: 100 }),
      lookupsApi.get(),
    ]);
    return { summary, byDepartment, workload, recentRequests, assets, lookups };
  }, 'admin-dashboard');

  if (query.loading) return <PageLoader label="Loading the operations dashboard…" />;
  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.reload} />;
  }

  const { summary, byDepartment, workload, recentRequests, assets, lookups } = query.data;
  const statusSegments = STATUS_SEGMENTS.map((segment) => ({
    ...segment,
    value: Number(summary.assets?.[segment.key] ?? 0),
  }));
  const departmentItems = byDepartment
    .filter((row) => Number(row.total_assets) > 0)
    .map((row) => ({ label: row.department_name, value: Number(row.total_assets) }));
  const warrantyAssets = assets.items
    .filter((asset) => {
      const days = daysUntil(asset.warranty_end);
      return days !== null && days >= 0 && days <= 60 && asset.status !== 'retired';
    })
    .sort((a, b) => String(a.warranty_end).localeCompare(String(b.warranty_end)))
    .slice(0, 6);

  const workloadSegments = [
    { key: 'open_requests', label: 'Open requests', color: '#6366f1' },
    { key: 'in_progress_requests', label: 'Requests in progress', color: '#0ea5e9' },
    { key: 'in_progress_maintenance', label: 'Maintenance in progress', color: '#f59e0b' },
    { key: 'scheduled_maintenance', label: 'Scheduled maintenance', color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations dashboard"
        description="Live estate, service desk and maintenance totals from the authoritative assignment and maintenance records."
        actions={
          <>
            <ButtonLink to="/admin/assets?register=1" variant="secondary">
              Register asset
            </ButtonLink>
            <ButtonLink to="/admin/requests">Service requests</ButtonLink>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total assets"
          value={formatNumber(summary.assets.total_assets)}
          hint={`${summary.assets.available} available · ${summary.assets.unavailable} unavailable`}
          to="/admin/assets"
        />
        <StatCard
          label="Open allocations"
          value={formatNumber(summary.allocations.open_allocations)}
          hint="Assets currently held by employees"
          tone="sky"
          to="/admin/assignments"
        />
        <StatCard
          label="In-progress maintenance"
          value={formatNumber(summary.maintenance.in_progress)}
          hint={`${summary.maintenance.scheduled} scheduled · ${summary.overdue_maintenance} overdue`}
          tone="amber"
          to="/admin/maintenance?status=in_progress"
        />
        <StatCard
          label="Open service requests"
          value={formatNumber(
            Number(summary.requests.pending ?? 0) +
              Number(summary.requests.assigned ?? 0) +
              Number(summary.requests.in_progress ?? 0),
          )}
          hint={`${summary.requests.resolved} resolved · ${summary.requests.closed} closed`}
          tone="indigo"
          to="/admin/requests"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Asset status distribution"
            description="The cached status is derived from allocations, maintenance and condition."
            actions={<Link to="/admin/assets" className="text-xs font-medium text-blue-700 hover:text-blue-800">View inventory</Link>}
          />
          <CardBody>
            <DonutChart
              segments={statusSegments}
              centerValue={formatNumber(summary.assets.total_assets)}
              centerLabel="Assets"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Service desk snapshot" />
          <CardBody className="space-y-4">
            <StackedBar
              segments={[
                { label: 'Pending', value: summary.requests.pending, color: '#f59e0b' },
                { label: 'Assigned', value: summary.requests.assigned, color: '#0ea5e9' },
                { label: 'In progress', value: summary.requests.in_progress, color: '#6366f1' },
                { label: 'Resolved', value: summary.requests.resolved, color: '#10b981' },
                { label: 'Closed', value: summary.requests.closed, color: '#64748b' },
                { label: 'Cancelled', value: summary.requests.cancelled, color: '#f43f5e' },
              ]}
            />
            <div className="rounded-lg bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600">
              <p className="font-semibold text-slate-800">Maintenance outcomes</p>
              <p className="mt-1">
                {summary.maintenance.returned_to_service} returned to service ·{' '}
                {summary.maintenance.held_unavailable} held unavailable · {summary.maintenance.retired}{' '}
                retired
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Assets by department"
            description="Open allocations grouped by the holder's department."
          />
          <CardBody>
            <BarList items={departmentItems} valueLabel="assets" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Technician workload"
            description="Open service requests and upcoming maintenance."
            actions={
              <Link to="/admin/users" className="text-xs font-medium text-blue-700 hover:text-blue-800">
                Manage technicians
              </Link>
            }
          />
          <CardBody className="space-y-5">
            {workload.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No active technicians.</p>
            ) : (
              workload.slice(0, 5).map((technician) => (
                <div key={technician.technician_id}>
                  <p className="mb-2 text-sm font-medium text-slate-800">
                    {technician.technician_name}
                  </p>
                  <StackedBar
                    segments={workloadSegments.map((segment) => ({
                      label: segment.label,
                      value: technician[segment.key],
                      color: segment.color,
                    }))}
                    emptyLabel="No assigned work."
                  />
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent service requests"
            actions={<Link to="/admin/requests" className="text-xs font-medium text-blue-700 hover:text-blue-800">View all</Link>}
          />
          {recentRequests.items.length === 0 ? (
            <EmptyState title="No service requests yet" description="Requests raised by employees appear here." />
          ) : (
            <TableFrame>
              <thead>
                <tr>
                  <Th>Request</Th>
                  <Th>Requester</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRequests.items.map((request) => (
                  <tr key={request.request_id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        to={`/admin/requests/${request.request_id}`}
                        className="font-medium text-slate-900 hover:text-blue-800"
                      >
                        {request.request_code}
                      </Link>
                      <p className="mt-0.5 max-w-[18rem] truncate text-xs text-slate-500">
                        {request.title}
                      </p>
                    </Td>
                    <Td>
                      <p className="text-slate-800">{request.requester_name}</p>
                      <p className="text-xs text-slate-400">{request.department_name}</p>
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
            title="Warranty expiring soon"
            description="Next 60 days, from the first 100 assets."
          />
          {warrantyAssets.length === 0 ? (
            <EmptyState title="No warranties expiring" description="Nothing is due in the next 60 days." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {warrantyAssets.map((asset) => (
                <li key={asset.asset_id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/assets/${asset.asset_id}`}
                      className="truncate text-sm font-medium text-slate-900 hover:text-blue-800"
                    >
                      {asset.asset_code}
                    </Link>
                    <p className="truncate text-xs text-slate-500">{asset.name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <AssetStatusBadge status={asset.status} dot={false} />
                    <p className="mt-1 text-[11px] text-slate-500">{formatDate(asset.warranty_end)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Maintenance by state" />
          <CardBody>
            <BarList
              items={[
                { label: 'Scheduled', value: summary.maintenance.scheduled, className: 'bg-sky-500' },
                { label: 'In progress', value: summary.maintenance.in_progress, className: 'bg-amber-500' },
                { label: 'Completed', value: summary.maintenance.completed, className: 'bg-emerald-500' },
                { label: 'Cancelled', value: summary.maintenance.cancelled, className: 'bg-rose-400' },
              ]}
              valueLabel="records"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Available lookups" description="Active records available to forms." />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Employees</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{lookups.employees.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Technicians</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{lookups.technicians.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Asset categories</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{lookups.asset_categories.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Service categories</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{lookups.service_categories.length}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Maintenance guidance" actions={<Link to="/admin/maintenance" className="text-xs font-medium text-blue-700 hover:text-blue-800">Open</Link>} />
          <CardBody className="text-sm text-slate-600">
            <p>
              {summary.maintenance.in_progress} record{summary.maintenance.in_progress === 1 ? '' : 's'} currently
              holds an asset in <span className="font-medium">under maintenance</span> status.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Completing a maintenance record requires an explicit outcome: return to service, hold
              unavailable, or retire. The asset status is recomputed in the same transaction.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <MaintenanceStatusBadge status="scheduled" />
              <MaintenanceStatusBadge status="in_progress" />
              <MaintenanceStatusBadge status="completed" />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
