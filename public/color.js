// Математика кольору. Тільки чисті функції, без DOM.
// sRGB <-> OKLab за Björn Ottosson (2020), контраст за WCAG 2.x.

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Цільова світлота OKLCH для кожного кроку (близько до Tailwind v4).
const LIGHTNESS = {
  50: 0.975, 100: 0.945, 200: 0.89, 300: 0.815, 400: 0.715,
  500: 0.63, 600: 0.55, 700: 0.475, 800: 0.395, 900: 0.32, 950: 0.24,
};

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(value) {
  return typeof value === 'string' && HEX_RE.test(value.trim());
}

export function normalizeHex(value) {
  if (!isHex(value)) return null;
  let h = value.trim().replace('#', '').toLowerCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return '#' + h;
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex);
  if (!h) throw new Error(`Невалідний hex: ${hex}`);
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}

export function rgbToHex([r, g, b]) {
  const to = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function linearRgbToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToLinearRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function hexToOklch(hex) {
  const [L, a, b] = linearRgbToOklab(hexToRgb(hex).map(toLinear));
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 1e-4 ? 0 : H };
}

function oklchToLinear({ l, c, h }) {
  const rad = (h * Math.PI) / 180;
  return oklabToLinearRgb([l, c * Math.cos(rad), c * Math.sin(rad)]);
}

const EPS = 1e-6;
export function inGamut(oklch) {
  return oklchToLinear(oklch).every((v) => v >= -EPS && v <= 1 + EPS);
}

// Якщо колір не влазить у sRGB - зменшуємо хрому (бінарний пошук), світлоту і тон не чіпаємо.
export function clampChroma(oklch) {
  if (inGamut(oklch)) return oklch;
  let lo = 0;
  let hi = oklch.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...oklch, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...oklch, c: lo };
}

export function oklchToHex(oklch) {
  return rgbToHex(oklchToLinear(clampChroma(oklch)).map(toGamma));
}

export function formatOklch({ l, c, h }) {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

// Хрома м'якшає на світлих і темних краях, щоб 50 і 950 не були «кислотними».
function chromaFactor(l) {
  if (l > 0.63) return 1 - ((l - 0.63) / (0.99 - 0.63)) ** 1.6 * 0.85;
  return 1 - ((0.63 - l) / (0.63 - 0.2)) ** 2 * 0.45;
}

// Найближчий крок до світлоти введеного кольору - туди ставимо сам колір без змін.
export function anchorStep(hex) {
  const { l } = hexToOklch(hex);
  return STEPS.reduce((best, s) => (Math.abs(LIGHTNESS[s] - l) < Math.abs(LIGHTNESS[best] - l) ? s : best), 500);
}

// Світлота кроку з урахуванням введеного кольору: сусідні кроки рівномірно
// «підтягуються» до нього, щоб не було двох майже однакових свотчів поруч.
function stepLightness(step, anchor, inputL) {
  const first = STEPS[0];
  const last = STEPS[STEPS.length - 1];
  const L = LIGHTNESS[step];
  const La = LIGHTNESS[anchor];
  if (step === anchor) return inputL;
  if (step < anchor) {
    const L0 = Math.max(LIGHTNESS[first], inputL + 0.01);
    return L0 + ((L - LIGHTNESS[first]) * (inputL - L0)) / (La - LIGHTNESS[first]);
  }
  const L1 = Math.min(LIGHTNESS[last], inputL - 0.01);
  return inputL + ((L - La) * (L1 - inputL)) / (LIGHTNESS[last] - La);
}

// Тональна шкала. Повертає [{ step, hex, oklch, anchor }].
// Хрому рахуємо відносно кроку-якоря, далі обрізаємо до меж sRGB.
export function makeScale(hex) {
  const base = hexToOklch(hex);
  const anchor = anchorStep(hex);
  const peak = base.c / Math.max(0.35, chromaFactor(base.l));
  return STEPS.map((step) => {
    if (step === anchor) return { step, hex: normalizeHex(hex), oklch: base, anchor: true };
    const l = stepLightness(step, anchor, base.l);
    const target = clampChroma({ l, c: peak * chromaFactor(l), h: base.h });
    return { step, hex: oklchToHex(target), oklch: target, anchor: false };
  });
}

// Нейтральна шкала з легким відтінком бренду (хрома ~0.012).
export function makeNeutral(hex, tint = 0.012) {
  const { h } = hexToOklch(hex);
  return STEPS.map((step) => {
    const target = { l: LIGHTNESS[step], c: tint * chromaFactor(LIGHTNESS[step]), h };
    return { step, hex: oklchToHex(target), oklch: clampChroma(target), anchor: false };
  });
}

// Відносна яскравість WCAG 2.x
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Рівень для тексту. large = великий текст (18pt / 14pt bold) або UI-елемент (3:1).
export function wcagLevel(ratio, { large = false } = {}) {
  if (large) return ratio >= 4.5 ? 'AAA' : ratio >= 3 ? 'AA' : 'Fail';
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large' : 'Fail';
}
