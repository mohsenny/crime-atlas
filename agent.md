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

Runtime data comes from the committed SQLite database:

- `prisma/crime-atlas.db`

The schema/client layer is:

- `prisma/schema.prisma`
- `src/lib/prisma.ts`

The ingestion/reset flow is:

- `scripts/reset-database.ts`
- `scripts/prepare-data.ts`

Local reseeding currently expects the host machine to have `sqlite3` available, because `scripts/reset-database.ts` applies SQL generated from the Prisma schema into `prisma/crime-atlas.db`.

If source data changes, regenerate and reseed with:

```bash
npm run data:prepare
```

Production builds intentionally use the committed database. Do not make Railway or production builds depend on live remote fetching unless there is a very good reason.

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

### 1.1 Wikipedia can be a lead, not a source

Wikipedia is acceptable for discovery only.

Use it to:

- identify candidate cities or countries
- find the names of police/statistical institutions
- find archive page titles, report names, and official datasets in the references

Do not use Wikipedia numbers as product data.

If Wikipedia points to a useful source, follow the citation through to the original official publisher and validate the geography, year range, taxonomy, and file usability there.

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

Selection rules for this dashboard taxonomy:

- `All recorded offenses` is a mutually exclusive total bucket.
- If `All recorded offenses` is selected, every other category should be deselected.
- If any non-total category is selected, `All recorded offenses` should be deselected.
- The same exclusivity rule also applies to shipped parent buckets that already include their own children:
  - `All theft` vs theft descendants such as `Theft`, `Other theft`, `Vehicle theft`, `From vehicles`, `Bike theft`, and `Burglary`
  - `All assaults` vs `Assault` / `Aggravated assault`
  - `All arson` / `All arson-related offenses` vs `Arson`
  - `All damage` / `All criminal damage` vs `Criminal damage` / `Graffiti`
- Reason:
  - these parent buckets are already inclusive totals in the source and should not stack on top of their descendants in the public chart
- If a future city introduces a new parent-style bucket, extend the centralized helper in `src/lib/location-category-selection.ts` instead of hardcoding page-specific behavior.

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

## Population-series rule for comparison

City-to-city `Rate per 100k` comparison should be treated as a first-class data requirement, not an optional afterthought.

When adding or upgrading a city:

1. verify the exact geography of the crime counts
2. get an official yearly population series for that same geography
3. store it in the normalized location-population table through the ingestion pipeline
4. prefer official annual city totals over inferred or interpolated values
5. if some years are missing from the official population source, leave those rate years blank rather than inventing them

The compare page can safely enable the rate toggle when every selected city has a real official city-population series. Missing years should render as gaps, not fabricated lines.

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

## Database expectations

The JSON-export era is over. Future agents should treat the SQLite database as the primary runtime store.

That means:

- source fetch/parsing belongs in `scripts/prepare-data.ts`
- database reset/schema bootstrap belongs in `scripts/reset-database.ts`
- runtime reads should come from Prisma queries in `src/lib/dashboard-data.ts`
- if a source path emits duplicate or invalid numeric rows, fix that during ingestion rather than compensating in the UI

The current normalized tables are designed to scale:

- `Location`
- `Source`
- `District`
- `Category`
- `LocationPopulation`
- `CrimeRecord`
- `CanonicalCategory`
- `ComparisonMapping`
- `ComparisonMappingSource`

When adding a new city, make sure the ingestion path fills all relevant tables, not just crime records.

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
- The early `2008–2009` OCR corruption is now repaired in ingestion instead of being shipped raw.
- Current repair rule:
  - detect rows whose count/rate combination implies an impossible district population, or whose rate structure is broken
  - replace only those rows with a derived fill from adjacent official years for the same district/category
- This makes Berlin much safer than before, but it still means some `2008–2009` district/category rows are derived repairs, not direct trustworthy OCR output.

### Barcelona / Valencia

- The Spanish source path is official, but the municipality-level publication structure is not stable enough across all archive years to ship as one continuous annual series.
- The app now intentionally keeps only the verified municipality-comparable years:
  - `2013`
  - `2014`
  - `2018–2025`
