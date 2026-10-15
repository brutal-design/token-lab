# План Token Lab

1. **Каркас** - CLAUDE.md, структура папок, `.gitignore`, порожній `index.html`. Коміт `chore: каркас проєкту`.
2. **Математика кольору** - `color.js`: hex <-> OKLCH, шкала 50…950 (світлота по фіксованих кроках, хрома м'якшає на краях, гамут-мапінг у sRGB), контраст WCAG 2.x. Тести `node --test`.
3. **Екран з дизайну** - `index.html` + `styles.css` + `app.js` за скріном з Figma: поле hex + пікер + пресети, свотчі brand/neutral, таблиця семантичних токенів, прев'ю світла/темна з бейджами контрасту, експорт CSS. Адаптив, стани.
4. **Поділитися** - D1 таблиця `palettes`, Pages Functions: POST `/api/palettes`, GET `/api/palettes/:id`, сторінка `/p/:id`. Локальний тест через `wrangler pages dev --d1 DB`. Деплой на Cloudflare Pages.
5. **Гілка + PR** - `feat/export-formats`: експорт у Tailwind v4 і Figma variables JSON. Рев'ю Claude, мердж, перевірка прев'ю.

Поза скоупом (якщо час): імпорт з Figma, кілька бренд-кольорів, APCA.
