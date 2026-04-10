/**
 * Pure helper functions for the protokoll page.
 * Extracted from +page.svelte to reduce component complexity.
 */

/** Strip HTML tags and normalize whitespace. */
export function stripHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => l || (i > 0 && arr[i - 1]))
    .join('\n')
    .trim();
}

/** Get a date string from a procurement timeline by type. */
export function getTimelineDate(proc: any, type: string): string | null {
  if (!proc?.timeline) return null;
  for (const entry of Object.values(proc.timeline) as any[]) {
    if (entry?.type === type && entry?.date) {
      return entry.date;
    }
  }
  return null;
}

/** Get org name from an activity. */
export function getOrgName(activity: any): string {
  const org = activity?.organization ?? activity?.supplier;
  return org?.name ?? `Leverandør ${org?.id ?? '?'}`;
}

/** Build org-id → name lookup from all activities. */
export function buildOrgLookup(activities: any[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const a of activities) {
    const org = a.organization ?? a.supplier;
    if (org?.id && org?.name) lookup.set(org.id, org.name);
  }
  return lookup;
}

/** Get org name with fallback to lookup map. */
export function getOrgNameWithLookup(activity: any, lookup: Map<string, string>): string {
  const org = activity?.organization ?? activity?.supplier;
  if (org?.name) return org.name;
  if (org?.id && lookup.has(org.id)) return lookup.get(org.id)!;
  return `Leverandør ${org?.id ?? '?'}`;
}

/** Format a number as Norwegian currency. */
export function fmtCurrency(value: number | null | undefined, currency?: string): string | null {
  if (value == null) return null;
  return `${new Intl.NumberFormat('nb-NO').format(value)} ${currency ?? 'NOK'}`;
}

/** Threshold code → Norwegian label. */
const THRESHOLD_LABELS: Record<string, string> = {
  over_eea_threshold_value: 'Over EØS-terskel',
  below_eea_threshold_value: 'Under EØS-terskel',
  national_threshold: 'Nasjonal terskel',
  below_national_threshold: 'Under nasjonal terskel',
};

/** Format threshold code to Norwegian label. */
export function formatThreshold(t: string | null | undefined): string {
  return t ? (THRESHOLD_LABELS[t] ?? t) : '—';
}

/** Procurement display name with HTML stripping. */
export function getProcName(proc: any): string {
  const raw = proc?.name || proc?.title || '';
  return stripHtml(raw) || `Anskaffelse ${proc?.id ?? ''}`;
}

/** Add calendar days to an ISO date string. */
export function addDays(isoDate: string, days: number): string {
  const dt = new Date(isoDate + 'T00:00:00');
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Case-insensitive label lookup. Returns the raw key as fallback if no match. */
export function lookupLabel(map: Record<string, string>, key: string | undefined): string | null {
  if (!key) return null;
  if (map[key]) return map[key];
  const cap = key.charAt(0).toUpperCase() + key.slice(1);
  return map[cap] ?? key;
}

/** Procedure code → Norwegian label. */
export const PROCEDURE_LABELS: Record<string, string> = {
  Open: 'Åpen anbudskonkurranse',
  Limited: 'Begrenset anbudskonkurranse',
  'Competitive negotiated': 'Konkurranse med forhandling etter forutgående kunngjøring',
  'Competitive dialogue': 'Konkurransepreget dialog',
  'Innovation partnership': 'Innovasjonspartnerskap',
  'Negotiated without publication': 'Konkurranse med forhandling uten forutgående kunngjøring',
  'Direct award': 'Anskaffelse uten konkurranse',
};

/** Contract nature code → Norwegian label. */
export const CONTRACT_NATURE_LABELS: Record<string, string> = {
  services: 'Tjeneste',
  supplies: 'Varer',
  works: 'Bygg og anlegg',
};
