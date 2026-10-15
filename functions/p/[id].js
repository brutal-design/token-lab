// /p/:id - віддаємо той самий index.html, палітру підтягує app.js через /api/palettes/:id
export async function onRequestGet({ request, env }) {
  return env.ASSETS.fetch(new URL('/', request.url));
}
