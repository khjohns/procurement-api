/**
 * Protokoll store — reactive state for the protocol document.
 * Uses Svelte 5 runes with class-based pattern (per ADR-003).
 *
 * All cascading calculations use $derived — no $effect.
 * localStorage auto-save via explicit save/restore methods.
 */

import {
	DEL2_SECTIONS,
	DEL3_SECTIONS,
	type SectionDefinition,
	type SectionContext,
	type FieldDefinition
} from './protokoll-sections';

// ── Types ──

export type AvvisningKategori = 'formalfeil' | 'leverandor' | 'tilbud';

export interface Avvisning {
	kategori: AvvisningKategori;
	begrunnelse: string;
}

export interface ManualFields {
	[key: string]: unknown;
	delingsbegrunnelse?: string;
	prosedyrebegrunnelse?: string;
	utvelgelsesbegrunnelser?: Record<string, string>;
	avvisningerFormalfeil?: Record<string, Avvisning>;
	avvisningerLeverandor?: Record<string, Avvisning>;
	forkastedeTilbud?: string;
	inhabilitet?: string;
	tildelingsbegrunnelse?: string;
	underleverandorer?: string;
	kvalifikasjonsvurderinger?: Record<string, string>;
	forhandlingsreferat?: string;
	klagefrist?: string;
	markedsdialog?: string;
	unntakElektronisk?: boolean;
	unntakElektroniskBegrunnelse?: string;
	reservasjonIdeell?: boolean;
	reservasjonIdeellBegrunnelse?: string;
	unormaltLavtTilbud?: boolean;
	unormaltLavtTilbudBegrunnelse?: string;
}

export type SectionStatus = 'complete' | 'partial' | 'empty' | 'na';

export interface ResolvedSection extends SectionDefinition {
	visible: boolean;
	status: SectionStatus;
	sectionNumber: number;
}

// ── Threshold map (matches Python protokoll/__main__.py) ──

const DEL2_THRESHOLDS = new Set(['below_eea_threshold_value', 'national_threshold']);

// ── Store ──

class ProtokollStore {
	procurement = $state<any>(null);
	activities = $state<any[]>([]);
	eforms = $state<any>(null);
	manual = $state<ManualFields>({});
	loading = $state(false);
	error = $state<string | null>(null);
	openSections = $state<Set<string>>(new Set());

	// Auto-save debounce
	private _saveTimer: ReturnType<typeof setTimeout> | null = null;
	private _lastSavedJson = '';

	// Derived: which document part (matches Python logic)
	isDel2 = $derived(
		DEL2_THRESHOLDS.has(this.procurement?.threshold ?? '')
	);

	// Derived: del label for display
	delLabel = $derived(this.isDel2 ? 'Del II' : 'Del III');

	// Derived: procedure type string
	procedure = $derived<string>(this.procurement?.procedure ?? '');

	// Derived: has eForms data
	hasEforms = $derived(this.eforms != null);

	// Derived: has framework agreement
	hasFramework = $derived(
		!!(this.procurement?.frameworkAgreementMaximumParticipants ||
			this.procurement?.frameworkAgreementTypeCode)
	);

	// Derived: suppliers from activities
	suppliers = $derived.by(() => {
		const seen = new Map<string, { id: string; name: string }>();
		for (const a of this.activities) {
			if (a.action === 'SUBMIT_BID' && a.supplier) {
				const key = String(a.supplier.id ?? a.supplier.name);
				if (!seen.has(key)) {
					seen.set(key, {
						id: key,
						name: a.supplier.name ?? `Leverandør ${key}`
					});
				}
			}
		}
		return [...seen.values()];
	});

	// Derived: section context for condition evaluation
	sectionContext = $derived<SectionContext>({
		isDel2: this.isDel2,
		procedure: this.procedure,
		hasEforms: this.hasEforms,
		hasFramework: this.hasFramework,
		activities: this.activities
	});

	// Derived: base section definitions
	sectionDefs = $derived<SectionDefinition[]>(
		this.isDel2 ? DEL2_SECTIONS : DEL3_SECTIONS
	);

