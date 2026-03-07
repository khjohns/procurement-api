/** Hendelsestyper i anskaffelsens livssyklus: U → K → F → S → T → E → P */
export type HendelseType = 'U' | 'K' | 'F' | 'S' | 'T' | 'E' | 'P';

export type OversiktVisning = 'tidslinje' | 'tabell';

export interface AnskaffelsesHendelse {
	type: HendelseType;
	dato: string;
	label: string;
	besvart?: boolean;
}

export interface AnskaffelsesOversiktItem {
	id: number;
	sequenceId: string;
	name: string;
	procedure: string;
	threshold: string;
	deadline: string;
	contactPerson: string;
	awarded: boolean;
	framework: boolean;
	hendelser: AnskaffelsesHendelse[];
}

export type StatusFilter = 'alle' | 'pågående' | 'tildelt';

export interface AnskaffelsesFilter {
	status: StatusFilter;
	prosedyrer: Set<string>;
	terskler: Set<string>;
	rammeavtale: boolean | null;
	saksbehandlere: Set<string>;
}
