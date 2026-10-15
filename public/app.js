import { normalizeHex, contrast } from './color.js';
import { buildSystem, checkContrast, TOKEN_NAMES, toCSS } from './tokens.js';

const $ = (sel) => document.querySelector(sel);
const DEFAULT_HEX = '#4f46e5';

const state = { hex: DEFAULT_HEX, sys: null, format: 'css' };

const EXPORTERS = { css: toCSS };

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const readable = (hex) => (contrast('#ffffff', hex) >= contrast('#141413', hex) ? '#ffffff' : '#141413');
const badge = (level, ratio) => `<span class="badge" data-level="${level}">${level}${ratio ? ' ' + ratio.toFixed(1) : ''}</span>`;

// ---------- Рендер ----------

function renderSwatches(el, scale) {
  el.innerHTML = scale.map((s) => `
    <button class="swatch" type="button" data-copy="${s.hex}" aria-label="${s.step}, ${s.hex}, копіювати">
      <span class="swatch-color" style="background:${s.hex}"></span>
      ${s.anchor ? `<span class="swatch-pin">твій</span>` : ''}
      <span class="swatch-step">${s.step}</span>
      <span class="swatch-hex">${s.hex.slice(1)}</span>
    </button>`).join('');
}

function tokenCell(t) {
  return `<div class="tok"><i style="background:${t.hex}"></i><span class="tok-ref">${t.ref ?? 'white'}</span><span class="tok-hex">${t.hex}</span></div>`;
}

function renderTokens(sys) {
  $('#tokens-body').innerHTML = TOKEN_NAMES.map((n) => `
    <tr><td>${n}</td><td>${tokenCell(sys.light[n])}</td><td>${tokenCell(sys.dark[n])}</td></tr>`).join('');
}

function previewVars(theme) {
  const map = { bg: 'bg', surface: 'surface', text: 'text', 'text-muted': 'muted', border: 'border', accent: 'accent', 'accent-hover': 'accent-hover', 'on-accent': 'on-accent', danger: 'danger', success: 'success' };
  return Object.entries(map).map(([k, v]) => `--p-${v}:${theme[k].hex}`).join(';');
}

function renderPreview(title, theme) {
  const checks = checkContrast(theme);
  const by = Object.fromEntries(checks.map((c) => [c.id, c]));
  const inline = (id) => `<span class="wcag-inline">${badge(by[id].level, by[id].ratio)}</span>`;
  const passed = checks.filter((c) => c.pass).length;
  return `
  <article class="preview">
    <div class="preview-head"><span>${title}</span><span class="preview-score">${passed}/${checks.length} пройдено</span></div>
    <div class="canvas" style="${previewVars(theme)}">
      <div class="pv-card">
        <div class="pv-top"><span class="pv-kicker">Підписка</span><span class="pv-pill">Активна ${inline('success')}</span></div>
        <p class="pv-title">Pro для дизайнерів ${inline('text-surface')}</p>
        <p class="pv-body">Безлімітні палітри, експорт у Figma і спільний доступ для команди.</p>
        <label class="pv-label">Email
          <input class="pv-input is-error" value="dmytro.uxhero" aria-invalid="true">
        </label>
        <p class="pv-error">Бракує @ в адресі ${inline('danger')}</p>
        <div class="pv-actions">
          <button class="pv-btn" type="button">Оформити</button>
          <button class="pv-btn is-hover" type="button" tabindex="-1">Наведення</button>
          <button class="pv-btn-ghost" type="button">Пізніше</button>
          ${inline('button')}
        </div>
      </div>
      <p class="pv-foot">Оновлено 2 хв тому ${inline('muted-bg')}</p>
    </div>
    <ul class="checks">
      ${checks.map((c) => `
        <li>
          <span class="sample" style="background:${theme[c.bg].hex};color:${theme[c.fg].hex}">Aa</span>
          <span>${c.label}<span class="hint"> · ${c.fg} / ${c.bg}</span></span>
          <span class="ratio">${c.ratio.toFixed(2)}:1</span>
          ${badge(c.level)}
        </li>`).join('')}
    </ul>
  </article>`;
}

