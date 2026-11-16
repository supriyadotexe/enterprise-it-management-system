import { useAuth } from '../../context/AuthContext.jsx';
import { employeesApi } from '../../api/employees.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Badge, { ActiveBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import { InlineLoader, InlineAlert } from '../../components/ui/States.jsx';
import { ROLE_LABELS } from '../../utils/constants.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  useDocumentTitle('Profile');
  const { user } = useAuth();
  const query = useApiQuery(
    () => employeesApi.get(user.employee_id),
    String(user.employee_id),
  );
  const employee = query.data ?? null;

  const detailItems = [
    { label: 'Employee code', value: employee?.employee_code ?? user.employee_code },
    { label: 'Department', value: employee?.department_name ?? user.department_name },
    { label: 'Designation', value: employee?.designation ?? user.designation },
    { label: 'Email', value: employee?.email ?? user.email },
    { label: 'Phone', value: employee?.phone ?? user.phone ?? '—' },
    { label: 'Date joined', value: formatDate(employee?.date_joined) },
    { label: 'Username', value: employee?.account?.username ?? user.username },
    {
      label: 'Last sign-in',
      value: formatDateTime(employee?.account?.last_login_at ?? user.last_login_at),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="My profile"
        description="Your employee record and the account details used to access EITAMS."
        actions={
          <Link to="/change-password">
            <Button variant="secondary">Change password</Button>
          </Link>
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={user.full_name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-950">{user.full_name}</h2>
              <Badge tone="indigo">{ROLE_LABELS[user.role] ?? user.role}</Badge>
              <ActiveBadge active={user.is_active} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {user.designation} · {user.department_name}
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Employee details"
          description="These values are maintained by an administrator."
        />
        <CardBody>
          {query.loading && <InlineLoader />}
          {query.error && (
            <div className="mb-4">
              <InlineAlert tone="warning" title="Live employee record unavailable">
                {query.error} Showing the identity returned by your session.
              </InlineAlert>
            </div>
          )}
          <DetailList items={detailItems} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Access and security" />
        <CardBody className="space-y-3 text-sm text-slate-600">
          <p>
            Account status:{' '}
            <Badge tone={user.is_active ? 'emerald' : 'slate'}>
              {user.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </p>
          <p className="text-xs leading-6 text-slate-500">
            Your role controls which modules appear in the navigation, but the API enforces every
            permission independently. If an administrator changes your role or deactivates the
            account, the next request reflects that change immediately.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
