import type { FaseStatus } from '$lib/types/saksmappe';
import type { Activity } from '$lib/types/activity';
import { formatDatoMndKort } from '$lib/utils/format';
import { getTimelineDate } from '$lib/utils/protokoll-helpers';

export interface PhaseDefinition {
  id: string;
  label: string;
  route: string;
}

export interface PhaseState {
  status: FaseStatus;
  meta: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- proc shape varies
export type ProcDeadlineInfo = Record<string, any>;

/**
 * Three phases matching the user's mental model:
 * 1. Registrering — prepare and classify
 * 2. Konkurranse — the work phase (includes kvalifisering, evaluering, protokoll, meddelelse)
 * 3. Tildeling — award, standstill, contract (absorbs old "kontrakt" phase)
 */
export const phases: PhaseDefinition[] = [
  { id: 'registrering', label: 'Registrering', route: '' },
  { id: 'konkurranse', label: 'Konkurranse', route: 'konkurranse' },
  { id: 'tildeling', label: 'Tildeling', route: 'tildeling' },
];

/** Map sub-routes to the phase they belong to. */
export const routeToPhase: Record<string, string> = {
  konkurranse: 'konkurranse',
  kvalifisering: 'konkurranse',
  evaluering: 'konkurranse',
  protokoll: 'konkurranse',
  meddelelse: 'konkurranse',
  tildeling: 'tildeling',
};

/** Human-readable label for sub-routes (breadcrumbs). */
export const routeLabels: Record<string, string> = {
  konkurranse: 'Konkurranse',
  kvalifisering: 'Kvalifisering',
  evaluering: 'Evaluering',
  tildeling: 'Tildeling',
  protokoll: 'Protokoll',
  meddelelse: 'Meddelelse',
};

export const statusLabels: Record<FaseStatus, string> = {
  fullfort: 'Fullført',
  aktiv: 'Aktiv',
  kommende: 'Kommende',
};

function activityDate(activities: Activity[], action: string): string | null {
  const a = activities.find((x) => x.action === action);
  if (!a) return null;
  return formatDatoMndKort(new Date(a.date));
}

/**
 * Derive phase statuses from activities and procurement data.
 *
 * Phase gates (3-phase model):
 * - PUBLISH_TO_DOFFIN → registrering done, konkurranse starts
 * - areAwardLettersSent → konkurranse done, tildeling starts
 *
 * Note: konkurranse is NOT done when bids are received. The user continues
 * to work on evaluation, protocol, and award letters within this phase.
 */
export function derivePhaseStates(
  activities: Activity[],
  proc?: ProcDeadlineInfo,
): Record<string, PhaseState> {
  const actions = new Set(activities.map((a) => a.action));
  const published = actions.has('PUBLISH_TO_DOFFIN');
  const awardLettersSent = proc?.areAwardLettersSent === true;

  // Deadline countdown for active konkurranse
  const deadline = proc?.currentDeadline ?? getTimelineDate(proc, 'submission');
  let konkurranseMeta = 'Aktiv';
  if (deadline) {
    const d = new Date(deadline);
    const dager = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    konkurranseMeta = `Frist: ${formatDatoMndKort(d)} · ${Math.abs(dager)}d`;
  }

  // Sub-state hints for konkurranse meta
  const hasBids = actions.has('SUBMIT_BID');
  const awarded = actions.has('AWARDING_PARTICIPANTS');
  if (awarded && !awardLettersSent) {
    konkurranseMeta = 'Tildeling pågår';
  } else if (hasBids && !awarded) {
    konkurranseMeta = 'Evaluering pågår';
  }

  return {
    registrering: {
      status: published ? 'fullfort' : 'aktiv',
      meta: published
        ? activityDate(activities, 'PUBLISH_TO_DOFFIN') ?? 'Fullført'
        : 'Aktiv',
    },
    konkurranse: {
      status: awardLettersSent ? 'fullfort' : published ? 'aktiv' : 'kommende',
      meta: awardLettersSent ? 'Fullført' : published ? konkurranseMeta : 'Kommende',
    },
    tildeling: {
      status: awardLettersSent ? 'aktiv' : 'kommende',
      meta: awardLettersSent ? 'Karensperiode' : 'Kommende',
    },
  };
}
