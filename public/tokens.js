// Семантичні токени та експорт. Чисті функції над шкалами з color.js.
import { makeScale, makeNeutral, contrast, wcagLevel, STEPS } from './color.js';

const DANGER_SEED = '#dc2626';
const SUCCESS_SEED = '#15803d';

const at = (scale, step) => scale.find((s) => s.step === step);
const neighbour = (step, dir) => STEPS[Math.min(STEPS.length - 1, Math.max(0, STEPS.indexOf(step) + dir))];

// Посилання на примітив: { ref: 'brand-700', hex: '#...' } або { ref: null, hex: '#ffffff' }
const ref = (name, scale, step) => ({ ref: `${name}-${step}`, hex: at(scale, step).hex });
const raw = (hex) => ({ ref: null, hex });

function pickOnAccent(accentHex, neutral) {
  const dark = at(neutral, 950);
  return contrast('#ffffff', accentHex) >= contrast(dark.hex, accentHex) ? raw('#ffffff') : ref('neutral', neutral, 950);
}

export function buildSystem(brandHex) {
  const brand = makeScale(brandHex);
  const neutral = makeNeutral(brandHex);
  const danger = makeScale(DANGER_SEED);
  const success = makeScale(SUCCESS_SEED);
  const anchor = brand.find((s) => s.anchor);

  // Світла тема: акцент = сам бренд-колір. Темна: бренд, якщо він достатньо світлий, інакше 400.
  const lightAccent = anchor.step;
  const darkAccent = anchor.oklch.l >= 0.6 ? anchor.step : 400;

  const light = {
    bg: ref('neutral', neutral, 50),
    surface: raw('#ffffff'),
    text: ref('neutral', neutral, 950),
    'text-muted': ref('neutral', neutral, 600),
    border: ref('neutral', neutral, 200),
    accent: ref('brand', brand, lightAccent),
    'accent-hover': ref('brand', brand, neighbour(lightAccent, +1)),
    'on-accent': null,
    danger: ref('danger', danger, 600),
    success: ref('success', success, 700),
  };
  light['on-accent'] = pickOnAccent(light.accent.hex, neutral);

  const dark = {
    bg: ref('neutral', neutral, 950),
    surface: ref('neutral', neutral, 900),
    text: ref('neutral', neutral, 50),
    'text-muted': ref('neutral', neutral, 400),
    border: ref('neutral', neutral, 800),
    accent: ref('brand', brand, darkAccent),
    'accent-hover': ref('brand', brand, neighbour(darkAccent, -1)),
    'on-accent': null,
    danger: ref('danger', danger, 400),
    success: ref('success', success, 400),
  };
  dark['on-accent'] = pickOnAccent(dark.accent.hex, neutral);

  return { brandHex: anchor.hex, brand, neutral, danger, success, light, dark };
}

export const TOKEN_NAMES = ['bg', 'surface', 'text', 'text-muted', 'border', 'accent', 'accent-hover', 'on-accent', 'danger', 'success'];

// Пари для перевірки контрасту. large = UI-елемент або великий текст (поріг 3:1).
const PAIRS = [
  { id: 'text-bg', label: 'Текст на фоні', fg: 'text', bg: 'bg' },
  { id: 'muted-bg', label: 'Другорядний текст', fg: 'text-muted', bg: 'bg' },
  { id: 'text-surface', label: 'Текст у картці', fg: 'text', bg: 'surface' },
  { id: 'button', label: 'Підпис кнопки', fg: 'on-accent', bg: 'accent' },
  { id: 'accent-bg', label: 'Кнопка на фоні', fg: 'accent', bg: 'bg', large: true },
  { id: 'danger', label: 'Помилка', fg: 'danger', bg: 'surface' },
  { id: 'success', label: 'Успіх', fg: 'success', bg: 'surface' },
];

export function checkContrast(theme) {
  return PAIRS.map((p) => {
    const ratio = contrast(theme[p.fg].hex, theme[p.bg].hex);
    const level = wcagLevel(ratio, { large: p.large });
    return { ...p, ratio, level, pass: level !== 'Fail' };
  });
}

// ---------- Експорт ----------

const cssVar = (t) => (t.ref ? `var(--${t.ref})` : t.hex);

export function toCSS(sys) {
  const prim = [];
  for (const [name, scale] of [['brand', sys.brand], ['neutral', sys.neutral], ['danger', sys.danger], ['success', sys.success]]) {
    for (const s of scale) prim.push(`  --${name}-${s.step}: ${s.hex};`);
  }
  const sem = (theme) => TOKEN_NAMES.map((n) => `  --color-${n}: ${cssVar(theme[n])};`).join('\n');
  return `/* Token Lab - ${sys.brandHex} */
:root {
${prim.join('\n')}

${sem(sys.light)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${sem(sys.dark).replace(/^/gm, '  ')}
  }
}

[data-theme="dark"] {
${sem(sys.dark)}
}
`;
}
