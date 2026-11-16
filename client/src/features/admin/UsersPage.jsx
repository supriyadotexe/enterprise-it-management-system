import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../../api/employees.js';
import { usersApi } from '../../api/users.js';
import { lookupsApi } from '../../api/dashboard.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useForm } from '../../hooks/useForm.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/toastContext.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge, { ActiveBadge } from '../../components/ui/Badge.jsx';
import { FilterBar, SearchField, SelectFilter } from '../../components/ui/Filters.jsx';
import { TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Checkbox, Field, FormError, Input, Select } from '../../components/ui/Form.jsx';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States.jsx';
import { ROLE_LABELS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';
import { minLength, required } from '../../utils/validation.js';

const CREATE_INITIAL = { employee_id: '', username: '', role_id: '', password: '' };
const EDIT_INITIAL = { username: '', role_id: '', is_active: true };
const RESET_INITIAL = { password: '', confirmPassword: '' };

export default function UsersPage() {
  useDocumentTitle('Users & technicians');
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const createForm = useForm(CREATE_INITIAL);
  const editForm = useForm(EDIT_INITIAL);
  const resetForm = useForm(RESET_INITIAL);

  const query = useApiQuery(async () => {
    const [employees, lookups] = await Promise.all([
      employeesApi.list({ limit: 100 }),
      lookupsApi.get(),
    ]);
    return { employees, lookups };
  }, 'users-page');

  const accounts = useMemo(() => {
    const rows = (query.data?.employees.items ?? []).filter((employee) => employee.account);
    const term = search.trim().toLowerCase();
    return rows
      .filter((employee) => {
        if (term) {
          const haystack =
            `${employee.full_name} ${employee.employee_code} ${employee.account.username} ${employee.email}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        if (roleFilter && employee.account.role !== roleFilter) return false;
        if (statusFilter === 'active' && !employee.account.is_active) return false;
        if (statusFilter === 'inactive' && employee.account.is_active) return false;
        return true;
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [query.data, search, roleFilter, statusFilter]);

  const employeesWithoutAccounts = useMemo(
    () => (query.data?.employees.items ?? []).filter((employee) => !employee.account && employee.is_active),
    [query.data],
  );

  if (query.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users & technicians" description="Loading accounts…" />
        <Card><TableSkeleton rows={7} columns={5} /></Card>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users & technicians" />
        <ErrorState message={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const { lookups } = query.data;
  const technicianCount = accounts.filter((row) => row.account.role === 'technician').length;

  function openCreate() {
    createForm.reset(CREATE_INITIAL);
    setCreateOpen(true);
  }

  function submitCreate(event) {
    event.preventDefault();
    const values = createForm.values;
    const errors = {};
    if (!values.employee_id) errors.employee_id = 'Select an employee.';
    const usernameError = required(values.username, 'Username');
    if (usernameError) errors.username = usernameError;
    else if (!/^[A-Za-z0-9._-]{3,50}$/.test(values.username.trim())) {
      errors.username = 'Use 3–50 letters, numbers, dots, underscores or hyphens.';
    }
    if (!values.role_id) errors.role_id = 'Select a role.';
    const passwordError = minLength(values.password, 8, 'Password');
    if (passwordError) errors.password = passwordError;

    createForm.handleSubmit(errors, async () => {
      await usersApi.create({
        employee_id: Number(values.employee_id),
        username: values.username.trim(),
        role_id: Number(values.role_id),
        password: values.password,
      });
      toast.success('User account created');
      setCreateOpen(false);
      createForm.reset(CREATE_INITIAL);
      query.reload();
    });
  }

  function openEdit(employee) {
    setEditing(employee);
    editForm.reset({
      username: employee.account.username,
      role_id: String(employee.account.role_id),
      is_active: employee.account.is_active,
    });
  }

  function submitEdit(event) {
    event.preventDefault();
    const values = editForm.values;
    const errors = {};
    const usernameError = required(values.username, 'Username');
    if (usernameError) errors.username = usernameError;
    else if (!/^[A-Za-z0-9._-]{3,50}$/.test(values.username.trim())) {
      errors.username = 'Use 3–50 letters, numbers, dots, underscores or hyphens.';
    }
    if (!values.role_id) errors.role_id = 'Select a role.';
    if (editing.account.user_id === currentUser.user_id && !values.is_active) {
      errors.is_active = 'You cannot disable your own account.';
    }

    editForm.handleSubmit(errors, async () => {
      await usersApi.update(editing.account.user_id, {
        username: values.username.trim(),
        role_id: Number(values.role_id),
        is_active: values.is_active,
      });
      toast.success('User account updated');
      setEditing(null);
      editForm.reset(EDIT_INITIAL);
      query.reload();
    });
  }

  function openReset(employee) {
    setResetting(employee);
    resetForm.reset(RESET_INITIAL);
  }

  function submitReset(event) {
    event.preventDefault();
    const values = resetForm.values;
    const errors = {};
    const passwordError = minLength(values.password, 8, 'Password');
    if (passwordError) errors.password = passwordError;
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'The passwords do not match.';
    }
    resetForm.handleSubmit(errors, async () => {
      await usersApi.resetPassword(resetting.account.user_id, values.password);
      toast.success('Password reset', `Share the new password securely with ${resetting.full_name}.`);
      setResetting(null);
      resetForm.reset(RESET_INITIAL);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & technicians"
        description="Sign-in accounts are derived from employee records. Use this page to create accounts, assign roles and reset passwords."
        actions={<Button onClick={openCreate}>Create user account</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            User accounts
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{accounts.length}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Technicians
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{technicianCount}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Employees without accounts
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {employeesWithoutAccounts.length}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Accounts"
          description="Role changes apply on the next request. Technician accounts are eligible for request and maintenance assignment."
        />
        <FilterBar>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search name, code or username…"
            className="w-full sm:w-80"
          />
          <SelectFilter
            label="Filter by role"
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: '', label: 'All roles' },
              { value: 'admin', label: 'Administrators' },
              { value: 'employee', label: 'Employees' },
              { value: 'technician', label: 'Technicians' },
            ]}
          />
          <SelectFilter
            label="Filter by account status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active accounts' },
              { value: 'inactive', label: 'Disabled accounts' },
            ]}
          />
        </FilterBar>

        {accounts.length === 0 ? (
          <EmptyState
            title="No accounts match"
            description="Adjust the filters, or create a sign-in account for an employee."
            action={<Button onClick={openCreate}>Create user account</Button>}
          />
        ) : (
          <TableFrame>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Username</Th>
                <Th>Role</Th>
                <Th>Account status</Th>
                <Th>Last sign-in</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((employee) => (
                <tr key={employee.account.user_id} className="hover:bg-slate-50/70">
                  <Td>
                    <Link
                      to={`/admin/employees/${employee.employee_id}`}
                      className="font-medium text-slate-900 hover:text-blue-800"
                    >
                      {employee.full_name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {employee.employee_code} · {employee.department_name}
                    </p>
                  </Td>
                  <Td className="text-xs font-medium text-slate-700">@{employee.account.username}</Td>
                  <Td>
                    <Badge tone={employee.account.role === 'technician' ? 'violet' : 'indigo'}>
                      {ROLE_LABELS[employee.account.role] ?? employee.account.role}
                    </Badge>
                  </Td>
                  <Td>
                    <ActiveBadge
                      active={employee.account.is_active}
                      activeLabel="Active"
                      inactiveLabel="Disabled"
                    />
                  </Td>
                  <Td className="whitespace-nowrap text-xs">
                    {formatDateTime(employee.account.last_login_at)}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(employee)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openReset(employee)}>
                        Reset password
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
        )}
      </Card>

      {employeesWithoutAccounts.length > 0 && (
        <Card>
          <CardHeader
            title="Employees without sign-in accounts"
            description="These directory records cannot access the application until an account is created."
          />
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {employeesWithoutAccounts.slice(0, 24).map((employee) => (
              <span
                key={employee.employee_id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
              >
                {employee.full_name}
                <Link
                  to={`/admin/employees/${employee.employee_id}`}
                  className="font-medium text-blue-700 hover:text-blue-800"
                >
                  Create
                </Link>
              </span>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={createForm.submitting ? undefined : () => setCreateOpen(false)}
        title="Create user account"
        description="Grant an existing active employee access to EITAMS."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createForm.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-user-form" loading={createForm.submitting}>
              Create account
            </Button>
          </div>
        }
      >
        <form id="create-user-form" onSubmit={submitCreate} className="space-y-4" noValidate>
          {createForm.formError && <FormError message={createForm.formError} />}
          <Field
            label="Employee"
            htmlFor="create-user-employee"
            error={createForm.fieldErrors.employee_id}
            hint={
              employeesWithoutAccounts.length === 0
                ? 'Every active employee already has an account.'
                : 'Only active employees without an account are listed.'
            }
            required
          >
            <Select
              id="create-user-employee"
              value={createForm.values.employee_id}
              onChange={(event) => {
                const employeeId = event.target.value;
                const employee = employeesWithoutAccounts.find(
                  (row) => String(row.employee_id) === employeeId,
                );
                createForm.setValues({
                  ...createForm.values,
                  employee_id: employeeId,
                  username:
                    createForm.values.username ||
                    (employee
                      ? employee.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '')
                      : ''),
                });
              }}
              error={createForm.fieldErrors.employee_id}
            >
              <option value="">Select an employee</option>
              {employeesWithoutAccounts.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>
                  {employee.full_name} · {employee.employee_code}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Username"
            htmlFor="create-user-username"
            error={createForm.fieldErrors.username}
            required
          >
            <Input
              id="create-user-username"
              autoComplete="off"
              value={createForm.values.username}
              onChange={(event) => createForm.setValue('username', event.target.value)}
              error={createForm.fieldErrors.username}
            />
          </Field>
          <Field label="Role" htmlFor="create-user-role" error={createForm.fieldErrors.role_id} required>
            <Select
              id="create-user-role"
              value={createForm.values.role_id}
              onChange={(event) => createForm.setValue('role_id', event.target.value)}
              error={createForm.fieldErrors.role_id}
            >
              <option value="">Select a role</option>
              {lookups.roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Initial password"
            htmlFor="create-user-password"
            error={createForm.fieldErrors.password}
            hint="At least 8 characters."
            required
          >
            <Input
              id="create-user-password"
              type="password"
              autoComplete="new-password"
              value={createForm.values.password}
              onChange={(event) => createForm.setValue('password', event.target.value)}
              error={createForm.fieldErrors.password}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={editForm.submitting ? undefined : () => setEditing(null)}
        title="Edit user account"
        description={editing ? `Update @${editing.account.username} for ${editing.full_name}.` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={editForm.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="edit-user-form" loading={editForm.submitting}>
              Save account
            </Button>
          </div>
        }
      >
        <form id="edit-user-form" onSubmit={submitEdit} className="space-y-4" noValidate>
          {editForm.formError && <FormError message={editForm.formError} />}
          <Field
            label="Username"
            htmlFor="edit-user-username"
            error={editForm.fieldErrors.username}
            required
          >
            <Input
              id="edit-user-username"
              value={editForm.values.username}
              onChange={(event) => editForm.setValue('username', event.target.value)}
              error={editForm.fieldErrors.username}
            />
          </Field>
          <Field label="Role" htmlFor="edit-user-role" error={editForm.fieldErrors.role_id} required>
            <Select
              id="edit-user-role"
              value={editForm.values.role_id}
              onChange={(event) => editForm.setValue('role_id', event.target.value)}
              error={editForm.fieldErrors.role_id}
              disabled={editing?.account.user_id === currentUser.user_id}
            >
              <option value="">Select a role</option>
              {lookups.roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <Checkbox
              label="Account is active"
              description="Disabled accounts cannot sign in. Employee status is managed separately."
              checked={editForm.values.is_active}
              onChange={(event) => editForm.setValue('is_active', event.target.checked)}
              disabled={editing?.account.user_id === currentUser.user_id}
            />
            {editForm.fieldErrors.is_active && (
              <p className="mt-1.5 text-xs text-rose-600">{editForm.fieldErrors.is_active}</p>
            )}
          </div>
          {editing?.account.user_id === currentUser.user_id && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              You cannot change your own role or disable your own account here.
            </p>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(resetting)}
        onClose={resetForm.submitting ? undefined : () => setResetting(null)}
        title="Reset password"
        description={resetting ? `Set a new password for @${resetting.account.username}.` : undefined}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setResetting(null)} disabled={resetForm.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="admin-reset-form" loading={resetForm.submitting}>
              Reset password
            </Button>
          </div>
        }
      >
        <form id="admin-reset-form" onSubmit={submitReset} className="space-y-4" noValidate>
          {resetForm.formError && <FormError message={resetForm.formError} />}
          <Field
            label="New password"
            htmlFor="admin-reset-password"
            error={resetForm.fieldErrors.password}
            required
          >
            <Input
              id="admin-reset-password"
              type="password"
              autoComplete="new-password"
              value={resetForm.values.password}
              onChange={(event) => resetForm.setValue('password', event.target.value)}
              error={resetForm.fieldErrors.password}
            />
          </Field>
          <Field
            label="Confirm password"
            htmlFor="admin-reset-confirm"
            error={resetForm.fieldErrors.confirmPassword}
            required
          >
            <Input
              id="admin-reset-confirm"
              type="password"
              autoComplete="new-password"
              value={resetForm.values.confirmPassword}
              onChange={(event) => resetForm.setValue('confirmPassword', event.target.value)}
              error={resetForm.fieldErrors.confirmPassword}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
