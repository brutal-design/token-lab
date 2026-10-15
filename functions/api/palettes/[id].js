// GET /api/palettes/:id  ->  { id, hex, created_at }
const ID_RE = /^[0-9a-zA-Z]{7}$/;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

export async function onRequestGet({ params, env }) {
  const id = String(params.id);
  if (!ID_RE.test(id)) return json({ error: 'Невірне посилання' }, 400);
  const row = await env.DB.prepare('SELECT id, hex, created_at FROM palettes WHERE id = ?1').bind(id).first();
  if (!row) return json({ error: 'Палітру не знайдено' }, 404);
  // Палітра після збереження не змінюється - можна кешувати.
  return json(row, 200, { 'cache-control': 'public, max-age=86400, immutable' });
}
