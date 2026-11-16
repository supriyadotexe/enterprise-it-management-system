import { useEffect } from 'react';
import { maintenanceApi } from '../../api/maintenance.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/toastContext.js';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, FormError, FormGrid, Input, Select, Textarea } from '../../components/ui/Form.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { MAINTENANCE_TYPES } from '../../utils/constants.js';
import { formatDate, todayInputValue } from '../../utils/format.js';
import { required } from '../../utils/validation.js';

const INITIAL = {
  asset_id: '',
  technician_id: '',
  maintenance_type: 'corrective',
  description: '',
  mode: 'in_progress',
  scheduled_date: '',
  remarks: '',
};

export default function MaintenanceFormModal({
  open,
  asset,
  assets = [],
  technicians = [],
  request = null,
  isAdmin = false,
  onClose,
  onSaved,
}) {
  const toast = useToast();
  const form = useForm(INITIAL);
  const presetAssetId = asset?.asset_id ?? null;
  const requestId = request?.request_id ?? null;

  useEffect(() => {
    if (!open) return;
    form.reset({
      ...INITIAL,
      asset_id: presetAssetId ? String(presetAssetId) : '',
      mode: 'in_progress',
      scheduled_date: '',
      technician_id: request?.assigned_technician_id
        ? String(request.assigned_technician_id)
        : '',
    });
    // Form reset is stable for the module initial values; reset on open only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetAssetId, requestId]);

  const selectedAsset = asset ?? assets.find((row) => String(row.asset_id) === form.values.asset_id);
  const isRetired = selectedAsset?.status === 'retired';
  const lockedTechnicianId = request?.assigned_technician_id ?? null;

  function onSubmit(event) {
    event.preventDefault();
    const values = form.values;
    const errors = {};

    if (!values.asset_id) errors.asset_id = 'Select an asset.';
    if (isAdmin && !lockedTechnicianId && !values.technician_id) {
      errors.technician_id = 'Select the technician accountable for this work.';
    }
    const typeError = required(values.maintenance_type, 'Maintenance type');
    if (typeError) errors.maintenance_type = typeError;
    const descriptionError = required(values.description, 'Description');
    if (descriptionError) errors.description = descriptionError;
    else if (values.description.trim().length > 5000) {
      errors.description = 'Description must be at most 5,000 characters.';
    }
    if (values.mode === 'scheduled') {
      if (!values.scheduled_date) {
        errors.scheduled_date = 'Scheduled maintenance requires a date.';
      } else if (values.scheduled_date < todayInputValue()) {
        errors.scheduled_date = 'Scheduled maintenance cannot be in the past.';
      }
    }

    form.handleSubmit(errors, async () => {
      const payload = {
        asset_id: Number(values.asset_id),
        maintenance_type: values.maintenance_type,
        description: values.description.trim(),
        status: values.mode,
        remarks: values.remarks.trim() || undefined,
      };
      if (values.mode === 'scheduled') {
        payload.scheduled_date = values.scheduled_date;
      }
      if (lockedTechnicianId) {
        payload.technician_id = Number(lockedTechnicianId);
      } else if (isAdmin && values.technician_id) {
        payload.technician_id = Number(values.technician_id);
      }
      if (requestId) payload.request_id = requestId;

      const saved = await maintenanceApi.create(payload);
      toast.success(
        values.mode === 'scheduled' ? 'Maintenance scheduled' : 'Maintenance started',
        values.mode === 'scheduled'
          ? `Scheduled for ${formatDate(saved.scheduled_date)}.`
          : 'The asset is now marked under maintenance.',
      );
      onSaved?.(saved);
    });
  }

  return (
    <Modal
      open={open}
      onClose={form.submitting ? undefined : onClose}
      title="Create maintenance record"
      description={
        asset
          ? `Record maintenance for ${asset.asset_code} · ${asset.name}.`
          : 'Choose an asset and either start work immediately or schedule it for a future date.'
      }
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={form.submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="maintenance-create-form"
            loading={form.submitting}
            disabled={isRetired}
          >
            {form.values.mode === 'scheduled' ? 'Schedule maintenance' : 'Start maintenance'}
          </Button>
        </div>
      }
    >
      <form id="maintenance-create-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        {form.formError && <FormError message={form.formError} />}

        {isRetired && (
          <InlineAlert tone="error" title="This asset is retired">
            A retired asset cannot enter a new maintenance record.
          </InlineAlert>
        )}

        {request && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-950">
            Linked service request: <span className="font-semibold">{request.request_code}</span> ·{' '}
            {request.title}
          </div>
        )}

        <FormGrid>
          <Field
            label="Asset"
            htmlFor="maintenance-asset"
            error={form.fieldErrors.asset_id}
            required
          >
            {asset ? (
              <Input
                id="maintenance-asset"
                value={`${asset.asset_code} · ${asset.name}`}
                disabled
                readOnly
              />
            ) : (
              <Select
                id="maintenance-asset"
                value={form.values.asset_id}
                onChange={(event) => form.setValue('asset_id', event.target.value)}
                error={form.fieldErrors.asset_id}
              >
                <option value="">Select an asset</option>
                {assets.map((row) => (
                  <option key={row.asset_id} value={row.asset_id} disabled={row.status === 'retired'}>
                    {row.asset_code} · {row.name}
                    {row.status === 'retired' ? ' (retired)' : ''}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Maintenance type"
            htmlFor="maintenance-type"
            error={form.fieldErrors.maintenance_type}
            required
          >
            <Select
              id="maintenance-type"
              value={form.values.maintenance_type}
              onChange={(event) => form.setValue('maintenance_type', event.target.value)}
              error={form.fieldErrors.maintenance_type}
            >
              {MAINTENANCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
          {isAdmin && lockedTechnicianId ? (
            <Field
              label="Technician"
              htmlFor="maintenance-technician"
              hint="Maintenance linked to a service request must stay with the assigned technician."
            >
              <Input
                id="maintenance-technician"
                value={
                  request?.technician_name ||
                  technicians.find((row) => String(row.user_id) === String(lockedTechnicianId))
                    ?.full_name ||
                  'Assigned technician'
                }
                disabled
                readOnly
              />
            </Field>
          ) : isAdmin ? (
            <Field
              label="Technician"
              htmlFor="maintenance-technician"
              error={form.fieldErrors.technician_id}
              hint="Only active technician accounts are listed."
              required
            >
              <Select
                id="maintenance-technician"
                value={form.values.technician_id}
                onChange={(event) => form.setValue('technician_id', event.target.value)}
                error={form.fieldErrors.technician_id}
              >
                <option value="">Select a technician</option>
                {technicians.map((technician) => (
                  <option key={technician.user_id} value={technician.user_id}>
                    {technician.full_name} · {technician.employee_code}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field
            label="Timing"
            htmlFor="maintenance-mode"
            error={form.fieldErrors.mode}
            hint="Immediate work begins now and marks the asset under maintenance."
            required
          >
            <Select
              id="maintenance-mode"
              value={form.values.mode}
              onChange={(event) => form.setValue('mode', event.target.value)}
              error={form.fieldErrors.mode}
            >
              <option value="in_progress">Start immediately</option>
              <option value="scheduled">Schedule for a future date</option>
            </Select>
          </Field>
          {form.values.mode === 'scheduled' && (
            <Field
              label="Scheduled date"
              htmlFor="maintenance-date"
              error={form.fieldErrors.scheduled_date}
              hint="The asset remains in its current state until work is started."
              required
            >
              <Input
                id="maintenance-date"
                type="date"
                min={todayInputValue()}
                value={form.values.scheduled_date}
                onChange={(event) => form.setValue('scheduled_date', event.target.value)}
                error={form.fieldErrors.scheduled_date}
              />
            </Field>
          )}
        </FormGrid>

        <Field
          label="Description"
          htmlFor="maintenance-description"
          error={form.fieldErrors.description}
          required
        >
          <Textarea
            id="maintenance-description"
            rows={4}
            maxLength={5000}
            value={form.values.description}
            onChange={(event) => form.setValue('description', event.target.value)}
            error={form.fieldErrors.description}
            placeholder="Describe the fault, planned work or inspection scope."
          />
        </Field>
        <Field
          label="Remarks"
          htmlFor="maintenance-remarks"
          error={form.fieldErrors.remarks}
          hint="Optional internal note for the maintenance record."
        >
          <Textarea
            id="maintenance-remarks"
            rows={2}
            maxLength={500}
            value={form.values.remarks}
            onChange={(event) => form.setValue('remarks', event.target.value)}
            error={form.fieldErrors.remarks}
          />
        </Field>
      </form>
    </Modal>
  );
}
