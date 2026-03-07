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
	hendelser: AnskaffelsesHendelse[];
}
