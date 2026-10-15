// POST /api/palettes  { hex: "#4f46e5" }  ->  201 { id, url }
const HEX_RE = /^#[0-9a-f]{6}$/;
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'; // без 0/O/1/l/I

function makeId(length = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Очікую JSON' }, 400);
  }
  const hex = String(body?.hex ?? '').trim().toLowerCase();
  if (!HEX_RE.test(hex)) return json({ error: 'Потрібен hex у форматі #rrggbb' }, 400);

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = makeId();
    try {
      await env.DB.prepare('INSERT INTO palettes (id, hex) VALUES (?1, ?2)').bind(id, hex).run();
      const url = new URL(`/p/${id}`, request.url).toString();
      return json({ id, url }, 201);
    } catch (err) {
      if (!String(err).includes('UNIQUE')) return json({ error: 'Не вдалося зберегти' }, 500);
    }
  }
  return json({ error: 'Спробуй ще раз' }, 503);
}
