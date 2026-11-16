import { useMemo, useState } from 'react';
import { assetCategoriesApi, serviceCategoriesApi } from '../../api/categories.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/toastContext.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Field, FormError, Input, Textarea } from '../../components/ui/Form.jsx';
import { FilterBar, SearchField } from '../../components/ui/Filters.jsx';
import { TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import Badge, { ActiveBadge } from '../../components/ui/Badge.jsx';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States.jsx';
import { required } from '../../utils/validation.js';

const INITIAL = { name: '', description: '', is_active: true };

export default function CategoriesPage() {
  useDocumentTitle('Categories');
  const toast = useToast();
  const [tab, setTab] = useState('asset');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const form = useForm(INITIAL);

  const query = useApiQuery(async () => {
    const [asset, service] = await Promise.all([
      assetCategoriesApi.list({ include_inactive: true }),
      serviceCategoriesApi.list({ include_inactive: true }),
    ]);
    return { asset, service };
  }, 'categories');

  const rows = useMemo(() => {
    const source = query.data ? query.data[tab] : [];
    const term = search.trim().toLowerCase();
    return source.filter((row) => {
      if (!includeInactive && !row.is_active) return false;
      if (term && !`${row.name} ${row.description ?? ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [query.data, tab, search, includeInactive]);

  if (query.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Categories" description="Loading categories…" />
        <Card><TableSkeleton rows={6} columns={4} /></Card>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Categories" />
        <ErrorState message={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const api = tab === 'asset' ? assetCategoriesApi : serviceCategoriesApi;
  const label = tab === 'asset' ? 'asset category' : 'service category';

  function openCreate() {
    setEditing(null);
    form.reset(INITIAL);
    setFormOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.reset({ name: row.name, description: row.description ?? '', is_active: row.is_active });
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
    if (required(form.values.name, 'Category name')) {
      errors.name = required(form.values.name, 'Category name');
    }
    if (form.values.name.trim().length > 60) {
      errors.name = 'Category name must be at most 60 characters.';
    }
    form.handleSubmit(errors, async () => {
      const payload = {
        name: form.values.name.trim(),
        description: form.values.description.trim() || null,
        is_active: form.values.is_active,
      };
      if (editing) {
        await api.update(editing.id, payload);
        toast.success('Category updated');
      } else {
        await api.create(payload);
        toast.success('Category created');
      }
      setFormOpen(false);
      setEditing(null);
      form.reset(INITIAL);
      query.reload();
    });
  }

  async function toggleActive(row) {
    try {
      await api.update(row.id, { is_active: !row.is_active });
      toast.success(row.is_active ? 'Category deactivated' : 'Category activated');
      query.reload();
    } catch (error) {
      toast.error(
        'Category status not changed',
        error?.response?.data?.error?.message ?? 'Try again.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Controlled vocabularies for asset registration and service request classification."
        actions={<Button onClick={openCreate}>New {label}</Button>}
      />

      <Card>
        <Tabs
          active={tab}
          onChange={(value) => {
            setTab(value);
            setSearch('');
          }}
          tabs={[
            { value: 'asset', label: 'Asset categories', count: query.data.asset.length },
            { value: 'service', label: 'Service categories', count: query.data.service.length },
          ]}
        />
        <CardHeader
          title={tab === 'asset' ? 'Asset categories' : 'Service categories'}
          description={
            tab === 'asset'
              ? 'Used when registering assets. Inactive categories remain on historical assets.'
              : 'Used when employees raise service requests.'
          }
        />
        <FilterBar>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={`Search ${tab} categories…`}
            className="w-full sm:w-72"
          />
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
            />
            Show inactive
          </label>
        </FilterBar>

        {rows.length === 0 ? (
          <EmptyState
            title="No categories found"
            description="Adjust the search or create a category."
            action={<Button onClick={openCreate}>New {label}</Button>}
          />
        ) : (
          <TableFrame>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <Td className="font-medium text-slate-900">{row.name}</Td>
                  <Td className="max-w-xl text-slate-600">{row.description || '—'}</Td>
                  <Td><ActiveBadge active={row.is_active} /></Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={row.is_active ? 'ghost' : 'secondary'}
                        onClick={() => toggleActive(row)}
                      >
                        {row.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
        )}
      </Card>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500 shadow-sm">
        <p className="font-semibold text-slate-700">About category status</p>
        <p>
          Deactivating a category removes it from new forms but does not rewrite historical records.
          The API rejects new assets or requests that reference an inactive category with{' '}
          <Badge tone="slate">422 CATEGORY_INACTIVE</Badge>.
        </p>
      </div>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? `Edit ${label}` : `New ${label}`}
        description={
          editing
            ? 'Category names are unique within their type.'
            : 'Add a value to the approved category list.'
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeForm} disabled={form.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="category-form" loading={form.submitting}>
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </div>
        }
      >
        <form id="category-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          {form.formError && <FormError message={form.formError} />}
          <Field label="Name" htmlFor="category-name" error={form.fieldErrors.name} required>
            <Input
              id="category-name"
              value={form.values.name}
              maxLength={60}
              onChange={(event) => form.setValue('name', event.target.value)}
              error={form.fieldErrors.name}
            />
          </Field>
          <Field
            label="Description"
            htmlFor="category-description"
            error={form.fieldErrors.description}
            hint="Optional. Up to 255 characters."
          >
            <Textarea
              id="category-description"
              rows={3}
              maxLength={255}
              value={form.values.description}
              onChange={(event) => form.setValue('description', event.target.value)}
              error={form.fieldErrors.description}
            />
          </Field>
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={form.values.is_active}
              onChange={(event) => form.setValue('is_active', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Active
              <span className="mt-0.5 block text-xs text-slate-500">
                Inactive categories stay on historical records but are hidden from new forms.
              </span>
            </span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
