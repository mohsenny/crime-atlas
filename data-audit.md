# Crime Atlas Data Audit

Last updated: 2026-04-09

This file tracks data-integrity findings for every shipped location in the app.

It is intentionally blunt. If a source path, parser, or coverage window is not trustworthy enough, it should be called out here instead of being silently tolerated in the product.

## Audit Method

This first-pass audit used:

- the committed runtime database at `prisma/crime-atlas.db`
- source-family review from `src/lib/location-config.ts`
- location-by-location anomaly scanning of year-over-year counts and rates
- targeted spot checks of the highest-risk locations already known to be fragile

This file does **not** claim that every single row has been manually verified against the original official attachment yet.

What it does claim:

- every shipped location has now been reviewed
- the worst current mismatches and suspicious coverage windows are recorded here
- locations that look stable on a first pass are explicitly marked as such

## Status Legend

- `Confirmed issue`: data in the DB is wrong, incomplete, or structurally unsafe
- `High concern`: source/parser path is fragile enough that the series should not be treated as fully trustworthy yet
- `Moderate concern`: coverage or category limitations are known, but the location is still usable with caveats
- `Initial pass clean`: no major anomaly surfaced in the first audit pass; deeper row-level source verification is still possible later

## Cross-Location Findings

### Confirmed issues

### Coverage issues

- `Munich` has a DB coverage gap:
  - present: `2001–2002`, `2010–2017`
  - absent: `2003–2009`
  - This may reflect source availability, but it must be documented as a real coverage gap rather than treated as continuous history.

- `São Paulo` has a population-series gap for `2023`.
  - Crime coverage is `2010–2025`
  - Official population coverage in DB is missing `2023`
  - Count views are still usable; rate views for `2023` should remain blank rather than interpolated.

### Known low-base noise that is not yet a confirmed citywide failure

- `Phoenix` shows many large ratio jumps in tiny grid cells such as `1 -> 64`, `15 -> 1`, etc.
  - Because Phoenix is modeled at a very fine grid level, these may be real low-base effects rather than parser corruption.
  - This is noisy, but not yet enough to call the overall city series broken.

- `Tokyo`, `France`, `Italy`, `Louisville`, `Seattle`, `San Francisco`, and several others show some large year-over-year jumps only in very small categories or tiny base counts.
  - These need normal skepticism, but they are not currently the highest-priority integrity failures.

### Potential non-public geography buckets

- A broader district-label scan found several feeds that may contain internal or non-public geography buckets similar to Cleveland's former `District O`.
- Current watchlist:
  - `Austin`: labels such as `District OOC`, `District ADM`, `District P`, `District S`, `District IDA`
  - `Houston`: labels such as `Beat NULL`, `Beat OOJ`, `Beat UH-2PD`, `Beat UH-3PD`, `Beat HCC*`, `Beat HCSO`
- These are not yet confirmed errors, but they should be source-checked before the related area layers are treated as fully clean public geography.

### Parent/child category overlap

- The dashboard previously allowed inclusive parent buckets such as `All theft` to stack alongside their own descendants.
- That could visually overstate totals even when the source data itself was fine.
- This has now been corrected in the shared selection logic:
  - `All offenses` remains mutually exclusive with all other categories
  - `All theft`, `All assaults`, `All arson`, and `All damage` are mutually exclusive with their own child buckets
- Future audits should keep watching newly added cities for additional parent-style categories that need the same treatment.

## Location-by-Location Audit

## Australia

### Melbourne

- Status: `Initial pass clean`
- DB coverage: `2020–2025`
- Area layer: `31 LGAs`
- Source family: Crime Statistics Agency Victoria LGA workbooks + ABS LGA population workbook
- Findings:
  - citywide totals look directionally coherent: `397,697` in `2020` -> `458,327` in `2025`
  - no major structural break surfaced in the first anomaly pass
- Follow-up:
  - still worth spot-checking one or two LGA/category rows directly against the workbook

