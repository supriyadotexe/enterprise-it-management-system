import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../../api/requests.js';
import { employeesApi } from '../../api/employees.js';
import { lookupsApi } from '../../api/dashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/toastContext.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, FormError, FormGrid, Input, Select, Textarea } from '../../components/ui/Form.jsx';
import { ErrorState, InlineAlert, PageLoader } from '../../components/ui/States.jsx';
import { REQUEST_PRIORITIES } from '../../utils/constants.js';
import { required } from '../../utils/validation.js';

const INITIAL = {
  title: '',
  description: '',
  service_category_id: '',
  priority: 'medium',
  asset_id: '',
};

export default function NewRequestPage() {
  useDocumentTitle('Raise a service request');
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const form = useForm(INITIAL);

  const query = useApiQuery(async () => {
    const [lookups, assets] = await Promise.all([
      lookupsApi.get(),
      employeesApi.assets(user.employee_id, { limit: 100 }),
    ]);
    return { lookups, assets };
  }, `new-request-${user.employee_id}`);

  if (query.loading) return <PageLoader label="Preparing the request form…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />;

  const { lookups, assets } = query.data;

  function onSubmit(event) {
    event.preventDefault();
    const values = form.values;
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

    form.handleSubmit(errors, async () => {
      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        service_category_id: Number(values.service_category_id),
        priority: values.priority,
      };
      if (values.asset_id) payload.asset_id = Number(values.asset_id);

      const created = await requestsApi.create(payload);
      toast.success(
        'Service request raised',
        `${created.request_code} is pending assignment to a technician.`,
      );
      navigate(`/me/requests/${created.request_id}`);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raise a service request"
        backTo="/me/requests"
        backLabel="My requests"
        description="Describe the problem or service you need. An administrator will assign a technician."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader
            title="Request details"
            description="Provide enough detail for the technician to understand the problem before starting."
          />
          <CardBody>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              {form.formError && <FormError message={form.formError} />}

              <Field
                label="Title"
                htmlFor="new-request-title"
                error={form.fieldErrors.title}
                hint="Short summary, for example “Laptop does not boot”."
                required
              >
                <Input
                  id="new-request-title"
                  maxLength={150}
                  value={form.values.title}
                  onChange={(event) => form.setValue('title', event.target.value)}
                  error={form.fieldErrors.title}
                  placeholder="What do you need help with?"
                />
              </Field>

              <Field
                label="Description"
                htmlFor="new-request-description"
                error={form.fieldErrors.description}
                hint="Include error messages, when the problem started and any troubleshooting already tried."
                required
              >
                <Textarea
                  id="new-request-description"
                  rows={7}
                  maxLength={5000}
                  value={form.values.description}
                  onChange={(event) => form.setValue('description', event.target.value)}
                  error={form.fieldErrors.description}
                  placeholder="Describe the problem or service request in detail."
                />
              </Field>

              <FormGrid>
                <Field
                  label="Service category"
                  htmlFor="new-request-category"
                  error={form.fieldErrors.service_category_id}
                  required
                >
                  <Select
                    id="new-request-category"
                    value={form.values.service_category_id}
                    onChange={(event) =>
                      form.setValue('service_category_id', event.target.value)
                    }
                    error={form.fieldErrors.service_category_id}
                  >
                    <option value="">Select a category</option>
                    {lookups.service_categories.map((category) => (
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
                  htmlFor="new-request-priority"
                  error={form.fieldErrors.priority}
                  hint="Use critical only when work is blocked or data is at risk."
                  required
                >
                  <Select
                    id="new-request-priority"
                    value={form.values.priority}
                    onChange={(event) => form.setValue('priority', event.target.value)}
                    error={form.fieldErrors.priority}
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
                label="Related asset"
                htmlFor="new-request-asset"
                error={form.fieldErrors.asset_id}
                hint="Optional. Only assets currently allocated to you can be linked."
              >
                <Select
                  id="new-request-asset"
                  value={form.values.asset_id}
                  onChange={(event) => form.setValue('asset_id', event.target.value)}
                  error={form.fieldErrors.asset_id}
                >
                  <option value="">No linked asset</option>
                  {assets.items.map((asset) => (
                    <option key={asset.asset_id} value={asset.asset_id}>
                      {asset.asset_code} · {asset.asset_name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/me/requests')}
                  disabled={form.submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={form.submitting}>
                  Raise request
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <InlineAlert tone="info" title="What happens next?">
            Your request starts as <strong>pending</strong>. An administrator assigns a technician, who
            starts work and records resolution notes. You can then close the request to confirm the
            outcome.
          </InlineAlert>
          <InlineAlert tone="neutral" title="Asset history">
            Linking a currently allocated asset keeps its service history with the equipment. If the
            problem is not about a specific asset, leave the asset field blank.
          </InlineAlert>
        </div>
      </div>
    </div>
  );
}
