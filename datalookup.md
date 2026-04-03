# Crime Atlas Data Lookup Notes

## Purpose
This note is the handoff for future agents extending the data layer in this repo.

The rule is:
- prefer official public-authority sources only
- do not stop at the first year range already wired in the app
- do not assume an archive page year tab means there is a clean city-level series for that year
- verify the actual downloadable file structure before concluding a city has no more usable data

## Current ingestion model
The app does **not** read spreadsheets or PDFs at runtime.

Runtime data comes from committed generated JSON:
- `src/generated/locations-index.json`
- `src/generated/crime-data.json`
- `src/generated/locations/*.json`

The generator is:
- `scripts/prepare-data.ts`

Production builds intentionally use the committed generated data. If you refresh source data, run:
- `npm run data:prepare`

## Project-wide sourcing rules

### 1) Archive year lists are not enough
Many official archive pages list years going far back, but that does **not** prove:
- city-level rows exist for those years
- the same geography exists for those years
- the category taxonomy is comparable
- the file is still downloadable
- the file is machine-parseable

Always inspect the actual attachment or workbook before claiming a year is usable.

### 2) “No area breakdown” must be a verified conclusion
Do not infer this from the current app alone.

You must check whether the official source family includes:
- district / borough / arrondissement / municipio slices
- separate geography IDs in CSV/XLS/PDF tables
- another official public-authority dataset for the same city that has smaller-area crime data

Only after checking those paths should you conclude there is no usable area breakdown.

### 3) Preserve source-era taxonomy honestly
If older files use a different official category system:
- keep the original source label in the mapping layer
- map only where the relationship is defensible
- do not invent fine-grained categories that are absent in older files

Missing older-category detail is better than fake continuity.

## City notes

### Berlin
- Official source family: Polizei Berlin Kriminalitätsatlas + PKS archive
- Current app coverage: `2006–2024`
- District breakdown: yes
- Main caveat: atlas category names are stable enough for the current mapping, but future agents should still re-check new workbook structures and any renamed offense groups

### London
- Official source family: MPS geographic breakdown + ONS population files
- Current app coverage: `2010–2024`
- Borough breakdown: yes
- Main caveat: some category names change over time and are merged in the mapping layer

### Frankfurt
- Official source family currently wired: Frankfurt open-data citywide offense-type CSV
- Current app coverage: `2013–2024`
- Area breakdown in app: no
- Important caveat: this is a citywide source with broad offense groups only; richer official detail may exist in other official Hessen / police statistical releases

### Hamburg
- Official source family: Polizei Hamburg PKS yearbooks
- Current app coverage: `2019–2024`
- Area breakdown in app: no
- Important caveat: the current Hamburg slice is a stable citywide subset taken from the official yearbook comparison tables
- Build caveat: direct automated PDF downloads from `polizei.hamburg` can fail in some environments; the repo therefore stores a committed official-source extract in `src/data/hamburg-citywide-records.json`

### Munich
- Official source family identified: Landeshauptstadt München safety/crime statistics archive
- App status: not shipped yet
- Why not shipped yet: the official PDF host currently returns anti-bot / proxy blocks for some years in this environment, so a reproducible end-to-end generator path is not ready
- Verified source path: `https://stadt.muenchen.de/infos/statistik-sicherheit.html`
- Verified archive shape: annual `Jahreszahlen` PDFs from `2001–2024`, plus a dedicated `Erfasste und aufgeklärte Straftaten 2024` PDF
- Important caveat: some early PDFs are structurally inconsistent for fine category extraction; do not assume a clean `2001–2024` category series without validating each year

### Paris
- Official source family currently wired: French Interior / SSMSI communal base
- Current app coverage: `2016–2025`
- Area breakdown in app: no
- Important caveat: the raw source includes arrondissement rows for Paris; the app currently keeps only commune-wide Paris `75056`

### Luton
- Official source family currently wired: ONS / Home Office local-authority annual crime tables
- Current app coverage: `2003–2018`
- Area breakdown in app: no
- Important caveat: smaller-area official crime data exists in other UK police datasets, but not in the same clean annual local-authority series currently used here

### Milan
- Official source family: Comune di Milano crime and population CSVs
- Current app coverage: `2004–2023`
- Area breakdown in app: no verified time-series area layer wired yet

### New York City
- Official source family: NYC Open Data / NYPD complaint datasets
- Current app coverage: `2006–2025`
- Borough breakdown: yes
- Important caveat: the raw NYPD offense catalog is much broader than the dashboard. The app maps a stable major-offense subset from the official catalog rather than claiming to show every NYPD offense row.

### Chicago
- Official source family: Chicago Data Portal crime dataset
- Current app coverage: `2001–2025`
- District breakdown: yes
- Important caveat: the source is incident-level and very broad. The app maps the major offense groups directly from the official `primary_type` values and leaves the rest out rather than inventing a fake all-crime total.

