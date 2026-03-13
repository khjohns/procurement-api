/**
 * Sensitivity store — weight simulation + tipping point analysis.
 * Uses $state overrides Map merged into $derived for simulation.
 */

import { evaluation, weightedAverage, type Criterion } from './evaluation.svelte';

export interface SimulatedWeight {
  id: string;
  name: string;
  original: number;
  weight: number;
}

export interface TippingPoint {
  challengerId: string;
  challengerName: string;
  criterionId: string;
  criterionName: string;
  type: 'score' | 'weight';
  /** For score: margin in points. For weight: threshold % that flips ranking. */
  delta: number;
  /** Current value (score gap or weight %). */
  current: number;
}

export interface PairAnalysis {
  winnerId: string;
  winnerName: string;
  challengerId: string;
  challengerName: string;
  totalMargin: number;
  tippingPoints: TippingPoint[];
  stable: boolean;
}

class SensitivityStore {
  /** User overrides: criterionId → simulated weight. */
  #overrides = $state<Record<string, number>>({});

  /** Merged view: evaluation criteria weights + user overrides. */
  simulatedWeights: SimulatedWeight[] = $derived.by(() => {
    return evaluation.data.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      original: c.weight,
      weight: this.#overrides[c.id] ?? c.weight,
    }));
  });

  simulatedSum = $derived(this.simulatedWeights.reduce((s, w) => s + w.weight, 0));

  hasChanges = $derived(this.simulatedWeights.some((w) => w.weight !== w.original));

  /** Simulated totals per supplier using simulated weights. */
  simulatedTotals = $derived.by(() => {
    const result: Record<string, number> = {};
    const totalSimWeight = this.simulatedWeights.reduce((s, w) => s + w.weight, 0);
    if (totalSimWeight === 0) return result;

    const weightMap = new Map(this.simulatedWeights.map((w) => [w.id, w.weight]));

    for (const supplier of evaluation.data.suppliers) {
      let sum = 0;
      for (const criterion of evaluation.data.criteria) {
        const simWeight = weightMap.get(criterion.id) ?? criterion.weight;
        const avg = weightedAverage(criterion.subcriteria, supplier.id, evaluation.itemScores);
        sum += avg * simWeight;
      }
      result[supplier.id] = sum / totalSimWeight;
    }
    return result;
  });

  simulatedRanking = $derived.by(() => {
    return evaluation.data.suppliers
      .map((s) => ({
        id: s.id,
        name: s.name,
        score: this.simulatedTotals[s.id] ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  });

  /** Whether the #1 position changed. */
  winnerChanged = $derived(
    evaluation.ranking.length > 0 &&
      this.simulatedRanking.length > 0 &&
      evaluation.ranking[0].supplier.id !== this.simulatedRanking[0].id
  );

  /** Whether any ranking position differs from actual. */
  rankingChanged = $derived.by(() => {
    if (evaluation.ranking.length !== this.simulatedRanking.length) return true;
    return evaluation.ranking.some(
      (entry, i) => entry.supplier.id !== this.simulatedRanking[i]?.id
    );
  });

  pairAnalyses = $derived.by(() => {
    return computePairAnalyses(
      evaluation.data.criteria,
      evaluation.ranking,
      evaluation.groupScores
    );
  });

  robustnessLabel = $derived.by(() => {
    if (this.pairAnalyses.length === 0) return 'stabil';
    const minMargin = Math.min(...this.pairAnalyses.map((p) => p.totalMargin));
    if (minMargin >= 0.5) return 'robust';
    if (minMargin >= 0.2) return 'moderat robust';
    return 'sårbart';
  });

  /** Most sensitive parameter: weight tipping point closest to flipping. */
  mostSensitive = $derived.by(() => {
    let best: { criterionName: string; weight: number; distanceToFlip: number } | null = null;
    for (const pair of this.pairAnalyses) {
      for (const tp of pair.tippingPoints) {
        if (tp.type === 'weight') {
          const dist = Math.abs(tp.delta - tp.current);
          if (!best || dist < best.distanceToFlip) {
            best = { criterionName: tp.criterionName, weight: tp.current, distanceToFlip: dist };
          }
        }
      }
    }
    if (!best) {
      const heaviest = evaluation.data.criteria.reduce((a, b) => (a.weight > b.weight ? a : b));
      return { criterionName: heaviest.name, weight: heaviest.weight };
    }
    return best;
  });

  setWeight(criterionId: string, weight: number) {
    this.#overrides = {
      ...this.#overrides,
      [criterionId]: Math.max(0, Math.min(100, Math.round(weight))),
    };
  }

  reset() {
    this.#overrides = {};
  }
}

/** Compute tipping points for all winner–challenger pairs. */
function computePairAnalyses(
  criteria: Criterion[],
  ranking: Array<{ supplier: { id: string; name: string }; score: number; rank: number }>,
  groupScores: Record<string, Record<string, number>>
): PairAnalysis[] {
  if (ranking.length < 2) return [];

  const winner = ranking[0];
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return [];

  const results: PairAnalysis[] = [];

  for (let i = 1; i < ranking.length; i++) {
    const challenger = ranking[i];
    const margin = winner.score - challenger.score;
    const tippingPoints: TippingPoint[] = [];

    for (const criterion of criteria) {
      const winnerGroup = groupScores[criterion.id]?.[winner.supplier.id] ?? 0;
      const challengerGroup = groupScores[criterion.id]?.[challenger.supplier.id] ?? 0;
      const scoreDiff = winnerGroup - challengerGroup;

      tippingPoints.push({
        challengerId: challenger.supplier.id,
        challengerName: challenger.supplier.name,
        criterionId: criterion.id,
        criterionName: criterion.name,
        type: 'score',
        delta: scoreDiff,
        current: scoreDiff,
      });

      // Weight tipping: find weight where challenger overtakes winner
      // winnerOther + winnerGroup * w = challengerOther + challengerGroup * w
      // w = (challengerOther - winnerOther) / (winnerGroup - challengerGroup)
      const winnerOtherSum = criteria
        .filter((c) => c.id !== criterion.id)
        .reduce((s, c) => s + (groupScores[c.id]?.[winner.supplier.id] ?? 0) * c.weight, 0);
      const challengerOtherSum = criteria
        .filter((c) => c.id !== criterion.id)
        .reduce((s, c) => s + (groupScores[c.id]?.[challenger.supplier.id] ?? 0) * c.weight, 0);

      const denominator = winnerGroup - challengerGroup;

      if (Math.abs(denominator) > 0.0001) {
        const flipWeight = (challengerOtherSum - winnerOtherSum) / denominator;
        if (flipWeight >= 0 && flipWeight <= 100) {
          tippingPoints.push({
            challengerId: challenger.supplier.id,
            challengerName: challenger.supplier.name,
            criterionId: criterion.id,
            criterionName: criterion.name,
            type: 'weight',
            delta: flipWeight,
            current: criterion.weight,
          });
        }
      }
    }

    tippingPoints.sort((a, b) => {
      if (a.type === 'weight' && b.type === 'weight') {
        return Math.abs(a.delta - a.current) - Math.abs(b.delta - b.current);
      }
      if (a.type === 'weight') return -1;
      if (b.type === 'weight') return 1;
      return Math.abs(a.delta) - Math.abs(b.delta);
    });

    const hasWeightFlip = tippingPoints.some((tp) => tp.type === 'weight');
    results.push({
      winnerId: winner.supplier.id,
      winnerName: winner.supplier.name,
      challengerId: challenger.supplier.id,
      challengerName: challenger.supplier.name,
      totalMargin: margin,
      tippingPoints,
      stable: !hasWeightFlip && margin >= 0.5,
    });
  }

  return results.sort((a, b) => a.totalMargin - b.totalMargin);
}

export const sensitivity = new SensitivityStore();
