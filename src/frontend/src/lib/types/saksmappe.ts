export type FaseStatus = 'fullfort' | 'aktiv' | 'kommende';

export interface FaseHendelse {
  dato: string;
  tekst: string;
}

export interface FaseAktivitet {
  label: string;
  dato: string;
  done: boolean;
}

export interface Fase {
  id: string;
  label: string;
  status: FaseStatus;
  dato?: string;
  sammendrag?: string;
  href?: string;
  aktiviteter?: FaseAktivitet[];
  hendelser?: FaseHendelse[];
  substeg?: string[];
}

export interface Dokument {
  navn: string;
  status: 'publisert' | 'sendt' | 'utkast' | 'ikke påbegynt';
  dato: string | null;
}

export interface Teammedlem {
  rolle: string;
  navn: string;
}

export interface Frist {
  label: string;
  dato: string;
  dager: number;
  ref: string;
}

export interface Sak {
  saksnr: string;
  tittel: string;
  beskrivelse: string;
  oppdragsgiver: string;
  kontraktstype: string;
  kontraktstypeRef: string;
  del: string;
  verdi: number;
  eosTerskel: number;
  varighet: string;
  prosedyre: string;
  prosedyreRef: string;
  opprettet: string;
}

export interface SaksmappeData {
  sak: Sak;
  faser: Fase[];
  dokumenter: Dokument[];
  team: Teammedlem[];
  frister: Frist[];
}
