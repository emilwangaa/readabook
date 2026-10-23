# readabook

A small web app for keeping a log of the books you've read: title, author, the date you finished, a 0–5 star score (half stars allowed) and optional notes.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Other scripts: `npm test` (unit tests), `npm run build` (type-check + production build), `npm run lint`.

## Deploy

Every push to `main` is linted, tested, built and published to GitHub Pages by [.github/workflows/deploy.yml](.github/workflows/deploy.yml), at `https://<user>.github.io/readabook/`. One-time setup: in the GitHub repo, set **Settings → Pages → Source** to **GitHub Actions**.

The production build is served under `/readabook/` (see `base` in [vite.config.ts](vite.config.ts)); change it there if the repository has a different name. `npm run preview` serves the build at http://localhost:4173/readabook/.

The published site keeps books in each visitor's own browser too, so your local data doesn't carry over: Export it here and Import it on the live site.

## Where is my data?

Books are stored in your browser's `localStorage` (key `readabook.books.v1`), so they stay on this device and in this browser only. Clearing site data removes them.

Use **Export** to download a JSON backup and **Import** to load one back; imported books are merged with the existing ones (same `id` = replaced).