### Sydney

- Status: `Low concern`
- DB coverage: `2001–2025`
- Area layer: `33 LGAs`
- Source family: NSW BOCSAR offence-by-month workbook + ABS LGA population workbook
- Findings:
  - citywide totals are broadly coherent over the full run
  - anomaly scan surfaced a handful of high-ratio changes in very small LGA/category series, e.g. `Mosman` `Drug trafficking`
  - sampled Wollondilly rows, including `Arson` and several `Drug offences` subcategories, match the official workbook values directly
- Assessment:
  - no citywide failure found in the first pass
  - sampled low-base spikes appear to be source-real behavior rather than a parser problem

## Brazil

### São Paulo

- Status: `Moderate concern`
- DB coverage: `2010–2025`
- Area layer: citywide only
- Source family: São Paulo state public-security tables + IBGE population APIs
- Findings:
  - citywide totals are plausible across the full run
  - `2021–2025` growth deserves later source spot-checking but is not obviously impossible
  - official population series is missing `2023`
- Assessment:
  - crime counts look usable
  - comparison-rate support is incomplete for the `2023` year

## France

### France

- Status: `Initial pass clean`
- DB coverage: `2000–2021`
- Area layer: departments
- Source family: French Interior/SSMSI communal/departmental tables
- Findings:
  - a few large ratio changes surfaced only in tiny-base categories such as department-level homicides
  - no broad department-wide structural collapse similar to Spain was found
- Assessment:
  - usable on first pass
  - still deserves later spot-checks of a few department/year rows

### Paris

- Status: `Initial pass clean`
- DB coverage: `2016–2025`
- Area layer: citywide only in the current app
- Source family: French Interior/SSMSI communal base
- Findings:
  - citywide totals look coherent, including the expected pandemic dip and rebound
  - no major anomaly surfaced in the first pass
- Assessment:
  - looks stable on first pass

## Germany

### Berlin

- Status: `Moderate concern`
- DB coverage: `2006–2024`
- Area layer: districts
- Source family: Berlin atlas workbook + historical PDF extraction
- Findings:
  - the earlier corrupt `2008–2009` atlas rows are now repaired during ingestion instead of being shipped raw
  - repair rule:
    - detect rows whose count/rate combination implies an impossible district population, or whose count/rate structure is otherwise broken
    - replace only those rows with a derived fill from adjacent official years for the same district/category
  - the current DB no longer contains Berlin `2008–2009` rows with impossible implied populations or zero-rate corruption
  - examples now look coherent again:
    - `Spandau` `All theft`: `9,898` in `2007` -> `9,985` in `2008` -> `10,073` in `2009` -> `10,160` in `2010`
    - `Treptow-Köpenick` `All theft`: `9,795` in `2007` -> `9,686` in `2008` -> `9,576` in `2009` -> `9,467` in `2010`
    - `Reinickendorf` `All theft`: `10,695` in `2007` -> `10,790` in `2008` -> `10,886` in `2009` -> `10,981` in `2010`
- Assessment:
  - `2015–2024` current workbook years are safer because they come from the current Berlin workbook
  - `2006–2014` is now materially better, but still carries a methodological caveat because some `2008–2009` rows are derived repairs rather than direct trustworthy OCR output

### Frankfurt

- Status: `Initial pass clean`
- DB coverage: `2013–2024`
- Area layer: citywide only
- Findings:
  - totals are stable and plausible across the run
  - no major first-pass anomaly surfaced

### Germany

- Status: `Initial pass clean`
- DB coverage: `2019–2024`
- Area layer: Länder
- Findings:
  - totals are stable and plausible at country-subdivision scale
  - no structural failure surfaced in the first pass

### Hamburg

- Status: `Initial pass clean`
- DB coverage: `2019–2024`
- Area layer: citywide only
- Findings:
  - totals are coherent
  - no major anomaly surfaced

### Munich

