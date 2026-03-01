#!/usr/bin/env node

/**
 * Kontrastsjekk for Analysebordet design tokens.
 *
 * Beregner WCAG 2.1 kontrastforhold for alle tekst/bakgrunn-kombinasjoner
 * i designsystemet og rapporterer brudd.
 *
 * Bruk:  node contrast-check.js
 */

// ── Tokens ──────────────────────────────────────────────────────────

const surfaces = {
	'canvas':       '#0c0e14',
	'felt':         '#12151e',
	'felt-raised':  '#181c28',
	'felt-hover':   '#1e2233',
	'felt-active':  '#242840',
};

const inks = {
	'ink':           '#e2e5ef',
	'ink-secondary': '#8890a4',
	'ink-muted':     '#7b829b',
	'ink-ghost':     '#5a6178',
};

const accents = {
	'vekt':      '#e8a838',
	'vekt-dim':  '#c49030',
	'score-high':'#3d9a6e',
	'score-mid': '#8890a4',
	'score-low': '#c45858',
};

// ── Actual usage in the codebase ────────────────────────────────────

const usages = [
	// Table headers
	{ fg: 'ink-muted',     bg: 'felt',        size: 10, weight: 600, label: 'Tabellhode (vekt/tildelingskriterier/leverandør)' },
	{ fg: 'ink-muted',     bg: 'canvas',      size: 10, weight: 600, label: 'Tabellhode på canvas' },

	// Section labels
	{ fg: 'ink-muted',     bg: 'canvas',      size: 11, weight: 600, label: 'Seksjonstittel (Evalueringsmatrise, Rangering…)' },
	{ fg: 'ink-muted',     bg: 'felt',        size: 11, weight: 600, label: 'Seksjonstittel på felt' },
	{ fg: 'ink-muted',     bg: 'felt',        size: 10, weight: 600, label: 'Panel-label (Poeng, Begrunnelse, Aggregering)' },
	{ fg: 'ink-secondary', bg: 'felt-raised', size: 10, weight: 600, label: 'Innsikt-label (Margin, Størst påvirkning)' },

	// Meta/config labels
	{ fg: 'ink-muted',     bg: 'canvas',      size: 12, weight: 500, label: 'Meta-label (Anskaffelse, Ref)' },
	{ fg: 'ink-muted',     bg: 'canvas',      size: 12, weight: 500, label: 'Meta-verdi' },
	{ fg: 'ink-muted',     bg: 'felt',        size: 11, weight: 500, label: 'Config-label (Tittel, Referanse…)' },

	// Sub-criteria
	{ fg: 'ink-muted',     bg: 'canvas',      size: 12, weight: 500, label: 'Underkriterium i matrise' },

	// Primary text
	{ fg: 'ink',           bg: 'canvas',      size: 13, weight: 500, label: 'Primærtekst' },
	{ fg: 'ink',           bg: 'felt',        size: 13, weight: 500, label: 'Primærtekst på felt' },
	{ fg: 'ink-secondary', bg: 'canvas',      size: 13, weight: 500, label: 'Sekundærtekst' },
	{ fg: 'ink-secondary', bg: 'felt',        size: 13, weight: 500, label: 'Sekundærtekst på felt' },

	// Scores
	{ fg: 'score-high',    bg: 'canvas',      size: 13, weight: 700, label: 'Høy score (grønn)' },
	{ fg: 'score-mid',     bg: 'canvas',      size: 13, weight: 500, label: 'Middels score' },
	{ fg: 'score-low',     bg: 'canvas',      size: 13, weight: 500, label: 'Lav score (rød)' },

	// Accents
	{ fg: 'vekt',          bg: 'canvas',      size: 13, weight: 600, label: 'Vekt-tall (amber)' },
	{ fg: 'vekt-dim',      bg: 'canvas',      size: 11, weight: 500, label: 'Vekt-dim (% suffiks)' },
];

// ── WCAG contrast calculation ───────────────────────────────────────

function hexToRgb(hex) {
	const h = hex.replace('#', '');
	return [
		parseInt(h.substring(0, 2), 16) / 255,
		parseInt(h.substring(2, 4), 16) / 255,
		parseInt(h.substring(4, 6), 16) / 255,
	];
}

