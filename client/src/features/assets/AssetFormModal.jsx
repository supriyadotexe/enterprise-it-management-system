import { useEffect } from 'react';
import { assetsApi } from '../../api/assets.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/toastContext.js';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Checkbox, Field, FormError, FormGrid, Input, Select, Textarea } from '../../components/ui/Form.jsx';
import { ASSET_CONDITIONS } from '../../utils/constants.js';
import { date as dateRule, numeric, required } from '../../utils/validation.js';

const INITIAL = {
  category_id: '',
  asset_code: '',
  name: '',
  brand: '',
  model: '',
  serial_number: '',
  purchase_date: '',
  warranty_end: '',
  purchase_cost: '',
  asset_condition: 'good',
  notes: '',
  allocateNow: false,
  employee_id: '',
};

export default function AssetFormModal({
  open,
  asset,
  categories,
  employees,
  onClose,
  onSaved,
}) {
  const toast = useToast();
  const form = useForm(INITIAL);
  const assetId = asset?.asset_id ?? null;

  useEffect(() => {
    if (!open) return;
    if (asset) {
      form.setValues({
        category_id: String(asset.category_id ?? ''),
        asset_code: asset.asset_code ?? '',
        name: asset.name ?? '',
        brand: asset.brand ?? '',
        model: asset.model ?? '',
        serial_number: asset.serial_number ?? '',
        purchase_date: asset.purchase_date ?? '',
        warranty_end: asset.warranty_end ?? '',
        purchase_cost: asset.purchase_cost ?? '',
        asset_condition: asset.asset_condition ?? 'good',
        notes: asset.notes ?? '',
        allocateNow: false,
        employee_id: '',
      });
    } else {
      form.reset(INITIAL);
    }
    // Form setters are stable; including them would reset the form on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assetId]);

  function onSubmit(event) {
    event.preventDefault();
    const values = form.values;
    const errors = {};

    if (!values.category_id) errors.category_id = 'Select an asset category.';
    const codeError = required(values.asset_code, 'Asset code');
    if (codeError) errors.asset_code = codeError;
    else if (!/^[A-Za-z0-9-]{2,30}$/.test(values.asset_code.trim())) {
      errors.asset_code = 'Use 2–30 letters, numbers and hyphens only.';
    }
    const nameError = required(values.name, 'Asset name');
    if (nameError) errors.name = nameError;

    const purchaseError = dateRule(values.purchase_date, 'Purchase date');
    if (purchaseError) errors.purchase_date = purchaseError;
    const warrantyError = dateRule(values.warranty_end, 'Warranty end');
    if (warrantyError) errors.warranty_end = warrantyError;
    if (
      !purchaseError &&
      !warrantyError &&
      values.purchase_date &&
      values.warranty_end &&
      values.warranty_end < values.purchase_date
    ) {
      errors.warranty_end = 'Warranty end cannot be before the purchase date.';
    }
    const costError = numeric(values.purchase_cost, 'Purchase cost', { min: 0 });
    if (costError) errors.purchase_cost = costError;

    if (!asset && values.allocateNow && !values.employee_id) {
      errors.employee_id = 'Select the employee who should receive this asset.';
    }

    form.handleSubmit(errors, async () => {
      const payload = {
        category_id: Number(values.category_id),
        asset_code: values.asset_code.trim(),
        name: values.name.trim(),
        brand: values.brand.trim() || null,
        model: values.model.trim() || null,
        serial_number: values.serial_number.trim() || null,
        purchase_date: values.purchase_date || null,
        warranty_end: values.warranty_end || null,
        purchase_cost: values.purchase_cost === '' ? null : Number(values.purchase_cost),
        asset_condition: values.asset_condition,
        notes: values.notes.trim() || null,
      };

      let saved;
      if (asset) {
        saved = await assetsApi.update(asset.asset_id, payload);
        toast.success('Asset updated', `${saved.asset_code} has been saved.`);
      } else {
        saved = await assetsApi.create(payload);
        toast.success('Asset registered', `${saved.asset_code} is now in the asset register.`);
      }

      onSaved?.(saved, {
        allocateEmployeeId:
          !asset && values.allocateNow && values.employee_id
            ? Number(values.employee_id)
            : null,
      });
    });
  }

  return (
    <Modal
      open={open}
      onClose={form.submitting ? undefined : onClose}
      title={asset ? 'Edit asset' : 'Register asset'}
      description={
        asset
          ? 'Status and allocation state are managed through lifecycle actions, not this form.'
          : 'Register the asset first, then allocate it from the asset record.'
      }
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={form.submitting}>
            Cancel
          </Button>
          <Button type="submit" form="asset-form" loading={form.submitting}>
            {asset ? 'Save changes' : 'Register asset'}
          </Button>
        </div>
      }
    >
      <form id="asset-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        {form.formError && <FormError message={form.formError} />}

        <FormGrid>
          <Field
            label="Asset category"
            htmlFor="asset-category"
            error={form.fieldErrors.category_id}
            required
          >
            <Select
              id="asset-category"
              value={form.values.category_id}
              onChange={(event) => form.setValue('category_id', event.target.value)}
              error={form.fieldErrors.category_id}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option
                  key={category.category_id}
                  value={category.category_id}
                  disabled={!category.is_active}
                >
                  {category.category_name}
                  {!category.is_active ? ' (inactive)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Asset code"
            htmlFor="asset-code"
            error={form.fieldErrors.asset_code}
            hint="Must be unique across the estate."
            required
          >
            <Input
              id="asset-code"
              value={form.values.asset_code}
              maxLength={30}
              onChange={(event) => form.setValue('asset_code', event.target.value)}
              error={form.fieldErrors.asset_code}
              placeholder="e.g. LAP-2041"
            />
          </Field>
          <Field
            label="Asset name"
            htmlFor="asset-name"
            error={form.fieldErrors.name}
            required
          >
            <Input
              id="asset-name"
              value={form.values.name}
              maxLength={120}
              onChange={(event) => form.setValue('name', event.target.value)}
              error={form.fieldErrors.name}
              placeholder="e.g. Dell Latitude 7440"
            />
          </Field>
          <Field label="Brand" htmlFor="asset-brand" error={form.fieldErrors.brand}>
            <Input
              id="asset-brand"
              value={form.values.brand}
              maxLength={60}
              onChange={(event) => form.setValue('brand', event.target.value)}
              error={form.fieldErrors.brand}
            />
          </Field>
          <Field label="Model" htmlFor="asset-model" error={form.fieldErrors.model}>
            <Input
              id="asset-model"
              value={form.values.model}
              maxLength={80}
              onChange={(event) => form.setValue('model', event.target.value)}
              error={form.fieldErrors.model}
            />
          </Field>
          <Field
            label="Serial number"
            htmlFor="asset-serial"
            error={form.fieldErrors.serial_number}
          >
            <Input
              id="asset-serial"
              value={form.values.serial_number}
              maxLength={80}
              onChange={(event) => form.setValue('serial_number', event.target.value)}
              error={form.fieldErrors.serial_number}
            />
          </Field>
          <Field
            label="Purchase date"
            htmlFor="asset-purchase-date"
            error={form.fieldErrors.purchase_date}
          >
            <Input
              id="asset-purchase-date"
              type="date"
              value={form.values.purchase_date}
              onChange={(event) => form.setValue('purchase_date', event.target.value)}
              error={form.fieldErrors.purchase_date}
            />
          </Field>
          <Field
            label="Warranty end"
            htmlFor="asset-warranty"
            error={form.fieldErrors.warranty_end}
          >
            <Input
              id="asset-warranty"
              type="date"
              value={form.values.warranty_end}
              onChange={(event) => form.setValue('warranty_end', event.target.value)}
              error={form.fieldErrors.warranty_end}
            />
          </Field>
          <Field
            label="Purchase cost (INR)"
            htmlFor="asset-cost"
            error={form.fieldErrors.purchase_cost}
            hint="Optional. Use the purchase price, not the depreciated value."
          >
            <Input
              id="asset-cost"
              type="number"
              min="0"
              step="0.01"
              value={form.values.purchase_cost}
              onChange={(event) => form.setValue('purchase_cost', event.target.value)}
              error={form.fieldErrors.purchase_cost}
            />
          </Field>
          <Field
            label="Condition"
            htmlFor="asset-condition"
            error={form.fieldErrors.asset_condition}
            required
          >
            <Select
              id="asset-condition"
              value={form.values.asset_condition}
              onChange={(event) => form.setValue('asset_condition', event.target.value)}
              error={form.fieldErrors.asset_condition}
            >
              {ASSET_CONDITIONS.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>

        <Field label="Notes" htmlFor="asset-notes" error={form.fieldErrors.notes} hint="Optional.">
          <Textarea
            id="asset-notes"
            rows={3}
            maxLength={500}
            value={form.values.notes}
            onChange={(event) => form.setValue('notes', event.target.value)}
            error={form.fieldErrors.notes}
          />
        </Field>

        {!asset && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <Checkbox
              label="Allocate this asset after registration"
              description="The asset will be registered as available, then the allocation dialog opens on the asset record."
              checked={form.values.allocateNow}
              onChange={(event) => form.setValue('allocateNow', event.target.checked)}
            />
            {form.values.allocateNow && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <Field
                  label="Allocate to"
                  htmlFor="asset-allocate-employee"
                  error={form.fieldErrors.employee_id}
                  hint="Only active employees are listed."
                  required
                >
                  <Select
                    id="asset-allocate-employee"
                    value={form.values.employee_id}
                    onChange={(event) => form.setValue('employee_id', event.target.value)}
                    error={form.fieldErrors.employee_id}
                  >
                    <option value="">Select an employee</option>
                    {employees.map((employee) => (
                      <option key={employee.employee_id} value={employee.employee_id}>
                        {employee.full_name} · {employee.employee_code}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
