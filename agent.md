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

## Current unresolved data-quality findings

As of April 2026, the current generated data still has several source-cleaning issues that future agents must treat as open work before expanding comparison aggressively.

### Berlin

- `2006–2015` remains the riskiest source path because it is PDF-extracted.
- A real parser bug previously produced a fake `2008` residential-burglary spike.
- That specific case was identified, but additional suspicious historical rows still remain in early Berlin years.
- Known examples from anomaly scans include:
  - Reinickendorf `All recorded offenses` collapsing to very small counts and then jumping back
  - Spandau / Treptow-Köpenick `All theft` with impossible `ratePer100k` values in `2008`
  - isolated categories where one year appears truncated or columns shift

### Barcelona / Valencia

- The Spanish source path is official, but the municipality-level publication structure is not stable enough across all archive years to ship as one continuous annual series.
- The app now intentionally keeps only the verified municipality-comparable years:
  - `2013`
  - `2014`
  - `2020–2025`
- `2015–2019` are currently excluded on purpose because they created obvious structural discontinuities when stitched into the same city-level series.
- Treat this as a source-family compatibility problem, not a real crime collapse.

### Los Angeles

- Several LAPD area-level categories showed clear one-year truncation in `2015`, then rebound in `2016`.
- Examples appeared in `Southeast` and `Olympic` for robbery, burglary, theft, theft-from-vehicles, assaults, and fraud.
- The app now excludes `2015` entirely and also excludes `2024`, which appears to be an unsafe/incomplete latest-year slice in the currently used source path.
- Treat this as a source-window / schema-transition issue, not a real crime crash.

### New York City

- Borough-level rows showed obvious discontinuities when the app mixed a historical endpoint with a current endpoint across `2021–2025`.
- The app now uses:
  - historical source for `2006–2024`
  - current source only for `2025`
- This eliminated the tiny false 2021–2024 values that appeared in borough series like robbery.
- Rule: do not merge NYPD historical and current feeds across overlapping years unless the row structure is verified equivalent.

### Tokyo

- Official source family is now wired and shipped.
- Source pattern:
  - `https://www.toukei.metro.tokyo.lg.jp/tnenkan/<year>/tn<yy>qv201000.csv`
- Current app coverage: `2010–2023`
- Area breakdown: yes, aggregated from police-station rows to district/municipality rows
- Important caveats:
  - `2024` does not currently resolve at the verified CSV path
  - the CSV should be fetched with a browser-like user agent
  - police-station detail is more granular than the dashboard; the app aggregates to a stable area layer

### São Paulo

- Official source family is now wired and shipped.
- Current app coverage: `2010–2025`
- Area breakdown in app: no, citywide only
- Source path:
  - `https://www.ssp.sp.gov.br/assets/estatistica/trimestral/arquivos/<year>-04.htm`
- Important caveats:
  - use only quarter-4 (`-04`) pages for annual comparability
  - parse the official HTML using workbook-style import while preserving formatted cell text
  - use the `Capital` column for citywide São Paulo
  - the parser must keep display strings like `164.650` intact or thousands separators may be misread

### Berlin

- The app now removes a small set of obviously impossible PDF-corrupted historical rows before building generated data.
- This is a safeguard, not a full fix.
- Current sanitizing rule lives in `scripts/prepare-data.ts` and only removes implausibly large old PDF-derived rows.
- There are still unresolved early-year anomalies in Berlin, so treat comparison on old Berlin series as directionally useful but not fully clean.

### London

- One minor anomaly still remains in the airport special area:
  - `London Heathrow and London City Airports__Theft from vehicles 2023:456 -> 2024:83`
- This looks like a special-geography artifact rather than a citywide logic failure.

### Valencia

- One anomaly still remains in the currently shipped citywide series:
  - `Theft 2022:4507 -> 2023:24234`
- Treat Valencia as less trustworthy than Barcelona until the remaining Spanish municipality stitching is fully revalidated.

### Rule for future agents

Do not add more cities into the comparison layer as if the current dataset were fully clean.

First:

