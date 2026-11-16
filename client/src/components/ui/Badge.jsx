const TONES = {
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  indigo: 'border-blue-200 bg-blue-50 text-blue-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
};

export default function Badge({ children, tone = 'slate', className = '', dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone] ?? TONES.slate} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

const ASSET_STATUS = {
  available: ['emerald', 'Available'],
  allocated: ['sky', 'Allocated'],
  under_maintenance: ['amber', 'Under maintenance'],
  unavailable: ['rose', 'Unavailable'],
  retired: ['slate', 'Retired'],
};

const REQUEST_STATUS = {
  pending: ['amber', 'Pending'],
  assigned: ['sky', 'Assigned'],
  in_progress: ['indigo', 'In progress'],
  resolved: ['emerald', 'Resolved'],
  closed: ['slate', 'Closed'],
  cancelled: ['rose', 'Cancelled'],
};

const PRIORITY = {
  low: ['slate', 'Low'],
  medium: ['sky', 'Medium'],
  high: ['amber', 'High'],
  critical: ['rose', 'Critical'],
};

const MAINTENANCE_STATUS = {
  scheduled: ['sky', 'Scheduled'],
  in_progress: ['amber', 'In progress'],
  completed: ['emerald', 'Completed'],
  cancelled: ['rose', 'Cancelled'],
};

const CONDITION = {
  new: ['emerald', 'New'],
  good: ['sky', 'Good'],
  fair: ['amber', 'Fair'],
  poor: ['rose', 'Poor'],
  damaged: ['rose', 'Damaged'],
};

const OUTCOME = {
  returned_to_service: ['emerald', 'Returned to service'],
  held_unavailable: ['amber', 'Held unavailable'],
  retired: ['slate', 'Retired'],
};

const MAINTENANCE_TYPE = {
  preventive: ['sky', 'Preventive'],
  corrective: ['amber', 'Corrective'],
  inspection: ['indigo', 'Inspection'],
  upgrade: ['violet', 'Upgrade'],
};

function LookupBadge({ map, value, dot = false }) {
  const [tone, label] = map[value] ?? ['slate', value ?? '—'];
  return (
    <Badge tone={tone} dot={dot}>
      {label}
    </Badge>
  );
}

export function AssetStatusBadge({ status, dot = true }) {
  return <LookupBadge map={ASSET_STATUS} value={status} dot={dot} />;
}

export function RequestStatusBadge({ status, dot = true }) {
  return <LookupBadge map={REQUEST_STATUS} value={status} dot={dot} />;
}

export function PriorityBadge({ priority }) {
  return <LookupBadge map={PRIORITY} value={priority} />;
}

export function MaintenanceStatusBadge({ status, dot = true }) {
  return <LookupBadge map={MAINTENANCE_STATUS} value={status} dot={dot} />;
}

export function ConditionBadge({ condition }) {
  return <LookupBadge map={CONDITION} value={condition} />;
}

export function OutcomeBadge({ outcome }) {
  return <LookupBadge map={OUTCOME} value={outcome} />;
}

export function MaintenanceTypeBadge({ type }) {
  return <LookupBadge map={MAINTENANCE_TYPE} value={type} />;
}

export function ActiveBadge({ active, activeLabel = 'Active', inactiveLabel = 'Inactive' }) {
  return (
    <Badge tone={active ? 'emerald' : 'slate'} dot>
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
