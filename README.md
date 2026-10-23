# readabook

A small web app for keeping a log of the books you've read: title, author, the date you finished, a 0–5 star score (half stars allowed) and optional notes.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Other scripts: `npm test` (unit tests), `npm run build` (type-check + production build), `npm run lint`.

## Where is my data?

Books are stored in your browser's `localStorage` (key `readabook.books.v1`), so they stay on this device and in this browser only. Clearing site data removes them.

Use **Export** to download a JSON backup and **Import** to load one back; imported books are merged with the existing ones (same `id` = replaced).
