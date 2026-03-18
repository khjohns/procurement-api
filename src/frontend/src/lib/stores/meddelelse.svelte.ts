/**
 * Meddelelse store — reactive state for award notification letters.
 * Auto-generates letters from evaluation + protokoll data.
 * All configuration (karens, klagefrist) is read from protokoll localStorage.
 */

import { type EvaluationData, type ActiveMethod, type Supplier } from './evaluation.svelte';
import {
  computeGroupScores,
  computeItemScores,
  computePriceFormulaScores,
  computeTotals,
  computeRanking,
} from './evaluation-computations';
import {
  generateEvaluationDescription,
  type JustificationInput,
} from '$lib/utils/justification-generator';
import { generateMeddelelse, type MeddelelseInput } from '$lib/utils/meddelelse-generator';
import { buildOrgLookup, getOrgNameWithLookup } from '$lib/utils/protokoll-helpers';

// ── Types ──

export interface MeddelelseLetterResult {
  supplier: Supplier;
  html: string;
  isWinner: boolean;
}

// ── Threshold map ──

const DEL2_THRESHOLDS = new Set(['below_eea_threshold_value', 'national_threshold']);

// ── Store ──

class MeddelelseStore {
  procurement = $state<any>(null);
  activities = $state<any[]>([]);

  /** Raw letter index — clamped via `currentIdx` derived. */
  private _currentIdx = $state(0);

  // ── Derived procurement info ──

  isDel2 = $derived(DEL2_THRESHOLDS.has(this.procurement?.threshold ?? ''));

  // ── Protokoll data bridge (read from localStorage) ──

  private _protokollVersion = $state(0);

