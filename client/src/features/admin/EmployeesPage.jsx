import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { employeesApi } from '../../api/employees.js';
import { departmentsApi } from '../../api/departments.js';
import { lookupsApi } from '../../api/dashboard.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge, { ActiveBadge } from '../../components/ui/Badge.jsx';
import { FilterBar, SearchField, SelectFilter } from '../../components/ui/Filters.jsx';
import { TableFrame, Td, Th, Pagination } from '../../components/ui/Table.jsx';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States.jsx';
import { formatDate } from '../../utils/format.js';
import EmployeeFormModal from './EmployeeFormModal.jsx';

export default function EmployeesPage() {
  useDocumentTitle('Employees');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [departmentId, setDepartmentId] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const query = useApiQuery(async () => {
    const [list, departments, lookups] = await Promise.all([
      employeesApi.list({
        page,
        limit: 20,
        search: debouncedSearch,
        department_id: departmentId || undefined,
        is_active: activeFilter === '' ? undefined : activeFilter === 'true',
      }),
      departmentsApi.list({ include_inactive: true }),
      lookupsApi.get(),
    ]);
    return { list, departments, lookups };
  }, `${page}|${debouncedSearch}|${departmentId}|${activeFilter}`);

  if (query.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Employees" description="Loading the employee directory…" />
        <Card>
          <TableSkeleton rows={7} columns={5} />
        </Card>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Employees" />
        <ErrorState message={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const { list, departments, lookups } = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Employee records, department placement and linked user accounts."
        actions={<Button onClick={() => setFormOpen(true)}>New employee</Button>}
      />

      <Card>
        <CardHeader
          title="Employee directory"
          description={`${list.meta.total} employee record${list.meta.total === 1 ? '' : 's'}`}
        />
        <FilterBar>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search name, email or code…"
            className="w-full sm:w-72"
          />
          <SelectFilter
            label="Filter by department"
            value={departmentId}
            onChange={(value) => {
              setDepartmentId(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All departments' },
              ...departments.map((department) => ({
                value: String(department.department_id),
                label: department.is_active ? department.name : `${department.name} (inactive)`,
              })),
            ]}
          />
          <SelectFilter
            label="Filter by employee status"
            value={activeFilter}
            onChange={(value) => {
              setActiveFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'true', label: 'Active only' },
              { value: 'false', label: 'Inactive only' },
            ]}
          />
        </FilterBar>

        {list.items.length === 0 ? (
          <EmptyState
            title="No employees found"
            description="Adjust the filters or create a new employee record."
            action={<Button onClick={() => setFormOpen(true)}>New employee</Button>}
          />
        ) : (
          <>
            <TableFrame>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Department</Th>
                  <Th>Contact</Th>
                  <Th>Account</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((employee) => (
                  <tr key={employee.employee_id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        to={`/admin/employees/${employee.employee_id}`}
                        className="font-medium text-slate-900 hover:text-blue-800"
                      >
                        {employee.full_name}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {employee.employee_code} · {employee.designation}
                      </p>
                    </Td>
                    <Td>{employee.department_name}</Td>
                    <Td>
                      <p className="text-xs text-slate-700">{employee.email}</p>
                      <p className="text-xs text-slate-400">{employee.phone || 'No phone'}</p>
                    </Td>
                    <Td>
                      {employee.account ? (
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            @{employee.account.username}
                          </p>
                          <Badge tone="indigo">{employee.account.role}</Badge>
                        </div>
                      ) : (
                        <Badge tone="slate">No account</Badge>
                      )}
                    </Td>
                    <Td>
                      <ActiveBadge
                        active={employee.is_active}
                        activeLabel="Active"
                        inactiveLabel="Inactive"
                      />
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(employee.date_joined)}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <Link
                          to={`/admin/employees/${employee.employee_id}`}
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

      <EmployeeFormModal
        open={formOpen}
        employee={null}
        departments={departments}
        roles={lookups.roles}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false);
          navigate(`/admin/employees/${saved.employee_id}`);
        }}
      />
    </div>
  );
}
