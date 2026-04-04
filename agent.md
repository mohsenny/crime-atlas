# Crime Atlas Agent Guide

This file is the primary handoff for future agents working on the data, comparison logic, and sourcing rules in this repo.

If there is any conflict between speed and data honesty, choose data honesty.

## Core product rule

Crime Atlas is not a generic chart demo.

It is a public-facing crime-data product built on official recorded-crime statistics published by public authorities. That means:

- use official sources only
- preserve source meaning
- do not invent continuity where the source does not support it
- do not claim cross-city comparability that the data cannot defend

## What this app runs on

The app does not read spreadsheets or PDFs at runtime.

Runtime data comes from committed generated JSON:

- `src/generated/locations-index.json`
- `src/generated/crime-data.json`
- `src/generated/locations/*.json`

The generator is:

- `scripts/prepare-data.ts`

If source data changes, regenerate with:

```bash
npm run data:prepare
```

Production builds intentionally use committed generated data. Do not make Railway or production builds depend on live remote fetching unless there is a very good reason.

## Validation commands

After any non-trivial data or comparison change, run:

```bash
npm run data:prepare
npm run lint
npm run build
```

Do not stop at partial checks.

## Official-source rules

### 1. Official means official

Acceptable sources:

- police departments
- ministries of interior / justice / public security
- official city statistical offices
- official municipal open-data portals
- official national statistics offices

Do not use:

- press articles
- blogs
- mirrors
- NGO summaries as primary data
- random Kaggle / GitHub reposts

### 2. Archive year links are not proof

An archive listing `2000–2025` does not prove there is:

- a city-level series for every year
- the same geography for every year
- the same taxonomy for every year
- a file that is actually downloadable
- a file that is machine-parseable

Always inspect the real attachment or workbook before claiming the year is usable.

### 3. “No Area Breakdown” must be verified

Before concluding a city has no sub-city layer, check whether the official source family exposes:

- district / borough / arrondissement / municipio rows
- geography IDs in CSV/XLS/PDF tables
- a separate official city dataset with smaller-area crime data

Only then conclude there is no area breakdown.

### 4. Preserve taxonomy honestly

If the source changes category structure across years:

- keep the original source label in the source layer
- map only where the relationship is defensible
- prefer gaps over fake continuity

If older years only expose broader categories, do not invent fine-grained values.

## Data model expectations

There are two different category systems in this app:

### A. Dashboard category system

This is the city-specific visualization layer used on the normal city page.

It maps official source categories into a location-specific dashboard taxonomy.

### B. Comparison category system

This is the cross-city canonical layer used on `/compare`.

It lives in:

- `src/lib/comparison-taxonomy.ts`

It stores:

- canonical category key
- canonical label
- display metadata
- per-city mappings
- mapping confidence

## Comparison rules

The app should not compare raw labels directly across cities.

Use:

1. official source labels
2. per-city mapping into canonical comparison categories
3. confidence levels

Current confidence model:

- `high`
- `medium`
- `partial`

Current UI rule:

- only categories mapped across all selected cities are eligible
- only `high` and `medium` mappings are shown
- `partial` is excluded from the visible comparison UI

Why this exists:

- some cities publish only broad umbrella categories
- some cities split one concept into multiple subcategories
- some cities expose labels without full legal/statistical definitions
- some cities change category systems over time

Do not upgrade a mapping to `high` unless the source evidence really supports it.

## Category mapping workflow

When adding or improving a city:

1. collect the official source labels exactly as published
2. look for official definitions, glossary notes, workbook notes, police/statistical metadata
3. map them into canonical comparison categories
4. mark the confidence honestly
5. exclude categories that cannot be compared cleanly

Important:

- do not sum an umbrella category together with its own subcategories
- do not double count
- if one city exposes `Drug offenses` and another only `Drug trafficking`, that is not automatically `high`

## Multi-select comparison categories

If comparison categories are ever multi-select:

- only sum canonical categories, never raw source labels directly
- only sum categories that are disjoint enough to combine safely
- default comparison should still remain interpretable

Single-select is safer as the default.

## Comparison transparency

Comparison pages should help the user understand what is being compared.

That means exposing:

- selected canonical category
- mapping confidence
- which official source labels feed that canonical category for each city
- why some categories are missing

The current comparison methodology UI is the beginning of that and should be preserved.

## Anomaly checking

Always run anomaly checks after data refreshes.

At minimum, check for:

