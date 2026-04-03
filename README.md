# Crime Atlas

Interactive Next.js dashboard for official-source city crime data, currently covering Berlin, Frankfurt, London, Luton, and Paris.

## Run locally

```bash
npm install
npm run dev
```

The dev script regenerates the location datasets in `src/generated/` before starting the app.

## Production

```bash
npm run build
npm start
```

The app is configured for standalone Next.js output so it can be deployed cleanly to Railway.

## Stack

- Next.js App Router
- Route handlers under `src/app/api`
- Recharts for the interactive stacked bar charts
- Tailwind CSS v4 with custom dashboard styling

## Data notes

- Each city uses official primary sources and keeps that source list visible inside the dashboard.
- Some source categories are nested subtypes of broader categories, so stacked totals are best interpreted comparatively rather than as deduplicated incident totals.
