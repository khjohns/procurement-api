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

// ── Convenience helpers for Artifik API codes ──

/** Translate Artifik procedure code (e.g. "Open") to Norwegian. */
export function artifikProcedureLabel(code: string | undefined, fallback?: string): string {
	if (!code) return fallback ?? '';
	return eformsLabel('artifik-procedure', code, fallback);
}

/** Translate Artifik contract nature code (e.g. "SERVICES") to Norwegian. */
export function artifikNatureLabel(code: string | undefined, fallback?: string): string {
	if (!code) return fallback ?? '';
	// Try pre-resolved Artifik label, then eForms lowercase lookup
	return eformsLabel('artifik-nature', code)
		?? eformsLabel('contract-nature', code.toLowerCase(), fallback);
}

/** Format Artifik threshold code to Norwegian label. */
export function formatThreshold(t: string | null | undefined): string {
	if (!t) return '—';
	return eformsLabel('threshold', t);
}
