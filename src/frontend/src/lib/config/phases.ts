import type { FaseStatus } from '$lib/types/saksmappe';

export interface PhaseDefinition {
  id: string;
  number: string;
  label: string;
  route: string | null;
  status: FaseStatus;
}

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
  { id: 'registrering', number: '01', label: 'Registrering', route: '', status: 'fullfort' },
  { id: 'konkurranse', number: '02', label: 'Konkurranse', route: 'konkurranse', status: 'aktiv' },
  { id: 'kvalifisering', number: '03', label: 'Kvalifisering', route: 'kvalifisering', status: 'fullfort' },
  { id: 'evaluering', number: '04', label: 'Evaluering', route: 'evaluering', status: 'kommende' },
  { id: 'tildeling', number: '05', label: 'Tildeling', route: 'protokoll', status: 'kommende' },
  { id: 'kontrakt', number: '06', label: 'Kontrakt', route: 'kontrakt', status: 'kommende' },
];

/** Map sub-route segment → phase id (for highlighting active phase) */
export const routeToPhase: Record<string, string> = {
  konkurranse: 'konkurranse',
  kvalifisering: 'kvalifisering',
  evaluering: 'evaluering',
  protokoll: 'tildeling',
  meddelelse: 'tildeling',
  kontrakt: 'kontrakt',
};

/** Map sub-route segment → display label (for breadcrumbs) */
export const routeLabels: Record<string, string> = {
  konkurranse: 'Konkurranse',
  kvalifisering: 'Kvalifisering',
  evaluering: 'Evaluering',
  protokoll: 'Protokoll',
  meddelelse: 'Meddelelse',
  kontrakt: 'Kontrakt',
};

export const statusLabels: Record<FaseStatus, string> = {
  fullfort: 'Fullført',
  aktiv: 'Aktiv',
  kommende: 'Kommende',
};
