import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { employeesApi } from '../../api/employees.js';
import { usersApi } from '../../api/users.js';
import { departmentsApi } from '../../api/departments.js';
import { lookupsApi } from '../../api/dashboard.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useForm } from '../../hooks/useForm.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/toastContext.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardBody } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge, { ActiveBadge, AssetStatusBadge, ConditionBadge, PriorityBadge, RequestStatusBadge } from '../../components/ui/Badge.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Modal, { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Field, FormError, Input, Select } from '../../components/ui/Form.jsx';
import { TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/States.jsx';
import { ROLE_LABELS } from '../../utils/constants.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import { minLength, required } from '../../utils/validation.js';
import EmployeeFormModal from './EmployeeFormModal.jsx';

const ACCOUNT_INITIAL = { username: '', role_id: '', password: '' };
const RESET_INITIAL = { password: '', confirmPassword: '' };

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const accountForm = useForm(ACCOUNT_INITIAL);
  const resetForm = useForm(RESET_INITIAL);

  const query = useApiQuery(async () => {
    const [employee, assets, requests, departments, lookups] = await Promise.all([
      employeesApi.get(id),
      employeesApi.assets(id, { include_returned: true, limit: 100 }),
      employeesApi.requests(id, { limit: 20 }),
      departmentsApi.list({ include_inactive: true }),
      lookupsApi.get(),
    ]);
    return { employee, assets, requests, departments, lookups };
  }, `employee-${id}`);
  useDocumentTitle(query.data?.employee?.full_name ?? 'Employee details');

  if (query.loading) return <PageLoader label="Loading employee record…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />;

  const { employee, assets, requests, departments, lookups } = query.data;
  const account = employee.account;

  function openCreateAccount() {
    accountForm.reset({
      username: employee.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, ''),
      role_id: '',
      password: '',
    });
    setAccountOpen(true);
  }

  function openEditAccount() {
    accountForm.reset({
      username: account.username,
      role_id: String(account.role_id),
      password: '',
    });
    setAccountOpen(true);
  }

  function submitAccount(event) {
    event.preventDefault();
    const values = accountForm.values;
    const errors = {};
    const usernameError = required(values.username, 'Username');
    if (usernameError) errors.username = usernameError;
    else if (!/^[A-Za-z0-9._-]{3,50}$/.test(values.username.trim())) {
      errors.username = 'Use 3–50 letters, numbers, dots, underscores or hyphens.';
    }
    if (!values.role_id) errors.role_id = 'Select a role.';
    if (!account) {
      const passwordError = minLength(values.password, 8, 'Password');
      if (passwordError) errors.password = passwordError;
    }

    accountForm.handleSubmit(errors, async () => {
      if (account) {
        await usersApi.update(account.user_id, {
          username: values.username.trim(),
          role_id: Number(values.role_id),
        });
        toast.success('Account updated');
      } else {
        await usersApi.create({
          employee_id: employee.employee_id,
          username: values.username.trim(),
          role_id: Number(values.role_id),
          password: values.password,
        });
        toast.success('Account created', `${employee.full_name} can now sign in.`);
      }
      setAccountOpen(false);
      accountForm.reset(ACCOUNT_INITIAL);
      query.reload();
    });
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
      await usersApi.resetPassword(account.user_id, values.password);
      toast.success('Password reset');
      setResetOpen(false);
      resetForm.reset(RESET_INITIAL);
    });
  }

  async function toggleStatus() {
    setStatusLoading(true);
    setStatusError(null);
    try {
      await employeesApi.setStatus(employee.employee_id, !employee.is_active);
      toast.success(employee.is_active ? 'Employee deactivated' : 'Employee activated');
      setStatusOpen(false);
      query.reload();
    } catch (error) {
      setStatusError(
        error?.response?.data?.error?.message ?? 'The employee status could not be changed.',
      );
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.full_name}
        backTo="/admin/employees"
        backLabel="Employees"
        description={`${employee.designation} · ${employee.department_name}`}
        meta={
          <>
            <ActiveBadge active={employee.is_active} />
            {account ? (
              <Badge tone="indigo">{ROLE_LABELS[account.role] ?? account.role}</Badge>
            ) : (
              <Badge tone="slate">No sign-in account</Badge>
            )}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              Edit employee
            </Button>
            {account ? (
              <>
                <Button variant="secondary" onClick={openEditAccount}>
                  Edit account
                </Button>
                <Button variant="secondary" onClick={() => setResetOpen(true)}>
                  Reset password
                </Button>
              </>
            ) : (
              <Button onClick={openCreateAccount}>Create account</Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-4">
            <Avatar name={employee.full_name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{employee.employee_code}</p>
              <p className="mt-0.5 text-sm text-slate-500">{employee.email}</p>
              <p className="text-xs text-slate-400">{employee.phone || 'No phone number'}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Employment status
            </p>
            <ActiveBadge active={employee.is_active} />
            <p className="text-xs leading-5 text-slate-500">
              {employee.is_active
                ? 'The employee can receive allocations and raise requests.'
                : 'The employee and linked account are inactive.'}
            </p>
            <Button
              size="sm"
              variant={employee.is_active ? 'ghost' : 'secondary'}
              onClick={() => {
                setStatusError(null);
                setStatusOpen(true);
              }}
            >
              {employee.is_active ? 'Deactivate employee' : 'Activate employee'}
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'assets', label: 'Assets', count: assets.items.length },
            { value: 'requests', label: 'Service requests', count: requests.items.length },
          ]}
        />
        {tab === 'overview' && (
          <CardBody className="space-y-6">
            <DetailList
              items={[
                { label: 'Employee code', value: employee.employee_code },
                { label: 'Department', value: employee.department_name },
                { label: 'Designation', value: employee.designation },
                { label: 'Email', value: employee.email },
                { label: 'Phone', value: employee.phone || '—' },
                { label: 'Date joined', value: formatDate(employee.date_joined) },
                { label: 'Record created', value: formatDateTime(employee.created_at) },
                { label: 'Last updated', value: formatDateTime(employee.updated_at) },
              ]}
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Sign-in account</h3>
              {account ? (
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Username</p>
                    <p className="mt-0.5 font-medium text-slate-800">@{account.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Role</p>
                    <p className="mt-0.5 font-medium text-slate-800">
                      {ROLE_LABELS[account.role] ?? account.role}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Last sign-in</p>
                    <p className="mt-0.5 font-medium text-slate-800">
                      {formatDateTime(account.last_login_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This employee has no user account and cannot sign in. Create an account to grant
                  access, or leave it empty for an employee who only needs a directory record.
                </p>
              )}
            </div>
          </CardBody>
        )}

        {tab === 'assets' && (
          <div>
            {assets.items.length === 0 ? (
              <EmptyState
                title="No asset history"
                description="Assets allocated to this employee will appear here."
              />
            ) : (
              <TableFrame>
                <thead>
                  <tr>
                    <Th>Asset</Th>
                    <Th>Category</Th>
                    <Th>Status</Th>
                    <Th>Condition</Th>
                    <Th>Allocated</Th>
                    <Th>Returned</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.items.map((asset) => (
                    <tr key={asset.assignment_id} className="hover:bg-slate-50/70">
                      <Td>
                        <Link
                          to={`/admin/assets/${asset.asset_id}`}
                          className="font-medium text-slate-900 hover:text-blue-800"
                        >
                          {asset.asset_code}
                        </Link>
                        <p className="text-xs text-slate-500">{asset.asset_name}</p>
                      </Td>
                      <Td>{asset.category_name}</Td>
                      <Td><AssetStatusBadge status={asset.asset_status} /></Td>
                      <Td><ConditionBadge condition={asset.asset_condition} /></Td>
                      <Td className="whitespace-nowrap text-xs">{formatDate(asset.assigned_at)}</Td>
                      <Td className="whitespace-nowrap text-xs">
                        {asset.returned_at ? formatDate(asset.returned_at) : 'Current'}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableFrame>
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div>
            {requests.items.length === 0 ? (
              <EmptyState
                title="No service requests"
                description="Requests raised by this employee will appear here."
              />
            ) : (
              <TableFrame>
                <thead>
                  <tr>
                    <Th>Request</Th>
                    <Th>Category</Th>
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
                          to={`/admin/requests/${request.request_id}`}
                          className="font-medium text-slate-900 hover:text-blue-800"
                        >
                          {request.request_code}
                        </Link>
                        <p className="max-w-[22rem] truncate text-xs text-slate-500">
                          {request.title}
                        </p>
                      </Td>
                      <Td>{request.service_category_name}</Td>
                      <Td><PriorityBadge priority={request.priority} /></Td>
                      <Td><RequestStatusBadge status={request.status} /></Td>
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(request.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableFrame>
            )}
          </div>
        )}
      </Card>

      <EmployeeFormModal
        open={editOpen}
        employee={employee}
        departments={departments}
        roles={lookups.roles}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          query.reload();
        }}
      />

      <Modal
        open={accountOpen}
        onClose={accountForm.submitting ? undefined : () => setAccountOpen(false)}
        title={account ? 'Edit sign-in account' : 'Create sign-in account'}
        description={
          account
            ? 'Change the username or role. Role changes take effect on the next API request.'
            : `Grant ${employee.full_name} access to EITAMS.`
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setAccountOpen(false)}
              disabled={accountForm.submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="account-form" loading={accountForm.submitting}>
              {account ? 'Save account' : 'Create account'}
            </Button>
          </div>
        }
      >
        <form id="account-form" onSubmit={submitAccount} className="space-y-4" noValidate>
          {accountForm.formError && <FormError message={accountForm.formError} />}
          <Field
            label="Username"
            htmlFor="account-username"
            error={accountForm.fieldErrors.username}
            required
          >
            <Input
              id="account-username"
              autoComplete="off"
              value={accountForm.values.username}
              onChange={(event) => accountForm.setValue('username', event.target.value)}
              error={accountForm.fieldErrors.username}
            />
          </Field>
          <Field label="Role" htmlFor="account-role" error={accountForm.fieldErrors.role_id} required>
            <Select
              id="account-role"
              value={accountForm.values.role_id}
              onChange={(event) => accountForm.setValue('role_id', event.target.value)}
              error={accountForm.fieldErrors.role_id}
            >
              <option value="">Select a role</option>
              {lookups.roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </Select>
          </Field>
          {!account && (
            <Field
              label="Initial password"
              htmlFor="account-password"
              error={accountForm.fieldErrors.password}
              hint="At least 8 characters. Share it securely; the user can change it after signing in."
              required
            >
              <Input
                id="account-password"
                type="password"
                autoComplete="new-password"
                value={accountForm.values.password}
                onChange={(event) => accountForm.setValue('password', event.target.value)}
                error={accountForm.fieldErrors.password}
              />
            </Field>
          )}
        </form>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={resetForm.submitting ? undefined : () => setResetOpen(false)}
        title="Reset password"
        description={`Set a new password for @${account?.username ?? ''}. Existing tokens are not revoked.`}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setResetOpen(false)} disabled={resetForm.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="reset-password-form" loading={resetForm.submitting}>
              Reset password
            </Button>
          </div>
        }
      >
        <form id="reset-password-form" onSubmit={submitReset} className="space-y-4" noValidate>
          {resetForm.formError && <FormError message={resetForm.formError} />}
          <Field
            label="New password"
            htmlFor="reset-password"
            error={resetForm.fieldErrors.password}
            required
          >
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={resetForm.values.password}
              onChange={(event) => resetForm.setValue('password', event.target.value)}
              error={resetForm.fieldErrors.password}
            />
          </Field>
          <Field
            label="Confirm password"
            htmlFor="reset-password-confirm"
            error={resetForm.fieldErrors.confirmPassword}
            required
          >
            <Input
              id="reset-password-confirm"
              type="password"
              autoComplete="new-password"
              value={resetForm.values.confirmPassword}
              onChange={(event) => resetForm.setValue('confirmPassword', event.target.value)}
              error={resetForm.fieldErrors.confirmPassword}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onConfirm={toggleStatus}
        title={employee.is_active ? 'Deactivate employee?' : 'Activate employee?'}
        confirmLabel={employee.is_active ? 'Deactivate' : 'Activate'}
        variant={employee.is_active ? 'danger' : 'primary'}
        loading={statusLoading}
        error={statusError}
      >
        {employee.is_active ? (
          <>
            <p>
              {employee.full_name} and their account will be deactivated. They will not be able to
              sign in or receive new allocations.
            </p>
            <p className="text-xs text-slate-500">
              All assets must be returned first. Historical data is retained.
            </p>
          </>
        ) : (
          <p>{employee.full_name} and any linked account will be reactivated.</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
