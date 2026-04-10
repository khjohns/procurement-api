import type { FaseStatus } from '$lib/types/saksmappe';
import type { Activity } from '$lib/types/activity';
import { formatDatoMndKort } from '$lib/utils/format';
import { getTimelineDate } from '$lib/utils/protokoll-helpers';

export interface PhaseDefinition {
  id: string;
  number: string;
  label: string;
  route: string | null;
}

export interface PhaseState {
  status: FaseStatus;
  meta: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- proc shape varies
export type ProcDeadlineInfo = Record<string, any>;

/** SVG path data per phase icon (viewBox="0 0 18 18", stroke="currentColor") */
export const phaseIcons: Record<string, string> = {
  registrering:
    '<rect x="3.5" y="1.5" width="11" height="15" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 5.5h6M6 8.5h6M6 11.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  konkurranse:
    '<path d="M13.5 3L7 6H4a1 1 0 00-1 1v4a1 1 0 001 1h3l6.5 3V3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  kvalifisering:
    '<path d="M9 2v5M5 4.5L9 7l4-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8h12M3 11.5h12M5 15h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
  evaluering:
    '<path d="M3.5 14V8.5M7 14V5M10.5 14V9.5M14.5 14V3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  tildeling:
    '<circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 9l2 2.5 4-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  kontrakt:
    '<path d="M10.5 2.5l5 5-8.5 8.5H2V11L10.5 2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 16.5h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
};

export const phases: PhaseDefinition[] = [
  { id: 'registrering', number: '01', label: 'Registrering', route: '' },
  { id: 'konkurranse', number: '02', label: 'Konkurranse', route: 'konkurranse' },
  { id: 'kvalifisering', number: '03', label: 'Kvalifisering', route: 'kvalifisering' },
  { id: 'evaluering', number: '04', label: 'Evaluering', route: 'evaluering' },
  { id: 'tildeling', number: '05', label: 'Tildeling', route: 'tildeling' },
  { id: 'kontrakt', number: '06', label: 'Kontrakt', route: 'kontrakt' },
];

export const routeToPhase: Record<string, string> = {
  konkurranse: 'konkurranse',
  kvalifisering: 'kvalifisering',
  evaluering: 'evaluering',
  tildeling: 'tildeling',
  protokoll: 'tildeling',
  meddelelse: 'tildeling',
  kontrakt: 'kontrakt',
};

export const routeLabels: Record<string, string> = {
  konkurranse: 'Konkurranse',
  kvalifisering: 'Kvalifisering',
  evaluering: 'Evaluering',
  tildeling: 'Tildeling',
  protokoll: 'Protokoll',
  meddelelse: 'Meddelelse',
  kontrakt: 'Kontrakt',
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

function doneMeta(date: string | null): string {
  return date ? `✓ ${date}` : '✓ Fullført';
}

/**
 * Derive phase statuses and display metadata from activities.
 *
 * Phase gates:
 * - PUBLISH_TO_DOFFIN → konkurranse starts
 * - QUALIFYING_PARTICIPANTS → kvalifisering done
 * - SUBMIT_BID → konkurranse done, evaluering starts
 * - AWARDING_PARTICIPANTS → evaluering done, tildeling starts
 */
export function derivePhaseStates(
  activities: Activity[],
  proc?: ProcDeadlineInfo,
): Record<string, PhaseState> {
  const actions = new Set(activities.map((a) => a.action));
  const has = (action: string) => actions.has(action);

  const published = has('PUBLISH_TO_DOFFIN');
  const qualified = has('QUALIFYING_PARTICIPANTS');
  const hasBids = has('SUBMIT_BID');
  const awarded = has('AWARDING_PARTICIPANTS');

  // Deadline countdown for active konkurranse
  const deadline = proc?.currentDeadline ?? getTimelineDate(proc, 'submission');
  let fristMeta = 'Aktiv';
  if (deadline) {
    const d = new Date(deadline);
    const dager = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    fristMeta = `Frist: ${formatDatoMndKort(d)} · ${Math.abs(dager)}d`;
  }

  return {
    registrering: {
      status: 'fullfort',
      meta: doneMeta(activityDate(activities, 'PUBLISH_TO_DOFFIN')),
    },
    konkurranse: {
      status: hasBids ? 'fullfort' : published ? 'aktiv' : 'kommende',
      meta: hasBids
        ? doneMeta(activityDate(activities, 'SUBMIT_BID'))
        : published
          ? fristMeta
          : 'Kommende',
    },
    kvalifisering: {
      status: qualified || hasBids ? 'fullfort' : published ? 'aktiv' : 'kommende',
      meta:
        qualified || hasBids
          ? doneMeta(activityDate(activities, 'QUALIFYING_PARTICIPANTS'))
          : published
            ? 'Aktiv'
            : 'Kommende',
    },
    evaluering: {
      status: awarded ? 'fullfort' : hasBids ? 'aktiv' : 'kommende',
      meta: awarded
        ? doneMeta(activityDate(activities, 'AWARDING_PARTICIPANTS'))
        : hasBids
          ? 'Aktiv'
          : 'Kommende',
    },
    tildeling: {
      status: awarded ? 'aktiv' : 'kommende',
      meta: awarded ? 'Aktiv' : 'Kommende',
    },
    kontrakt: { status: 'kommende', meta: 'Kommende' },
  };
}
