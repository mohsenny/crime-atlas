# Berlin Crime Data Lookup Notes

## Purpose
This note explains how the Berlin crime workbook was sourced, interpreted, transformed, and what to watch out for if another agent needs to extend it later.

The generated deliverables were:
- `berlin_kriminalitaetsatlas_2015_2024.xlsx`: the original official source workbook downloaded from Berlin open data / Kriminalitätsatlas
- `berlin_crime_by_district_2015_2024.xlsx`: a cleaned workbook focused on district-level analysis

## Primary sources used

### 1) Berlin Open Data / Kriminalitätsatlas Berlin
Primary public source for district-level crime counts and rates.

Relevant endpoints/pages:
- Berlin Open Data dataset page: https://daten.berlin.de/datensaetze/kriminalitatsatlas-berlin
- Kriminalitätsatlas Berlin district view: https://www.kriminalitaetsatlas.berlin.de/K-Atlas/bezirke/atlasbez.html
- Kriminalitätsatlas Berlin notes/method page: https://www.kriminalitaetsatlas.berlin.de/K-Atlas/hinweise.htm

What this source provides:
- official Berlin police crime atlas data
- 12 administrative districts (`Bezirke`)
- also smaller spatial units, but those were not used in the cleaned workbook
- 17 offense groups (`Straftaten(-gruppen)`)
- both:
  - absolute counts (`Fälle`)
  - frequency/rate values (`Häufigkeitszahl`, usually referred to as `HZ`), i.e. cases per 100,000 residents
- time coverage currently described by the atlas notes as 2015–2024

Why this was the main source:
- it already exposes exactly the district-by-offense-by-year structure needed
- it is more convenient for district breakdowns than using only the annual PKS PDFs
- it contains both counts and normalized rates

### 2) Polizei Berlin PKS pages and PDFs
Used for methodology context and caveats, not as the main extraction source.

Relevant pages:
- PKS landing page: https://www.berlin.de/polizei/verschiedenes/polizeiliche-kriminalstatistik/
- example annual reports / PDFs for methodology and definitions

Why this source matters:
- confirms that the data is based on police-recorded crime (`Polizeiliche Kriminalstatistik`, PKS)
- clarifies scope and exclusions
- useful if you later want richer category definitions, offense-key mapping, suspect counts, or citywide series beyond the atlas tables

## What the data actually is
This is **police-recorded crime data**, not a perfect measurement of all crime that actually happened.

Important meaning:
- counts are cases known to and processed by police
- not all crimes are reported to police
- some offense types are more reporting-sensitive than others
- year-to-year changes can reflect behavior, policing, reporting intensity, legal changes, recording changes, or real crime changes

Typical PKS caveats from the Berlin / German methodology:
- not directly comparable with court conviction data
- certain offense domains are excluded or handled separately in PKS contexts, such as some traffic and state-security-related areas
- the legal/statistical grouping used by police may differ from how a layperson expects categories to be grouped

## What was extracted
The cleaned workbook was intentionally kept at the **district** level only.

Core dimensions used:
- `year`
- `district`
- `category`
- `count`
- `rate_per_100k`

The cleaned workbook includes:
- `Long_2015_2024`: tidy/long format table, best for filtering, pivoting, charts, BI tools, or later code ingestion
- `Last5_2020_2024`: same but only the most recent 5 years
- `OverallRate`: total offense rate per district/year
- `OverallCount`: total offense count per district/year
- `2024_Rate_ByCategory`: district x category matrix for rates
- `2024_Count_ByCategory`: district x category matrix for counts

## High-level extraction logic used
The exact source workbook layout may change over time, so do not assume stable cell references forever.

The general logic was:
1. Download the official workbook from the Berlin open data / atlas source.
2. Inspect workbook tabs and identify the district-level sheets or the sheets containing district values for:
   - total counts
   - total rates
   - category-level counts
   - category-level rates
3. Normalize the district-level content into a tidy long table with one row per:
   - year
   - district
   - category
4. Preserve both raw count and HZ/rate when possible.
5. Build a few convenience sheets for quick Excel use.

## Assumptions / interpretation choices
A few interpretation choices were made while cleaning the file:

### 1) District-level only
The atlas also has smaller-area geographies. Those were intentionally left out to keep the workbook focused and manageable.

### 2) Category naming was kept close to source naming
Category labels should remain as close as possible to the official wording. If you later want English labels or merged groups, do that in a mapping layer rather than replacing the original labels.

Recommended approach:
- keep `category_source` with the original German label
- add `category_en` or `category_grouped` as extra derived columns

### 3) HZ was treated as rate per 100,000 residents
This is the standard interpretation for Berlin crime atlas HZ values.

### 4) The cleaned workbook favors usability over preserving every source formatting nuance
No attempt was made to preserve source colors, merged cells, visual formatting logic, or every auxiliary sheet from the official workbook.

## Ifs / hows / caveats another agent should know

### If the official workbook structure changes
This is the main risk.