- Status: `Moderate concern`
- DB coverage: `2001–2002`, `2010–2017`
- Area layer: citywide only
- Findings:
  - values present in the DB do not look obviously impossible
  - the coverage gap from `2003–2009` is real and must be treated as a gap, not a silent omission

## Italy

### Italy

- Status: `Moderate concern`
- DB coverage: `2019–2024`
- Area layer: regions
- Findings:
  - anomaly scan surfaced several very large ratio moves in low-base regional categories such as `Public service disruption` and `Bribery and corruption`
  - these may be real low-count effects, but they deserve source spot-checking before the region series is treated as fully clean

### Milan

- Status: `Initial pass clean`
- DB coverage: `2004–2023`
- Area layer: citywide only
- Findings:
  - totals are coherent, including the `2020` pandemic dip and later recovery

### Rome

- Status: `Initial pass clean`
- DB coverage: `2016–2023`
- Area layer: citywide only
- Findings:
  - totals look plausible and continuous
  - no major first-pass anomaly surfaced

## Japan

### Tokyo

- Status: `Low concern`
- DB coverage: `2010–2023`
- Area layer: 46 districts/municipalities
- Source family: Tokyo statistical yearbook CSVs
- Findings:
  - citywide totals show a long decline through `2019` and later modest rebound; this may be real
  - anomaly scan surfaced several large jumps in tiny-base categories at district level, e.g. `Counterfeiting` and `Arson`
  - the flagged `Chuo-ku` `Fraud` jump is present in the official station-level CSV when summed to the district row, so it is not a mapper artifact
- Assessment:
  - no obvious citywide corruption found
  - sampled spikes appear to be source-real, not parser corruption

## Spain

### Barcelona

- Status: `Moderate concern`
- DB coverage: `2013`, `2014`, `2018–2025`
- Area layer: citywide only
- Findings:
  - the earlier PDF-driven discontinuity risk has been reduced by switching `2018–2025` to the official structured PC-Axis municipality exports
  - direct source spot-checks now match the official municipality CSV exactly for sampled totals, including `2020`, `2023`, and `2025`
  - shipped totals now look broadly plausible, including:
    - `All recorded offenses`: `194,290` in `2018`, `200,225` in `2019`, `117,786` in `2020`, `186,014` in `2023`, `169,678` in `2025`
  - the remaining missing `2015–2017` gap should stay explicit as a real coverage gap, not be backfilled invisibly
- Assessment:
  - currently usable for the shipped years

### Spain

- Status: `Low concern`
- DB coverage: `2018–2025`
- Area layer: autonomous communities
- Findings:
  - the earlier broken PDF-derived regional series has been replaced with the official structured PC-Axis community exports
  - the rebuilt totals are continuous and plausible:
    - `All recorded offenses`: `2,116,614` in `2018`, `2,187,091` in `2019`, `1,764,403` in `2020`, `2,466,459` in `2025`
  - direct source spot-checks confirm the community rows and national total are internally consistent in the official CSVs
  - the dashboard sum is intentionally below the official `TOTAL NACIONAL` row because the official file includes an `EN EL EXTRANJERO` bucket that is outside the dashboard's autonomous-community area layer
  - `2020` remains a real low year, but it now sits inside a plausible national series rather than a clearly corrupted one
- Assessment:
  - usable after the structured-source rebuild; region/category spot checks are still worth doing, but the main all-offenses continuity issue is resolved

### Valencia

- Status: `Moderate concern`
- DB coverage: `2013`, `2014`, `2018–2025`
- Area layer: citywide only
- Findings:
  - the earlier PDF-driven `2023` discontinuity is gone after switching `2018–2025` to the official structured municipality exports
  - direct source spot-checks now match the official municipality CSV exactly for sampled totals, including `2020`, `2023`, and `2025`
  - current DB values now look much more coherent:
    - `Theft`: `19,863` in `2021` -> `23,226` in `2022` -> `24,234` in `2023`
    - `All recorded offenses`: `53,358` in `2021` -> `60,825` in `2022` -> `62,393` in `2023`
  - as with Barcelona, the remaining missing `2015–2017` years are a real documented coverage gap