function linearize(c) {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
	const [r, g, b] = hexToRgb(hex).map(linearize);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
	const l1 = relativeLuminance(fg);
	const l2 = relativeLuminance(bg);
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

// WCAG 2.1 krav:
//   Normal tekst (<18pt / <14pt bold): 4.5:1 (AA), 7:1 (AAA)
//   Stor tekst (≥18pt / ≥14pt bold):  3:1 (AA), 4.5:1 (AAA)
//   1pt = 1.333px → 18pt = 24px, 14pt = 18.67px

function isLargeText(sizePx, weight) {
	return sizePx >= 24 || (sizePx >= 18.67 && weight >= 700);
}

function wcagLevel(ratio, sizePx, weight) {
	const large = isLargeText(sizePx, weight);
	if (large) {
		if (ratio >= 4.5) return 'AAA';
		if (ratio >= 3.0) return 'AA';
		return 'FAIL';
	}
	if (ratio >= 7.0) return 'AAA';
	if (ratio >= 4.5) return 'AA';
	return 'FAIL';
}

// ── Run audit ───────────────────────────────────────────────────────

const allColors = { ...inks, ...accents };

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║  Analysebordet — Kontrastsjekk (WCAG 2.1)                      ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// Token-par oversikt
console.log('── Alle token-par mot overflater ──────────────────────────────────\n');
console.log(
	'Farge'.padEnd(16) +
	Object.keys(surfaces).map(s => s.padEnd(13)).join('') +
	'  Hex'
);
console.log('─'.repeat(16 + Object.keys(surfaces).length * 13 + 10));

for (const [inkName, inkHex] of Object.entries({ ...inks, ...accents })) {
	let line = inkName.padEnd(16);
	for (const [, bgHex] of Object.entries(surfaces)) {
		const ratio = contrastRatio(inkHex, bgHex);
		const marker = ratio < 3 ? ' ✗' : ratio < 4.5 ? ' △' : ratio < 7 ? ' ○' : ' ●';
		line += `${ratio.toFixed(2)}:1${marker}`.padEnd(13);
	}
	line += `  ${inkHex}`;
	console.log(line);
}

console.log('\n  ● ≥ 7:1 (AAA)  ○ ≥ 4.5:1 (AA)  △ ≥ 3:1 (stor tekst)  ✗ < 3:1 (utilstrekkelig)\n');

// Bruksspesifikk rapport
console.log('── Faktisk bruk i kodebasen ───────────────────────────────────────\n');

const failures = [];
const warnings = [];

for (const u of usages) {
	const fgHex = allColors[u.fg];
	const bgHex = surfaces[u.bg];
	if (!fgHex || !bgHex) continue;

	const ratio = contrastRatio(fgHex, bgHex);
	const level = wcagLevel(ratio, u.size, u.weight);
	const entry = {
		...u,
		ratio: ratio.toFixed(2),
		level,
		fgHex,
		bgHex,
	};

	if (level === 'FAIL') failures.push(entry);
	else if (level === 'AA') warnings.push(entry);
}

if (failures.length > 0) {
	console.log(`  ✗ BRUDD (${failures.length} stk — under WCAG AA):\n`);
	for (const f of failures) {
		console.log(`    ${f.ratio}:1  ${f.fg} → ${f.bg}  (${f.size}px/${f.weight}w)`);
		console.log(`    └─ ${f.label}`);
		const needed = isLargeText(f.size, f.weight) ? '3.0:1' : '4.5:1';
		console.log(`       Trenger minst ${needed} for WCAG AA\n`);
	}
}

if (warnings.length > 0) {
	console.log(`  △ Passerer AA, men ikke AAA (${warnings.length} stk):\n`);
	for (const w of warnings) {
		console.log(`    ${w.ratio}:1  ${w.fg} → ${w.bg}  (${w.size}px/${w.weight}w)`);
		console.log(`    └─ ${w.label}\n`);
	}
}

const passes = usages.length - failures.length - warnings.length;
console.log(`  ● Godkjent AAA: ${passes}/${usages.length}`);
console.log(`  ○ Godkjent AA:  ${warnings.length}/${usages.length}`);
console.log(`  ✗ Brudd:        ${failures.length}/${usages.length}\n`);

// ── Forslag ─────────────────────────────────────────────────────────

if (failures.length > 0) {
	console.log('── Forslag ────────────────────────────────────────────────────────\n');

	const canvasL = relativeLuminance(surfaces.canvas);
	const targetRatio = 4.5;
	const neededL = targetRatio * (canvasL + 0.05) - 0.05;

	console.log(`  Mot canvas (${surfaces.canvas}), L=${canvasL.toFixed(4)}:`);
	console.log(`  For 4.5:1 (AA normal tekst) trenger fg L ≥ ${neededL.toFixed(4)}\n`);

	for (const f of failures) {
		const needed = isLargeText(f.size, f.weight) ? '3.0:1' : '4.5:1';
		console.log(`  ${f.fg}: Hev hex-verdien til minst ${needed} kontrast mot ${f.bg}`);
	}
	console.log('');
}
