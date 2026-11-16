import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { maintenanceApi } from '../../api/maintenance.js';
import { assetsApi } from '../../api/assets.js';
import { lookupsApi } from '../../api/dashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  MaintenanceStatusBadge,
  MaintenanceTypeBadge,
  OutcomeBadge,
} from '../../components/ui/Badge.jsx';
import { FilterBar, SearchField, SelectFilter } from '../../components/ui/Filters.jsx';
import { Pagination, TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States.jsx';
import {
  MAINTENANCE_STATUSES,
  pathsForRole,
} from '../../utils/constants.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import MaintenanceFormModal from '../maintenance/MaintenanceFormModal.jsx';

export default function MaintenanceListPage() {
  useDocumentTitle('Maintenance');
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';
  const paths = pathsForRole(user.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [technicianId, setTechnicianId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const autoOpened = useRef(false);

  const query = useApiQuery(async () => {
    const [list, assets, lookups] = await Promise.all([
      maintenanceApi.list({
        page,
        limit: 20,
        search: debouncedSearch,
        status: status || undefined,
        technician_id: technicianId || undefined,
      }),
      assetsApi.list({ limit: 100 }),
      isAdmin ? lookupsApi.get() : Promise.resolve(null),
    ]);
    return { list, assets, lookups };
  }, `maintenance-${user.user_id}|${page}|${debouncedSearch}|${status}|${technicianId}`);

  useEffect(() => {
    if (autoOpened.current || !query.data) return undefined;
    if (searchParams.get('create') !== '1') return undefined;
    autoOpened.current = true;
    const timer = window.setTimeout(() => {
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }, 0);
    return () => window.clearTimeout(timer);
    // Only react to the first successful load and the requested query flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  if (query.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Maintenance" description="Loading the maintenance board…" />
        <Card><TableSkeleton rows={7} columns={7} /></Card>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Maintenance" />
        <ErrorState message={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const { list, assets, lookups } = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description={
          isAdmin
            ? 'Scheduled and in-progress maintenance across the estate, including completion outcomes.'
            : 'Maintenance assigned to you. Start scheduled work, then record the completion outcome.'
        }
        actions={<Button onClick={() => setFormOpen(true)}>Create maintenance</Button>}
      />

      <Card>
        <CardHeader
          title="Maintenance records"
          description={`${list.meta.total} record${list.meta.total === 1 ? '' : 's'} match the current filters`}
        />
        <FilterBar>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search asset code, name or description…"
            className="w-full sm:w-72"
          />
          <SelectFilter
            label="Filter maintenance by status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              ...MAINTENANCE_STATUSES.map((item) => ({
                value: item.value,
                label: item.label,
              })),
            ]}
          />
          {isAdmin && lookups && (
            <SelectFilter
              label="Filter maintenance by technician"
              value={technicianId}
              onChange={(value) => {
                setTechnicianId(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All technicians' },
                ...lookups.technicians.map((technician) => ({
                  value: String(technician.user_id),
                  label: technician.full_name,
                })),
              ]}
            />
          )}
        </FilterBar>

        {list.items.length === 0 ? (
          <EmptyState
            title="No maintenance records"
            description={
              isAdmin
                ? 'Create a scheduled or immediate maintenance record for an asset.'
                : 'Scheduled and in-progress work assigned to you will appear here.'
            }
            action={<Button onClick={() => setFormOpen(true)}>Create maintenance</Button>}
          />
        ) : (
          <>
            <TableFrame>
              <thead>
                <tr>
                  <Th>Record</Th>
                  <Th>Asset</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Technician</Th>
                  <Th>Scheduled</Th>
                  <Th>Updated activity</Th>
                  <Th>Outcome</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((record) => (
                  <tr key={record.maintenance_id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        to={`${paths.maintenance}/${record.maintenance_id}`}
                        className="font-medium text-slate-900 hover:text-blue-800"
                      >
                        #{record.maintenance_id}
                      </Link>
                      <p className="max-w-[18rem] truncate text-xs text-slate-500">
                        {record.description}
                      </p>
                      {record.request_code && (
                        <p className="mt-0.5 text-[11px] text-blue-700">
                          {record.request_code}
                        </p>
                      )}
                    </Td>
                    <Td className="text-xs">
                      <Link
                        to={`${paths.assets}/${record.asset_id}`}
                        className="font-medium text-slate-700 hover:text-blue-800"
                      >
                        {record.asset_code}
                      </Link>
                      <p className="max-w-[14rem] truncate text-[11px] text-slate-400">
                        {record.asset_name}
                      </p>
                    </Td>
                    <Td><MaintenanceTypeBadge type={record.maintenance_type} /></Td>
                    <Td><MaintenanceStatusBadge status={record.status} /></Td>
                    <Td className="text-xs">{record.technician_name}</Td>
                    <Td className="whitespace-nowrap text-xs">
                      {formatDate(record.scheduled_date)}
                    </Td>
                    <Td className="whitespace-nowrap text-xs">
                      {record.completed_at ? (
                        <div>
                          <p>Completed</p>
                          <p className="text-[11px] text-slate-400">
                            {formatDateTime(record.completed_at)}
                          </p>
                        </div>
                      ) : record.started_at ? (
                        <div>
                          <p>Started</p>
                          <p className="text-[11px] text-slate-400">
                            {formatDateTime(record.started_at)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">Not started</span>
                      )}
                    </Td>
                    <Td>
                      {record.outcome ? (
                        <OutcomeBadge outcome={record.outcome} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <Link
                          to={`${paths.maintenance}/${record.maintenance_id}`}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          Open
                        </Link>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
            <Pagination meta={list.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <MaintenanceFormModal
        open={formOpen}
        assets={assets.items}
        isAdmin={isAdmin}
        technicians={lookups?.technicians ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false);
          navigate(`${paths.maintenance}/${saved.maintenance_id}`);
        }}
      />
    </div>
  );
}
