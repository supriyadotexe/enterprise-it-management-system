import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { requestsApi } from '../../api/requests.js';
import { assetsApi } from '../../api/assets.js';
import { employeesApi } from '../../api/employees.js';
import { maintenanceApi } from '../../api/maintenance.js';
import { lookupsApi } from '../../api/dashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/toastContext.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  MaintenanceStatusBadge,
  MaintenanceTypeBadge,
  OutcomeBadge,
  PriorityBadge,
  RequestStatusBadge,
} from '../../components/ui/Badge.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Field, FormError, FormGrid, Input, Select, Textarea } from '../../components/ui/Form.jsx';
import { TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { EmptyState, ErrorState, InlineAlert, PageLoader } from '../../components/ui/States.jsx';
import {
  pathsForRole,
  REQUEST_PRIORITIES,
} from '../../utils/constants.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import { required } from '../../utils/validation.js';
import MaintenanceFormModal from '../maintenance/MaintenanceFormModal.jsx';

const STATUS_GUIDANCE = {
  pending: ['info', 'Awaiting assignment', 'An administrator must assign an active technician.'],
  assigned: [
    'info',
    'Assigned to a technician',
    'The technician must start work before resolution notes can be recorded.',
  ],
  in_progress: [
    'neutral',
    'Work in progress',
    'The assigned technician can resolve the request. Administrators may cancel it if necessary.',
  ],
  resolved: [
    'success',
    'Awaiting confirmation',
    'The requester or an administrator can close the request after reviewing the resolution notes.',
  ],
  closed: ['success', 'Request closed', 'This request is complete and cannot be reopened.'],
  cancelled: ['warning', 'Request cancelled', 'No further work is required for this request.'],
};

const ACTION_COPY = {
  assign: {
    title: 'Assign technician',
    description: 'Choose the active technician accountable for resolving this request.',
    submitLabel: 'Assign request',
    successTitle: 'Technician assigned',
    variant: 'primary',
  },
  start: {
    title: 'Start work',
    description: 'Move the request to in progress. The requester will see that work has begun.',
    submitLabel: 'Start work',
    successTitle: 'Work started',
    variant: 'primary',
  },
  resolve: {
    title: 'Resolve request',
    description: 'Record what was done. Resolution notes are visible to the requester.',
    submitLabel: 'Resolve request',
    successTitle: 'Request resolved',
    variant: 'primary',
  },
  close: {
    title: 'Close this request?',
    description: 'Closing confirms the service outcome. Closed requests cannot be reopened.',
    submitLabel: 'Close request',
    successTitle: 'Request closed',
    variant: 'primary',
  },
  cancel: {
    title: 'Cancel this request?',
    description: 'Cancelling stops the request permanently. Record why it is being cancelled.',
    submitLabel: 'Cancel request',
    successTitle: 'Request cancelled',
    variant: 'danger',
  },
};

function statusForAction(action) {
  if (action === 'start') return 'in_progress';
  if (action === 'resolve') return 'resolved';
  if (action === 'close') return 'closed';
  if (action === 'cancel') return 'cancelled';
  return null;
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const role = user.role;
  const paths = pathsForRole(role);
  const isAdmin = role === 'admin';
  const canManageMaintenance = role === 'admin' || role === 'technician';

  const [tab, setTab] = useState('overview');
  const [action, setAction] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const actionForm = useForm({ technician_id: '', remarks: '', resolution_notes: '' });
  const editForm = useForm({
    title: '',
    description: '',
    service_category_id: '',
    priority: 'medium',
    asset_id: '',
  });

  const query = useApiQuery(async () => {
    const [request, history] = await Promise.all([
      requestsApi.get(id),
      requestsApi.history(id),
    ]);
    const [asset, lookups, employeeAssets, maintenance] = await Promise.all([
      request.asset_id ? assetsApi.get(request.asset_id) : Promise.resolve(null),
      isAdmin || role === 'employee' ? lookupsApi.get() : Promise.resolve(null),
      role === 'employee'
        ? employeesApi.assets(user.employee_id, { limit: 100 })
        : Promise.resolve(null),
      canManageMaintenance
        ? maintenanceApi.list({ request_id: id, limit: 50 })
        : Promise.resolve({ items: [], meta: { total: 0 } }),
    ]);
    return { request, history, asset, lookups, employeeAssets, maintenance };
  }, `request-${id}-${role}`);

  useDocumentTitle(
    query.data?.request ? `${query.data.request.request_code} · Service request` : 'Service request',
  );

  if (query.loading) return <PageLoader label="Loading service request…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />;

  const { request, history, asset, lookups, employeeAssets, maintenance } = query.data;
  const isOwner = role === 'employee' && request.employee_id === user.employee_id;
  const isAssignedTechnician =
    role === 'technician' && request.assigned_technician_id === user.user_id;

  const canAssign = isAdmin && request.status === 'pending';
  const canStart = (isAdmin || isAssignedTechnician) && request.status === 'assigned';
  const canResolve = isAssignedTechnician && request.status === 'in_progress';
  const canClose =
    (isAdmin || isOwner) && request.status === 'resolved';
  const canCancel = isAdmin && ['pending', 'assigned', 'in_progress'].includes(request.status);
  const canEdit = isOwner && request.status === 'pending';
  const canCreateMaintenance =
    canManageMaintenance &&
    ['assigned', 'in_progress'].includes(request.status) &&
    Boolean(request.asset_id) &&
    Boolean(request.assigned_technician_id) &&
    Boolean(asset) &&
    asset.status !== 'retired';

  const guidance = STATUS_GUIDANCE[request.status] ?? STATUS_GUIDANCE.pending;
  const assetPath = asset ? `${paths.assets}/${asset.asset_id}` : null;

  function openAction(kind) {
    actionForm.reset({ technician_id: '', remarks: '', resolution_notes: '' });
    setAction(kind);
  }

  function closeAction() {
    if (actionForm.submitting) return;
    resetActionState();
  }

  function resetActionState() {
    setAction(null);
    actionForm.reset({ technician_id: '', remarks: '', resolution_notes: '' });
  }

  function submitAction(event) {
    event.preventDefault();
    const values = actionForm.values;
    const errors = {};

    if (action === 'assign' && !values.technician_id) {
      errors.technician_id = 'Select a technician.';
    }
    if (action === 'resolve') {
      const notesError = required(values.resolution_notes, 'Resolution notes');
      if (notesError) errors.resolution_notes = notesError;
      else if (values.resolution_notes.trim().length > 5000) {
        errors.resolution_notes = 'Resolution notes must be at most 5,000 characters.';
      }
    }
    if (action === 'cancel') {
      const remarksError = required(values.remarks, 'Cancellation reason');
      if (remarksError) errors.remarks = remarksError;
    }
    if (values.remarks.trim().length > 500) {
      errors.remarks = 'Remarks must be at most 500 characters.';
    }

    const copy = ACTION_COPY[action];
    actionForm.handleSubmit(errors, async () => {
      const remarks = values.remarks.trim() || undefined;

      if (action === 'assign') {
        await requestsApi.assign(request.request_id, {
          technician_id: Number(values.technician_id),
          remarks,
        });
      } else {
        const payload = { status: statusForAction(action) };
        if (remarks) payload.remarks = remarks;
        if (action === 'resolve') {
          payload.resolution_notes = values.resolution_notes.trim();
        }
        await requestsApi.transition(request.request_id, payload);
      }

      toast.success(copy.successTitle, `${request.request_code} has been updated.`);
      resetActionState();
      setTab('history');
      query.reload();
    });
  }

  function openEdit() {
    const currentAsset = employeeAssets?.items.find(
      (row) => row.asset_id === request.asset_id,
    );
    editForm.reset({
      title: request.title,
      description: request.description,
      service_category_id: String(request.service_category_id),
      priority: request.priority,
      asset_id: currentAsset ? String(currentAsset.asset_id) : '',
    });
    setEditOpen(true);
  }

  function submitEdit(event) {
    event.preventDefault();
    const values = editForm.values;
    const errors = {};

    const titleError = required(values.title, 'Title');
    if (titleError) errors.title = titleError;
    else if (values.title.trim().length > 150) {
      errors.title = 'Title must be at most 150 characters.';
    }
    const descriptionError = required(values.description, 'Description');
    if (descriptionError) errors.description = descriptionError;
    else if (values.description.trim().length > 5000) {
      errors.description = 'Description must be at most 5,000 characters.';
    }
    if (!values.service_category_id) {
      errors.service_category_id = 'Select a service category.';
    }

    editForm.handleSubmit(errors, async () => {
      const nextAssetId = values.asset_id ? Number(values.asset_id) : null;
      const payload = {};
      if (values.title.trim() !== request.title) payload.title = values.title.trim();
      if (values.description.trim() !== request.description) {
        payload.description = values.description.trim();
      }
      if (values.priority !== request.priority) payload.priority = values.priority;
      if (Number(values.service_category_id) !== request.service_category_id) {
        payload.service_category_id = Number(values.service_category_id);
      }
      if (nextAssetId !== (request.asset_id ?? null)) payload.asset_id = nextAssetId;

      if (Object.keys(payload).length === 0) {
        toast.info('No changes to save', 'Update a field before saving the request.');
        setEditOpen(false);
        return;
      }

      await requestsApi.update(request.request_id, payload);
      toast.success('Request updated', `${request.request_code} has been saved.`);
      setEditOpen(false);
      editForm.reset();
      query.reload();
    });
  }

  const currentAssets = employeeAssets?.items ?? [];
  const currentAssetMissing =
    Boolean(request.asset_id) && !currentAssets.some((row) => row.asset_id === request.asset_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.request_code}
        backTo={paths.requests}
        backLabel={role === 'technician' ? 'Assigned requests' : 'Requests'}
        description={request.title}
        meta={
          <>
            <RequestStatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </>
        }
        actions={
          <>
            {canEdit && (
              <Button variant="secondary" onClick={openEdit}>
                Edit request
              </Button>
            )}
            {canCreateMaintenance && (
              <Button variant="secondary" onClick={() => setMaintenanceOpen(true)}>
                Create maintenance
              </Button>
            )}
            {canAssign && <Button onClick={() => openAction('assign')}>Assign technician</Button>}
            {canStart && <Button onClick={() => openAction('start')}>Start work</Button>}
            {canResolve && <Button onClick={() => openAction('resolve')}>Resolve request</Button>}
            {canClose && <Button onClick={() => openAction('close')}>Close request</Button>}
            {canCancel && (
              <Button variant="ghost" onClick={() => openAction('cancel')}>
                Cancel request
              </Button>
            )}
          </>
        }
      />

      <InlineAlert tone={guidance[0]} title={guidance[1]}>
        {guidance[2]}
      </InlineAlert>

      <Card>
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'history', label: 'Status history', count: history.length },
            ...(canManageMaintenance
              ? [
                  {
                    value: 'maintenance',
                    label: 'Maintenance',
                    count: maintenance.meta.total,
                  },
                ]
              : []),
          ]}
        />

        {tab === 'overview' && (
          <div className="grid gap-6 px-5 py-5 lg:grid-cols-[1fr_22rem]">
            <div className="min-w-0 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Request description</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {request.description}
                </p>
              </div>

              {request.resolution_notes && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-emerald-900">Resolution notes</h3>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-emerald-800">
                    {request.resolution_notes}
                  </p>
                </div>
              )}

              {request.asset_id && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Linked asset
                  </p>
                  {asset && assetPath ? (
                    <Link
                      to={assetPath}
                      className="mt-1 inline-block text-sm font-semibold text-blue-800 hover:text-blue-900"
                    >
                      {asset.asset_code} · {asset.name}
                    </Link>
                  ) : (
                    <p className="mt-1 text-sm text-slate-700">
                      {request.asset_code} · {request.asset_name}
                    </p>
                  )}
                  {asset && (
                    <p className="mt-1 text-xs text-slate-500">
                      {asset.category_name} · condition {asset.asset_condition.replaceAll('_', ' ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <DetailList
                columns={1}
                items={[
                  { label: 'Requester', value: request.requester_name },
                  { label: 'Department', value: request.department_name },
                  { label: 'Service category', value: request.service_category_name },
                  { label: 'Assigned technician', value: request.technician_name || 'Unassigned' },
                  {
                    label: 'Technician username',
                    value: request.technician_username || '—',
                  },
                  { label: 'Created', value: formatDateTime(request.created_at) },
                  { label: 'Assigned', value: formatDateTime(request.assigned_at) },
                  { label: 'Resolved', value: formatDateTime(request.resolved_at) },
                  { label: 'Last updated', value: formatDateTime(request.updated_at) },
                ]}
              />
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div>
            {history.length === 0 ? (
              <EmptyState
                title="No status history"
                description="Status changes for this request will appear here."
              />
            ) : (
              <ol className="space-y-0 px-5 py-2">
                {[...history].reverse().map((event, index) => (
                  <li key={event.history_id} className="relative flex gap-4 py-4">
                    <div className="flex flex-col items-center">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                      {index < history.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-slate-200" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {event.old_status ? (
                            <>
                              <RequestStatusBadge status={event.old_status} />
                              <span className="text-xs text-slate-400" aria-hidden="true">
                                →
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Created as</span>
                          )}
                          <RequestStatusBadge status={event.new_status} />
                        </div>
                        <time className="text-xs text-slate-400">
                          {formatDateTime(event.changed_at)}
                        </time>
                      </div>
                      {event.remarks && (
                        <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {event.remarks}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-slate-400">
                        {event.changed_by_name} · {event.changed_by_username}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {canManageMaintenance && tab === 'maintenance' && (
          <div>
            {maintenance.items.length === 0 ? (
              <EmptyState
                title="No linked maintenance"
                description="Maintenance recorded against this request will appear here."
                action={
                  canCreateMaintenance ? (
                    <Button variant="secondary" onClick={() => setMaintenanceOpen(true)}>
                      Create maintenance
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <TableFrame>
                <thead>
                  <tr>
                    <Th>Record</Th>
                    <Th>Asset</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Technician</Th>
                    <Th>Scheduled</Th>
                    <Th>Outcome</Th>
                    <Th align="right"></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenance.items.map((record) => (
                    <tr key={record.maintenance_id} className="hover:bg-slate-50/70">
                      <Td>
                        <p className="font-medium text-slate-800">#{record.maintenance_id}</p>
                        <p className="max-w-[18rem] truncate text-xs text-slate-500">
                          {record.description}
                        </p>
                      </Td>
                      <Td className="text-xs">
                        {record.asset_code}
                        <p className="text-[11px] text-slate-400">{record.asset_name}</p>
                      </Td>
                      <Td><MaintenanceTypeBadge type={record.maintenance_type} /></Td>
                      <Td><MaintenanceStatusBadge status={record.status} /></Td>
                      <Td className="text-xs">{record.technician_name}</Td>
                      <Td className="whitespace-nowrap text-xs">
                        {formatDate(record.scheduled_date)}
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
                            className="text-xs font-medium text-blue-700 hover:text-blue-800"
                          >
                            Open
                          </Link>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableFrame>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(action)}
        onClose={closeAction}
        title={action ? ACTION_COPY[action].title : 'Update request'}
        description={action ? ACTION_COPY[action].description : undefined}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeAction} disabled={actionForm.submitting}>
              Keep request as is
            </Button>
            <Button
              type="submit"
              form="request-action-form"
              variant={action ? ACTION_COPY[action].variant : 'primary'}
              loading={actionForm.submitting}
            >
              {action ? ACTION_COPY[action].submitLabel : 'Save'}
            </Button>
          </div>
        }
      >
        <form id="request-action-form" onSubmit={submitAction} className="space-y-4" noValidate>
          {actionForm.formError && <FormError message={actionForm.formError} />}

          {action === 'assign' && (
            <Field
              label="Technician"
              htmlFor="request-technician"
              error={actionForm.fieldErrors.technician_id}
              hint="Only active technician accounts are listed."
              required
            >
              <Select
                id="request-technician"
                value={actionForm.values.technician_id}
                onChange={(event) => actionForm.setValue('technician_id', event.target.value)}
                error={actionForm.fieldErrors.technician_id}
              >
                <option value="">Select a technician</option>
                {(lookups?.technicians ?? []).map((technician) => (
                  <option key={technician.user_id} value={technician.user_id}>
                    {technician.full_name} · {technician.employee_code}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {action === 'resolve' && (
            <Field
              label="Resolution notes"
              htmlFor="request-resolution-notes"
              error={actionForm.fieldErrors.resolution_notes}
              hint="Describe the diagnosis and the work completed. The requester can read this."
              required
            >
              <Textarea
                id="request-resolution-notes"
                rows={5}
                maxLength={5000}
                value={actionForm.values.resolution_notes}
                onChange={(event) =>
                  actionForm.setValue('resolution_notes', event.target.value)
                }
                error={actionForm.fieldErrors.resolution_notes}
                placeholder="What was wrong and what did you do?"
              />
            </Field>
          )}

          {action && action !== 'assign' && (
            <Field
              label={action === 'cancel' ? 'Cancellation reason' : 'Remarks'}
              htmlFor="request-action-remarks"
              error={actionForm.fieldErrors.remarks}
              hint={
                action === 'cancel'
                  ? 'Required. The reason is recorded in the status history.'
                  : 'Optional. Recorded in the status history.'
              }
              required={action === 'cancel'}
            >
              <Textarea
                id="request-action-remarks"
                rows={3}
                maxLength={500}
                value={actionForm.values.remarks}
                onChange={(event) => actionForm.setValue('remarks', event.target.value)}
                error={actionForm.fieldErrors.remarks}
              />
            </Field>
          )}

          {action === 'cancel' && (
            <InlineAlert tone="error" title="This cannot be undone">
              The request will stop immediately. Maintenance work is not cancelled automatically.
            </InlineAlert>
          )}
          {action === 'close' && (
            <InlineAlert tone="neutral">
              Closing is the final request state. Confirm that the resolution is acceptable.
            </InlineAlert>
          )}
        </form>
      </Modal>

      {canEdit && (
        <Modal
          open={editOpen}
          onClose={editForm.submitting ? undefined : () => setEditOpen(false)}
          title="Edit pending request"
          description="Only pending requests can be edited by the requester."
          size="lg"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setEditOpen(false)}
                disabled={editForm.submitting}
              >
                Cancel
              </Button>
              <Button type="submit" form="request-edit-form" loading={editForm.submitting}>
                Save changes
              </Button>
            </div>
          }
        >
          <form id="request-edit-form" onSubmit={submitEdit} className="space-y-5" noValidate>
            {editForm.formError && <FormError message={editForm.formError} />}

            <Field
              label="Title"
              htmlFor="request-edit-title"
              error={editForm.fieldErrors.title}
              required
            >
              <Input
                id="request-edit-title"
                maxLength={150}
                value={editForm.values.title}
                onChange={(event) => editForm.setValue('title', event.target.value)}
                error={editForm.fieldErrors.title}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="request-edit-description"
              error={editForm.fieldErrors.description}
              required
            >
              <Textarea
                id="request-edit-description"
                rows={5}
                maxLength={5000}
                value={editForm.values.description}
                onChange={(event) => editForm.setValue('description', event.target.value)}
                error={editForm.fieldErrors.description}
              />
            </Field>

            <FormGrid>
              <Field
                label="Service category"
                htmlFor="request-edit-category"
                error={editForm.fieldErrors.service_category_id}
                required
              >
                <Select
                  id="request-edit-category"
                  value={editForm.values.service_category_id}
                  onChange={(event) =>
                    editForm.setValue('service_category_id', event.target.value)
                  }
                  error={editForm.fieldErrors.service_category_id}
                >
                  <option value="">Select a category</option>
                  {(lookups?.service_categories ?? []).map((category) => (
                    <option
                      key={category.service_category_id}
                      value={category.service_category_id}
                      disabled={!category.is_active}
                    >
                      {category.name}
                      {!category.is_active ? ' (inactive)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Priority"
                htmlFor="request-edit-priority"
                error={editForm.fieldErrors.priority}
                required
              >
                <Select
                  id="request-edit-priority"
                  value={editForm.values.priority}
                  onChange={(event) => editForm.setValue('priority', event.target.value)}
                  error={editForm.fieldErrors.priority}
                >
                  {REQUEST_PRIORITIES.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormGrid>

            <Field
              label="Linked asset"
              htmlFor="request-edit-asset"
              error={editForm.fieldErrors.asset_id}
              hint={
                currentAssetMissing
                  ? 'The previously linked asset is no longer allocated to you. Choose a current asset or leave this blank.'
                  : 'Optional. Only assets currently allocated to you can be linked.'
              }
            >
              <Select
                id="request-edit-asset"
                value={editForm.values.asset_id}
                onChange={(event) => editForm.setValue('asset_id', event.target.value)}
                error={editForm.fieldErrors.asset_id}
              >
                <option value="">No linked asset</option>
                {currentAssets.map((row) => (
                  <option key={row.asset_id} value={row.asset_id}>
                    {row.asset_code} · {row.asset_name}
                  </option>
                ))}
              </Select>
            </Field>
          </form>
        </Modal>
      )}

      {canManageMaintenance && canCreateMaintenance && asset && (
        <MaintenanceFormModal
          open={maintenanceOpen}
          asset={asset}
          request={request}
          isAdmin={isAdmin}
          technicians={lookups?.technicians ?? []}
          onClose={() => setMaintenanceOpen(false)}
          onSaved={() => {
            setMaintenanceOpen(false);
            setTab('maintenance');
            query.reload();
          }}
        />
      )}
    </div>
  );
}
