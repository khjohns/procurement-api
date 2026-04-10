import type { Activity } from '$lib/types/activity';

/** Extract unique bidders (SUBMIT_BID actors) from procurement activities. */
export function extractBidders(activities: Activity[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const a of activities) {
    if (a.action === 'SUBMIT_BID') {
      const org = a.organization ?? a.supplier;
      if (!org) continue;
      const key = String(org.id ?? org.name);
      if (!seen.has(key)) {
        seen.set(key, org.name ?? `Leverandør ${key}`);
      }
    }
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}
