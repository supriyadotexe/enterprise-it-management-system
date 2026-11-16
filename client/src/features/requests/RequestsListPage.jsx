import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { requestsApi } from '../../api/requests.js';
import { lookupsApi } from '../../api/dashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ButtonLink from '../../components/ui/ButtonLink.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import {
  PriorityBadge,
  RequestStatusBadge,
} from '../../components/ui/Badge.jsx';
import { FilterBar, SearchField, SelectFilter } from '../../components/ui/Filters.jsx';
import { Pagination, TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States.jsx';
import {
  pathsForRole,
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
} from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';

const COPY = {
  admin: {
    title: 'Service requests',
    description:
      'Assign technicians, follow request progress and review the full status history.',
  },
  employee: {
    title: 'My service requests',
    description:
      'Requests you have raised, their current status and the technician handling them.',
  },
  technician: {
    title: 'Assigned requests',
    description:
      'Service requests assigned to you. Start work and resolve requests with resolution notes.',
  },
};

export default function RequestsListPage() {
  const { user } = useAuth();
  const role = user.role;
  const copy = COPY[role];
  useDocumentTitle(copy.title);
  const paths = pathsForRole(role);
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [priority, setPriority] = useState(searchParams.get('priority') ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [technicianId, setTechnicianId] = useState('');

  const query = useApiQuery(async () => {
    const [list, lookups] = await Promise.all([
      requestsApi.list({
        page,
        limit: 20,
        search: debouncedSearch,
        status: status || undefined,
        priority: priority || undefined,
        service_category_id: categoryId || undefined,
        assigned_technician_id: technicianId || undefined,
      }),
      role === 'admin' ? lookupsApi.get() : Promise.resolve(null),
    ]);
    return { list, lookups };
  }, `${role}|${page}|${debouncedSearch}|${status}|${priority}|${categoryId}|${technicianId}`);

  if (query.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={copy.title} description="Loading service requests…" />
        <Card><TableSkeleton rows={7} columns={6} /></Card>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="space-y-6">
        <PageHeader title={copy.title} />
        <ErrorState message={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const { list, lookups } = query.data;
  const showRequester = role !== 'employee';

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          role === 'employee' ? (
            <ButtonLink to={paths.newRequest}>Raise a service request</ButtonLink>
          ) : role === 'technician' ? (
            <ButtonLink to={paths.maintenance} variant="secondary">
              Maintenance queue
            </ButtonLink>
          ) : (
            <ButtonLink to={paths.reports} variant="secondary">
              Service reports
            </ButtonLink>
          )
        }
      />

      <Card>
        <CardHeader
          title="Request queue"
          description={`${list.meta.total} request${list.meta.total === 1 ? '' : 's'} match the current filters`}
        />
        <FilterBar>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search code, title or description…"
            className="w-full sm:w-72"
          />
          <SelectFilter
            label="Filter by request status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              ...REQUEST_STATUSES.map((item) => ({ value: item.value, label: item.label })),
            ]}
          />
          <SelectFilter
            label="Filter by priority"
            value={priority}
            onChange={(value) => {
              setPriority(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All priorities' },
              ...REQUEST_PRIORITIES.map((item) => ({ value: item.value, label: item.label })),
            ]}
          />
          {role === 'admin' && lookups && (
            <>
              <SelectFilter
                label="Filter by service category"
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'All categories' },
                  ...lookups.service_categories.map((category) => ({
                    value: String(category.service_category_id),
                    label: category.name,
                  })),
                ]}
              />
              <SelectFilter
                label="Filter by technician"
                value={technicianId}
                onChange={(value) => {
                  setTechnicianId(value);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'Any technician' },
                  ...lookups.technicians.map((technician) => ({
                    value: String(technician.user_id),
                    label: technician.full_name,
                  })),
                ]}
              />
            </>
          )}
        </FilterBar>

        {list.items.length === 0 ? (
          <EmptyState
            title={
              search || status || priority || categoryId || technicianId
                ? 'No requests match'
                : role === 'employee'
                  ? 'No service requests yet'
                  : role === 'technician'
                    ? 'No requests assigned'
                    : 'No service requests yet'
            }
            description={
              role === 'employee'
                ? 'Raise a request when you need IT help with an asset or service.'
                : role === 'technician'
                  ? 'Requests assigned by an administrator will appear here.'
                  : 'Requests raised by employees will appear here.'
            }
            action={
              role === 'employee' ? (
                <ButtonLink to={paths.newRequest}>Raise a service request</ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <>
            <TableFrame>
              <thead>
                <tr>
                  <Th>Request</Th>
                  {showRequester && <Th>Requester</Th>}
                  <Th>Service category</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th>Technician</Th>
                  <Th>Created</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((request) => (
                  <tr key={request.request_id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        to={`${paths.requests}/${request.request_id}`}
                        className="font-medium text-slate-900 hover:text-blue-800"
                      >
                        {request.request_code}
                      </Link>
                      <p className="mt-0.5 max-w-[20rem] truncate text-xs text-slate-500">
                        {request.title}
                      </p>
                      {request.asset_code && (
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {request.asset_code} · {request.asset_name}
                        </p>
                      )}
                    </Td>
                    {showRequester && (
                      <Td>
                        <p className="text-xs font-medium text-slate-700">{request.requester_name}</p>
                        <p className="text-[11px] text-slate-400">{request.department_name}</p>
                      </Td>
                    )}
                    <Td className="text-xs">{request.service_category_name}</Td>
                    <Td><PriorityBadge priority={request.priority} /></Td>
                    <Td><RequestStatusBadge status={request.status} /></Td>
                    <Td className="text-xs">
                      {request.technician_name || (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-xs">
                      {formatDateTime(request.created_at)}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <Link
                          to={`${paths.requests}/${request.request_id}`}
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
    </div>
  );
}