- implausibly large counts
- implausibly large rates
- extreme one-year spikes or collapses
- obvious year-parsing mistakes
- PDF row shifts / column merges

Do not assume the source parser is correct because the build passed.

## Berlin historical warning

Berlin `2006–2015` history is extracted from archived atlas PDFs via:

- `scripts/extract-berlin-historical.py`

This source is fragile.

Known failure modes:

- choosing the wrong nearby PDF page when several pages look table-like
- fused wrapped numeric fields turning `count + rate` into one fake value
- summary rows being mistaken for district rows
- continuation lines of district rows being split incorrectly

This previously produced false spikes such as Berlin `Residential burglary` in `2008`.

Current guardrail:

- `assertBerlinHistoricalRecordPlausibility()` in `scripts/prepare-data.ts`

Do not remove that guardrail unless you replace it with something better.

## Build/deploy rules

Production should not depend on:

- local Excel files
- local PDFs
- private registries
- environment-specific Python packages
- live downloads during deploy

If a source host is flaky or anti-bot:

- prefer committing a compact official-source extract
- document exactly what it contains
- keep the raw-source provenance in notes

## City-specific notes

### Berlin

- source family: Polizei Berlin Kriminalitätsatlas + PKS archive
- coverage in app: `2006–2024`
- area breakdown: yes
- risk: archived PDF parsing for early years

### London

- source family: MPS geographic breakdown + ONS population
- coverage in app: `2010–2024`
- area breakdown: yes

### Frankfurt

- current wired source: citywide Frankfurt open-data offense CSV
- coverage in app: `2013–2024`
- area breakdown in app: no
- caveat: richer Hessen / police sources may exist outside the currently wired citywide CSV

### Hamburg

- source family: Polizei Hamburg PKS yearbooks
- coverage in app: `2019–2024`
- area breakdown in app: no

### Munich

- official source family verified
- not fully shipped yet as a reproducible end-to-end location
- caveat: host and document structure issues across years

### Paris

- source family: French Interior / SSMSI communal base
- coverage in app: `2016–2025`
- app currently uses citywide Paris only
- arrondissement rows exist in the raw source

### Luton

- current source family: annual ONS / Home Office local-authority series
- coverage in app: `2003–2018`
- area breakdown in current app source: no
- smaller-area official UK data exists in other source families

### Milan

- source family: Comune di Milano
- coverage in app: `2004–2023`
- area breakdown: not yet verified as a clean time series

### New York City

- source family: NYPD complaint open data
- coverage in app: `2006–2025`
- borough breakdown: yes
- caveat: offense catalog is broad; the app maps a major-offense subset only

### Chicago

- source family: Chicago Data Portal
- coverage in app: `2001–2025`
- district breakdown: yes

### Los Angeles

- source family: LAPD open data
- coverage in app: `2010–2024`
- area breakdown: yes
- caveat: very granular raw labels grouped into broader categories

### San Francisco

- source family: SFPD open data
- coverage in app: `2018–2025`
- police-district breakdown: yes

### Rome

- source family: Roma Capitale workbooks
- coverage in app: `2016–2023`
- area breakdown: not yet verified as a clean time series

### Barcelona and Valencia

- source family: Spanish Interior Ministry annual crime-balance releases
- coverage in app: `2013–2025`
- area breakdown in app: no

Important caveat:

- the archive page goes further back, but that does not prove a clean, continuous city-level municipal series exists for every year in the same usable structure

## When adding a new city

Checklist:

1. verify official source
2. verify actual download surface
3. determine years really usable
4. determine whether sub-city geography exists
5. determine whether rate data exists
6. map source categories into dashboard taxonomy
7. map source categories into comparison taxonomy
8. add source notes
9. regenerate data
10. run anomaly checks
11. run lint/build

## What not to do

- do not backfill with guessed values
- do not smooth or interpolate missing years silently
- do not compare categories across cities just because the English labels look similar
- do not call something “official city data” if it actually comes from a ministry or national statistics office
- do not remove methodology notes to make the UI look cleaner

## Copy guidance

Homepage / product copy should remain technically correct.

Safe wording:

- official dashboards built from police-recorded crime data published by public authorities

Avoid wording that implies:

- all data comes directly from city authorities
- all cities are perfectly comparable
- the app measures all crime that happened rather than officially recorded crime

## Related file

`datalookup.md` is older supporting context.

Use `agent.md` as the main operating guide going forward.
