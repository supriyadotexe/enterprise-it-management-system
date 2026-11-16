import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  AssetStatusBadge,
  ConditionBadge,
} from '../../components/ui/Badge.jsx';
import { FilterBar, SearchField, SelectFilter } from '../../components/ui/Filters.jsx';
import { Pagination, TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States.jsx';
import { ASSET_STATUSES } from '../../utils/constants.js';
import { formatDate } from '../../utils/format.js';
import { pathsForRole } from '../../utils/constants.js';
import AssetFormModal from './AssetFormModal.jsx';

export default function AssetsPage() {
  useDocumentTitle('Assets');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdmin = user.role === 'admin';
  const paths = pathsForRole(user.role);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') ?? '');
  const [employeeId, setEmployeeId] = useState(searchParams.get('assigned_employee_id') ?? '');
  const [formOpen, setFormOpen] = useState(false);

  const query = useApiQuery(async () => {
    const [list, lookups] = await Promise.all([
      assetsApi.list({
        page,
        limit: 20,
        search: debouncedSearch,
        status: status || undefined,
        category_id: categoryId || undefined,
        assigned_employee_id: employeeId || undefined,
      }),
      lookupsApi.get(),
    ]);
    return { list, lookups };
  }, `${page}|${debouncedSearch}|${status}|${categoryId}|${employeeId}`);

  if (query.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assets" description="Loading the asset register…" />
        <Card><TableSkeleton rows={8} columns={6} /></Card>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assets" />
        <ErrorState message={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const { list, lookups } = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description={
          isAdmin
            ? 'The asset register, current lifecycle status and allocation state.'
            : 'Browse the IT estate to review assets and their maintenance history.'
        }
        actions={
          isAdmin ? <Button onClick={() => setFormOpen(true)}>Register asset</Button> : undefined
        }
      />

      <Card>
        <CardHeader
          title="Asset register"
          description={`${list.meta.total} asset${list.meta.total === 1 ? '' : 's'} match the current filters`}
        />
        <FilterBar>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search code, name or serial…"
            className="w-full sm:w-72"
          />
          <SelectFilter
            label="Filter by asset status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              ...ASSET_STATUSES.map((item) => ({ value: item.value, label: item.label })),
            ]}
          />
          <SelectFilter
            label="Filter by asset category"
            value={categoryId}
            onChange={(value) => {
              setCategoryId(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All categories' },
              ...lookups.asset_categories.map((category) => ({
                value: String(category.category_id),
                label: category.category_name,
              })),
            ]}
          />
          <SelectFilter
            label="Filter by assigned employee"
            value={employeeId}
            onChange={(value) => {
              setEmployeeId(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Any allocation' },
              ...lookups.employees.map((employee) => ({
                value: String(employee.employee_id),
                label: employee.full_name,
              })),
            ]}
          />
        </FilterBar>

        {list.items.length === 0 ? (
          <EmptyState
            title="No assets found"
            description={
              isAdmin
                ? 'Adjust the filters or register the first asset in this view.'
                : 'No assets match the current filters.'
            }
            action={isAdmin ? <Button onClick={() => setFormOpen(true)}>Register asset</Button> : undefined}
          />
        ) : (
          <>
            <TableFrame>
              <thead>
                <tr>
                  <Th>Asset</Th>
                  <Th>Category</Th>
                  <Th>Status</Th>
                  <Th>Condition</Th>
                  <Th>Allocation</Th>
                  <Th>Warranty</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((asset) => (
                  <tr key={asset.asset_id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        to={`${paths.assets}/${asset.asset_id}`}
                        className="font-medium text-slate-900 hover:text-blue-800"
                      >
                        {asset.asset_code}
                      </Link>
                      <p className="mt-0.5 max-w-[20rem] truncate text-xs text-slate-500">
                        {asset.name}
                        {asset.brand ? ` · ${asset.brand}` : ''}
                      </p>
                    </Td>
                    <Td>{asset.category_name}</Td>
                    <Td><AssetStatusBadge status={asset.status} /></Td>
                    <Td><ConditionBadge condition={asset.asset_condition} /></Td>
                    <Td>
                      {asset.assigned_employee_name ? (
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {asset.assigned_employee_name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            since {formatDate(asset.assigned_at)}
                          </p>
                        </div>
                      ) : asset.open_maintenance_id ? (
                        <div>
                          <p className="text-xs font-medium text-amber-700">In maintenance</p>
                          <p className="text-[11px] text-slate-400">
                            {asset.maintenance_technician_name || 'Technician assigned'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not allocated</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-xs">
                      {asset.warranty_end ? (
                        <span
                          className={
                            new Date(`${asset.warranty_end}T00:00:00`) < new Date()
                              ? 'text-rose-600'
                              : 'text-slate-600'
                          }
                        >
                          {formatDate(asset.warranty_end)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <Link
                          to={`${paths.assets}/${asset.asset_id}`}
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

      {isAdmin && (
        <AssetFormModal
          open={formOpen}
          asset={null}
          categories={lookups.asset_categories}
          employees={lookups.employees}
          onClose={() => setFormOpen(false)}
          onSaved={(saved, options) => {
            setFormOpen(false);
            navigate(`${paths.assets}/${saved.asset_id}`, {
              state: options?.allocateEmployeeId
                ? { openAllocate: true, employeeId: String(options.allocateEmployeeId) }
                : undefined,
            });
          }}
        />
      )}
    </div>
  );
}