	// Derived: resolved sections with visibility, status, numbering
	sections = $derived.by<ResolvedSection[]>(() => {
		let num = 0;
		return this.sectionDefs.map((def) => {
			const visible = def.condition ? def.condition(this.sectionContext) : true;
			if (visible) num++;
			return {
				...def,
				visible,
				status: visible ? this._resolveStatus(def) : 'na' as SectionStatus,
				sectionNumber: visible ? num : 0
			};
		});
	});

	// Derived: only visible sections
	visibleSections = $derived(this.sections.filter((s) => s.visible));

	// Derived: completeness (excludes N/A and datakvalitet)
	completeness = $derived.by(() => {
		const applicable = this.sections.filter(
			(s) => s.visible && s.id !== 'datakvalitet'
		);
		const complete = applicable.filter((s) => s.status === 'complete');
		const missing = applicable.filter((s) => s.status !== 'complete');
		return {
			done: complete.length,
			total: applicable.length,
			percent: applicable.length > 0
				? Math.round((complete.length / applicable.length) * 100)
				: 0,
			missing
		};
	});

	// Derived: number of open sections
	openCount = $derived(this.openSections.size);

	// ── Status resolution ──

	private _resolveStatus(def: SectionDefinition): SectionStatus {
		if (def.dataSource === 'api' || def.dataSource === 'eforms') {
			// Pure auto-filled sections are always complete if data exists
			if (def.dataSource === 'eforms' && !this.hasEforms) return 'empty';
			if (def.dataSource === 'api' && !this.procurement) return 'empty';
			return 'complete';
		}

		// Manual or mixed: check each field
		const manualFields = def.fields.filter(
			(f) => f.type !== 'info-table' && f.type !== 'supplier-list' && f.type !== 'data-quality-table'
		);

		if (manualFields.length === 0) return 'complete';

		let filled = 0;
		let total = 0;

		for (const field of manualFields) {
			const result = this._fieldFilled(field);
			total += result.total;
			filled += result.filled;
		}

		if (total === 0) return 'complete';
		if (filled === 0) return 'empty';
		if (filled >= total) return 'complete';
		return 'partial';
	}

	private _fieldFilled(field: FieldDefinition): { filled: number; total: number } {
		const val = this.manual[field.key];

		switch (field.type) {
			case 'textarea':
			case 'tipex': {
				const text = typeof val === 'string' ? val.replace(/<[^>]*>/g, '').trim() : '';
				return { total: 1, filled: text.length > 0 ? 1 : 0 };
			}

			case 'checkbox-textarea': {
				// Checkbox unchecked = complete (nothing to do). Checked + empty = incomplete.
				const checked = !!this.manual[field.key];
				if (!checked) return { total: 1, filled: 1 };
				const begrunnelse = typeof this.manual[`${field.key}Begrunnelse`] === 'string'
					? (this.manual[`${field.key}Begrunnelse`] as string).trim()
					: '';
				return { total: 1, filled: begrunnelse.length > 0 ? 1 : 0 };
			}

			case 'per-supplier-textarea':
			case 'per-supplier-tipex': {
				const record = val as Record<string, string> | undefined;
				if (!record || this.suppliers.length === 0) {
					return { total: this.suppliers.length || 1, filled: 0 };
				}
				let filled = 0;
				for (const s of this.suppliers) {
					const text = (record[s.id] ?? '').replace(/<[^>]*>/g, '').trim();
					if (text.length > 0) filled++;
				}
				return { total: this.suppliers.length, filled };
			}

			case 'avvisning-card': {
				const record = val as Record<string, Avvisning> | undefined;
				if (!record) return { total: 1, filled: 0 };
				const entries = Object.values(record);
				if (entries.length === 0) return { total: 1, filled: 0 };
				let filled = 0;
				for (const entry of entries) {
					if (entry.kategori && entry.begrunnelse?.trim()) filled++;
				}
				return { total: entries.length, filled };
			}

			default:
				return { total: 0, filled: 0 };
		}
	}

	// ── Mutation methods ──

	setManualField(key: string, value: unknown) {
		this.manual = { ...this.manual, [key]: value };
		this._scheduleSave();
	}

