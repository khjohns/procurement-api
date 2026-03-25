export type OppdragsgiverType = 'statlig' | 'kommunal' | 'offentligrettslig';
export type KontraktstypeId = 'vare' | 'tjeneste' | 'bygge' | 'saerlig' | 'helse';
export type VarighetType = 'tidsbegrenset' | 'tidsubegrenset';

export interface GjeldendeDel {
  del: string;
  label: string;
  desc: string;
}

export interface Krav {
  l: string;
  r: string;
  w?: boolean;
}

export interface UnntakItem {
  id: string;
  label: string;
  hjemmel: string;
}
