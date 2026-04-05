# Crime Atlas

Interactive Next.js dashboard for official-source city crime data, currently covering multiple European, U.S., Japanese, and Brazilian cities.

## Run locally

```bash
npm install
npm run dev
```

The app reads from the committed SQLite database at `prisma/crime-atlas.db`.
If you want to refresh the official datasets and reseed the database manually, run:

```bash
npm run data:prepare
```

That local reseed flow expects `sqlite3` to be available on the machine.

## Production

```bash
npm run build
npm start
```

Production builds use the committed Prisma schema plus the committed SQLite database, so deployments do not depend on live upstream downloads.

## Stack

- Next.js App Router
- Prisma + SQLite for persisted normalized crime data
- Route handlers under `src/app/api`
- Recharts for the interactive stacked bar charts
- Tailwind CSS v4 with custom dashboard styling

## Data notes

- Each city uses official primary sources and keeps that source list visible inside the dashboard.
- Some source categories are nested subtypes of broader categories, so stacked totals are best interpreted comparatively rather than as deduplicated incident totals.
