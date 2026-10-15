# Token Lab

Один бренд-колір -> шкала 50-950 (OKLCH), семантичні токени для світлої і темної теми, перевірка контрасту WCAG, експорт і коротке посилання на палітру.

Зроблено наживо на ефірі UX Hero 15.10.2026.

## Локально
```bash
npx wrangler d1 execute token-lab --local --file=schema.sql   # один раз
npx wrangler pages dev                                         # http://localhost:8788
node --test                                                    # тести математики кольору
```

## Деплой (Cloudflare Pages + D1)
```bash
npx wrangler login
npx wrangler d1 create token-lab                 # скопіюй database_id у wrangler.toml
npx wrangler d1 execute token-lab --remote --file=schema.sql
```
Далі Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git -> цей репозиторій.
Build command: порожньо. Output directory: `public`.
Settings -> Bindings -> D1 database: `DB` -> `token-lab` (для Production і Preview).
Кожна гілка = своє прев'ю-посилання, мердж у `main` = прод.

## API
- `POST /api/palettes` `{ "hex": "#4f46e5" }` -> `201 { id, url }`
- `GET /api/palettes/:id` -> `{ id, hex, created_at }`
- `GET /p/:id` -> сторінка з цією палітрою
