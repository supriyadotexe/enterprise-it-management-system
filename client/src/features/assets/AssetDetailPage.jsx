import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { assetsApi } from '../../api/assets.js';
import { assignmentsApi } from '../../api/assignments.js';
import { lookupsApi } from '../../api/dashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useForm } from '../../hooks/useForm.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/toastContext.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardBody } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  AssetStatusBadge,
  ConditionBadge,
  MaintenanceStatusBadge,
  MaintenanceTypeBadge,
  OutcomeBadge,
} from '../../components/ui/Badge.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Modal, { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Field, FormError, Select, Textarea } from '../../components/ui/Form.jsx';
import { Pagination, TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { EmptyState, ErrorState, InlineAlert, PageLoader } from '../../components/ui/States.jsx';
import { ASSET_CONDITIONS } from '../../utils/constants.js';
import { pathsForRole } from '../../utils/constants.js';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format.js';
import AssetFormModal from './AssetFormModal.jsx';
import MaintenanceFormModal from '../maintenance/MaintenanceFormModal.jsx';

const ALLOCATE_INITIAL = { employee_id: '', remarks: '' };
const RETURN_INITIAL = { return_condition: 'good', remarks: '' };

const STATUS_HELP = {
  available: 'The asset is not allocated and has no in-progress maintenance. It can be allocated.',
  allocated: 'The asset is held by an employee through an open allocation.',
  under_maintenance: 'Maintenance work is currently in progress. The asset cannot be allocated.',
  unavailable: 'The asset is held out of circulation because of its condition or a maintenance outcome.',
  retired: 'The asset is permanently withdrawn. No further lifecycle actions are available.',
};

export default function AssetDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const canManageMaintenance = user.role === 'admin' || user.role === 'technician';
  const paths = pathsForRole(user.role);

  const [tab, setTab] = useState('overview');
  const [historyPage, setHistoryPage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [retireError, setRetireError] = useState(null);
  const autoAllocateHandled = useRef(false);
  const allocateForm = useForm(ALLOCATE_INITIAL);
  const returnForm = useForm(RETURN_INITIAL);

  const query = useApiQuery(async () => {
    const [asset, history, maintenance, lookups] = await Promise.all([
      assetsApi.get(id),
      assetsApi.history(id, { page: historyPage, limit: 10 }),
      assetsApi.maintenance(id, { page: maintenancePage, limit: 10 }),
      isAdmin ? lookupsApi.get() : Promise.resolve(null),
    ]);
    return { asset, history, maintenance, lookups };
  }, `asset-${id}|${historyPage}|${maintenancePage}`);

  useDocumentTitle(query.data?.asset ? `${query.data.asset.asset_code} · ${query.data.asset.name}` : 'Asset details');

  useEffect(() => {
    if (autoAllocateHandled.current || !query.data || !isAdmin) return undefined;
    const state = location.state;
    if (!state?.openAllocate) return undefined;
    autoAllocateHandled.current = true;
    const timer = window.setTimeout(() => {
      navigate(location.pathname, { replace: true, state: null });
      if (query.data.asset.status === 'available' && !query.data.asset.open_assignment_id) {
        allocateForm.reset({ employee_id: state.employeeId ?? '', remarks: '' });
        setAllocateOpen(true);
      } else {
        toast.info(
          'Allocation dialog not opened',
          'The asset is not currently available. Review its status before allocating it.',
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // navigation and form reset are stable; only react to loaded asset/route state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, isAdmin]);

  if (query.loading) return <PageLoader label="Loading asset record…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />;

  const { asset, history, maintenance, lookups } = query.data;
  const canAllocate =
    isAdmin &&
    asset.status === 'available' &&
    !asset.open_assignment_id &&
    !asset.open_maintenance_id;
  const canReturn = isAdmin && Boolean(asset.open_assignment_id);
  const canRetire =
    isAdmin &&
    asset.status !== 'retired' &&
    !asset.open_assignment_id &&
    !asset.open_maintenance_id;

  function openAllocate() {
    allocateForm.reset(ALLOCATE_INITIAL);
    setAllocateOpen(true);
  }

  function submitAllocate(event) {
    event.preventDefault();
    const errors = {};
    if (!allocateForm.values.employee_id) errors.employee_id = 'Select an employee.';
    allocateForm.handleSubmit(errors, async () => {
      await assetsApi.assign(asset.asset_id, {
        employee_id: Number(allocateForm.values.employee_id),
        remarks: allocateForm.values.remarks.trim() || undefined,
      });
      toast.success('Asset allocated', `${asset.asset_code} has been allocated.`);
      setAllocateOpen(false);
      allocateForm.reset(ALLOCATE_INITIAL);
      query.reload();
    });
  }

  function openReturn() {
    returnForm.reset({ return_condition: asset.asset_condition ?? 'good', remarks: '' });
    setReturnOpen(true);
  }

  function submitReturn(event) {
    event.preventDefault();
    returnForm.handleSubmit({}, async () => {
      await assignmentsApi.return(asset.open_assignment_id, {
        return_condition: returnForm.values.return_condition,
        remarks: returnForm.values.remarks.trim() || undefined,
      });
      toast.success('Asset returned', `${asset.asset_code} is back in the asset pool.`);
      setReturnOpen(false);
      returnForm.reset(RETURN_INITIAL);
      query.reload();
    });
  }

  async function retireAsset() {
    setRetiring(true);
    setRetireError(null);
    try {
      await assetsApi.retire(asset.asset_id);
      toast.success('Asset retired', `${asset.asset_code} has been withdrawn permanently.`);
      setRetireOpen(false);
      query.reload();
    } catch (error) {
      setRetireError(
        error?.response?.data?.error?.message ?? 'The asset could not be retired.',
      );
    } finally {
      setRetiring(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${asset.asset_code} · ${asset.name}`}
        backTo={paths.assets}
        backLabel={user.role === 'employee' ? 'My assets' : 'Assets'}
        description={`${asset.category_name}${asset.brand ? ` · ${asset.brand}` : ''}${asset.model ? ` ${asset.model}` : ''}`}
        meta={
          <>
            <AssetStatusBadge status={asset.status} />
            <ConditionBadge condition={asset.asset_condition} />
          </>
        }
        actions={
          <>
            {isAdmin && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit asset
              </Button>
            )}
            {canAllocate && <Button onClick={openAllocate}>Allocate</Button>}
            {canReturn && (
              <Button variant="secondary" onClick={openReturn}>
                Return asset
              </Button>
            )}
            {canManageMaintenance && asset.status !== 'retired' && (
              <Button variant="secondary" onClick={() => setMaintenanceOpen(true)}>
                Create maintenance
              </Button>
            )}
            {isAdmin && asset.status !== 'retired' && (
              <Button
                variant="ghost"
                onClick={() => {
                  setRetireError(null);
                  setRetireOpen(true);
                }}
                disabled={!canRetire}
                title={
                  canRetire
                    ? 'Permanently retire this asset'
                    : 'Return all open allocations and finish in-progress maintenance before retiring.'
                }
              >
                Retire
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Lifecycle status
                </dt>
                <dd className="mt-1.5"><AssetStatusBadge status={asset.status} /></dd>
                <dd className="mt-2 text-xs leading-5 text-slate-500">{STATUS_HELP[asset.status]}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Condition
                </dt>
                <dd className="mt-1.5"><ConditionBadge condition={asset.asset_condition} /></dd>
                <dd className="mt-2 text-xs leading-5 text-slate-500">
                  Condition is updated by returns and maintenance completion.
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Current holder
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-slate-800">
                  {asset.assigned_employee_name || 'Not allocated'}
                </dd>
                <dd className="mt-2 text-xs leading-5 text-slate-500">
                  {asset.assigned_at ? `Since ${formatDate(asset.assigned_at)}` : 'Ready for allocation when available.'}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Asset identity
            </p>
            <p className="text-sm font-semibold text-slate-900">{asset.asset_code}</p>
            <p className="text-sm text-slate-600">{asset.category_name}</p>
            <p className="text-xs text-slate-500">
              Serial: {asset.serial_number || 'Not recorded'}
            </p>
            <p className="text-xs text-slate-500">
              Record created {formatDateTime(asset.created_at)}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'history', label: 'Lifecycle history', count: history.meta.total },
            { value: 'maintenance', label: 'Maintenance', count: maintenance.meta.total },
          ]}
        />

        {tab === 'overview' && (
          <CardBody className="space-y-6">
            <DetailList
              items={[
                { label: 'Asset code', value: asset.asset_code },
                { label: 'Category', value: asset.category_name },
                { label: 'Brand', value: asset.brand || '—' },
                { label: 'Model', value: asset.model || '—' },
                { label: 'Serial number', value: asset.serial_number || '—' },
                { label: 'Purchase date', value: formatDate(asset.purchase_date) },
                { label: 'Warranty end', value: formatDate(asset.warranty_end) },
                { label: 'Purchase cost', value: formatMoney(asset.purchase_cost) },
                { label: 'Retired at', value: formatDateTime(asset.retired_at) },
              ]}
            />

            {asset.notes && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {asset.notes}
                </p>
              </div>
            )}

            {asset.open_assignment_id && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <p className="font-semibold">Open allocation</p>
                <p className="mt-1 leading-6">
                  {asset.assigned_employee_name} has held this asset since{' '}
                  {formatDate(asset.assigned_at)}. Record the return condition before another
                  employee can receive it.
                </p>
              </div>
            )}

            {asset.open_maintenance_id && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Maintenance in progress</p>
                <p className="mt-1 leading-6">
                  Technician {asset.maintenance_technician_name || 'assigned'} is working on this
                  asset. Complete or cancel the record before allocation or retirement.
                </p>
              </div>
            )}
          </CardBody>
        )}

        {tab === 'history' && (
          <div>
            {history.items.length === 0 ? (
              <EmptyState
                title="No lifecycle events"
                description="Allocation, return, maintenance and retirement events will appear here."
              />
            ) : (
              <>
                <ol className="space-y-0 px-5 py-2">
                  {history.items.map((event, index) => (
                    <li key={`${event.reference_table}-${event.reference_id}-${event.event_at}-${index}`} className="relative flex gap-4 py-4">
                      <div className="flex flex-col items-center">
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                        {index < history.items.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-slate-200" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pb-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{event.summary}</p>
                          <time className="text-xs text-slate-400">
                            {formatDateTime(event.event_at)}
                          </time>
                        </div>
                        {event.detail && (
                          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {event.detail}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {event.status_from && <AssetStatusBadge status={event.status_from} />}
                          {event.status_from && event.status_to && (
                            <span className="text-xs text-slate-400" aria-hidden="true">→</span>
                          )}
                          {event.status_to && <AssetStatusBadge status={event.status_to} />}
                          {event.condition_from && (
                            <span className="text-xs text-slate-400">
                              condition {event.condition_from}
                            </span>
                          )}
                          {event.condition_from && event.condition_to && (
                            <span className="text-xs text-slate-400">→</span>
                          )}
                          {event.condition_to && <ConditionBadge condition={event.condition_to} />}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {event.actor_name || 'System'} · {event.event_type?.replaceAll('_', ' ')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <Pagination
                  meta={history.meta}
                  onPageChange={setHistoryPage}
                  className="border-t border-slate-100"
                />
              </>
            )}
          </div>
        )}

        {tab === 'maintenance' && (
          <div>
            {maintenance.items.length === 0 ? (
              <EmptyState
                title="No maintenance records"
                description="Scheduled and completed maintenance for this asset will appear here."
              />
            ) : (
              <>
                <TableFrame>
                  <thead>
                    <tr>
                      <Th>Record</Th>
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
                          <p className="font-medium text-slate-800">
                            #{record.maintenance_id}
                          </p>
                          <p className="max-w-[18rem] truncate text-xs text-slate-500">
                            {record.description}
                          </p>
                          {record.request_code && (
                            <p className="mt-0.5 text-[11px] text-blue-700">{record.request_code}</p>
                          )}
                        </Td>
                        <Td><MaintenanceTypeBadge type={record.maintenance_type} /></Td>
                        <Td><MaintenanceStatusBadge status={record.status} /></Td>
                        <Td className="text-xs">{record.technician_name}</Td>
                        <Td className="whitespace-nowrap text-xs">{formatDate(record.scheduled_date)}</Td>
                        <Td>
                          {record.outcome ? (
                            <OutcomeBadge outcome={record.outcome} />
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </Td>
                        <Td>
                          {canManageMaintenance ? (
                            <Link
                              to={`${paths.maintenance}/${record.maintenance_id}`}
                              className="text-xs font-medium text-blue-700 hover:text-blue-800"
                            >
                              Open
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">View only</span>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableFrame>
                <Pagination meta={maintenance.meta} onPageChange={setMaintenancePage} />
              </>
            )}
          </div>
        )}
      </Card>

      {isAdmin && query.data.lookups && (
        <AssetFormModal
          open={editOpen}
          asset={asset}
          categories={lookups.asset_categories}
          employees={lookups.employees}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            query.reload();
          }}
        />
      )}

      <Modal
        open={allocateOpen}
        onClose={allocateForm.submitting ? undefined : () => setAllocateOpen(false)}
        title="Allocate asset"
        description={`Assign ${asset.asset_code} to an active employee.`}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setAllocateOpen(false)} disabled={allocateForm.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="allocate-form" loading={allocateForm.submitting}>
              Allocate asset
            </Button>
          </div>
        }
      >
        <form id="allocate-form" onSubmit={submitAllocate} className="space-y-4" noValidate>
          {allocateForm.formError && <FormError message={allocateForm.formError} />}
          <Field
            label="Employee"
            htmlFor="allocate-employee"
            error={allocateForm.fieldErrors.employee_id}
            hint="Only active employees are listed."
            required
          >
            <Select
              id="allocate-employee"
              value={allocateForm.values.employee_id}
              onChange={(event) => allocateForm.setValue('employee_id', event.target.value)}
              error={allocateForm.fieldErrors.employee_id}
            >
              <option value="">Select an employee</option>
              {lookups?.employees.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>
                  {employee.full_name} · {employee.employee_code}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Remarks"
            htmlFor="allocate-remarks"
            error={allocateForm.fieldErrors.remarks}
            hint="Optional. Recorded on the allocation."
          >
            <Textarea
              id="allocate-remarks"
              rows={3}
              maxLength={255}
              value={allocateForm.values.remarks}
              onChange={(event) => allocateForm.setValue('remarks', event.target.value)}
              error={allocateForm.fieldErrors.remarks}
            />
          </Field>
          <InlineAlert tone="neutral">
            The asset becomes <strong>allocated</strong> immediately. The employee can see it in
            their workspace and can reference it when raising a service request.
          </InlineAlert>
        </form>
      </Modal>

      <Modal
        open={returnOpen}
        onClose={returnForm.submitting ? undefined : () => setReturnOpen(false)}
        title="Return asset"
        description={`Record the condition of ${asset.asset_code} when it is returned by ${asset.assigned_employee_name ?? 'the employee'}.`}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setReturnOpen(false)} disabled={returnForm.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="return-form" loading={returnForm.submitting}>
              Record return
            </Button>
          </div>
        }
      >
        <form id="return-form" onSubmit={submitReturn} className="space-y-4" noValidate>
          {returnForm.formError && <FormError message={returnForm.formError} />}
          <Field
            label="Return condition"
            htmlFor="return-condition"
            error={returnForm.fieldErrors.return_condition}
            hint="The asset condition is updated to this value."
            required
          >
            <Select
              id="return-condition"
              value={returnForm.values.return_condition}
              onChange={(event) => returnForm.setValue('return_condition', event.target.value)}
              error={returnForm.fieldErrors.return_condition}
            >
              {ASSET_CONDITIONS.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Remarks"
            htmlFor="return-remarks"
            error={returnForm.fieldErrors.remarks}
            hint="Optional. Record damage or missing accessories."
          >
            <Textarea
              id="return-remarks"
              rows={3}
              maxLength={255}
              value={returnForm.values.remarks}
              onChange={(event) => returnForm.setValue('remarks', event.target.value)}
              error={returnForm.fieldErrors.remarks}
            />
          </Field>
          <InlineAlert tone="warning">
            A poor or damaged return makes the asset unavailable for allocation. Use maintenance if
            repair is required.
          </InlineAlert>
        </form>
      </Modal>

      {canManageMaintenance && (
        <MaintenanceFormModal
          open={maintenanceOpen}
          asset={asset}
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

      <ConfirmDialog
        open={retireOpen}
        onClose={() => setRetireOpen(false)}
        onConfirm={retireAsset}
        title="Retire this asset?"
        confirmLabel="Retire permanently"
        variant="danger"
        loading={retiring}
        error={retireError}
      >
        <p>
          <span className="font-medium text-slate-900">{asset.asset_code}</span> will be marked
          retired and can no longer be allocated or maintained.
        </p>
        <p className="text-xs text-slate-500">
          Allocation and maintenance history is retained. This action cannot be reversed.
        </p>
      </ConfirmDialog>
    </div>
  );
}