What to do:
- inspect the source workbook sheet names first
- avoid hardcoded row/column references unless confirmed in the latest file
- prefer pattern-based parsing where possible
- verify a few spot values manually against the published atlas webpage or source sheets

### If new years are added later
The atlas notes suggest this dataset is maintained annually.

Recommended update flow:
1. redownload the newest source workbook
2. confirm the latest year exists in the district-level sheets
3. append only the new year into the long table
4. rerun validation checks for duplicates and missing district-category combinations
5. regenerate convenience tabs

### If new crime categories are added or renamed
Possible issues:
- category names may change slightly
- categories may split or merge
- offense definitions can evolve

Recommended handling:
- do not assume category list is permanently fixed
- build a category dictionary from the latest workbook each run
- compare against prior years and log additions/removals/renames
- preserve the original source label even if you create grouped analytical labels

### If you want more geographic breakdowns
The atlas includes smaller-area breakdowns beyond the 12 districts.

Possible extension paths:
- district (`Bezirk`) only; easiest and most stable
- smaller planning/administrative areas; more granular but more fragile and harder to compare over time

If you add smaller areas:
- include a `geo_level` column
- include `geo_name`
- include a stable geographic identifier if one exists in source
- do not mix district and sub-district rows in one flat table without explicit level tagging

### If you want offense-key granularity rather than broad groups
The atlas is category-group oriented.

If you want deeper offense detail, you may need to combine in other Berlin PKS resources, possibly annual PDF tables or other official tabular sources. That is a different extraction problem from the district atlas.

## Validation checks that should always be done
Any future update should include at least these checks:

1. **District completeness**
   - expect the 12 Berlin administrative districts
   - check for missing or renamed districts

2. **Year completeness**
   - confirm all intended years are present
   - confirm no accidental duplicate year/category/district combinations

3. **Category completeness**
   - compare category list across years
   - flag unexpected additions/removals/renames

4. **Count/rate sanity**
   - rates should not be negative
   - counts should be integers or integer-like values
   - large jumps should be manually spot-checked

5. **Spot-check against source**
   - manually verify at least a few random cells from the cleaned workbook against the original workbook or atlas page

## Tips for making this future-proof

### Best practice 1: keep three layers
Use three separate artifacts/layers:
- `raw/`: untouched official download
- `intermediate/`: parsed but still close to source structure
- `final/`: user-friendly workbook / CSV / parquet / BI-ready tables

### Best practice 2: keep a data dictionary
Maintain a separate small file such as `crime_category_dictionary.csv` with:
- `category_source`
- `category_en`
- `category_group`
- `notes`
- `first_seen_year`
- `last_seen_year`

### Best practice 3: add a metadata sheet
If rebuilding the workbook again, add a `README` or `Metadata` sheet with:
- source URL
- download date
- years included
- geography level
- transformation version
- known caveats

### Best practice 4: prefer long format as the source of truth
Pivot tables and pretty matrices are useful for humans, but the real canonical dataset should be long/tidy format.

Suggested canonical schema:
- `source_name`
- `source_url`
- `download_date`
- `year`
- `geo_level`
- `district`
- `category_source`
- `count`
- `rate_per_100k`

### Best practice 5: save to CSV or parquet too
Excel is convenient, but for updates and automation, also export:
- `berlin_crime_long.csv`
- `berlin_crime_long.parquet`

That makes diffing, loading, and scripting much easier.

## Suggested next extensions
If you want to evolve this dataset later, the most practical additions would be:

1. **Automated yearly refresh script**
   - downloads latest workbook
   - detects latest year
   - updates cleaned outputs
   - writes a change log

2. **Category mapping file**
   - adds English names
   - groups categories into broader themes like violent crime, property crime, sexual offenses, etc.

3. **District ranking sheets**
   - top/bottom districts by category per year
   - change over time
   - year-over-year deltas

4. **Smaller-area breakdowns**
   - only if needed; more complexity and more room for boundary/consistency issues

5. **Dashboard-ready exports**
   - Power BI / Tableau / Looker / Python-ready files

## What not to overclaim with this data
Avoid statements like:
- “this is the real crime rate”
- “district X is objectively the most dangerous in every sense”
- “increase in police-recorded cases always means more actual crime happened”

Safer framing:
- “police-recorded offenses”
- “recorded case counts”
- “HZ per 100,000 residents”
- “within the limitations of PKS reporting and recording practices”

## Handoff summary for another agent
If another agent needs to continue this work, the shortest accurate handoff is:

- Use the **Berlin Open Data / Kriminalitätsatlas Berlin** workbook as the primary source for district-level crime counts and HZ rates.
- Treat it as **police-recorded crime**, not all real crime.
- Keep the original workbook untouched.
- Build a **long-format canonical table** with `year`, `district`, `category`, `count`, `rate_per_100k`.
- Do not hardcode workbook cell positions without checking the latest source structure.
- Validate district/year/category completeness every refresh.
- Keep source German category names; add translation/grouping as a separate layer.
- If you need more detail than the atlas categories, you will probably need to supplement with annual PKS materials or other official tables.