1. anomaly-scan every shipped city
2. isolate source-path failures
3. patch parser / transform logic
4. only then trust comparison behavior as broadly representative

## Current official-source coverage added after the first launch

These locations are now in the app and should be treated as shipped:

- Tokyo
- São Paulo

Do not remove or remap them casually. Preserve their current official source families unless you have a demonstrably better official-series path.

## Current strongest next research candidates

These are the most promising official source paths after the current hardening pass:

### Kyoto

- Official source family verified:
  - Kyoto Prefectural Police crime statistics page
  - `https://www.pref.kyoto.jp/fukei/anzen/toke/tokei.html`
- What is promising:
  - city/municipality-level crime PDFs are explicitly published
  - annual crime-statistics books exist
- Why not shipped yet:
  - still PDF-heavy
  - needs a stable extraction strategy before being trusted in the same way as Tokyo

### Mexico City

- Official source family looks promising via Mexico City open-data / prosecutorial incidence publications.
- What is promising:
  - there are official notes and datasets that explicitly refer to `alcaldías`
  - the city has a strong official open-data ecosystem
- Why not shipped yet:
  - the exact clean annual comparable offense-series path still needs one verified stable dataset family
  - do not ship from mixed explanatory notes / partial resources alone

### Lower-confidence investigations still open

- Tampa
- San Salvador

These may still become shippable, but as of now they do not yet have a verified clean official annual structured series on par with the stronger city candidates above.

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

### Candidate research backlog

These are official-source candidates that have been partially verified but not yet shipped.

#### São Paulo

- official path verified:
  - São Paulo State Public Security Secretariat transparency / statistics pages
  - official quarterly HTML tables with `Capital` / regional crime counts
- promising because:
  - reproducible official download surface exists
  - long span appears available on the archive pattern
  - category labels such as homicide, robbery, theft, vehicle theft, rape, and extortion are visible in the tables
- caution:
  - verify whether `Capital` is the right city-level unit to represent São Paulo consistently across years
  - confirm which archive files are annual / quarter-end and avoid mixing partial-year snapshots with full-year counts

#### Tokyo

- official path verified:
  - Tokyo Metropolitan Police (警視庁) annual crime statistics pages
  - Tokyo Statistical Yearbook table `20-10 Criminal Offenses Known to the Police by Type of Crime and Police Station`
- promising because:
  - reproducible CSV surface exists for at least `2018–2023`
  - police-station-level geography is already present
  - category breakdown is rich and machine-readable
- caution:
  - must decide whether product unit is Tokyo prefecture-wide, 23 wards, or a smaller city-centered interpretation

#### Kyoto

- official path verified:
  - Kyoto City statistical monthly reports
  - Kyoto Prefecture statistics / police materials
- promising because:
  - official city-level crime recognition counts are visible in Kyoto city statistical reports
  - police/prefecture layers may help with category depth
- caution:
  - needs a clean reproducible yearly series, not just scattered annual report PDFs

#### Bangkok

- official path partially verified:
  - Bangkok open-data / KPI datasets exist
- caution:
  - currently verified material appears too narrow or too short in coverage
  - not yet enough for a trustworthy long crime-category series

#### San Salvador

- official path partially verified:
  - Ministry of Justice and Security / DIA statistics pages
  - PNC transparency materials and municipality-level homicide examples
- caution:
  - current verified surface is mostly homicide / partial transparency outputs
  - not yet a robust municipal multi-category crime series

#### Mexico City

- official path verified:
  - CDMX open-data portal
  - FGJ crime-investigation datasets
  - official “delitos de alto impacto” monitor resources
- promising because:
  - official city source family is rich
  - alcaldía-level geography appears available
  - long updated series exists from `2016+`
- caution:
  - there was a documented official reclassification break around `2020`
  - any ingestion must respect the equivalence / reclassification notes, not blindly stitch pre/post series together

#### Tampa

- official path partially verified:
  - Tampa Police annual reports page
- caution:
  - the annual reports are official, but I have not yet verified a reproducible structured download path
  - if only PDF annual reports are available, this becomes a lower-priority source than Tokyo / São Paulo / CDMX

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