	setPerSupplierField(key: string, supplierId: string, value: string) {
		const current = (this.manual[key] as Record<string, string>) ?? {};
		this.manual = {
			...this.manual,
			[key]: { ...current, [supplierId]: value }
		};
		this._scheduleSave();
	}

	setAvvisning(key: string, supplierId: string, avvisning: Avvisning) {
		const current = (this.manual[key] as Record<string, Avvisning>) ?? {};
		this.manual = {
			...this.manual,
			[key]: { ...current, [supplierId]: avvisning }
		};
		this._scheduleSave();
	}

	toggleSection(sectionId: string) {
		const next = new Set(this.openSections);
		if (next.has(sectionId)) {
			next.delete(sectionId);
		} else {
			next.add(sectionId);
		}
		this.openSections = next;
	}

	closeAllSections() {
		this.openSections = new Set();
	}

	isSectionOpen(sectionId: string): boolean {
		return this.openSections.has(sectionId);
	}

	// ── Data loading ──

	async loadProcurement(procurementId: number) {
		this.loading = true;
		this.error = null;

		try {
			const [procRes, actRes] = await Promise.all([
				fetch(`/api/procurements/${procurementId}`),
				fetch(`/api/procurements/${procurementId}/activities`)
			]);

			if (!procRes.ok) throw new Error(`Kunne ikke hente anskaffelse: ${procRes.status}`);
			if (!actRes.ok) throw new Error(`Kunne ikke hente aktiviteter: ${actRes.status}`);

			const [proc, acts] = await Promise.all([procRes.json(), actRes.json()]);
			this.procurement = proc;
			this.activities = Array.isArray(acts) ? acts : acts.activities ?? [];

			// Try to fetch eForms data if doffin_id available
			const doffinId = proc.doffinReferenceId || proc.doffin_id;
			if (doffinId) {
				try {
					const eformsRes = await fetch(`/api/eforms/${doffinId}`);
					if (eformsRes.ok) {
						this.eforms = await eformsRes.json();
					}
				} catch {
					// eForms is optional — silently ignore
				}
			}

			// Restore saved manual fields
			this._restoreFromStorage(procurementId);
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
		} finally {
			this.loading = false;
		}
	}

	async generateDocx(): Promise<Blob | null> {
		try {
			const res = await fetch('/api/protokoll/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					procurement: this.procurement,
					activities: this.activities,
					eforms: this.eforms,
					isDel2: this.isDel2,
					manual: this.manual
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Ukjent feil' }));
				throw new Error(err.error || `HTTP ${res.status}`);
			}

			return await res.blob();
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
			return null;
		}
	}

	// ── localStorage persistence ──

	private _storageKey(procId: number): string {
		return `protokoll:${procId}`;
	}

	private _scheduleSave() {
		if (this._saveTimer) clearTimeout(this._saveTimer);
		this._saveTimer = setTimeout(() => this._saveToStorage(), 500);
	}

	private _saveToStorage() {
		const procId = this.procurement?.id;
		if (!procId) return;

		try {
			const json = JSON.stringify(this.manual);
			if (json === this._lastSavedJson) return;
			localStorage.setItem(this._storageKey(procId), json);
			this._lastSavedJson = json;
		} catch {
			// localStorage full or unavailable — ignore
		}
	}

	private _restoreFromStorage(procId: number) {
		try {
			const saved = localStorage.getItem(this._storageKey(procId));
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed && typeof parsed === 'object') {
					this.manual = parsed as ManualFields;
					this._lastSavedJson = saved;
				}
			}
		} catch {
			// Corrupt data — start fresh
		}
	}

	/** Reset store to initial state. */
	reset() {
		this.procurement = null;
		this.activities = [];
		this.eforms = null;
		this.manual = {};
		this.loading = false;
		this.error = null;
		this.openSections = new Set();
		this._lastSavedJson = '';
	}

	/** Check if a procurement is loaded. */
	get hasData(): boolean {
		return this.procurement != null;
	}
}

export const protokoll = new ProtokollStore();