### Los Angeles
- Official source family: Los Angeles Open Data / LAPD crime datasets
- Current app coverage: `2010–2024`
- Area breakdown: yes
- Important caveat: LAPD publishes very granular raw offense descriptions. The app groups those official labels into broader major-offense buckets, so future extensions must keep that grouping logic explicit and defensible.

### San Francisco
- Official source family: San Francisco Open Data / SFPD incident reports
- Current app coverage: `2018–2025`
- Police-district breakdown: yes
- Important caveat: some source categories are administrative or non-crime rows. The app intentionally maps only the defensible offense categories and ignores blank / non-offense buckets.

### Rome
- Official source family: Roma Capitale safety/statistics workbooks
- Current app coverage: `2016–2023`
- Area breakdown in app: no verified city-subarea time series wired yet
- Important caveat: the workbook structure changes before and across some years; do not hardcode one sheet layout forever

### Barcelona and Valencia
- Official source family: Spanish Interior Ministry annual crime-balance releases
- Current app coverage: `2013–2025`
- Area breakdown in app: no

Important caveats:
- The ministry archive page lists years back to `2000`, but that does **not** mean there is a continuous clean municipality-level annual category series back to `2000`
- The archive year tabs mix many Interior Ministry report types; do not assume every listed year contains the same municipality-level annual crime table
- The currently verified clean city-level annual span is derived from:
  - the official `2014` year-end workbook, which contains municipality rows for both `2013` and `2014`
  - official year-end `2015` PDF tables
  - official annual `2016–2020` ZIP bundles
  - official annual `2021–2025` PDFs
- `2015–2016` use the older EU-style offense groups
- `2017–2020` use the pre-cybercrime richer municipal grouping
- `2021+` use the newer official grouping with conventional crime / cybercrime splits
- `2022` is a special case: the official table is a three-year comparison (`2019 / 2021 / 2022`), so parser logic must not assume two-count rows
- If you extend Spain further back, verify municipality rows in the actual official download before claiming success

Official source paths already verified for Spain:
- archive page: `https://www.interior.gob.es/opencms/es/prensa/balances-e-informes/`
- publications portal: `https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/publicaciones.html`
- 2014 year-end workbook: `https://www.interior.gob.es/opencms/pdf/prensa/balances-e-informes/2014/Balance-criminalidad-diciembre-2014.xls`
- 2015 year-end PDF attachment: `https://www.interior.gob.es/opencms/pdf/informe-balance-2015_ene_dic_5607112.pdf`
- grouped annual ZIPs already used in the importer for `2016–2020`

### Lisbon
- Official source family identified: Statistics Portugal (INE) / Direção-Geral da Política de Justiça municipality indicator JSON
- App status: not shipped yet
- Verified official count endpoint: `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0012261&lang=PT`
- Verified official rate endpoint: `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0008074&lang=PT`
- Important caveat: the currently verified clean municipality count feed is only clearly exposed for `2025`, while the verified rate endpoint is only clearly exposed for `2022`; do not claim a continuous comparable Lisbon series until more years are validated

### Lampedusa fallback
- Best official fallback candidate found so far: Palermo
- Why Palermo: it is the strongest nearby major-city official-publication path identified so far for Sicilian municipal safety/crime statistics
- Current status: not shipped yet
- Important caveat: Palermo’s official open-data portal is verified, but the clean crime time-series layer still needs one more pass; current easily verified Palermo municipal open data is stronger on mobility/safety incidents than on a ready-made annual crime-category series
- Palermo official portals already verified:
  - `https://opendata.comune.palermo.it/`
  - `https://docs.comune.palermo.it/`

## Validation checklist for future data work
Every data extension should verify:

1. Year completeness
- confirm the app is not arbitrarily truncating a city where more official years exist

2. Geography completeness
- confirm whether official sub-city rows exist before leaving `No Area Breakdown`

3. Taxonomy drift
- compare old and new source labels and note where categories split, merge, or disappear

4. Sanity checks
- no negative counts
- expected years present
- spot-check at least a few rows against the official source

6. Reproducibility
- if an official host is anti-bot or environment-sensitive, prefer checking in a compact official-source extract over leaving a flaky live-download dependency in `data:prepare`

5. Production compatibility
- after any source refresh, run:
  - `npm run data:prepare`
  - `npm run lint`
  - `npm run build`

## Current principle for the homepage copy
Use wording that is technically correct across all cities.

Safe wording:
- official dashboards built from police-recorded crime data published by public authorities
- official dashboards built from police-recorded crime data published in public-authority datasets

Avoid wording that implies:
- all data comes directly from city authorities
- all data is directly comparable across countries
- the dashboard measures all crime that happened rather than officially recorded crime
