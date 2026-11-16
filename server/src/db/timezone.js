/**
 * MySQL accepts a numeric session offset even when the installation has not
 * loaded the named time-zone tables. APP_TIMEZONE remains a validated IANA name;
 * this helper converts it to the offset used by every EITAMS MySQL session.
 */
export function mysqlOffsetFor(timeZone, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    hour12: false,
  });
  const part = formatter.formatToParts(date).find((item) => item.type === 'timeZoneName');
  if (!part) throw new Error(`Cannot derive a MySQL offset for ${timeZone}`);
  if (part.value === 'GMT') return '+00:00';
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(part.value);
  if (!match) throw new Error(`Unexpected timezone offset: ${part.value}`);
  return `${match[1]}${match[2]}:${match[3]}`;
}
