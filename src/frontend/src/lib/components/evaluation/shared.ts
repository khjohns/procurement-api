/**
 * Shared utilities for evaluation components.
 * Pure functions — no Svelte imports, no side effects.
 */

import { scoreTier } from '$lib/stores/evaluation.svelte';

const TIER_COLORS = {
  high: 'var(--color-score-high)',
  mid: 'var(--color-ink-secondary)',
  low: 'var(--color-score-low)',
} as const;

const TIER_BGS = {
  high: 'var(--color-score-high-bg)',
  mid: 'transparent',
  low: 'var(--color-score-low-bg)',
} as const;

/** Score color based on tier thresholds (delegates to scoreTier). */
export function scoreColor(v: number | null | undefined): string {
  if (v == null) return 'var(--color-ink-ghost)';
  return TIER_COLORS[scoreTier(v)];
}

/** Score background for score badges (delegates to scoreTier). */
export function scoreBg(v: number | null | undefined): string {
  if (v == null) return 'transparent';
  return TIER_BGS[scoreTier(v)];
}

const _nf = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });

/** Format number with Norwegian locale (no decimals). */
export function fN(n: number): string {
  return _nf.format(n);
}

/** Format score for display: 1 decimal, dash for null. */
export function fS(v: number | null | undefined): string {
  return v != null ? v.toFixed(1) : '–';
}

/** Count completed evaluations for a criterion. */
export function countDone(
  criterion: {
    type: string;
    subcriteria: any[];
    evaluationType?: string;
    roles?: any[];
    scores?: Record<string, number>;
    items?: Record<string, any[]>;
  },
  suppliers: { id: string }[]
): { done: number; total: number } {
  const N = suppliers.length;

  if (criterion.type === 'price') {
    return { done: N, total: N };
  }

  // Leaf: direct scores on criterion
  if (criterion.subcriteria.length === 0 && criterion.evaluationType !== 'item') {
    const done = suppliers.filter((s) => criterion.scores?.[s.id] != null).length;
    return { done, total: N };
  }

  // Resource: roles × subcriteria (moments)
  if (criterion.evaluationType === 'item' && criterion.roles) {
    let done = 0;
    let total = 0;
    for (const s of suppliers) {
      for (const role of criterion.roles) {
        for (const sub of criterion.subcriteria) {
          total++;
          const items = criterion.items?.[s.id] ?? [];
          const item = items.find((it: any) => it.roleId === role.id);
          if (item?.scores?.[sub.id] != null) done++;
        }
      }
    }
    return { done, total };
  }

  // Traditional: subcriteria scores
  let done = 0;
  let total = 0;
  for (const s of suppliers) {
    for (const sub of criterion.subcriteria) {
      total++;
      if (sub.scores?.[s.id] != null) done++;
    }
  }
  return { done, total };
}
