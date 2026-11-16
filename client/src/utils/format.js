const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(value) {
  if (!value) return '—';
  const date = DATE_ONLY.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const normalized = DATE_ONLY.test(value) ? `${value}T00:00:00` : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMoney(value, currency = 'INR') {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatNumber(value) {
  const number = Number(value ?? 0);
  if (Number.isNaN(number)) return String(value);
  return new Intl.NumberFormat('en-IN').format(number);
}

export function formatLabel(value) {
  if (!value) return '—';
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function daysUntil(value) {
  if (!value) return null;
  const date = DATE_ONLY.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function initials(name) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
