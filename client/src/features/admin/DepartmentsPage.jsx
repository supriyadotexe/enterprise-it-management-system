import { useMemo, useState } from 'react';
import { departmentsApi } from '../../api/departments.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/toastContext.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal, { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Field, FormError, Input, Textarea } from '../../components/ui/Form.jsx';
import { FilterBar, SearchField } from '../../components/ui/Filters.jsx';
import { TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { ActiveBadge } from '../../components/ui/Badge.jsx';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States.jsx';
import { formatDate } from '../../utils/format.js';
import { required } from '../../utils/validation.js';

const INITIAL = { name: '', description: '' };

export default function DepartmentsPage() {
  useDocumentTitle('Departments');
  const toast = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const form = useForm(INITIAL);

  const query = useApiQuery(
    () =>
      departmentsApi.list({
        search: debouncedSearch,
        include_inactive: includeInactive || undefined,
      }),
    `${debouncedSearch}|${includeInactive}`,
  );
  const departments = query.data ?? [];
  const activeCount = useMemo(() => departments.filter((row) => row.is_active).length, [departments]);

  function openCreate() {
    setEditing(null);
    form.reset(INITIAL);
    setFormOpen(true);
  }

  function openEdit(department) {
    setEditing(department);
    form.reset({ name: department.name, description: department.description ?? '' });
    setFormOpen(true);
  }

  function closeForm() {
    if (form.submitting) return;
    setFormOpen(false);
    setEditing(null);
    form.reset(INITIAL);
  }

  function onSubmit(event) {
    event.preventDefault();
    const errors = {};
    if (required(form.values.name, 'Department name')) {
      errors.name = required(form.values.name, 'Department name');
    }
    form.handleSubmit(errors, async () => {
      const payload = {
        name: form.values.name.trim(),
        description: form.values.description.trim() || null,
      };
      if (editing) {
        await departmentsApi.update(editing.department_id, payload);
        toast.success('Department updated');
      } else {
        await departmentsApi.create(payload);
        toast.success('Department created');
      }
      setFormOpen(false);
      setEditing(null);
      form.reset(INITIAL);
      query.reload();
    });
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      await departmentsApi.setStatus(statusTarget.department_id, !statusTarget.is_active);
      toast.success(statusTarget.is_active ? 'Department deactivated' : 'Department activated');
      setStatusTarget(null);
      query.reload();
    } catch (error) {
      setStatusError(
        error?.response?.data?.error?.message ?? 'The department status could not be changed.',
      );
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="The organisational units used by employees, reporting and department-level access."
        actions={<Button onClick={openCreate}>New department</Button>}
      />

      <Card>
        <CardHeader
          title="Department directory"
          description={
            query.loading
              ? 'Loading departments…'
              : `${departments.length} department${departments.length === 1 ? '' : 's'} · ${activeCount} active`
          }
        />
        <FilterBar>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search departments…"
            className="w-full sm:w-72"
          />
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
            />
            Include inactive
          </label>
        </FilterBar>

        {query.loading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.reload} />
        ) : departments.length === 0 ? (
          <EmptyState
            title="No departments found"
            description={
              debouncedSearch
                ? 'No department matches the current search.'
                : 'Create the first department to start organising employees.'
            }
            action={<Button onClick={openCreate}>New department</Button>}
          />
        ) : (
          <TableFrame>
            <thead>
              <tr>
                <Th>Department</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((department) => (
                <tr key={department.department_id} className="hover:bg-slate-50/70">
                  <Td className="font-medium text-slate-900">{department.name}</Td>
                  <Td className="max-w-md">
                    <span className="line-clamp-2">{department.description || '—'}</span>
                  </Td>
                  <Td><ActiveBadge active={department.is_active} /></Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">
                    {formatDate(department.created_at)}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(department)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={department.is_active ? 'ghost' : 'secondary'}
                        onClick={() => {
                          setStatusError(null);
                          setStatusTarget(department);
                        }}
                      >
                        {department.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit department' : 'New department'}
        description={
          editing
            ? 'Update the department details shown across employee records.'
            : 'Department names must be unique.'
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeForm} disabled={form.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="department-form" loading={form.submitting}>
              {editing ? 'Save changes' : 'Create department'}
            </Button>
          </div>
        }
      >
        <form id="department-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          {form.formError && <FormError message={form.formError} />}
          <Field
            label="Department name"
            htmlFor="department-name"
            error={form.fieldErrors.name}
            required
          >
            <Input
              id="department-name"
              value={form.values.name}
              maxLength={100}
              onChange={(event) => form.setValue('name', event.target.value)}
              error={form.fieldErrors.name}
              placeholder="e.g. Technology Operations"
            />
          </Field>
          <Field
            label="Description"
            htmlFor="department-description"
            error={form.fieldErrors.description}
            hint="Optional. Up to 255 characters."
          >
            <Textarea
              id="department-description"
              rows={3}
              maxLength={255}
              value={form.values.description}
              onChange={(event) => form.setValue('description', event.target.value)}
              error={form.fieldErrors.description}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
        title={statusTarget?.is_active ? 'Deactivate department?' : 'Activate department?'}
        confirmLabel={statusTarget?.is_active ? 'Deactivate' : 'Activate'}
        variant={statusTarget?.is_active ? 'danger' : 'primary'}
        loading={statusSaving}
        error={statusError}
      >
        {statusTarget?.is_active ? (
          <>
            <p>
              <span className="font-medium text-slate-900">{statusTarget.name}</span> will stop
            appearing in new employee forms. Existing employee records are unchanged.
            </p>
            <p className="text-xs text-slate-500">
              The server also prevents selecting an inactive department for new employees.
            </p>
          </>
        ) : (
          <p>
            <span className="font-medium text-slate-900">{statusTarget?.name}</span> will become
            selectable again for employee records.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
