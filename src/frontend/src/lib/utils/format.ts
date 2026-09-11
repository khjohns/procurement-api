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

/** 3. mar — short date with month name, for timelines */
export function formatDatoMndKort(d: Date): string {
  return d.toLocaleDateString(NB, { day: 'numeric', month: 'short' });
}

/** 3. mar 2026 — short date with month name and year */
export function formatDatoMndAar(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    return new Date(iso).toLocaleDateString(NB, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(iso);
  }
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

/** Beregner og formaterer total varighet i år og måneder (f.eks. "4 år", "3 år og 6 måneder", "6 måneder") */
export function formatVarighet(
  startStr?: string | null,
  endStr?: string | null,
  durationMonths?: number | null,
  rawDuration?: string | null
): string {
  if (startStr && endStr) {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      // Legg til 1 dag for å inkludere hele sluttdatoen
      const adjustedEnd = new Date(e.getTime() + 24 * 60 * 60 * 1000);
      let years = adjustedEnd.getFullYear() - s.getFullYear();
      let months = adjustedEnd.getMonth() - s.getMonth();
      let days = adjustedEnd.getDate() - s.getDate();

      if (days < 0) {
        months -= 1;
        const prevMonth = new Date(adjustedEnd.getFullYear(), adjustedEnd.getMonth(), 0);
        days += prevMonth.getDate();
      }

      if (months < 0) {
        years -= 1;
        months += 12;
      }

      if (days >= 27) {
        months += 1;
        days = 0;
        if (months >= 12) {
          years += 1;
          months -= 12;
        }
      }

      const parts: string[] = [];
      if (years > 0) parts.push(`${years} ${years === 1 ? 'år' : 'år'}`);
      if (months > 0) parts.push(`${months} ${months === 1 ? 'måned' : 'måneder'}`);
      if (parts.length === 0 && days > 0) parts.push(`${days} dager`);

      if (parts.length > 0) return parts.join(' og ');
    }
  }

  if (durationMonths && durationMonths > 0) {
    const years = Math.floor(durationMonths / 12);
    const months = durationMonths % 12;
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} år`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'måned' : 'måneder'}`);
    return parts.join(' og ');
  }

  if (rawDuration) return rawDuration;
  return '–';
}

/**
 * Summerer total opsjonsvarighet fra optionsJSON (normalt i år).
 * Håndterer både JSON-streng og allerede-parset array/objekt:
 * Eksempel: [{prolongPeriods:[1]},{prolongPeriods:[1,1]}] → 3 år
 */
export function opsjonsVarighetAar(
  optionsJSON?: string | Array<Record<string, unknown>> | object | null
): number {
  if (!optionsJSON) return 0;
  let parsed: unknown;
  if (typeof optionsJSON === 'string') {
    try {
      parsed = JSON.parse(optionsJSON);
    } catch {
      return 0;
    }
  } else {
    parsed = optionsJSON;
  }
  if (!Array.isArray(parsed)) return 0;
  let total = 0;
  for (const opt of parsed as Array<Record<string, unknown>>) {
    const pipes = opt?.prolongPeriods;
    if (Array.isArray(pipes)) {
      for (const p of pipes) {
        const n = typeof p === 'number' ? p : Number(p);
        if (!isNaN(n)) total += n;
      }
    }
  }
  return total;
}

/**
 * Beregner siste mulige utløpsdato inkludert alle opsjoner/forlengelser.
 * Returnerer ISO-datostreng (yyyy-mm-dd) eller null hvis ikke mulig.
 */
export function forlengetUtlopsdato(
  endStr?: string | null,
  optionsJSON?: string | Array<Record<string, unknown>> | object | null
): string | null {
  if (!endStr) return null;
  const end = new Date(endStr);
  if (isNaN(end.getTime())) return null;
  const aar = opsjonsVarighetAar(optionsJSON);
  if (aar <= 0) return null;
  end.setFullYear(end.getFullYear() + aar);
  return end.toISOString().slice(0, 10);
}