function renderMeta(sys) {
  const anchor = sys.brand.find((s) => s.anchor);
  $('#meta').innerHTML = `
    <dt>Твій колір</dt><dd>brand-${anchor.step}</dd>
    <dt>HEX</dt><dd>${sys.brandHex}</dd>
    <dt>Кнопка, світла</dt><dd>on-accent ${sys.light['on-accent'].ref ?? 'white'}</dd>`;
}

function renderCode() {
  $('#code').textContent = EXPORTERS[state.format](state.sys);
}

function render() {
  const sys = buildSystem(state.hex);
  state.sys = sys;
  document.documentElement.style.setProperty('--brand', sys.brandHex);
  renderSwatches($('#brand-swatches'), sys.brand);
  renderSwatches($('#neutral-swatches'), sys.neutral);
  renderTokens(sys);
  $('#previews').innerHTML = renderPreview('Світла тема', sys.light) + renderPreview('Темна тема', sys.dark);
  renderMeta(sys);
  renderCode();
  document.querySelectorAll('#presets button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hex === sys.brandHex)));
}

// ---------- Події ----------

function setHex(value, { fromInput = false, keepUrl = false } = {}) {
  const hex = normalizeHex(value);
  const box = $('#hex-box');
  const err = $('#hex-error');
  if (!hex) {
    box.classList.add('is-error');
    $('#hex').setAttribute('aria-invalid', 'true');
    err.hidden = false;
    return;
  }
  box.classList.remove('is-error');
  $('#hex').removeAttribute('aria-invalid');
  err.hidden = true;
  state.hex = hex;
  if (!fromInput) $('#hex').value = hex.slice(1).toUpperCase();
  $('#picker').value = hex;
  if (!keepUrl) history.replaceState(null, '', `/?c=${hex.slice(1)}`);
  render();
}

let toastTimer;
export function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 1800);
}

async function copy(text, message = 'Скопійовано') {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    toast('Не вдалося скопіювати');
  }
}

// ---------- Поділитися ----------

async function share() {
  const btn = $('#share');
  btn.disabled = true;
  btn.textContent = 'Зберігаю…';
  try {
    const res = await fetch('/api/palettes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hex: state.hex }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка');
    history.replaceState(null, '', `/p/${data.id}`);
    await copy(data.url, 'Посилання скопійовано');
  } catch (err) {
    toast(`Не вийшло: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Поділитися';
  }
}

async function loadShared(id) {
  try {
    const res = await fetch(`/api/palettes/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setHex(data.hex, { keepUrl: true });
  } catch (err) {
    setHex(DEFAULT_HEX);
    toast(err.message || 'Палітру не знайдено');
  }
}

function bind() {
  $('#share').addEventListener('click', share);
  $('#hex').addEventListener('input', (e) => {
    const v = e.target.value.trim();
    if (v.replace('#', '').length === 3 || v.replace('#', '').length === 6) setHex(v, { fromInput: true });
    else if (v.length) setHex('', { fromInput: true }); // порожній рядок = помилка
  });
  $('#hex').addEventListener('blur', () => { if (normalizeHex($('#hex').value)) $('#hex').value = state.hex.slice(1).toUpperCase(); });
  $('#picker').addEventListener('input', (e) => setHex(e.target.value));
  $('#presets').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-hex]');
    if (b) setHex(b.dataset.hex);
  });
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-copy]');
    if (s) copy(s.dataset.copy, `${s.dataset.copy.toUpperCase()} скопійовано`);
  });
  $('#copy-code').addEventListener('click', () => copy($('#code').textContent));
  $('#export-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-format]');
    if (!b) return;
    state.format = b.dataset.format;
    document.querySelectorAll('#export-tabs button').forEach((t) => t.setAttribute('aria-selected', String(t === b)));
    renderCode();
  });
}

function init() {
  bind();
  const shared = location.pathname.match(/^\/p\/([0-9a-zA-Z]{7})$/);
  if (shared) return loadShared(shared[1]);
  const fromUrl = new URL(location.href).searchParams.get('c');
  setHex(normalizeHex(fromUrl ?? '') ?? DEFAULT_HEX, { keepUrl: !fromUrl });
}

init();
