/**
 * Reactive eForms codelist label lookup.
 *
 * Fetches Norwegian labels from /api/eforms-labels once and caches them
 * in $state so that Svelte components re-render when labels arrive.
 */

let cache = $state<Record<string, Record<string, string>> | null>(null);
let loading: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
	if (cache) return;
	if (loading) return loading;
	loading = fetch('/api/eforms-labels')
		.then((r) => (r.ok ? r.json() : {}))
		.then((data) => {
			cache = data;
		})
		.catch(() => {
			// Allow retry on next call
			loading = null;
		});
	return loading;
}

/** Pre-fetch labels (call early, e.g. in layout load). */
export function prefetchLabels(): void {
	ensureLoaded();
}

/** Look up a single label. Returns fallback (or raw code) if not found. */
export function eformsLabel(
	codelist: string,
	code: string | null | undefined,
	fallback?: string
): string {
	if (!code) return fallback ?? '';
	const labels = cache?.[codelist];
	return labels?.[code] ?? fallback ?? code;
}

/** Get all labels for a codelist. Returns empty object if not loaded. */
export function eformsLabels(codelist: string): Record<string, string> {
	return cache?.[codelist] ?? {};
}
