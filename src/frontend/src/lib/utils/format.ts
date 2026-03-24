/**
 * Norwegian date/time formatting utilities.
 *
 * All functions accept ISO date strings and return Norwegian (nb-NO) formatted output.
 */

const NB = 'nb-NO';

/** dd.mm.yy — compact date for dense UI (tidslinje, hendelseslogg) */
export function formatDatoKort(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const dag = String(d.getDate()).padStart(2, '0');
  const mnd = String(d.getMonth() + 1).padStart(2, '0');
  const aar = String(d.getFullYear()).slice(2);
  return `${dag}.${mnd}.${aar}`;
}

/** dd.mm.yyyy — full date for forms and protokoll */
export function formatDato(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    const dt = new Date(iso);
    return dt.toLocaleDateString(NB, { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(iso);
  }
}

/** 1 234 567 kr — Norwegian currency without decimals */
export function formatNOK(n: number | null | undefined): string {
  if (n == null) return '\u2013';
  return new Intl.NumberFormat(NB, { maximumFractionDigits: 0 }).format(n) + ' kr';
}

/** dd.mm.yyyy kl. HH:MM — date with time */
export function formatDatoTid(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    const dt = new Date(iso);
    const date = dt.toLocaleDateString(NB, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = dt.toLocaleTimeString(NB, { hour: '2-digit', minute: '2-digit' });
    return `${date}, kl. ${time}`;
  } catch {
    return String(iso);
  }
}
