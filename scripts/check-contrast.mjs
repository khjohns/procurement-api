/**
 * WCAG Contrast Checker for Analysebordet Design System
 *
 * Checks both light and dark theme token combinations.
 *
 * WCAG AA Requirements:
 * - Normal text (< 18pt): 4.5:1
 * - Large text (18pt+ or 14pt bold): 3:1
 * - UI components (borders, icons): 3:1
 */

// ── Color utilities ──

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function parseRgba(rgba) {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (match) {
    return { r: +match[1], g: +match[2], b: +match[3], a: match[4] ? +match[4] : 1 };
  }
  return null;
}

function blendColors(fg, bg) {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
  };
}

function resolveColor(color, bgHex) {
  if (color.startsWith('#')) return hexToRgb(color);
  if (color.startsWith('rgba')) {
    const rgba = parseRgba(color);
    if (rgba && bgHex) return blendColors(rgba, hexToRgb(bgHex));
    return rgba;
  }
  return null;
}

function getLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg, baseBg) {
  const bgRgb = resolveColor(bg, baseBg);
  const fgRgb = resolveColor(fg, baseBg);
  if (!bgRgb || !fgRgb) return 0;
  const l1 = getLuminance(fgRgb);
  const l2 = getLuminance(bgRgb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function rgbToHex(rgb) {
  return '#' + [rgb.r, rgb.g, rgb.b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ── Design system tokens ──

const themes = {
  light: {
    canvas: '#f5f4f1',
    felt: '#fdfcfa',
    'felt-raised': '#fdfcfa',
    'felt-hover': '#edecea',
    'felt-active': '#e3e1de',
    ink: '#1c1b18',
    'ink-secondary': '#5a5650',
    'ink-muted': '#6b6660',
    'ink-ghost': '#827e76',
    wire: 'rgba(0,0,0,0.07)',
    'wire-strong': 'rgba(0,0,0,0.13)',
    vekt: '#5262b5',
    'vekt-dim': '#4a58a8',
    'score-high': '#2d7a54',
    'score-mid': '#555b6e',
    'score-low': '#b04040',
  },
  dark: {
    canvas: '#0c0e14',
    felt: '#12151e',
    'felt-raised': '#181c28',
    'felt-hover': '#1e2233',
    'felt-active': '#242840',
    ink: '#e2e5ef',
    'ink-secondary': '#8890a4',
    'ink-muted': '#838ba5',
    'ink-ghost': '#6a7088',
    wire: 'rgba(255,255,255,0.06)',
    'wire-strong': 'rgba(255,255,255,0.10)',
    vekt: '#818cf8',
    'vekt-dim': '#6a76e4',
    'score-high': '#3d9a6e',
    'score-mid': '#8890a4',
    'score-low': '#d46e6e',
  },
};

// ── Combinations to test ──
// type: 'normal' = 4.5:1, 'large' = 3:1, 'ui' = 3:1

const combinations = [
  // Primary text on surfaces
  { name: 'ink on canvas', fg: 'ink', bg: 'canvas', type: 'normal', cat: 'Text' },
  { name: 'ink on felt', fg: 'ink', bg: 'felt', type: 'normal', cat: 'Text' },
  { name: 'ink on felt-raised', fg: 'ink', bg: 'felt-raised', type: 'normal', cat: 'Text' },
  { name: 'ink on felt-hover', fg: 'ink', bg: 'felt-hover', type: 'normal', cat: 'Text' },
  { name: 'ink on felt-active', fg: 'ink', bg: 'felt-active', type: 'normal', cat: 'Text' },

  // Secondary text
  { name: 'ink-secondary on canvas', fg: 'ink-secondary', bg: 'canvas', type: 'normal', cat: 'Text' },
  { name: 'ink-secondary on felt', fg: 'ink-secondary', bg: 'felt', type: 'normal', cat: 'Text' },
  { name: 'ink-secondary on felt-raised', fg: 'ink-secondary', bg: 'felt-raised', type: 'normal', cat: 'Text' },

  // Muted text (labels, metadata — typically 10-11px uppercase, treated as normal)
  { name: 'ink-muted on canvas', fg: 'ink-muted', bg: 'canvas', type: 'normal', cat: 'Labels' },
  { name: 'ink-muted on felt', fg: 'ink-muted', bg: 'felt', type: 'normal', cat: 'Labels' },
  { name: 'ink-muted on felt-raised', fg: 'ink-muted', bg: 'felt-raised', type: 'normal', cat: 'Labels' },

  // Ghost text (placeholders, decorative — typically 10px labels, acceptable at large-text ratio)
  { name: 'ink-ghost on canvas', fg: 'ink-ghost', bg: 'canvas', type: 'large', cat: 'Ghost' },
  { name: 'ink-ghost on felt', fg: 'ink-ghost', bg: 'felt', type: 'large', cat: 'Ghost' },
  { name: 'ink-ghost on felt-raised', fg: 'ink-ghost', bg: 'felt-raised', type: 'large', cat: 'Ghost' },

  // Accent text
  { name: 'vekt on canvas', fg: 'vekt', bg: 'canvas', type: 'normal', cat: 'Accent' },
  { name: 'vekt on felt', fg: 'vekt', bg: 'felt', type: 'normal', cat: 'Accent' },
  { name: 'vekt-dim on canvas', fg: 'vekt-dim', bg: 'canvas', type: 'normal', cat: 'Accent' },
  { name: 'vekt-dim on felt', fg: 'vekt-dim', bg: 'felt', type: 'normal', cat: 'Accent' },

  // Score semantics
  { name: 'score-high on canvas', fg: 'score-high', bg: 'canvas', type: 'normal', cat: 'Score' },
  { name: 'score-high on felt', fg: 'score-high', bg: 'felt', type: 'normal', cat: 'Score' },
  { name: 'score-low on canvas', fg: 'score-low', bg: 'canvas', type: 'normal', cat: 'Score' },
  { name: 'score-low on felt', fg: 'score-low', bg: 'felt', type: 'normal', cat: 'Score' },
  { name: 'score-mid on canvas', fg: 'score-mid', bg: 'canvas', type: 'normal', cat: 'Score' },
  { name: 'score-mid on felt', fg: 'score-mid', bg: 'felt', type: 'normal', cat: 'Score' },

  // Borders as UI components
  { name: 'wire on canvas (border)', fg: 'wire', bg: 'canvas', type: 'ui', cat: 'Borders' },
  { name: 'wire-strong on canvas (border)', fg: 'wire-strong', bg: 'canvas', type: 'ui', cat: 'Borders' },
  { name: 'wire on felt (border)', fg: 'wire', bg: 'felt', type: 'ui', cat: 'Borders' },
  { name: 'wire-strong on felt (border)', fg: 'wire-strong', bg: 'felt', type: 'ui', cat: 'Borders' },
];

// ── Run checks ──

for (const [themeName, tokens] of Object.entries(themes)) {
  console.log('='.repeat(70));
  console.log(`  ${themeName.toUpperCase()} THEME`);
  console.log('='.repeat(70));
  console.log('');

  let failures = [];
  let currentCat = '';

  for (const combo of combinations) {
    if (combo.cat !== currentCat) {
      currentCat = combo.cat;
      console.log(`── ${currentCat} ──`);
    }

    const fg = tokens[combo.fg];
    const bg = tokens[combo.bg];
    if (!fg || !bg) {
      console.log(`  SKIP  ${combo.name} (token not found)`);
      continue;
    }

    const ratio = contrastRatio(fg, bg, tokens.canvas);
    const required = combo.type === 'normal' ? 4.5 : 3.0;
    const pass = ratio >= required;
    const icon = pass ? '✅' : '❌';

    // Show effective color for rgba
    let bgDisplay = bg;
    if (bg.startsWith('rgba')) {
      const resolved = resolveColor(bg, tokens.canvas);
      if (resolved) bgDisplay = `${bg} → ${rgbToHex(resolved)}`;
    }

    console.log(
      `  ${icon}  ${ratio.toFixed(2)}:1  ${combo.name}  (need ${required}:1)` +
        (!pass ? `  ← FG: ${fg}, BG: ${bgDisplay}` : '')
    );

    if (!pass) {
      failures.push({ ...combo, ratio, required, fg, bg, theme: themeName });
    }
  }

  console.log('');
  if (failures.length === 0) {
    console.log(`  ✅ All ${combinations.length} checks pass for ${themeName} theme`);
  } else {
    console.log(`  ❌ ${failures.length}/${combinations.length} FAILED in ${themeName} theme:`);
    for (const f of failures) {
      console.log(`     ${f.name}: ${f.ratio.toFixed(2)}:1 (need ${f.required}:1)`);
    }
  }
  console.log('');
}
