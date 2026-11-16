import { useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../../api/employees.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ButtonLink from '../../components/ui/ButtonLink.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import { AssetStatusBadge, ConditionBadge } from '../../components/ui/Badge.jsx';
import { FilterBar, SelectFilter } from '../../components/ui/Filters.jsx';
import { Pagination, TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { EmptyState, ErrorState, InlineAlert, TableSkeleton } from '../../components/ui/States.jsx';
import { formatDate, formatDateTime } from '../../utils/format.js';

export default function EmployeeAssetsPage() {
  useDocumentTitle('My assets');
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [includeReturned, setIncludeReturned] = useState('current');

  const query = useApiQuery(
    () =>
      employeesApi.assets(user.employee_id, {
        page,
        limit: 20,
        include_returned: includeReturned === 'all' ? true : undefined,
      }),
    `${user.employee_id}|${page}|${includeReturned}`,
  );

  if (query.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My assets" description="Loading your allocations…" />
        <Card><TableSkeleton rows={5} columns={5} /></Card>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="My assets" />
        <ErrorState message={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const { items, meta } = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My assets"
        description="Equipment allocated to you by IT, with its current lifecycle status."
        actions={<ButtonLink to="/me/requests/new">Raise a service request</ButtonLink>}
      />

      <Card>
        <CardHeader
          title="Asset allocations"
          description={`${meta.total} allocation${meta.total === 1 ? '' : 's'} in this view`}
        />
        <FilterBar>
          <SelectFilter
            label="Filter allocations by return state"
            value={includeReturned}
            onChange={(value) => {
              setIncludeReturned(value);
              setPage(1);
            }}
            options={[
              { value: 'current', label: 'Current allocations' },
              { value: 'all', label: 'Include returned assets' },
            ]}
          />
        </FilterBar>

        {items.length === 0 ? (
          <EmptyState
            title={
              includeReturned === 'all'
                ? 'No asset allocations yet'
                : 'No assets currently allocated'
            }
            description="Assets allocated by IT appear here. Allocation and return are performed by an administrator."
          />
        ) : (
          <>
            <TableFrame>
              <thead>
                <tr>
                  <Th>Asset</Th>
                  <Th>Category</Th>
                  <Th>Lifecycle status</Th>
                  <Th>Condition</Th>
                  <Th>Allocated</Th>
                  <Th>Assigned by</Th>
                  <Th>Returned</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.assignment_id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        to={`/me/assets/${row.asset_id}`}
                        className="font-medium text-slate-900 hover:text-blue-800"
                      >
                        {row.asset_code}
                      </Link>
                      <p className="mt-0.5 max-w-[20rem] truncate text-xs text-slate-500">
                        {row.asset_name}
                      </p>
                    </Td>
                    <Td className="text-xs">{row.category_name}</Td>
                    <Td><AssetStatusBadge status={row.asset_status} /></Td>
                    <Td><ConditionBadge condition={row.asset_condition} /></Td>
                    <Td className="whitespace-nowrap text-xs">{formatDate(row.assigned_at)}</Td>
                    <Td className="text-xs">{row.assigned_by_name || '—'}</Td>
                    <Td className="whitespace-nowrap text-xs">
                      {row.returned_at ? (
                        <div>
                          <p>{formatDateTime(row.returned_at)}</p>
                          {row.return_condition && (
                            <p className="text-[11px] text-slate-400">
                              Condition: {row.return_condition}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">In use</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <Link
                          to={`/me/assets/${row.asset_id}`}
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
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <InlineAlert tone="info" title="Allocation changes">
        Contact IT to return an asset or report damage. Condition and lifecycle status can only be
        changed through an approved return or maintenance process.
      </InlineAlert>
    </div>
  );
}
