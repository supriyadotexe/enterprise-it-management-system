import { useState } from 'react';
import { Link } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.js';
import { lookupsApi } from '../../api/dashboard.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/toastContext.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ButtonLink from '../../components/ui/ButtonLink.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import {
  AssetStatusBadge,
  ConditionBadge,
} from '../../components/ui/Badge.jsx';
import { FilterBar, SelectFilter } from '../../components/ui/Filters.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Field, FormError, Select, Textarea } from '../../components/ui/Form.jsx';
import { Pagination, TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import { EmptyState, ErrorState, InlineAlert, TableSkeleton } from '../../components/ui/States.jsx';
import { ASSET_CONDITIONS } from '../../utils/constants.js';
import { formatDate, formatDateTime } from '../../utils/format.js';

const RETURN_INITIAL = { return_condition: 'good', remarks: '' };

export default function AssignmentsPage() {
  useDocumentTitle('Allocations');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [state, setState] = useState('open');
  const [employeeId, setEmployeeId] = useState('');
  const [returnRow, setReturnRow] = useState(null);
  const returnForm = useForm(RETURN_INITIAL);

  const query = useApiQuery(async () => {
    const [list, lookups] = await Promise.all([
      assignmentsApi.list({
        page,
        limit: 20,
        is_open: state === 'all' ? undefined : state === 'open',
        employee_id: employeeId || undefined,
      }),
      lookupsApi.get(),
    ]);
    return { list, lookups };
  }, `${page}|${state}|${employeeId}`);

  if (query.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Allocations" description="Loading asset allocations…" />
        <Card><TableSkeleton rows={6} columns={6} /></Card>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Allocations" />
        <ErrorState message={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const { list, lookups } = query.data;

  function openReturn(row) {
    returnForm.reset({
      return_condition: row.asset_condition ?? 'good',
      remarks: '',
    });
    setReturnRow(row);
  }

  function closeReturn() {
    if (returnForm.submitting) return;
    setReturnRow(null);
    returnForm.reset(RETURN_INITIAL);
  }

  function submitReturn(event) {
    event.preventDefault();
    returnForm.handleSubmit({}, async () => {
      await assignmentsApi.return(returnRow.assignment_id, {
        return_condition: returnForm.values.return_condition,
        remarks: returnForm.values.remarks.trim() || undefined,
      });
      toast.success(
        'Asset returned',
        `${returnRow.asset_code} has been returned by ${returnRow.employee_name}.`,
      );
      setReturnRow(null);
      returnForm.reset(RETURN_INITIAL);
      query.reload();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Allocations"
        description="Open and historical asset allocations. Allocations start from an available asset record."
        actions={<ButtonLink to="/admin/assets" variant="secondary">Open asset register</ButtonLink>}
      />

      <Card>
        <CardHeader
          title="Allocation records"
          description={`${list.meta.total} allocation${list.meta.total === 1 ? '' : 's'} match the current filters`}
        />
        <FilterBar>
          <SelectFilter
            label="Filter allocations by state"
            value={state}
            onChange={(value) => {
              setState(value);
              setPage(1);
            }}
            options={[
              { value: 'open', label: 'Open allocations' },
              { value: 'returned', label: 'Returned allocations' },
              { value: 'all', label: 'All allocations' },
            ]}
          />
          <SelectFilter
            label="Filter allocations by employee"
            value={employeeId}
            onChange={(value) => {
              setEmployeeId(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All employees' },
              ...lookups.employees.map((employee) => ({
                value: String(employee.employee_id),
                label: employee.full_name,
              })),
            ]}
          />
        </FilterBar>

        {list.items.length === 0 ? (
          <EmptyState
            title={state === 'open' ? 'No open allocations' : 'No allocation records found'}
            description={
              state === 'open'
                ? 'Open an available asset and use Allocate to assign it to an employee.'
                : 'Adjust the filters to review allocation history.'
            }
            action={
              state === 'open' ? (
                <ButtonLink to="/admin/assets?status=available" size="sm">
                  Browse available assets
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <>
            <TableFrame>
              <thead>
                <tr>
                  <Th>Asset</Th>
                  <Th>Employee</Th>
                  <Th>Status</Th>
                  <Th>Allocated</Th>
                  <Th>Assigned by</Th>
                  <Th>Returned</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((row) => (
                  <tr key={row.assignment_id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        to={`/admin/assets/${row.asset_id}`}
                        className="font-medium text-slate-900 hover:text-blue-800"
                      >
                        {row.asset_code}
                      </Link>
                      <p className="mt-0.5 max-w-[18rem] truncate text-xs text-slate-500">
                        {row.asset_name}
                      </p>
                    </Td>
                    <Td>
                      <p className="text-xs font-medium text-slate-700">{row.employee_name}</p>
                      <p className="text-[11px] text-slate-400">{row.employee_email}</p>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        <AssetStatusBadge status={row.asset_status} />
                        <ConditionBadge condition={row.asset_condition} />
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-xs">{formatDate(row.assigned_at)}</Td>
                    <Td className="text-xs">{row.assigned_by_name}</Td>
                    <Td className="whitespace-nowrap text-xs">
                      {row.returned_at ? (
                        <div>
                          <p>{formatDateTime(row.returned_at)}</p>
                          <p className="text-[11px] text-slate-400">
                            {row.returned_by_name || 'Returned'}
                            {row.return_condition ? ` · ${row.return_condition}` : ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-emerald-700">Open</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        {!row.returned_at && (
                          <Button size="sm" variant="secondary" onClick={() => openReturn(row)}>
                            Return
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
            <Pagination meta={list.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(returnRow)}
        onClose={closeReturn}
        title="Record asset return"
        description={
          returnRow
            ? `Return ${returnRow.asset_code} from ${returnRow.employee_name}.`
            : undefined
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeReturn} disabled={returnForm.submitting}>
              Cancel
            </Button>
            <Button type="submit" form="assignment-return-form" loading={returnForm.submitting}>
              Record return
            </Button>
          </div>
        }
      >
        <form id="assignment-return-form" onSubmit={submitReturn} className="space-y-4" noValidate>
          {returnForm.formError && <FormError message={returnForm.formError} />}
          <Field
            label="Return condition"
            htmlFor="assignment-return-condition"
            error={returnForm.fieldErrors.return_condition}
            hint="The asset condition is updated to this value."
            required
          >
            <Select
              id="assignment-return-condition"
              value={returnForm.values.return_condition}
              onChange={(event) =>
                returnForm.setValue('return_condition', event.target.value)
              }
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
            htmlFor="assignment-return-remarks"
            error={returnForm.fieldErrors.remarks}
            hint="Optional. Record damage, missing accessories or other notes."
          >
            <Textarea
              id="assignment-return-remarks"
              rows={3}
              maxLength={255}
              value={returnForm.values.remarks}
              onChange={(event) => returnForm.setValue('remarks', event.target.value)}
              error={returnForm.fieldErrors.remarks}
            />
          </Field>
          <InlineAlert tone="warning">
            A poor or damaged return makes the asset unavailable for allocation. Use maintenance if
            repair is needed.
          </InlineAlert>
        </form>
      </Modal>
    </div>
  );
}