- `2015–2017` are currently excluded on purpose because they do not yet have a verified municipality-comparable official series in the same stable structure.
- Treat this as a source-family compatibility problem, not a real crime collapse.
- Barcelona citywide population is now sourced from the official Barcelona open-data population package and covers the shipped years cleanly.
- Valencia citywide population comes from the official Valencia municipal indicator `F02051000` (`Población residente`), but the live PDF endpoint is intermittently blocked by a WAF in this environment.
- Because of that instability, the generator keeps a verified official fallback series for `2015–2024` extracted from the official PDF:
  - 2015: 787,266
  - 2016: 791,632
  - 2017: 792,086
  - 2018: 798,538
  - 2019: 795,736
  - 2020: 801,545
  - 2021: 800,180
  - 2022: 797,665
  - 2023: 809,501
  - 2024: 830,606
- Do not replace that fallback with non-official numbers. If live access becomes reliable again, prefer the direct official PDF parse.
- Important new finding from the April 2026 audit:
  - the official crime portal also exposes structured PC-Axis export pages with XLS/XLSX/CSV/PX downloads
  - example communities table:
    - `https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/Tabla.htm?L=0&file=99010.px&path=%2FDatosBalanceAnt%2Fl0%2F`
  - example export dialog:
    - `https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/dlgExport.htm?path=/DatosBalanceAnt/l0/&file=99010.px`
  - this is now the preferred Spain path and is already used for:
    - `Spain 2018–2025` (autonomous communities)
    - `Barcelona 2018–2025`
    - `Valencia 2018–2025`
  - direct April 2026 spot-checks confirmed that sampled Barcelona and Valencia all-offenses totals in `2020`, `2023`, and `2025` match the official municipality CSVs exactly
  - deeper spot-checks also confirmed sampled municipality category rows in `2020`, `2023`, and `2025` for:
    - robbery
    - burglary
    - vehicle theft
    - drug trafficking
    - total offenses
  - keep the `2014` municipal workbook only for the older `2013–2014` Barcelona/Valencia slice
  - do not regress Spain back to PDF text extraction for these shipped years
  - for Spain country-level community totals, remember that the official `TOTAL NACIONAL` row includes an `EN EL EXTRANJERO` bucket; the dashboard's Spain area layer intentionally excludes that non-community bucket
  - deeper spot-checks also confirmed sampled Spain community category rows in `2020`, `2023`, and `2025` for `Cataluña` and `Comunitat Valenciana`, including robbery, burglary, theft, vehicle theft, drug trafficking, and total offenses

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
- Citywide population is available from the official Tokyo statistical yearbook CSV `tn23qv020100.csv` and is wired for `2010–2023`
- Important audit note:
  - the previously flagged `Chuo-ku` `Fraud` jump is present in the official station-level CSV once summed to the district row
  - treat sampled low-base Tokyo spikes as source-real unless a future audit finds a clear structural source change

### São Paulo

- Official crime source family in app: São Paulo state public-security quarterly/year-end HTML tables, aggregated to the Capital row
- Current app coverage: `2010–2025`
- Area breakdown in app: no
- Citywide population is now sourced from official IBGE APIs:
  - annual estimates table `6579` for `2011–2021`, `2024–2025`
  - 2010 Census table `761`
  - 2022 Census table `4714`
  - 2023 IBGE DOU municipal publication XLS
- Important caveat:
  - the `2023` São Paulo row is an explicit official 2023 publication, but it is census-2022 based rather than a normal estimate-series row
  - keep that methodology seam documented instead of pretending every São Paulo population year comes from the same IBGE series

### U.S. cities

- Chicago, New York City, Los Angeles, and San Francisco now use official U.S. Census city population tables for `2001–2024`
- Austin, Dallas, Houston, Phoenix, and Seattle now use the same official U.S. Census city population series pattern for comparison-rate support
- Historical `2001–2010` values come from `sub-est00int.csv`
- `2010–2020` and `2020–2024` values come from state-specific Census XLSX tables
- Match the historical CSV on `SUMLEV=162`, `NAME`, and `STNAME`; do not match only on city-name substring or the wrong county/part rows can leak in
- Important caveats:
  - `2024` does not currently resolve at the verified CSV path
  - the CSV should be fetched with a browser-like user agent
  - police-station detail is more granular than the dashboard; the app aggregates to a stable area layer
  - comparison pages can use citywide rate calculations from these population series even when the city dashboard remains count-only because district-level population series are not wired
  - Houston annual HPD NIBRS CSV downloads are much more reliable through `curl` than through the repo's generic `fetch` helper