- Assessment:
  - now usable for the shipped years; still worth occasional source spot checks because this location mixes the 2014 workbook with the later PC-Axis export family

## United Kingdom

### Birmingham

- Status: `Initial pass clean`
- DB coverage: `2003–2018`
- Area layer: citywide only
- Findings:
  - totals are coherent
  - no major first-pass anomaly surfaced

### London

- Status: `Moderate concern`
- DB coverage: `2010–2024`
- Area layer: boroughs
- Findings:
  - citywide totals look coherent
  - one previously known small special-area anomaly still exists around the airport geography
- Assessment:
  - broadly sound, with a minor special-geography caveat

### Luton

- Status: `Initial pass clean`
- DB coverage: `2003–2020`
- Area layer: citywide only
- Findings:
  - totals are coherent
  - no major anomaly surfaced

### Manchester

- Status: `Initial pass clean`
- DB coverage: `2003–2018`
- Area layer: citywide only
- Findings:
  - totals are coherent
  - no major anomaly surfaced

## United States

### Austin

- Status: `Resolved with methodology trim`
- DB coverage: `2003–2025`
- Area layer: districts
- Findings:
  - citywide totals are coherent
  - the raw feed contains many sparse non-public or stray district codes alongside the stable public districts
  - the public dashboard now keeps Districts `1–8` only and collapses sparse zero-padded duplicates like `01` into the canonical public district code
- Assessment:
  - citywide totals remain plausible
  - the correct fix is to keep Austin’s stable public district layer rather than exposing internal stray district codes

### Chicago

- Status: `Initial pass clean`
- DB coverage: `2001–2025`
- Area layer: districts
- Findings:
  - citywide totals are coherent across the full run
  - anomaly scan only surfaced a small number of low-base district artifacts

### Cleveland

- Status: `Resolved with methodology trim`
- DB coverage: `2016–2025`
- Area layer: districts
- Findings:
  - the ArcGIS feed contains a `District O` bucket in addition to Districts `1–5`
  - `District O` shows several large one-year category collapses from `2018` to `2019`
  - examples:
    - `Motor vehicle theft`: `486` -> `17`
    - `Criminal damage`: `1,577` -> `85`
    - `Robbery`: `289` -> `21`
  - official Cleveland city materials consistently refer to five police districts, so `District O` does not look like a stable public district geography
- Assessment:
  - citywide totals remain plausible
  - the correct fix is to exclude `District O` from the public district selector instead of fabricating continuity

### Dallas

- Status: `Moderate concern`
- DB coverage: `2017–2025`
- Area layer: divisions
- Findings:
  - current DB no longer ships a `Sexual offenses` category for Dallas, which is intentional because the verified field mapping does not support it cleanly
  - totals look much more plausible after switching to the normalized `nibrs_crime` field
- Assessment:
  - current Dallas is usable, but category coverage is intentionally incomplete

### Houston

- Status: `Resolved with methodology trim`
- DB coverage: `2019–2025`
- Area layer: beats
- Findings:
  - the earlier `2025 = 0 everywhere` failure is now fixed locally
  - current DB after repair shows plausible `2025` totals again, including:
    - `All recorded offenses`: `248,273`
    - `Theft`: `37,548`
    - `Assault`: `27,197`
  - root cause was a header rename in the official HPD CSVs:
    - old headers: `NIBRSDescription`, `OffenseCount`, `Beat`
    - `2025` headers: `NIBRS Description`, `Offense Count`, `Beat`
  - ingestion is now normalizing header names before reading the CSV row
  - the raw beat field also contains non-public or external buckets such as `HCSO`, `UH-2PD`, `UH-3PD`, `OOJ`, `NULL`, and `HCC*`
  - the public dashboard now keeps only standard HPD beat codes matching the normal beat pattern
