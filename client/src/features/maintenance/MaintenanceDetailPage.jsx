import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { maintenanceApi } from '../../api/maintenance.js';
import { assetsApi } from '../../api/assets.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/toastContext.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  AssetStatusBadge,
  ConditionBadge,
  MaintenanceStatusBadge,
  MaintenanceTypeBadge,
  OutcomeBadge,
} from '../../components/ui/Badge.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Field, FormError, FormGrid, Input, Select, Textarea } from '../../components/ui/Form.jsx';
import { ErrorState, InlineAlert, PageLoader } from '../../components/ui/States.jsx';
import {
  ASSET_CONDITIONS,
  ELIGIBLE_CONDITIONS,
  MAINTENANCE_OUTCOMES,
  pathsForRole,
} from '../../utils/constants.js';
import { formatDate, formatDateTime, formatMoney, todayInputValue } from '../../utils/format.js';
import { date as dateRule, numeric, required } from '../../utils/validation.js';

export default function MaintenanceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const paths = pathsForRole(user.role);

  const [action, setAction] = useState(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const actionForm = useForm({ remarks: '' });
  const completeForm = useForm({
    outcome: 'returned_to_service',
    condition_after: 'good',
    cost: '',
    next_due_date: '',
    remarks: '',
  });

  const query = useApiQuery(async () => {
    const record = await maintenanceApi.get(id);
    const asset = await assetsApi.get(record.asset_id);
    return { record, asset };
  }, `maintenance-${id}`);

  useDocumentTitle(
    query.data ? `Maintenance #${query.data.record.maintenance_id}` : 'Maintenance details',
  );

  if (query.loading) return <PageLoader label="Loading maintenance record…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />;

  const { record, asset } = query.data;
  const canStart = record.status === 'scheduled';
  const canComplete = record.status === 'in_progress';
  const canCancel = ['scheduled', 'in_progress'].includes(record.status);
  const scheduledOrToday = record.scheduled_date ?? todayInputValue();
  const openAssignment = Boolean(asset.open_assignment_id);
  const eligibleCondition = ELIGIBLE_CONDITIONS.includes(completeForm.values.condition_after);

  const allowedOutcomes = MAINTENANCE_OUTCOMES.filter((outcome) => {
    if (outcome.value === 'retired') return true;
    return eligibleCondition
      ? outcome.value === 'returned_to_service'
      : outcome.value === 'held_unavailable';
  });

  function openAction(kind) {
    actionForm.reset({ remarks: '' });
    setAction(kind);
  }

  function closeAction() {
    if (actionForm.submitting) return;
    setAction(null);
    actionForm.reset({ remarks: '' });
  }

  function submitAction(event) {
    event.preventDefault();
    const remarks = actionForm.values.remarks.trim();
    const errors = {};
    if (remarks.length > 500) errors.remarks = 'Remarks must be at most 500 characters.';

    actionForm.handleSubmit(errors, async () => {
      if (action === 'start') {
        await maintenanceApi.start(record.maintenance_id, remarks ? { remarks } : {});
        toast.success('Maintenance started', 'The asset is now marked under maintenance.');
      } else {
        await maintenanceApi.cancel(
          record.maintenance_id,
          remarks ? { remarks } : {},
        );
        toast.success('Maintenance cancelled', 'The asset lifecycle status has been recalculated.');
      }
      setAction(null);
      actionForm.reset({ remarks: '' });
      query.reload();
    });
  }

  function openComplete() {
    const condition = asset.asset_condition ?? 'good';
    const eligible = ELIGIBLE_CONDITIONS.includes(condition);
    completeForm.reset({
      outcome: eligible ? 'returned_to_service' : 'held_unavailable',
      condition_after: condition,
      cost: '',
      next_due_date: '',
      remarks: '',
    });
    setCompleteOpen(true);
  }

  function closeComplete() {
    if (completeForm.submitting) return;
    setCompleteOpen(false);
    completeForm.reset();
  }

  function changeCondition(condition) {
    completeForm.setValue('condition_after', condition);
    const nextEligible = ELIGIBLE_CONDITIONS.includes(condition);
    const currentOutcome = completeForm.values.outcome;
    if (nextEligible && currentOutcome === 'held_unavailable') {
      completeForm.setValue('outcome', 'returned_to_service');
    }
    if (!nextEligible && currentOutcome === 'returned_to_service') {
      completeForm.setValue('outcome', 'held_unavailable');
    }
  }

  function submitComplete(event) {
    event.preventDefault();
    const values = completeForm.values;
    const errors = {};

    const outcomeError = required(values.outcome, 'Outcome');
    if (outcomeError) errors.outcome = outcomeError;
    const conditionError = required(values.condition_after, 'Condition after maintenance');
    if (conditionError) errors.condition_after = conditionError;

    const eligible = ELIGIBLE_CONDITIONS.includes(values.condition_after);
    if (values.outcome === 'returned_to_service' && !eligible) {
      errors.outcome = 'A poor or damaged asset cannot be returned to service.';
    }
    if (values.outcome === 'held_unavailable' && eligible) {
      errors.outcome = 'Use returned to service for a new, good or fair asset.';
    }
    if (
      ['held_unavailable', 'retired'].includes(values.outcome) &&
      openAssignment
    ) {
      errors.outcome = 'Return the open allocation before holding or retiring this asset.';
    }

    const costError = numeric(values.cost, 'Maintenance cost', { min: 0 });
    if (costError) errors.cost = costError;

    const dueError = dateRule(values.next_due_date, 'Next due date');
    if (dueError) errors.next_due_date = dueError;
    else if (values.next_due_date && values.next_due_date < scheduledOrToday) {
      errors.next_due_date = 'Next due date cannot be before the scheduled date.';
    }
    if (values.remarks.trim().length > 500) {
      errors.remarks = 'Remarks must be at most 500 characters.';
    }

    completeForm.handleSubmit(errors, async () => {
      const payload = {
        outcome: values.outcome,
        condition_after: values.condition_after,
        cost: values.cost === '' ? 0 : Number(values.cost),
      };
      if (values.next_due_date) payload.next_due_date = values.next_due_date;
      if (values.remarks.trim()) payload.remarks = values.remarks.trim();

      const updated = await maintenanceApi.complete(record.maintenance_id, payload);
      const outcomeLabel =
        MAINTENANCE_OUTCOMES.find((item) => item.value === updated.outcome)?.label ??
        updated.outcome;
      toast.success(
        'Maintenance completed',
        `${outcomeLabel}. Asset status is now ${String(updated.asset_status ?? '')
          .replaceAll('_', ' ')
          .toLowerCase()}.`,
      );
      setCompleteOpen(false);
      completeForm.reset();
      query.reload();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Maintenance #${record.maintenance_id}`}
        backTo={paths.maintenance}
        backLabel="Maintenance"
        description={record.description}
        meta={
          <>
            <MaintenanceStatusBadge status={record.status} />
            <MaintenanceTypeBadge type={record.maintenance_type} />
            {record.outcome && <OutcomeBadge outcome={record.outcome} />}
          </>
        }
        actions={
          <>
            {canStart && <Button onClick={() => openAction('start')}>Start maintenance</Button>}
            {canComplete && <Button onClick={openComplete}>Complete maintenance</Button>}
            {canCancel && (
              <Button variant="ghost" onClick={() => openAction('cancel')}>
                Cancel maintenance
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader
            title="Maintenance record"
            description="Technician, timing, completion outcome and asset lifecycle impact."
          />
          <CardBody>
            <DetailList
              columns={3}
              items={[
                {
                  label: 'Asset',
                  value: (
                    <Link
                      to={`${paths.assets}/${asset.asset_id}`}
                      className="font-medium text-blue-800 hover:text-blue-900"
                    >
                      {asset.asset_code} · {asset.name}
                    </Link>
                  ),
                },
                { label: 'Asset status', value: <AssetStatusBadge status={asset.status} /> },
                {
                  label: 'Asset condition',
                  value: <ConditionBadge condition={asset.asset_condition} />,
                },
                { label: 'Maintenance type', value: <MaintenanceTypeBadge type={record.maintenance_type} /> },
                { label: 'Technician', value: record.technician_name },
                { label: 'Technician email', value: record.technician_email },
                { label: 'Created by', value: record.created_by_name },
                { label: 'Created', value: formatDateTime(record.created_at) },
                { label: 'Scheduled date', value: formatDate(record.scheduled_date) },
                { label: 'Started', value: formatDateTime(record.started_at) },
                { label: 'Started by', value: record.started_by_name || '—' },
                { label: 'Completed', value: formatDateTime(record.completed_at) },
                { label: 'Completed by', value: record.completed_by_name || '—' },
                { label: 'Cancelled', value: formatDateTime(record.cancelled_at) },
                { label: 'Cancelled by', value: record.cancelled_by_name || '—' },
                {
                  label: 'Outcome',
                  value: record.outcome ? <OutcomeBadge outcome={record.outcome} /> : '—',
                },
                {
                  label: 'Condition after',
                  value: record.condition_after ? (
                    <ConditionBadge condition={record.condition_after} />
                  ) : (
                    '—'
                  ),
                },
                { label: 'Cost', value: formatMoney(record.cost) },
                { label: 'Next due date', value: formatDate(record.next_due_date) },
                { label: 'Service request', value: record.request_code || 'Not linked' },
                { label: 'Last updated', value: formatDateTime(record.updated_at) },
              ]}
            />

            {record.remarks && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <h2 className="text-sm font-semibold text-slate-900">Remarks</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {record.remarks}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Lifecycle guidance" />
            <CardBody className="space-y-3 text-sm leading-6 text-slate-600">
              {record.status === 'scheduled' && (
                <p>
                  This work is scheduled. The asset lifecycle is unchanged until the record is
                  started.
                </p>
              )}
              {record.status === 'in_progress' && (
                <p>
                  The asset is under maintenance. Completion requires an outcome and the condition
                  after work.
                </p>
              )}
              {record.status === 'completed' && (
                <p>This record is complete. The asset status reflects the completion outcome.</p>
              )}
              {record.status === 'cancelled' && (
                <p>This record was cancelled and no further action is available.</p>
              )}
              {openAssignment && (
                <InlineAlert tone="warning" title="Open allocation">
                  The asset is allocated to {asset.assigned_employee_name}. Return the allocation
                  before choosing held unavailable or retired.
                </InlineAlert>
              )}
              {record.request_code && record.request_id && (
                <p>
                  Linked request:{' '}
                  <Link
                    to={`${paths.requests}/${record.request_id}`}
                    className="font-medium text-blue-800 hover:text-blue-900"
                  >
                    {record.request_code}
                  </Link>
                </p>
              )}
            </CardBody>
          </Card>

          <InlineAlert tone="neutral" title="Three completion outcomes">
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Return to service: asset becomes available or stays allocated.</li>
              <li>Hold unavailable: asset leaves circulation but is not retired.</li>
              <li>Retire: asset is permanently withdrawn.</li>
            </ul>
          </InlineAlert>
        </div>
      </div>

      <Modal
        open={Boolean(action)}
        onClose={closeAction}
        title={action === 'start' ? 'Start maintenance' : 'Cancel maintenance'}
        description={
          action === 'start'
            ? 'Starting work moves the asset to under maintenance.'
            : 'Cancelling stops this record. The asset lifecycle status is recalculated.'
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeAction} disabled={actionForm.submitting}>
              Keep record as is
            </Button>
            <Button
              type="submit"
              form="maintenance-action-form"
              variant={action === 'cancel' ? 'danger' : 'primary'}
              loading={actionForm.submitting}
            >
              {action === 'start' ? 'Start maintenance' : 'Cancel maintenance'}
            </Button>
          </div>
        }
      >
        <form id="maintenance-action-form" onSubmit={submitAction} className="space-y-4" noValidate>
          {actionForm.formError && <FormError message={actionForm.formError} />}
          {action === 'cancel' && (
            <InlineAlert tone="warning" title="Cancellation is recorded">
              Cancellation is final for this maintenance record. If work is still needed, create a
              new scheduling record.
            </InlineAlert>
          )}
          <Field
            label="Remarks"
            htmlFor="maintenance-action-remarks"
            error={actionForm.fieldErrors.remarks}
            hint="Optional. Recorded on the maintenance record."
          >
            <Textarea
              id="maintenance-action-remarks"
              rows={3}
              maxLength={500}
              value={actionForm.values.remarks}
              onChange={(event) => actionForm.setValue('remarks', event.target.value)}
              error={actionForm.fieldErrors.remarks}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={completeOpen}
        onClose={closeComplete}
        title="Complete maintenance"
        description="Record the outcome, resulting condition and any cost. The asset lifecycle status updates automatically."
        size="lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeComplete} disabled={completeForm.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="maintenance-complete-form" loading={completeForm.submitting}>
              Complete maintenance
            </Button>
          </div>
        }
      >
        <form id="maintenance-complete-form" onSubmit={submitComplete} className="space-y-5" noValidate>
          {completeForm.formError && <FormError message={completeForm.formError} />}

          {openAssignment && (
            <InlineAlert tone="warning" title="Open allocation detected">
              Return the open allocation first if you intend to hold the asset unavailable or retire
              it.
            </InlineAlert>
          )}

          <FormGrid>
            <Field
              label="Condition after maintenance"
              htmlFor="maintenance-condition-after"
              error={completeForm.fieldErrors.condition_after}
              hint="New, good or fair can return to service. Poor or damaged must be held unavailable or retired."
              required
            >
              <Select
                id="maintenance-condition-after"
                value={completeForm.values.condition_after}
                onChange={(event) => changeCondition(event.target.value)}
                error={completeForm.fieldErrors.condition_after}
              >
                {ASSET_CONDITIONS.map((condition) => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Outcome"
              htmlFor="maintenance-outcome"
              error={completeForm.fieldErrors.outcome}
              required
            >
              <Select
                id="maintenance-outcome"
                value={completeForm.values.outcome}
                onChange={(event) => completeForm.setValue('outcome', event.target.value)}
                error={completeForm.fieldErrors.outcome}
              >
                {allowedOutcomes.map((outcome) => (
                  <option key={outcome.value} value={outcome.value}>
                    {outcome.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Maintenance cost (INR)"
              htmlFor="maintenance-cost"
              error={completeForm.fieldErrors.cost}
              hint="Optional. Defaults to zero."
            >
              <Input
                id="maintenance-cost"
                type="number"
                min="0"
                step="0.01"
                value={completeForm.values.cost}
                onChange={(event) => completeForm.setValue('cost', event.target.value)}
                error={completeForm.fieldErrors.cost}
              />
            </Field>
            {completeForm.values.outcome !== 'retired' && (
              <Field
                label="Next due date"
                htmlFor="maintenance-next-due"
                error={completeForm.fieldErrors.next_due_date}
                hint="Optional. Cannot be before the scheduled date."
              >
                <Input
                  id="maintenance-next-due"
                  type="date"
                  min={scheduledOrToday}
                  value={completeForm.values.next_due_date}
                  onChange={(event) =>
                    completeForm.setValue('next_due_date', event.target.value)
                  }
                  error={completeForm.fieldErrors.next_due_date}
                />
              </Field>
            )}
          </FormGrid>

          <Field
            label="Completion remarks"
            htmlFor="maintenance-complete-remarks"
            error={completeForm.fieldErrors.remarks}
            hint="Optional. Record parts replaced, tests performed or follow-up work."
          >
            <Textarea
              id="maintenance-complete-remarks"
              rows={4}
              maxLength={500}
              value={completeForm.values.remarks}
              onChange={(event) => completeForm.setValue('remarks', event.target.value)}
              error={completeForm.fieldErrors.remarks}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