### Cleveland

- Official crime source family is wired and shipped from the city ArcGIS incidents layer.
- Current app coverage: `2016–2025`
- Public area layer in app: Districts `1–5`
- Important audit note:
  - the ArcGIS feed also exposes `District O`
  - `District O` collapses sharply across many categories from `2018` to `2019`
  - official Cleveland city materials consistently describe five police districts, so `District O` should be treated as a non-public or unstable bucket
  - do not reintroduce `District O` into the public district selector unless a future official source clearly defines it as a stable public geography

### Internal geography watchlist

- Cleveland was not unique. A wider district-label scan surfaced other locations that may also mix public geographies with internal buckets.
- Current watchlist:
  - Austin: resolved in the app by trimming to stable public Districts `1–8`
  - Houston: resolved in the app by trimming to standard HPD beat codes only
  - Louisville: resolved in the app by trimming to the eight numbered LMPD divisions only
  - Minneapolis: resolved in the app by removing `Z_** Not Assigned **` and normalizing the duplicated `Stevens Square - Loring Heights` label
  - Seattle: resolved in the app by trimming to the five public SPD precincts only

### Overlapping Parent/Child Source Labels

- Some sources intentionally reuse the same raw offense labels for both a parent bucket and a child bucket.
- Example:
  - Sydney `Drug offenses` should include the trafficking subcategories.
  - Sydney `Burglary` should include the `Break and enter dwelling` slice while `Residential burglary` still exists separately.
  - Melbourne has the same pattern for `Drug offenses` and `Drug trafficking`.
- The ingestion layer must write those overlapping source labels into all intended categories, not just the last matching category.
- The dashboard UI exclusivity rules then prevent deceptive stacking by making parent buckets mutually exclusive with their child buckets.
- Rule for future agents:
  - do not assume every district/beat/division label in an official incident feed is a public-facing geography
  - if a feed contains unlabeled, null-like, county-like, or agency-like buckets, source-check them before shipping them in the area selector

### Sydney

- Official source family is wired and shipped from the NSW BOCSAR offence-by-month workbook.
- Current app coverage: `2001–2025`
- Area breakdown in app: `33` Greater Sydney LGAs
- Important audit note:
  - sampled Wollondilly `Arson` and `Drug offences` rows match the official workbook values directly
  - treat sampled low-base Sydney spikes as source-real unless a future audit finds a workbook-structure change

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

- The app now repairs a bounded set of obviously corrupted `2008–2009` PDF-derived rows before seeding the DB.
- Current repair rule lives in `scripts/prepare-data.ts` and interpolates only when the OCR row is structurally invalid and adjacent official years exist.
- This is a controlled repair, not proof that every raw PDF row is trustworthy.
- Treat old Berlin comparison as usable, but remember that some early rows are derived repairs.

### London

- The airport special area is not a parser failure.
- Direct source checks against the official London monthly CSVs show:
  - `London Heathrow and London City Airports__Theft from vehicles 2023:456`
  - `London Heathrow and London City Airports__Theft from vehicles 2024:83`
- Those dashboard totals come from real raw London categories:
  - `THEFT FROM A VEHICLE`
  - `INTERFERING WITH A MOTOR VEHICLE`
- Treat it as a special-geography caveat, not a citywide integrity problem.

### Valencia

- The earlier PDF-driven `2023` jump was fixed by switching the shipped `2018–2025` series to the official structured municipality exports.
- Current shipped Valencia is acceptable for the shipped years, but it still mixes:
  - `2013–2014` from the official workbook
  - `2018–2025` from the official PC-Axis municipality exports
- Keep the `2015–2017` gap explicit unless a reliable official source is found.

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

