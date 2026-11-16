import { useState } from 'react';
import { reportsApi } from '../../api/dashboard.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { BarList, DonutChart } from '../../components/ui/Charts.jsx';
import { Field, Input } from '../../components/ui/Form.jsx';
import { TableFrame, Td, Th } from '../../components/ui/Table.jsx';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  TableSkeleton,
} from '../../components/ui/States.jsx';
import { formatLabel, formatMoney, formatNumber } from '../../utils/format.js';
import { date as dateRule } from '../../utils/validation.js';

const STATUS_COLORS = {
  pending: '#f59e0b',
  assigned: '#0ea5e9',
  in_progress: '#6366f1',
  resolved: '#10b981',
  closed: '#64748b',
  cancelled: '#f43f5e',
};

export default function ReportsPage() {
  useDocumentTitle('Reports');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '' });
  const [rangeError, setRangeError] = useState(null);

  const query = useApiQuery(async () => {
    const [departmentAssets, technicianWorkload, maintenanceCost, requestSummary] =
      await Promise.all([
        reportsApi.assetsByDepartment(),
        reportsApi.technicianWorkload(),
        reportsApi.maintenanceCost({
          from: applied.from || undefined,
          to: applied.to || undefined,
        }),
        reportsApi.requestSummary({
          from: applied.from || undefined,
          to: applied.to || undefined,
        }),
      ]);
    return { departmentAssets, technicianWorkload, maintenanceCost, requestSummary };
  }, `reports|${applied.from}|${applied.to}`);

  function applyRange(event) {
    event.preventDefault();
    const fromError = dateRule(from, 'From date');
    const toError = dateRule(to, 'To date');
    if (fromError || toError) {
      setRangeError(fromError ?? toError);
      return;
    }
    if (from && to && from > to) {
      setRangeError('From date cannot be after the to date.');
      return;
    }
    setRangeError(null);
    setApplied({ from, to });
  }

  function clearRange() {
    setFrom('');
    setTo('');
    setRangeError(null);
    setApplied({ from: '', to: '' });
  }

  if (query.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Loading reporting data…" />
        <Card><TableSkeleton rows={8} columns={6} /></Card>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" />
        <ErrorState message={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const { departmentAssets, technicianWorkload, maintenanceCost, requestSummary } = query.data;
  const totalMaintenanceCost = maintenanceCost.reduce(
    (sum, row) => sum + Number(row.total_cost ?? 0),
    0,
  );
  const totalCompleted = maintenanceCost.reduce(
    (sum, row) => sum + Number(row.completed_count ?? 0),
    0,
  );
  const rangeLabel =
    applied.from || applied.to
      ? `${applied.from || 'start'} to ${applied.to || 'today'}`
      : 'All time';

  const statusSegments = requestSummary.by_status.map((row) => ({
    label: formatLabel(row.status),
    value: Number(row.count),
    color: STATUS_COLORS[row.status] ?? '#94a3b8',
  }));

  const priorityItems = requestSummary.by_priority.map((row) => ({
    label: formatLabel(row.priority),
    value: Number(row.count),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Asset distribution, technician workload and service performance. Request and cost reports respect the selected completion/creation date range."
        actions={
          <Button variant="secondary" onClick={() => window.print()}>
            Print report
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Report range"
          description="Applies to the request summary and maintenance cost reports."
        />
        <CardBody>
          <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3">
            <Field label="From date" htmlFor="report-from" className="w-full sm:w-44">
              <Input
                id="report-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </Field>
            <Field label="To date" htmlFor="report-to" className="w-full sm:w-44">
              <Input
                id="report-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </Field>
            <div className="flex gap-2 pb-0.5">
              <Button type="submit">Apply range</Button>
              <Button type="button" variant="secondary" onClick={clearRange}>
                Clear
              </Button>
            </div>
          </form>
          {rangeError && (
            <p className="mt-3 text-xs text-rose-600" role="alert">
              {rangeError}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Showing range: <span className="font-medium text-slate-700">{rangeLabel}</span>
          </p>
        </CardBody>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total requests"
          value={formatNumber(requestSummary.totals.total_requests)}
          hint={`In range: ${rangeLabel}`}
          tone="indigo"
        />
        <StatCard
          label="Open requests"
          value={formatNumber(requestSummary.totals.open_requests)}
          hint="Pending, assigned or in progress"
          tone="amber"
        />
        <StatCard
          label="Completed maintenance"
          value={formatNumber(totalCompleted)}
          hint={`In range: ${rangeLabel}`}
          tone="sky"
        />
        <StatCard
          label="Maintenance spend"
          value={formatMoney(totalMaintenanceCost)}
          hint="Completed work in the selected range"
          tone="emerald"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Request status distribution"
            description={`${formatNumber(requestSummary.totals.total_requests)} requests created in ${rangeLabel.toLowerCase()}`}
          />
          <CardBody>
            {statusSegments.length === 0 ? (
              <EmptyState
                title="No requests in this range"
                description="Adjust the date range to review request activity."
              />
            ) : (
              <DonutChart
                segments={statusSegments}
                centerValue={formatNumber(requestSummary.totals.total_requests)}
                centerLabel="requests"
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Requests by priority"
            description="Priority distribution for requests in the selected range."
          />
          <CardBody>
            <BarList
              items={priorityItems}
              valueLabel="requests"
              emptyLabel="No requests in this range."
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Assets by department"
          description="Current allocation-linked asset counts. Assets are attributed through the employee's department and open allocation."
        />
        {departmentAssets.length === 0 ? (
          <EmptyState
            title="No department data"
            description="Department asset distribution will appear when employees hold assets."
          />
        ) : (
          <TableFrame>
            <thead>
              <tr>
                <Th>Department</Th>
                <Th align="right">Total</Th>
                <Th align="right">Available</Th>
                <Th align="right">Allocated</Th>
                <Th align="right">Under maintenance</Th>
                <Th align="right">Unavailable</Th>
                <Th align="right">Retired</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentAssets.map((row) => (
                <tr key={row.department_id} className="hover:bg-slate-50/70">
                  <Td className="font-medium text-slate-800">{row.department_name}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(row.total_assets)}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(row.available)}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(row.allocated)}</Td>
                  <Td className="text-right tabular-nums">
                    {formatNumber(row.under_maintenance)}
                  </Td>
                  <Td className="text-right tabular-nums">{formatNumber(row.unavailable)}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(row.retired)}</Td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Technician workload"
            description="Current open requests and active maintenance per active technician."
          />
          {technicianWorkload.length === 0 ? (
            <EmptyState
              title="No active technicians"
              description="Active technician accounts will appear here."
            />
          ) : (
            <TableFrame>
              <thead>
                <tr>
                  <Th>Technician</Th>
                  <Th align="right">Open requests</Th>
                  <Th align="right">In progress</Th>
                  <Th align="right">Maintenance in progress</Th>
                  <Th align="right">Scheduled</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {technicianWorkload.map((row) => (
                  <tr key={row.technician_id} className="hover:bg-slate-50/70">
                    <Td className="font-medium text-slate-800">{row.technician_name}</Td>
                    <Td className="text-right tabular-nums">
                      {formatNumber(row.open_requests)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatNumber(row.in_progress_requests)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatNumber(row.in_progress_maintenance)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatNumber(row.scheduled_maintenance)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Maintenance cost"
            description={`Completed maintenance grouped by month · ${rangeLabel}`}
          />
          {maintenanceCost.length === 0 ? (
            <EmptyState
              title="No completed maintenance in this range"
              description="Adjust the date range or complete maintenance records to populate this report."
            />
          ) : (
            <TableFrame>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th align="right">Completed</Th>
                  <Th align="right">Total cost</Th>
                  <Th align="right">Average cost</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maintenanceCost.map((row) => (
                  <tr key={row.period} className="hover:bg-slate-50/70">
                    <Td className="font-medium text-slate-800">{row.period}</Td>
                    <Td className="text-right tabular-nums">
                      {formatNumber(row.completed_count)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(row.total_cost)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(row.average_cost)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
          )}
        </Card>
      </div>

      <InlineAlert tone="neutral" title="Report scope">
        Department figures count assets through open employee allocations. Request and maintenance
        cost reports use the selected date range; workload figures are current as of page load.
      </InlineAlert>
    </div>
  );
}
