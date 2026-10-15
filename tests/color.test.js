import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToOklch, oklchToHex, normalizeHex, isHex, makeScale, makeNeutral,
  contrast, wcagLevel, anchorStep, STEPS,
} from '../public/color.js';

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

test('hex нормалізується', () => {
  assert.equal(normalizeHex('#ABC'), '#aabbcc');
  assert.equal(normalizeHex('4f46e5'), '#4f46e5');
  assert.equal(normalizeHex('#12345'), null);
  assert.equal(isHex('zzz'), false);
});

test('OKLCH збігається з еталоном (CSS Color 4 / oklch.com)', () => {
  const red = hexToOklch('#ff0000');
  close(red.l, 0.628, 0.001, 'red L');
  close(red.c, 0.2577, 0.001, 'red C');
  close(red.h, 29.23, 0.05, 'red H');
  const white = hexToOklch('#ffffff');
  close(white.l, 1, 1e-4, 'white L');
  close(white.c, 0, 1e-4, 'white C');
  const indigo = hexToOklch('#4f46e5'); // oklch.com: #4f46e5 = oklch(51.1% 0.230 276.97)
  close(indigo.l, 0.511, 0.002, 'indigo L');
  close(indigo.c, 0.230, 0.002, 'indigo C');
  close(indigo.h, 276.97, 0.3, 'indigo H');
});

test('hex -> OKLCH -> hex без втрат', () => {
  for (const hex of ['#4f46e5', '#facc15', '#0f766e', '#e4572e', '#111110', '#ffffff', '#808080']) {
    assert.equal(oklchToHex(hexToOklch(hex)), hex);
  }
});

test('шкала: 11 кроків, світлота монотонно падає, все в гамуті sRGB', () => {
  for (const hex of ['#4f46e5', '#facc15', '#ff0000', '#00ff00', '#0f766e', '#808080', '#000000', '#ffffff']) {
    const scale = makeScale(hex);
    assert.deepEqual(scale.map((s) => s.step), STEPS);
    for (let i = 1; i < scale.length; i++) {
      assert.ok(scale[i].oklch.l < scale[i - 1].oklch.l, `${hex}: ${scale[i].step} темніший за ${scale[i - 1].step}`);
    }
    for (const s of scale) {
      assert.match(s.hex, /^#[0-9a-f]{6}$/);
    }
    const neutral = makeNeutral(hex);
    for (let i = 1; i < neutral.length; i++) assert.ok(neutral[i].oklch.l < neutral[i - 1].oklch.l);
  }
});

test('введений колір стоїть у шкалі без змін на найближчому кроці', () => {
  assert.equal(anchorStep('#4f46e5'), 700);
  const scale = makeScale('#4F46E5');
  const a = scale.find((s) => s.anchor);
  assert.equal(a.hex, '#4f46e5');
  assert.equal(scale.filter((s) => s.anchor).length, 1);
  assert.equal(anchorStep('#facc15'), 200);
});

test('тон шкали тримається (дрейф hue < 2°) для насичених кольорів', () => {
  const base = hexToOklch('#0f766e').h;
  for (const s of makeScale('#0f766e')) {
    if (s.oklch.c > 0.02) close(hexToOklch(s.hex).h, base, 2, `крок ${s.step}`);
  }
});

test('контраст WCAG: еталонні пари', () => {
  close(contrast('#ffffff', '#000000'), 21, 1e-9, 'білий/чорний');
  close(contrast('#767676', '#ffffff'), 4.54, 0.01, '#767676 на білому');
  close(contrast('#777777', '#ffffff'), 4.48, 0.01, '#777777 на білому');
  close(contrast('#ffffff', '#4f46e5'), 6.29, 0.02, 'білий на indigo-600');
  assert.equal(contrast('#123456', '#abcdef'), contrast('#abcdef', '#123456'));
});

test('рівні WCAG', () => {
  assert.equal(wcagLevel(7.1), 'AAA');
  assert.equal(wcagLevel(4.5), 'AA');
  assert.equal(wcagLevel(3.2), 'AA Large');
  assert.equal(wcagLevel(2.9), 'Fail');
  assert.equal(wcagLevel(3.1, { large: true }), 'AA');
});

test('сусідні кроки помітно різні (ΔL >= 0.025)', () => {
  for (const hex of ['#4f46e5', '#facc15', '#0f766e', '#e4572e', '#ffffff', '#000000', '#7c3aed']) {
    const s = makeScale(hex);
    for (let i = 1; i < s.length; i++) {
      assert.ok(s[i - 1].oklch.l - s[i].oklch.l >= 0.025, `${hex}: ${s[i - 1].step}->${s[i].step}`);
    }
  }
});