- `sanitizeBerlinHistoricalRecords()` in `scripts/prepare-data.ts`

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
- risk: archived PDF parsing for early years; a small set of `2008–2009` rows is now repaired from adjacent official years during ingestion

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
- coverage in app: `2001–2021`
- area breakdown in app: no
- official crime PDFs for `2003–2009` and `2018–2021` parse cleanly through the same Munich archive source family
- important parser note:
  - archived `2001–2002` PDFs expose previous/current count columns, while archived `2003–2009` PDFs expose current count plus rate only
  - the archived parser must choose the count column based on row shape, not one fixed numeric index
  - Munich `2010+` PDFs contain both a citywide summary block and later comparative table rows
  - the parser must prefer the first citywide summary matches for category counts
  - otherwise categories such as theft, bike theft, fraud, and robbery will be overstated by accidentally reading the later comparative rows
- official population series for `2003–2021` comes from the Munich statistical office publication `Bevölkerung 1970 - 2022 nach Geschlecht und Staatsangehörigkeit`

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

### Austin

- source family: Austin Police Department Crime Reports (official city Socrata dataset)
- coverage in app: `2003–2025`
- district breakdown: yes
- caveat: raw Austin offense labels are verbose and include family-violence / weapon qualifiers, so the mapping layer intentionally groups them into broader canonical categories
- important area-layer note:
  - the raw Austin feed contains many sparse stray district codes
  - the public dashboard now keeps only stable Districts `1–8` and normalizes zero-padded duplicates such as `01`

### Dallas

- source family: Dallas Police Incidents (official city Socrata dataset)
- coverage in app: `2017–2025`
- district breakdown: yes, using division-level geography
- caveats:
  - `date1` is not a stable timestamp column for grouped annual queries; use `year1` for year aggregation
  - use `nibrs_crime`, not `offincident`, for category mapping
  - the earlier `2014–2016` slice looked structurally incomplete in this source path and is intentionally excluded
  - Dallas sexual-offense support is intentionally not shipped in the current mapping layer because the verified official fields did not expose a clean comparable series

### Houston

- source family: Houston Police Department NIBRS public annual CSVs
- coverage in app: `2019–2025`
- area breakdown: yes, using police beats
- caveats:
  - the HPD annual CSVs are large and should be downloaded with `curl`; the generic `fetch` downloader stalled repeatedly in this environment
  - the CSV header format changed in `2025`
  - do not hardcode only the old compact header names; normalize headers so both forms work:
    - old: `NIBRSDescription`, `OffenseCount`
    - new: `NIBRS Description`, `Offense Count`
  - the `2025 = 0` failure was caused by this header rename, not by bad source data
  - the raw beat field also contains non-public or external buckets such as `HCSO`, `UH-*`, `OOJ`, `NULL`, and `HCC*`
  - keep only standard HPD beat codes in the public area selector unless a future official source explicitly defines the other buckets as public beats

### Phoenix

- source family: Phoenix open-data crime CSV
- coverage in app: `2016–2025`
- area breakdown: no clean police-district layer in the shipped source; the dashboard is currently citywide
- caveat: the first available slice in the CSV family is a partial `2015`, so the app starts at `2016`

### Seattle

- source family: SPD Crime Data 2008-Present (official Seattle open data)
- coverage in app: `2008–2025`
- precinct breakdown: yes
- caveat: `offense_category` is too coarse for the app; use `nibrs_offense_code_description` for category mapping
- area-layer rule:
  - the raw source also exposes `Ooj`, but Seattle Police publicly defines only `North`, `East`, `South`, `West`, and `Southwest` precincts
  - keep only those five public precincts in the dashboard area selector
  - do not surface `Ooj` unless a future official source explicitly defines it as a public precinct geography

### Louisville

- source family: Louisville Metro Government ArcGIS annual crime layers
- coverage in app: `2010–2025`
- area breakdown: yes, using LMPD divisions
- caveats:
  - the raw division field contains the eight numbered LMPD divisions plus a long tail of tiny municipal/OOJ-style buckets such as `Metro Louisville`, `Lmpd`, `Ooj`, `Oldham`, `Anchorage`, `Shively`, `St Matthews`, and others
  - for the public dashboard, keep only the eight numbered divisions:
    - `1st Division`
    - `2nd Division`
    - `3rd Division`
    - `4th Division`
    - `5th Division`
    - `6th Division`
    - `7th Division`
    - `8th Division`
  - do not expose the other buckets in the area selector unless a future official methodology source clearly says they belong in the same public division layer

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
- coverage in app: `2013`, `2014`, `2018–2025`
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
