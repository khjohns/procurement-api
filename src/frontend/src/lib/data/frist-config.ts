export type ProsedyreId = 'aapen' | 'begrenset' | 'forhandling' | 'del2';
export type FristType = 'start' | 'deadline' | 'milestone' | 'info' | 'soft';

export interface Prosedyre {
  id: ProsedyreId;
  label: string;
  ref: string;
  del: string;
}

export interface FristPunkt {
  label: string;
  date: Date;
  ref?: string;
  type: FristType;
  note?: string | null;
}

export const PROSEDYRER: Prosedyre[] = [
  { id: 'aapen', label: 'Åpen anbudskonkurranse', ref: '§ 20-2', del: 'III' },
  { id: 'begrenset', label: 'Begrenset anbudskonkurranse', ref: '§ 20-3', del: 'III' },
  { id: 'forhandling', label: 'Konkurranse med forhandling', ref: '§ 20-4', del: 'III' },
  { id: 'del2', label: 'Tilbudskonkurranse (Del II)', ref: '§ 8-17', del: 'II' },
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Re-export from shared utils for backwards compatibility
export { formatDatoMndKort as fmtDateShort } from '$lib/utils/format';

export function calcFrister(
  prosedyre: ProsedyreId,
  kunngjoring: string,
  veiledende: boolean,
  hast: boolean,
  elektronisk: boolean
): FristPunkt[] {
  const start = new Date(kunngjoring);
  if (isNaN(start.getTime())) return [];
  const m: FristPunkt[] = [];

  m.push({ label: 'Kunngjøring sendt', date: start, ref: '§ 21-2', type: 'start' });

  if (prosedyre === 'aapen') {
    let tilbudsDager = elektronisk ? 30 : 35;
    if (veiledende) tilbudsDager = 15;
    if (hast) tilbudsDager = 15;
    if (!elektronisk && !hast) tilbudsDager = Math.max(tilbudsDager, 35);

    const tilbudsFrist = addDays(start, tilbudsDager);
    m.push({
      label: `Tilbudsfrist (${tilbudsDager} dager)`,
      date: tilbudsFrist,
      ref: '§ 20-2',
      type: 'deadline',
      note: veiledende
        ? 'Forkortet pga. veiledende kunngjøring'
        : hast
          ? 'Forkortet pga. hastetilfelle'
          : null,
    });

    m.push({
      label: 'Vedståelsesfrist utløper',
      date: addDays(tilbudsFrist, 30),
      ref: '§ 20-6',
      type: 'soft',
      note: '30 dager fra tilbudsfrist (standard)',
    });

    const evalDager = Math.max(10, Math.round(tilbudsDager * 0.5));
    const meddelelse = addDays(tilbudsFrist, evalDager);
    m.push({
      label: 'Meddelelse om valg (estimert)',
      date: meddelelse,
      ref: '§ 25-1',
      type: 'info',
    });

    const karens = addDays(meddelelse, elektronisk ? 10 : 15);
    m.push({
      label: `Karensperiode utløper (${elektronisk ? 10 : 15} dager)`,
      date: karens,
      ref: '§ 25-2',
      type: 'deadline',
    });
    m.push({
      label: 'Tidligste kontraktsinngåelse',
      date: addDays(karens, 1),
      ref: '§ 25-2',
      type: 'milestone',
    });
  } else if (prosedyre === 'begrenset' || prosedyre === 'forhandling') {
    let foresporselDager = 30;
    if (hast) foresporselDager = 15;
    const foresporselFrist = addDays(start, foresporselDager);
    m.push({
      label: `Frist for forespørsler (${foresporselDager} dager)`,
      date: foresporselFrist,
      ref: prosedyre === 'begrenset' ? '§ 20-3 (1)' : '§ 20-4 (1)',
      type: 'deadline',
      note: hast ? 'Forkortet pga. hastetilfelle' : null,
    });

    const kvalEval = addDays(foresporselFrist, 10);
    m.push({
      label: 'Kvalifiseringsvurdering (estimert)',
      date: kvalEval,
      ref: '§ 23-1',
      type: 'info',
    });

    const invitasjon = addDays(kvalEval, 3);
    m.push({ label: 'Invitasjon sendt', date: invitasjon, ref: '§ 23-2', type: 'info' });

    let tilbudsDager = elektronisk ? 25 : 30;
    if (veiledende) tilbudsDager = 10;
    if (hast) tilbudsDager = 10;
    const tilbudsFrist = addDays(invitasjon, tilbudsDager);
    m.push({
      label: `Tilbudsfrist (${tilbudsDager} dager fra invitasjon)`,
      date: tilbudsFrist,
      ref: prosedyre === 'begrenset' ? '§ 20-3 (2)' : '§ 20-4 (2)',
      type: 'deadline',
    });

    if (prosedyre === 'forhandling') {
      const forhStart = addDays(tilbudsFrist, 5);
      m.push({ label: 'Forhandlinger starter (estimert)', date: forhStart, type: 'info' });
      const forhSlutt = addDays(forhStart, 14);
      m.push({ label: 'Forhandlinger avsluttet (estimert)', date: forhSlutt, type: 'info' });
      m.push({
        label: 'Endelig tilbudsfrist (estimert)',
        date: addDays(forhSlutt, 10),
        ref: '§ 23-7',
        type: 'deadline',
      });
    }

    m.push({
      label: 'Vedståelsesfrist utløper',
      date: addDays(tilbudsFrist, 30),
      ref: '§ 20-6',
      type: 'soft',
    });

    const evalDager = prosedyre === 'forhandling' ? 35 : 14;
    const meddelelse = addDays(tilbudsFrist, evalDager);
    m.push({
      label: 'Meddelelse om valg (estimert)',
      date: meddelelse,
      ref: '§ 25-1',
      type: 'info',
    });

    const karens = addDays(meddelelse, elektronisk ? 10 : 15);
    m.push({
      label: `Karensperiode utløper (${elektronisk ? 10 : 15} dager)`,
      date: karens,
      ref: '§ 25-2',
      type: 'deadline',
    });
    m.push({
      label: 'Tidligste kontraktsinngåelse',
      date: addDays(karens, 1),
      ref: '§ 25-2',
      type: 'milestone',
    });
  } else if (prosedyre === 'del2') {
    const tilbudsFrist = addDays(start, 14);
    m.push({
      label: 'Tilbudsfrist (estimert 14 dager)',
      date: tilbudsFrist,
      ref: '§ 8-17',
      type: 'deadline',
      note: 'Del II har ikke lovfestede minimumsfrister – sett rimelig frist',
    });

    const meddelelse = addDays(tilbudsFrist, 10);
    m.push({
      label: 'Meddelelse om valg (estimert)',
      date: meddelelse,
      ref: '§ 10-1',
      type: 'info',
    });

    const karens = addDays(meddelelse, 10);
    m.push({
      label: 'Karensperiode utløper (rimelig frist)',
      date: karens,
      ref: '§ 10-2',
      type: 'deadline',
      note: 'Del II krever «rimelig karensperiode» – ikke lovfestet minimumsfrist',
    });
    m.push({
      label: 'Tidligste kontraktsinngåelse',
      date: addDays(karens, 1),
      ref: '§ 10-2',
      type: 'milestone',
    });
  }

  return m.sort((a, b) => a.date.getTime() - b.date.getTime());
}
