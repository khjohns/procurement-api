/**
 * Pure helper functions for the protokoll page.
 * Extracted from +page.svelte to reduce component complexity.
 */

import { eformsLabel } from './eforms-labels';

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

/** Format threshold code to Norwegian label. */
export function formatThreshold(t: string | null | undefined): string {
  if (!t) return '—';
  return eformsLabel('threshold', t);
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

/** Artifik API procedure code → eForms code mapping. */
const ARTIFIK_PROCEDURE_TO_EFORMS: Record<string, string> = {
  Open: 'open',
  Limited: 'restricted',
  'Competitive negotiated': 'neg-w-call',
  'Competitive dialogue': 'comp-dial',
  'Innovation partnership': 'innovation',
  'Negotiated without publication': 'neg-wo-call',
  'Direct award': 'oth-single',
};

/** Artifik API nature code → eForms code mapping. */
const ARTIFIK_NATURE_TO_EFORMS: Record<string, string> = {
  SERVICES: 'services',
  SUPPLIES: 'supplies',
  WORKS: 'works',
  goods_and_services: 'combined',
};

/** Translate Artifik procedure code to Norwegian label. */
export function artifikProcedureLabel(code: string | undefined, fallback?: string): string {
  if (!code) return fallback ?? '';
  const eformsCode = ARTIFIK_PROCEDURE_TO_EFORMS[code];
  return eformsCode
    ? eformsLabel('procurement-procedure-type', eformsCode, fallback ?? code)
    : fallback ?? code;
}

/** Translate Artifik contract nature code to Norwegian label. */
export function artifikNatureLabel(code: string | undefined, fallback?: string): string {
  if (!code) return fallback ?? '';
  const eformsCode = ARTIFIK_NATURE_TO_EFORMS[code] ?? code.toLowerCase();
  return eformsLabel('contract-nature', eformsCode, fallback ?? code);
}