  private _protokollData = $derived.by<{
    selectedSuppliers: string[];
    karensDager: number;
    klagefristDato: string;
  }>(() => {
    const procId = this.procurement?.id;
    const _v = this._protokollVersion;
    if (!procId || typeof localStorage === 'undefined') {
      return { selectedSuppliers: [], karensDager: 10, klagefristDato: '' };
    }
    try {
      const raw = localStorage.getItem(`protokoll:${procId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const selectedSuppliers = Array.isArray(parsed?.selectedSuppliers)
          ? parsed.selectedSuppliers
          : [];

        // Del II uses klagefrist, Del III uses karensperiodeUtlop
        const klagefristDato =
          (parsed?.klagefrist as string) ?? (parsed?.karensperiodeUtlop as string) ?? '';

        // Compute karens days from meddelelseDato → klagefrist if both exist
        let karensDager = 10;
        if (parsed?.meddelelseDato && klagefristDato) {
          const ms = new Date(klagefristDato).getTime() - new Date(parsed.meddelelseDato).getTime();
          const days = Math.round(ms / 86400000);
          if (days > 0) karensDager = days;
        }

        return { selectedSuppliers, karensDager, klagefristDato };
      }
    } catch {
      /* corrupt */
    }
    return { selectedSuppliers: [], karensDager: 10, klagefristDato: '' };
  });

  selectedSupplierIds = $derived<string[]>(this._protokollData.selectedSuppliers);
  karensDager = $derived(this._protokollData.karensDager);
  klagefristDato = $derived(this._protokollData.klagefristDato);

  // ── Evaluation data bridge ──

  private _evalVersion = $state(0);
  private _lastEvalRaw = '';
  private _lastEvalParsed: { data: EvaluationData; activeMethod: ActiveMethod } | null = null;

  evaluationSnapshot = $derived.by<{ data: EvaluationData; activeMethod: ActiveMethod } | null>(
    () => {
      const procId = this.procurement?.id;
      const _v = this._evalVersion;
      if (!procId || typeof localStorage === 'undefined') return null;
      try {
        const raw = localStorage.getItem(`eval-${procId}`);
        if (!raw) {
          this._lastEvalRaw = '';
          this._lastEvalParsed = null;
          return null;
        }
        if (raw === this._lastEvalRaw) return this._lastEvalParsed;
        const parsed = JSON.parse(raw);
        if (parsed?.data) {
          this._lastEvalParsed = {
            data: parsed.data,
            activeMethod: parsed.activeMethod ?? 'poeng',
          };
          this._lastEvalRaw = raw;
          return this._lastEvalParsed;
        }
      } catch {
        /* corrupt */
      }
      return null;
    }
  );

  hasEvaluation = $derived(this.evaluationSnapshot != null);

  // ── Pre-computed evaluation values ──

  private _evalItemScores = $derived.by<Record<string, Record<string, number>>>(() => {
    const snap = this.evaluationSnapshot;
    if (!snap) return {};
    return computeItemScores(snap.data.criteria, snap.data.suppliers);
  });

  evalPriceFormulaScores = $derived.by<Record<string, number>>(() => {
    const snap = this.evaluationSnapshot;
    if (!snap) return {};
    return computePriceFormulaScores(snap.data.suppliers);
  });

  evalGroupScores = $derived.by<Record<string, Record<string, number>>>(() => {
    const snap = this.evaluationSnapshot;
    if (!snap) return {};
    return computeGroupScores(
      snap.data.criteria,
      snap.data.suppliers,
      snap.activeMethod,
      this._evalItemScores,
      this.evalPriceFormulaScores
    );
  });

  evalTotals = $derived.by<Record<string, number>>(() => {
    const snap = this.evaluationSnapshot;
    if (!snap) return {};
    return computeTotals(snap.data.criteria, snap.data.suppliers, this.evalGroupScores);
  });

  evalRanking = $derived.by<Array<{ supplier: Supplier; score: number; rank: number }>>(() => {
    const snap = this.evaluationSnapshot;
    if (!snap) return [];
    return computeRanking(snap.data.suppliers, this.evalTotals);
  });

  // ── Activity-derived data ──

  private _orgLookup = $derived(buildOrgLookup(this.activities));

  /** Evaluated suppliers (exclude rejected/withdrawn). */
  evaluatedSuppliers = $derived.by<Supplier[]>(() => {
    const snap = this.evaluationSnapshot;
    if (!snap) return [];
    const excluded = new Set(
      this.activities
        .filter(
          (a: any) => a.action === 'REJECT_PARTICIPATION' || a.action === 'WITHDRAW_PARTICIPATION'
        )
        .map((a: any) => getOrgNameWithLookup(a, this._orgLookup).toLowerCase())
    );
    return snap.data.suppliers.filter((s) => !excluded.has(s.name.toLowerCase()));
  });

  /** Rejected supplier count. */
  rejectedCount = $derived.by(() => {
    const rejected = new Set(
      this.activities
        .filter((a: any) => a.action === 'REJECT_PARTICIPATION')
        .map((a: any) => getOrgNameWithLookup(a, this._orgLookup).toLowerCase())
    );
    return rejected.size;
  });

  /** Total bids. */
  totalBids = $derived(this.activities.filter((a: any) => a.action === 'SUBMIT_BID').length);

  /** Can generate? */
  canGenerate = $derived(this.evaluationSnapshot != null && this.selectedSupplierIds.length > 0);

  /** Auto-generated letters (derived — regenerates when inputs change). */
  letters = $derived.by<MeddelelseLetterResult[]>(() => {
    const snap = this.evaluationSnapshot;
    if (!snap || this.selectedSupplierIds.length === 0 || this.evaluatedSuppliers.length === 0) {
      return [];
    }

    const evalInput: JustificationInput = {
      data: snap.data,
      activeMethod: snap.activeMethod,
      selectedSupplierIds: this.selectedSupplierIds,
      groupScores: this.evalGroupScores,
      totals: this.evalTotals,
      ranking: this.evalRanking,
      priceFormulaScores: this.evalPriceFormulaScores,
    };
    const evalHtml = generateEvaluationDescription(evalInput);

    return this.evaluatedSuppliers.map((recipient) => {
      const input: MeddelelseInput = {
        evaluation: evalInput,
        recipientSupplier: recipient,
        procurement: this.procurement,
        totalBids: this.totalBids,
        rejectedCount: this.rejectedCount,
        karensDager: this.karensDager,
        klagefristDato: this.klagefristDato || undefined,
        evaluationDescriptionHtml: evalHtml,
      };
      return {
        supplier: recipient,
        html: generateMeddelelse(input),
        isWinner: this.selectedSupplierIds.includes(recipient.id),
      };
    });
  });

  /** Whether letters have been generated. */
  hasLetters = $derived(this.letters.length > 0);

  /** Currently viewed letter index (clamped to valid range). */
  currentIdx = $derived(
    this.letters.length === 0 ? 0 : Math.min(this._currentIdx, this.letters.length - 1)
  );

  /** Current letter. */
  currentLetter = $derived<MeddelelseLetterResult | null>(this.letters[this.currentIdx] ?? null);

  // ── Methods ──

  loadFromData(proc: any, activities: any[]) {
    if (!proc) return;
    const newActivities = Array.isArray(activities) ? activities : [];
    if (this.procurement?.id === proc.id) {
      this.activities = newActivities;
      return;
    }
    this.procurement = proc;
    this.activities = newActivities;
    this._currentIdx = 0;
  }

  refreshData() {
    this._evalVersion++;
    this._protokollVersion++;
  }

  setCurrentIdx(idx: number) {
    if (idx >= 0 && idx < this.letters.length) {
      this._currentIdx = idx;
    }
  }

  reset() {
    this.procurement = null;
    this.activities = [];
    this._currentIdx = 0;
  }
}

export const meddelelse = new MeddelelseStore();
