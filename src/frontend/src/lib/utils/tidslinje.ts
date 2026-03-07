import type { AnskaffelsesHendelse, HendelseType } from '$lib/types/anskaffelse';

export interface TidslinjeNode {
	type: HendelseType;
	dato: string;
	label: string;
	pos: number;
	besvart: boolean;
	avvist?: boolean;
}

export interface TidslinjeKlynge {
	pos: number;
	items: TidslinjeNode[];
}

export interface TidslinjeAkseMerke {
	label: string;
	pos: number;
}

const KLYNGE_TERSKEL = 5; // % avstand for å slå sammen

const MAANED_KORT: Record<number, string> = {
	0: 'JAN', 1: 'FEB', 2: 'MAR', 3: 'APR', 4: 'MAI', 5: 'JUN',
	6: 'JUL', 7: 'AUG', 8: 'SEP', 9: 'OKT', 10: 'NOV', 11: 'DES',
};

export function beregnTidslinje(
	hendelser: AnskaffelsesHendelse[],
	minDato: Date,
	maksDato: Date,
): TidslinjeKlynge[] {
	const spenn = maksDato.getTime() - minDato.getTime();
	if (spenn <= 0) return [];

	const noder: TidslinjeNode[] = hendelser
		.filter((h): h is AnskaffelsesHendelse & { type: HendelseType } => h.dato !== '' && h.type !== '')
		.map((h) => ({
			type: h.type,
			dato: h.dato,
			label: h.label,
			pos: ((new Date(h.dato).getTime() - minDato.getTime()) / spenn) * 100,
			besvart: h.besvart ?? false,
			avvist: h.avvist,
		}))
		.filter((n) => !isNaN(n.pos))
		.sort((a, b) => a.pos - b.pos);

	const klynger: TidslinjeKlynge[] = [];
	for (const node of noder) {
		const siste = klynger[klynger.length - 1];
		if (siste && node.pos - siste.pos < KLYNGE_TERSKEL) {
			siste.items.push(node);
		} else {
			klynger.push({ pos: node.pos, items: [node] });
		}
	}

	return klynger;
}

export function genererAkseMerker(
	min: Date,
	maks: Date,
	maksPosisjon = 92,
	minAvstand = 10,
): TidslinjeAkseMerke[] {
	const spenn = maks.getTime() - min.getTime();
	if (spenn <= 0) return [];
	const merker: TidslinjeAkseMerke[] = [];
	const start = new Date(min.getFullYear(), min.getMonth(), 1);
	let sistePos = -Infinity;

	while (start <= maks) {
		const pos = ((start.getTime() - min.getTime()) / spenn) * 100;
		if (pos > maksPosisjon) break;
		if (pos >= 0 && pos - sistePos >= minAvstand) {
			const aar = String(start.getFullYear()).slice(2);
			merker.push({
				label: `${MAANED_KORT[start.getMonth()]} ${aar}`,
				pos,
			});
			sistePos = pos;
		}
		start.setMonth(start.getMonth() + 1);
	}

	return merker;
}

export function finnDatospenn(alleSaker: { hendelser: AnskaffelsesHendelse[] }[]): {
	min: Date;
	maks: Date;
} {
	let min = Infinity;
	let maks = -Infinity;

	for (const sak of alleSaker) {
		for (const h of sak.hendelser) {
			if (!h.dato || !h.type) continue;
			const t = new Date(h.dato).getTime();
			if (isNaN(t)) continue;
			if (t < min) min = t;
			if (t > maks) maks = t;
		}
	}

	if (!isFinite(min) || !isFinite(maks)) {
		const now = new Date();
		return { min: now, maks: now };
	}

	const spenn = maks - min;
	const padding = spenn * 0.03;

	return {
		min: new Date(min - padding),
		maks: new Date(maks + padding),
	};
}

/** Prioritet for klynge-tag farge: T > F > S > E > K > U > P */
export function klyngePrioritet(items: TidslinjeNode[]): HendelseType {
	if (items.some((i) => i.type === 'T')) return 'T';
	if (items.some((i) => i.type === 'F')) return 'F';
	if (items.some((i) => i.type === 'S')) return 'S';
	if (items.some((i) => i.type === 'E')) return 'E';
	if (items.some((i) => i.type === 'K')) return 'K';
	if (items.some((i) => i.type === 'U')) return 'U';
	return 'P';
}
