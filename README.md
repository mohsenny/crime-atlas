# Crime Atlas

Interactive Next.js dashboard for official-source city crime data, currently covering Berlin, Frankfurt, London, Luton, Paris, Barcelona, Valencia, Rome, and Milan.

## Run locally

```bash
npm install
npm run dev
```

The dev script regenerates the location datasets in `src/generated/` before starting the app.
If you want to refresh the official datasets manually without starting the app, run:

```bash
npm run data:prepare
```

## Production

```bash
npm run build
npm start
```

Production builds use the committed generated datasets in `src/generated/` so deployments do not depend on live upstream downloads. The app is configured for standalone Next.js output so it can be deployed cleanly to Railway.

## Stack

- Next.js App Router
- Route handlers under `src/app/api`
- Recharts for the interactive stacked bar charts
- Tailwind CSS v4 with custom dashboard styling

## Data notes

- Each city uses official primary sources and keeps that source list visible inside the dashboard.
- Some source categories are nested subtypes of broader categories, so stacked totals are best interpreted comparatively rather than as deduplicated incident totals.