- Assessment:
  - citywide totals now look usable across `2019–2025`
  - the beat layer still deserves normal anomaly checking because it is large and noisy, but the non-public bucket issue is now trimmed out

### Los Angeles

- Status: `Moderate concern`
- DB coverage: `2010–2014`, `2016–2023`
- Area layer: areas
- Findings:
  - the exclusion of `2015` and `2024` is still appropriate and should remain documented
  - the remaining shipped years look broadly plausible

### Louisville

- Status: `Resolved with methodology trim`
- DB coverage: `2010–2025`
- Area layer: divisions
- Findings:
  - citywide totals are coherent
  - the raw division field also contains tiny municipal/OOJ-style buckets such as `Metro Louisville`, `Lmpd`, `Ooj`, `Oldham`, `Anchorage`, `Shively`, and others
- Assessment:
  - the public area layer is now intentionally trimmed to the eight numbered LMPD divisions
  - the extra raw buckets should not be surfaced in the dashboard selector unless a future official methodology source explicitly says they belong there

### Minneapolis

- Status: `Moderate concern`
- DB coverage: `2017–2025`
- Area layer: neighborhoods
- Findings:
  - anomaly scan surfaced a number of low-base neighborhood jumps, especially in `Motor vehicle theft`
  - citywide totals are still coherent
- Assessment:
  - likely usable, but not yet deeply source-checked

### New York City

- Status: `Initial pass clean`
- DB coverage: `2006–2025`
- Area layer: boroughs
- Findings:
  - totals are coherent after the earlier historical/current feed split fix
  - no major first-pass anomaly surfaced in the repaired run

### Phoenix

- Status: `Moderate concern`
- DB coverage: `2016–2025`
- Area layer: grids
- Findings:
  - the grid layer is extremely sparse and produces many very large ratio changes in tiny cells
  - citywide totals are still broadly plausible
- Assessment:
  - usable, but noisy by design at the grid level

### San Francisco

- Status: `Initial pass clean`
- DB coverage: `2018–2025`
- Area layer: police districts
- Findings:
  - citywide totals are coherent
  - only small low-base category blips surfaced

### Seattle

- Status: `Resolved with methodology trim`
- DB coverage: `2008–2025`
- Area layer: precinct areas
- Findings:
  - citywide totals are coherent
  - the raw source exposes a small `Ooj` geography bucket alongside the public precincts
- Assessment:
  - Seattle Police publicly defines only five precincts: `North`, `East`, `South`, `West`, and `Southwest`
  - `Ooj` should stay excluded from the public precinct selector unless a future official source explicitly defines it as a public precinct geography

## Immediate Repair Queue

These should be addressed before more broad comparison claims or aggressive location expansion:

1. Continue spot-checking the rebuilt Spain structured-source series at region and municipality level
2. Keep low-base Tokyo/Sydney spikes on the watchlist, but no parser changes are currently indicated
3. Continue spot-checking newly added cities for additional parent-style categories that may need the same exclusivity treatment

## Next Source Upgrade Candidates

- `Spain` has already been upgraded away from PDF parsing for the shipped regional and Barcelona/Valencia municipality series.
  - Official structured PC-Axis community exports now drive `Spain 2018–2025`.
  - Official structured PC-Axis municipality exports now drive `Barcelona 2018–2025` and `Valencia 2018–2025`.
  - Example official communities table page:
    - `https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/Tabla.htm?L=0&file=99010.px&path=%2FDatosBalanceAnt%2Fl0%2F`
  - Example export dialog page:
    - `https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/dlgExport.htm?path=/DatosBalanceAnt/l0/&file=99010.px`

## Rule Going Forward

Every newly added location should be added to this file immediately with:

- coverage years actually shipped
- official source family used
- area-breakdown status
- known category limitations
- anomaly/audit status

If a location has not been added to this file, it has not been properly audited.
