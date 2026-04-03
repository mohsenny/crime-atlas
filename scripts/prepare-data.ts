import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import readline from "node:readline";
import zlib from "node:zlib";

import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";

import berlinHistoricalRecords from "../src/data/berlin-historical-records.json";
import { normalizeSourceLabel, slugify } from "../src/lib/crime-taxonomy";
import {
  BARCELONA_LOCATION,
  BERLIN_LOCATION,
  FRANKFURT_LOCATION,
  LONDON_LOCATION,
  LUTON_LOCATION,
  MILAN_LOCATION,
  PARIS_LOCATION,
  ROME_LOCATION,
  VALENCIA_LOCATION,
  type LocationDefinition,
} from "../src/lib/location-config";

type FilterOption = {
  label: string;
  value: string;
  shortLabel?: string;
  color?: string;
  isDefault?: boolean;
};

type CrimeRecord = {
  year: number;
  districtLabel: string;
  districtSlug: string;
  categoryLabel: string;
  categorySlug: string;
  count: number;
  ratePer100k: number | null;
};

type LocationPayload = {
  slug: string;
  label: string;
  country: string;
  areaLabelSingular: string;
  areaLabelPlural: string;
  chartTitle: string;
  note: string;
  sources: Array<{
    label: string;
    url?: string;
  }>;
  years: number[];
  districts: FilterOption[];
  categories: FilterOption[];
  defaultCategorySlugs: string[];
  records: CrimeRecord[];
};

type LondonCrimeRow = Record<string, string | number>;
type LondonPopulationRow = Record<string, string | number>;
type FrankfurtRow = Record<string, string>;
type LutonCrimeRow = Record<string, string | number>;
type ParisCrimeRow = Record<string, string>;
type MilanCrimeRow = Record<string, string | number>;

const ROOT = process.cwd();
const TMP_DIR = path.join(ROOT, "tmp_sources");
const BERLIN_WORKBOOK_PATH = path.join(TMP_DIR, "berlin_kriminalitaetsatlas_2015_2024.xlsx");
const BERLIN_HISTORICAL_RECORDS = berlinHistoricalRecords as Array<{
  year: number;
  district: string;
  category: string;
  count: number;
  rate_per_100k: number;
}>;

const SOURCE_URLS = {
  berlinHistorical: {
    "kbr2007.pdf": "https://www.berlin.de/polizei/_assets/verschiedenes/pks/kbr2007.pdf",
    "kriminalitaetsbelastung_2009.pdf":
      "https://www.berlin.de/polizei/_assets/verschiedenes/pks/kriminalitaetsbelastung_2009.pdf",
    "krimatlas2011.pdf": "https://www.berlin.de/polizei/_assets/verschiedenes/pks/krimatlas2011.pdf",
    "kriminalitatsatlas_berlin_2013.pdf":
      "https://www.berlin.de/polizei/_assets/verschiedenes/pks/kriminalitatsatlas_berlin_2013.pdf",
    "kriminalitatsatlas_berlin_2015.pdf":
      "https://www.berlin.de/polizei/_assets/verschiedenes/pks/kriminalitatsatlas_berlin_2015.pdf",
  },
  berlinCurrentWorkbook: "https://www.kriminalitaetsatlas.berlin.de/K-Atlas/bezirke/Fallzahlen%26HZ%202015-2024.xlsx",
  londonCrimeHistorical:
    "https://data.london.gov.uk/download/exy3m/6b725bdf-f863-4a7c-a1b4-c2bc15d547e1/MPS%20Borough%20Level%20Crime%20%28Historical%29.csv",
  londonCrimeRecent:
    "https://data.london.gov.uk/download/exy3m/f3c80ea8-c2d6-4920-80ab-6a5a478e59e7/MPS%20Borough%20Level%20Crime%20%28most%20recent%2024%20months%29.csv",
  londonPopulationHistorical:
    "https://data.london.gov.uk/download/vd615/20dc1341-e74a-4e20-b1ff-a01c45e9fa10/ons-mye-population-totals.xls",
  londonPopulationCurrent:
    "https://www.ons.gov.uk/file?uri=%2Fpeoplepopulationandcommunity%2Fpopulationandmigration%2Fpopulationestimates%2Fdatasets%2Festimatesofthepopulationforenglandandwales%2Fmid2011tomid2024detailedtimeseries%2Fmyebtablesenglandwales20112024.xlsx",
  frankfurtCrimeByCategory:
    "https://offenedaten.frankfurt.de/dcat/dataset/de-he-frankfurtam-straftaten_nach_art_der_straftat/content.csv",
  frankfurtPopulation:
    "https://offenedaten.frankfurt.de/dcat/dataset/de-he-frankfurtam-demographische_kennzahlen_gesamtstaedtisch/content.csv",
  lutonCrimeWorkbook:
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/crimeandjustice/datasets/recordedcrimedataatcommunitysafetypartnershiplocalauthoritylevel/current/prclocalauthoritytables.zip",
  populationTimeseries2001To2020:
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland/mid2001tomid2020detailedtimeseries/ukdetailedtimeseries2001to2020.zip",
  parisCrimeCommunal:
    "https://static.data.gouv.fr/resources/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/20260326-124144/donnee-data.gouv-2025-geographie2025-produit-le2026-02-03.csv.gz",
  romeStatisticsPage: "https://www.comune.roma.it/web/it/roma-statistica-legalita-e-sicurezza1.page",
  romeWorkbook2023: "https://www.comune.roma.it/web-resources/cms/documents/15_Sicurezza_Delitti2023.xlsx",
  milanCrimeCsv:
    "https://dati.comune.milano.it/dataset/34e2d2af-5c3b-4768-918b-ab7e5c0d15da/resource/8b03b9f2-f2d7-4408-b439-bc6efc093cff/download/ds564_reati_denunciati_2004_2023.csv",
  milanPopulationCsv:
    "https://dati.comune.milano.it/dataset/2ba2e01c-51db-48c6-a330-776bb4c5a023/resource/772962a9-9e2f-49d6-8e8b-21a2e1d86cdf/download/ds73_pop_calc_res_sesso-1936-2023.csv",
  spanishBalance2025:
    "https://www.interior.gob.es/opencms/export/sites/default/.galleries/galeria-de-prensa/documentos-y-multimedia/balances-e-informes/2025/Balance-de-Criminalidad_Cuarto_Trimestre_2025.pdf",
  spanishBalance2024:
    "https://www.interior.gob.es/opencms/export/sites/default/.galleries/galeria-de-prensa/documentos-y-multimedia/balances-e-informes/2024/BALANCE-CRIMINALIDAD-CUARTO-TRIMESTRE-2024.pdf",
  spanishBalance2023:
    "https://www.interior.gob.es/opencms/export/sites/default/.galleries/galeria-de-prensa/documentos-y-multimedia/balances-e-informes/2023/Balance-de-Criminalidad-Cuarto-Trimestre-2023.pdf",
  spanishBalance2022:
    "https://www.interior.gob.es/opencms/export/sites/default/.galleries/galeria-de-prensa/documentos-y-multimedia/balances-e-informes/2022/Balance-de-Criminalidad-Cuarto-Trimestre-2022.pdf",
  spanishBalance2021:
    "https://www.interior.gob.es/opencms/pdf/prensa/balances-e-informes/2021/Balance-de-Criminalidad.-Cuarto-Trimestre-2021.pdf",
};

function buildCategoryLookup(definition: LocationDefinition) {
  const lookup = new Map(
    definition.categories.flatMap((category) => {
      const slug = slugify(category.label);
      return category.sourceLabels.map((sourceLabel) => [
        normalizeSourceLabel(sourceLabel),
        {
          label: category.label,
          shortLabel: category.shortLabel,
          color: category.color,
          isDefault: category.isDefault,
          sortOrder: category.sortOrder,
          slug,
        },
      ]);
    }),
  );

  const options = definition.categories
    .map((category) => ({
      label: category.label,
      value: slugify(category.label),
      shortLabel: category.shortLabel,
      color: category.color,
      isDefault: category.isDefault,
      sortOrder: category.sortOrder,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ sortOrder: _sortOrder, ...category }) => category);

  return { lookup, options };
}

function mapSourceCategory(definition: LocationDefinition, sourceLabel: string) {
  const { lookup } = buildCategoryLookup(definition);
  const category = lookup.get(normalizeSourceLabel(sourceLabel));
  if (!category) {
    throw new Error(`Category not mapped for ${definition.slug}: ${sourceLabel}`);
  }
  return category;
}

async function ensureFile(filePath: string, url: string) {
  try {
    await fs.access(filePath);
    return;
  } catch {}

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0",
        },
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, buffer);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to download ${url}`);
}

async function parseSemicolonCsv(filePath: string) {
  const text = await fs.readFile(filePath, "utf8");
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);

  if (!headerLine) {
    return [] as FrankfurtRow[];
  }

  const headers = headerLine
    .split(";")
    .map(parseSemicolonCell)
    .map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, "") : value));

  return lines.map((line) => {
    const values = line.split(";").map(parseSemicolonCell);
    return headers.reduce<FrankfurtRow>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function parseSemicolonCell(value: string) {
  return value.trim().replace(/^"(.*)"$/s, "$1");
}

async function extractZipFile(zipPath: string, entryName: string, outputPath: string) {
  try {
    await fs.access(outputPath);
    return outputPath;
  } catch {}

  const buffer = execFileSync("unzip", ["-p", zipPath, entryName], {
    cwd: ROOT,
    maxBuffer: 128 * 1024 * 1024,
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

async function extractPdfText(filePath: string) {
  const parser = new PDFParse({ data: await fs.readFile(filePath) });
  try {
    const result = await parser.getText();
    return String(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}

function parseCountLike(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  return Number(String(value ?? "0").replace(/[^\d-]/g, "")) || 0;
}

function parseDecimalLike(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  return Number(String(value ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
}

function addOrMergeRecord(
  recordsByKey: Map<string, CrimeRecord>,
  input: Omit<CrimeRecord, "count" | "ratePer100k"> & {
    count: number;
    ratePer100k: number | null;
  },
) {
  const key = `${input.year}__${input.districtSlug}__${input.categorySlug}`;
  const existing = recordsByKey.get(key);

  if (!existing) {
    recordsByKey.set(key, input);
    return;
  }

  recordsByKey.set(key, {
    ...existing,
    count: existing.count + input.count,
    ratePer100k:
      existing.ratePer100k !== null && input.ratePer100k !== null ? existing.ratePer100k + input.ratePer100k : existing.ratePer100k,
  });
}

function findSheetName(sheetNames: string[], patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = sheetNames.find((sheetName) => pattern.test(sheetName));
    if (match) {
      return match;
    }
  }

  return null;
}

function findZipEntry(zipPath: string, matcher: (entry: string) => boolean) {
  const stdout = execFileSync("unzip", ["-Z1", zipPath], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });

  return stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .find((entry) => matcher(entry));
}

function parseRomeWorkbook(filePath: string, year: number) {
  const workbook = XLSX.readFile(filePath);
  const totalSheetName = findSheetName(workbook.SheetNames, [/tab\.?\s*15\.1/i, /tav_?14\.1/i]);
  const categorySheetName = findSheetName(workbook.SheetNames, [/tab\.?\s*15\.2/i, /tav_?14\.2/i]);

  if (!totalSheetName || !categorySheetName) {
    throw new Error(`Missing Rome workbook sheets for ${year}`);
  }

  const totalRows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets[totalSheetName], {
    header: 1,
    defval: null,
  });
  const categoryRows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets[categorySheetName], {
    header: 1,
    defval: null,
  });

  const totalRow = totalRows.find((row) => Number(row?.[0] ?? 0) === year);
  if (!totalRow) {
    throw new Error(`Missing Rome total row for ${year}`);
  }

  const categoryCounts = categoryRows
    .slice(2)
    .map((row) => ({
      category: normalizeSourceLabel(String(row?.[0] ?? "")),
      count: parseCountLike(row?.[1]),
    }))
    .filter((row) => row.category.length > 0);

  return {
    totalCount: parseCountLike(totalRow[1]),
    population: parseCountLike(totalRow[2]) || null,
    categoryCounts,
  };
}

function parseSpainMunicipalitySection(text: string, municipality: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeSourceLabel(line))
    .filter(Boolean);
  const startIndex = lines.findIndex((line) => line === `Municipio de ${municipality} Acumulado enero a diciembre`);

  if (startIndex === -1) {
    throw new Error(`Could not find Spain municipality block for ${municipality}`);
  }

  const headerLine = lines[startIndex + 1] ?? "";
  const years = [...headerLine.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  const currentYear = years.at(-1);

  if (!currentYear) {
    throw new Error(`Could not determine Spain balance year for ${municipality}`);
  }

  const rows = new Map<string, number>();

  for (let index = startIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("Municipio de ") && index > startIndex + 2) {
      break;
    }
    if (line.startsWith("Página ") || line.startsWith("-- ")) {
      continue;
    }

    const match = line.match(/^(.*?)\s+([\d.]+)\s+([\d.]+)\s+[-\d,]+$/);
    if (!match) {
      continue;
    }

    rows.set(normalizeSourceLabel(match[1]), parseCountLike(match[3]));
    if (normalizeSourceLabel(match[1]) === "III. TOTAL CRIMINALIDAD") {
      break;
    }
  }

  return { year: currentYear, rows };
}

async function buildSpainLocation(
  definition: LocationDefinition,
  municipality: string,
  balanceUrls: string[],
): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(definition);
  const districtLabel = definition.label;
  const districtSlug = slugify(districtLabel);
  const records: CrimeRecord[] = [];
  const years = new Set<number>();

  for (const [index, url] of balanceUrls.entries()) {
    const targetPath = path.join(TMP_DIR, `spain_balance_${index + 1}.pdf`);
    await ensureFile(targetPath, url);
    const text = await extractPdfText(targetPath);
    const parsed = parseSpainMunicipalitySection(text, municipality);
    years.add(parsed.year);

    parsed.rows.forEach((count, sourceLabel) => {
      const category = categoryLookup.get(normalizeSourceLabel(sourceLabel));
      if (!category) {
        return;
      }

      records.push({
        year: parsed.year,
        districtLabel,
        districtSlug,
        categoryLabel: category.label,
        categorySlug: category.slug,
        count,
        ratePer100k: null,
      });
    });
  }

  return {
    slug: definition.slug,
    label: definition.label,
    country: definition.country,
    areaLabelSingular: definition.areaLabelSingular,
    areaLabelPlural: definition.areaLabelPlural,
    chartTitle: definition.chartTitle,
    note: definition.note,
    sources: definition.sources,
    years: [...years].sort((left, right) => left - right),
    districts: [{ label: districtLabel, value: districtSlug }],
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    records,
  };
}

async function buildRomeLocation(): Promise<LocationPayload> {
  await fs.mkdir(path.join(TMP_DIR, "italy"), { recursive: true });

  const years = Array.from({ length: 6 }, (_, index) => 2018 + index);
  const districtLabel = "Rome";
  const districtSlug = slugify(districtLabel);
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(ROME_LOCATION);
  const recordsByKey = new Map<string, CrimeRecord>();

  for (const year of years) {
    const workbookPath = path.join(TMP_DIR, "italy", `rome_${year}.xlsx`);

    if (year === 2023) {
      await ensureFile(workbookPath, SOURCE_URLS.romeWorkbook2023);
    } else {
      const zipPath = path.join(TMP_DIR, "italy", `rome_${year}.zip`);
      await ensureFile(zipPath, `https://www.comune.roma.it/web-resources/cms/documents/Sicurezza_urbana_${year}.zip`);
      const entry = findZipEntry(
        zipPath,
        (candidate) => /\.xlsx$/i.test(candidate) && !/incident|incidentalita|stradali/i.test(candidate),
      );
      if (!entry) {
        throw new Error(`Could not find Rome workbook entry for ${year}`);
      }
      await extractZipFile(zipPath, entry, workbookPath);
    }

    const parsed = parseRomeWorkbook(workbookPath, year);

    const totalCategory = categoryLookup.get(normalizeSourceLabel("All recorded offenses"));
    if (!totalCategory) {
      throw new Error("Rome total category is not mapped.");
    }

    addOrMergeRecord(recordsByKey, {
      year,
      districtLabel,
      districtSlug,
      categoryLabel: totalCategory.label,
      categorySlug: totalCategory.slug,
      count: parsed.totalCount,
      ratePer100k: parsed.population ? (parsed.totalCount / parsed.population) * 100_000 : null,
    });

    for (const row of parsed.categoryCounts) {
      const category = categoryLookup.get(normalizeSourceLabel(row.category));
      if (!category) {
        continue;
      }

      addOrMergeRecord(recordsByKey, {
        year,
        districtLabel,
        districtSlug,
        categoryLabel: category.label,
        categorySlug: category.slug,
        count: row.count,
        ratePer100k: parsed.population ? (row.count / parsed.population) * 100_000 : null,
      });
    }
  }

  return {
    slug: ROME_LOCATION.slug,
    label: ROME_LOCATION.label,
    country: ROME_LOCATION.country,
    areaLabelSingular: ROME_LOCATION.areaLabelSingular,
    areaLabelPlural: ROME_LOCATION.areaLabelPlural,
    chartTitle: ROME_LOCATION.chartTitle,
    note: ROME_LOCATION.note,
    sources: ROME_LOCATION.sources,
    years,
    districts: [{ label: districtLabel, value: districtSlug }],
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    records: [...recordsByKey.values()].sort((left, right) => left.year - right.year),
  };
}

async function buildMilanLocation(): Promise<LocationPayload> {
  await fs.mkdir(path.join(TMP_DIR, "italy"), { recursive: true });

  const crimePath = path.join(TMP_DIR, "italy", "milan_crime_2004_2023.csv");
  const populationPath = path.join(TMP_DIR, "italy", "milan_population_1936_2023.csv");

  await Promise.all([
    ensureFile(crimePath, SOURCE_URLS.milanCrimeCsv),
    ensureFile(populationPath, SOURCE_URLS.milanPopulationCsv),
  ]);

  const crimeWorkbook = XLSX.readFile(crimePath);
  const populationWorkbook = XLSX.readFile(populationPath);
  const crimeRows = XLSX.utils.sheet_to_json<MilanCrimeRow>(crimeWorkbook.Sheets[crimeWorkbook.SheetNames[0]], { defval: "" });
  const populationRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(
    populationWorkbook.Sheets[populationWorkbook.SheetNames[0]],
    { defval: "" },
  );

  const populationByYear = new Map<number, number>();
  for (const row of populationRows) {
    const year = Number(row.Anni ?? 0);
    const population = Number(row["Popolazione calcolata Comune di Milano (fine anno)"] ?? 0);
    if (year >= 2004 && year <= 2023 && population > 0) {
      populationByYear.set(year, population);
    }
  }

  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(MILAN_LOCATION);
  const districtLabel = "Milan";
  const districtSlug = slugify(districtLabel);
  const years = [...new Set(crimeRows.map((row) => Number(row.anno_rilevamento_reato ?? 0)).filter((year) => year >= 2004 && year <= 2023))].sort(
    (left, right) => left - right,
  );
  const recordsByKey = new Map<string, CrimeRecord>();

  for (const row of crimeRows) {
    const year = Number(row.anno_rilevamento_reato ?? 0);
    const category = categoryLookup.get(normalizeSourceLabel(String(row.Reati_denunciati_tipologia ?? "")));
    if (!category || !years.includes(year)) {
      continue;
    }

    const count = Number(row.reati_denunciati ?? 0);
    const population = populationByYear.get(year) ?? null;
    addOrMergeRecord(recordsByKey, {
      year,
      districtLabel,
      districtSlug,
      categoryLabel: category.label,
      categorySlug: category.slug,
      count,
      ratePer100k: population ? (count / population) * 100_000 : null,
    });
  }

  return {
    slug: MILAN_LOCATION.slug,
    label: MILAN_LOCATION.label,
    country: MILAN_LOCATION.country,
    areaLabelSingular: MILAN_LOCATION.areaLabelSingular,
    areaLabelPlural: MILAN_LOCATION.areaLabelPlural,
    chartTitle: MILAN_LOCATION.chartTitle,
    note: MILAN_LOCATION.note,
    sources: MILAN_LOCATION.sources,
    years,
    districts: [{ label: districtLabel, value: districtSlug }],
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    records: [...recordsByKey.values()].sort((left, right) => left.year - right.year),
  };
}

async function parseBerlinCurrentRecords() {
  await fs.mkdir(TMP_DIR, { recursive: true });
  await ensureFile(BERLIN_WORKBOOK_PATH, SOURCE_URLS.berlinCurrentWorkbook);
  const workbook = XLSX.readFile(BERLIN_WORKBOOK_PATH);
  const records: Array<{ year: number; district: string; category: string; count: number; rate_per_100k: number }> = [];

  for (const year of Array.from({ length: 10 }, (_, index) => 2015 + index)) {
    const countSheet = workbook.Sheets[`Fallzahlen_${year}`];
    const rateSheet = workbook.Sheets[`HZ_${year}`];

    if (!countSheet || !rateSheet) {
      throw new Error(`Missing Berlin workbook sheets for ${year}`);
    }

    const countRows = XLSX.utils.sheet_to_json<Array<string | number | null>>(countSheet, {
      header: 1,
      defval: null,
    });
    const rateRows = XLSX.utils.sheet_to_json<Array<string | number | null>>(rateSheet, {
      header: 1,
      defval: null,
    });

    const headers = countRows[4].slice(2).map((value) => normalizeSourceLabel(String(value ?? "")));

    for (let rowIndex = 5; rowIndex < countRows.length; rowIndex += 1) {
      const code = String(countRows[rowIndex]?.[0] ?? "");
      if (!/^\d{6}$/.test(code) || !code.endsWith("0000") || code === "000000") {
        continue;
      }

      const district = String(countRows[rowIndex]?.[1] ?? "").trim();
      if (!district) {
        continue;
      }

      headers.forEach((category, categoryIndex) => {
        const count = Number(countRows[rowIndex]?.[categoryIndex + 2] ?? 0);
        const rate = Number(rateRows[rowIndex]?.[categoryIndex + 2] ?? 0);
        records.push({
          year,
          district,
          category,
          count,
          rate_per_100k: rate,
        });
      });
    }
  }

  return records;
}

async function parseBerlinHistoricalRecords() {
  return BERLIN_HISTORICAL_RECORDS;
}

async function buildBerlinLocation(): Promise<LocationPayload> {
  const [historicalRecords, currentRecords] = await Promise.all([
    parseBerlinHistoricalRecords(),
    parseBerlinCurrentRecords(),
  ]);
  const dedupedHistoricalRecords = historicalRecords.filter((record) => record.year < 2015);

  const { options: categories } = buildCategoryLookup(BERLIN_LOCATION);
  const mappedRecords = [...dedupedHistoricalRecords, ...currentRecords].map((row) => {
    const category = mapSourceCategory(BERLIN_LOCATION, row.category);
    return {
      year: row.year,
      districtLabel: row.district,
      districtSlug: slugify(row.district),
      categoryLabel: category.label,
      categorySlug: category.slug,
      count: row.count,
      ratePer100k: row.rate_per_100k,
    };
  });

  const years = [...new Set(mappedRecords.map((record) => record.year))].sort((left, right) => left - right);
  const districts = [...new Set(mappedRecords.map((record) => record.districtLabel))]
    .sort((left, right) => left.localeCompare(right))
    .map((label) => ({ label, value: slugify(label) }));

  return {
    slug: BERLIN_LOCATION.slug,
    label: BERLIN_LOCATION.label,
    country: BERLIN_LOCATION.country,
    areaLabelSingular: BERLIN_LOCATION.areaLabelSingular,
    areaLabelPlural: BERLIN_LOCATION.areaLabelPlural,
    chartTitle: BERLIN_LOCATION.chartTitle,
    note: BERLIN_LOCATION.note,
    sources: BERLIN_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    records: mappedRecords,
  };
}

async function parseLondonCrimeRows(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<LondonCrimeRow>(sheet, { defval: 0 });
}

function extractMonthKeys(row: LondonCrimeRow) {
  return Object.keys(row).filter((key) => /^\d{6}$/.test(key)).sort();
}

async function parseLondonPopulationHistorical(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets.MYE;
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, defval: null });
  const headerRow = rows[1];
  const yearIndexes = new Map<number, number>();

  headerRow.forEach((value, index) => {
    if (typeof value === "number" && value >= 2010 && value <= 2015) {
      yearIndexes.set(value, index);
    }
  });

  const byArea = new Map<string, Map<number, number>>();
  for (let rowIndex = 3; rowIndex < rows.length; rowIndex += 1) {
    const areaName = String(rows[rowIndex]?.[2] ?? "").trim();
    const newCode = String(rows[rowIndex]?.[1] ?? "").trim();
    if (!newCode.startsWith("E09")) {
      continue;
    }
    const populationByYear = new Map<number, number>();
    yearIndexes.forEach((columnIndex, year) => {
      populationByYear.set(year, Number(rows[rowIndex]?.[columnIndex] ?? 0));
    });
    byArea.set(areaName, populationByYear);
  }

  return byArea;
}

async function parseLondonPopulationCurrent(filePath: string, boroughs: Set<string>) {
  const workbook = XLSX.readFile(filePath, { sheets: ["MYEB1"] });
  const sheet = workbook.Sheets.MYEB1;
  const rows = XLSX.utils.sheet_to_json<LondonPopulationRow>(sheet, {
    defval: 0,
    range: 1,
  });

  const byArea = new Map<string, Map<number, number>>();
  for (const row of rows) {
    const areaName = String(row.laname23 ?? "").trim();
    if (!boroughs.has(areaName)) {
      continue;
    }
    const populationByYear = byArea.get(areaName) ?? new Map<number, number>();
    for (const year of Array.from({ length: 14 }, (_, index) => 2011 + index)) {
      const key = `population_${year}`;
      populationByYear.set(year, (populationByYear.get(year) ?? 0) + Number(row[key] ?? 0));
    }
    byArea.set(areaName, populationByYear);
  }

  return byArea;
}

async function buildLondonLocation(): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const historicalCrimePath = path.join(TMP_DIR, "london_borough_crime_historical.csv");
  const recentCrimePath = path.join(TMP_DIR, "london_borough_crime_recent.csv");
  const historicalPopulationPath = path.join(TMP_DIR, "london_population_1961_2014.xls");
  const currentPopulationPath = path.join(TMP_DIR, "ons_england_wales_population_2011_2024.xlsx");

  await Promise.all([
    ensureFile(historicalCrimePath, SOURCE_URLS.londonCrimeHistorical),
    ensureFile(recentCrimePath, SOURCE_URLS.londonCrimeRecent),
    ensureFile(historicalPopulationPath, SOURCE_URLS.londonPopulationHistorical),
    ensureFile(currentPopulationPath, SOURCE_URLS.londonPopulationCurrent),
  ]);

  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(LONDON_LOCATION);
  const [historicalCrimeRows, recentCrimeRows] = await Promise.all([
    parseLondonCrimeRows(historicalCrimePath),
    parseLondonCrimeRows(recentCrimePath),
  ]);
  const boroughs = new Set(
    [...historicalCrimeRows, ...recentCrimeRows]
      .map((row) => String(row.BoroughName ?? "").trim())
      .filter(Boolean)
      .filter((name) => name !== "Unknown"),
  );

  const [historicalPopulation, currentPopulation] = await Promise.all([
    parseLondonPopulationHistorical(historicalPopulationPath),
    parseLondonPopulationCurrent(currentPopulationPath, boroughs),
  ]);

  const countsByKey = new Map<string, number>();

  for (const row of [...historicalCrimeRows, ...recentCrimeRows]) {
    const boroughName = String(row.BoroughName ?? "").trim();
    const minorText = normalizeSourceLabel(String(row.MinorText ?? ""));
    const category = categoryLookup.get(minorText);

    if (!category || !boroughs.has(boroughName)) {
      continue;
    }

    for (const monthKey of extractMonthKeys(row)) {
      const year = Number(monthKey.slice(0, 4));
      if (year < 2010 || year > 2024) {
        continue;
      }
      const count = Number(row[monthKey] ?? 0);
      const key = `${boroughName}__${category.slug}__${year}`;
      countsByKey.set(key, (countsByKey.get(key) ?? 0) + count);
    }
  }

  const districts = [...boroughs].sort((left, right) => left.localeCompare(right)).map((label) => ({
    label,
    value: slugify(label),
  }));

  const years = Array.from({ length: 15 }, (_, index) => 2010 + index);
  const records: CrimeRecord[] = [];

  for (const district of districts) {
    const historicalPopulationByYear = historicalPopulation.get(district.label) ?? new Map<number, number>();
    const currentPopulationByYear = currentPopulation.get(district.label) ?? new Map<number, number>();

    for (const category of categories) {
      for (const year of years) {
        const count = countsByKey.get(`${district.label}__${category.value}__${year}`) ?? 0;
        const population = currentPopulationByYear.get(year) ?? historicalPopulationByYear.get(year) ?? null;
        records.push({
          year,
          districtLabel: district.label,
          districtSlug: district.value,
          categoryLabel: category.label,
          categorySlug: category.value,
          count,
          ratePer100k: population ? (count / population) * 100_000 : null,
        });
      }
    }
  }

  return {
    slug: LONDON_LOCATION.slug,
    label: LONDON_LOCATION.label,
    country: LONDON_LOCATION.country,
    areaLabelSingular: LONDON_LOCATION.areaLabelSingular,
    areaLabelPlural: LONDON_LOCATION.areaLabelPlural,
    chartTitle: LONDON_LOCATION.chartTitle,
    note: LONDON_LOCATION.note,
    sources: LONDON_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    records,
  };
}

async function buildFrankfurtLocation(): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const crimePath = path.join(TMP_DIR, "frankfurt_crime_by_category.csv");
  const populationPath = path.join(TMP_DIR, "frankfurt_population_citywide.csv");

  await Promise.all([
    ensureFile(crimePath, SOURCE_URLS.frankfurtCrimeByCategory),
    ensureFile(populationPath, SOURCE_URLS.frankfurtPopulation),
  ]);

  const [crimeRows, populationRows] = await Promise.all([parseSemicolonCsv(crimePath), parseSemicolonCsv(populationPath)]);
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(FRANKFURT_LOCATION);

  const populationByYear = new Map<number, number>();
  for (const row of populationRows) {
    const year = Number(row.Jahr ?? 0);
    const population = Number(String(row.Einwohner_insg ?? "0").replace(",", "."));
    if (year >= 2013 && year <= 2024 && population > 0) {
      populationByYear.set(year, population);
    }
  }

  const districtLabel = "Frankfurt am Main";
  const districtSlug = slugify(districtLabel);
  const years = [...new Set(crimeRows.map((row) => Number(row.Jahr ?? 0)).filter((year) => year >= 2013 && year <= 2024))].sort(
    (left, right) => left - right,
  );

  const records = crimeRows.flatMap((row) => {
    const year = Number(row.Jahr ?? 0);
    const category = categoryLookup.get(normalizeSourceLabel(String(row.Nr ?? "")));
    if (!category || !years.includes(year)) {
      return [];
    }

    const count = Number(String(row["Fälle"] ?? "0").replace(",", "."));
    const population = populationByYear.get(year);

    return [
      {
        year,
        districtLabel,
        districtSlug,
        categoryLabel: category.label,
        categorySlug: category.slug,
        count,
        ratePer100k: population ? (count / population) * 100_000 : null,
      },
    ] satisfies CrimeRecord[];
  });

  return {
    slug: FRANKFURT_LOCATION.slug,
    label: FRANKFURT_LOCATION.label,
    country: FRANKFURT_LOCATION.country,
    areaLabelSingular: FRANKFURT_LOCATION.areaLabelSingular,
    areaLabelPlural: FRANKFURT_LOCATION.areaLabelPlural,
    chartTitle: FRANKFURT_LOCATION.chartTitle,
    note: FRANKFURT_LOCATION.note,
    sources: FRANKFURT_LOCATION.sources,
    years,
    districts: [{ label: districtLabel, value: districtSlug }],
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    records,
  };
}

async function parsePopulationTimeseries2001To2020(filePath: string, areaCode: string) {
  const text = await fs.readFile(filePath, "utf8");
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);

  if (!headerLine) {
    return new Map<number, number>();
  }

  const headers = headerLine.split(",").map((value) => value.trim().replace(/^\uFEFF/, ""));
  const yearHeaders = headers.filter((header) => /^population_\d{4}$/.test(header));
  const populationByYear = new Map<number, number>();

  for (const line of lines) {
    const values = line.split(",");
    const row = headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});

    if (row.ladcode21 !== areaCode) {
      continue;
    }

    for (const yearHeader of yearHeaders) {
      const year = Number(yearHeader.slice("population_".length));
      populationByYear.set(year, (populationByYear.get(year) ?? 0) + Number(row[yearHeader] ?? 0));
    }
  }

  return populationByYear;
}

async function buildLutonLocation(): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const crimeZipPath = path.join(TMP_DIR, "luton_csp_local_authority.zip");
  const crimeWorkbookPath = path.join(TMP_DIR, "luton_csp_local_authority.xls");
  const populationZipPath = path.join(TMP_DIR, "ons_population_timeseries_2001_2020.zip");
  const populationCsvPath = path.join(TMP_DIR, "ons_population_timeseries_2001_2020.csv");

  await Promise.all([
    ensureFile(crimeZipPath, SOURCE_URLS.lutonCrimeWorkbook),
    ensureFile(populationZipPath, SOURCE_URLS.populationTimeseries2001To2020),
  ]);
  await Promise.all([
    extractZipFile(crimeZipPath, "rec-crime-la-file1.xls", crimeWorkbookPath),
    extractZipFile(
      populationZipPath,
      "MYEB1_detailed_population_estimates_series_UK_(2020_geog21).csv",
      populationCsvPath,
    ),
  ]);

  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(LUTON_LOCATION);
  const populationByYear = await parsePopulationTimeseries2001To2020(populationCsvPath, "E06000032");
  const workbook = XLSX.readFile(crimeWorkbookPath);
  const rawRows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets.Table, {
    header: 1,
    defval: null,
  });
  const dateCells = rawRows[1].slice(3).map((value) => Number(value ?? 0));
  const marchColumns = dateCells
    .map((serial, index) => ({ serial, index: index + 3 }))
    .filter(({ serial }) => {
      const parsedDate = XLSX.SSF.parse_date_code(serial);
      return parsedDate?.m === 3 && parsedDate?.d === 31;
    });

  const rows = rawRows.slice(2);

  const districtLabel = "Luton";
  const districtSlug = slugify(districtLabel);
  const records: CrimeRecord[] = [];
  const years = new Set<number>();
  let currentCsp = "";

  for (const row of rows) {
    const rowCsp = String(row[1] ?? "").trim();
    if (rowCsp) {
      currentCsp = rowCsp;
    }

    if (currentCsp !== districtLabel) {
      continue;
    }

    const category = categoryLookup.get(normalizeSourceLabel(String(row[2] ?? "")));
    if (!category) {
      continue;
    }

    for (const { serial, index } of marchColumns) {
      const parsedDate = XLSX.SSF.parse_date_code(serial);
      const year = parsedDate?.y;
      if (!year) {
        continue;
      }

      const count = Number(row[index] ?? 0);
      const population = populationByYear.get(year);
      years.add(year);
      records.push({
        year,
        districtLabel,
        districtSlug,
        categoryLabel: category.label,
        categorySlug: category.slug,
        count,
        ratePer100k: population ? (count / population) * 100_000 : null,
      });
    }
  }

  return {
    slug: LUTON_LOCATION.slug,
    label: LUTON_LOCATION.label,
    country: LUTON_LOCATION.country,
    areaLabelSingular: LUTON_LOCATION.areaLabelSingular,
    areaLabelPlural: LUTON_LOCATION.areaLabelPlural,
    chartTitle: LUTON_LOCATION.chartTitle,
    note: LUTON_LOCATION.note,
    sources: LUTON_LOCATION.sources,
    years: [...years].sort((left, right) => left - right),
    districts: [{ label: districtLabel, value: districtSlug }],
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    records,
  };
}

async function buildParisLocation(): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const crimePath = path.join(TMP_DIR, "paris_communal_crime.csv.gz");
  await ensureFile(crimePath, SOURCE_URLS.parisCrimeCommunal);

  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(PARIS_LOCATION);
  const districtLabel = "Paris";
  const districtSlug = slugify(districtLabel);
  const years = new Set<number>();
  const records: CrimeRecord[] = [];
  const lineReader = readline.createInterface({
    input: createReadStream(crimePath).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });

  let headers: string[] | null = null;
  for await (const line of lineReader) {
    if (!line.trim()) {
      continue;
    }

    if (!headers) {
      headers = line
        .split(";")
        .map(parseSemicolonCell)
        .map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, "") : value));
      continue;
    }

    const values = line.split(";").map(parseSemicolonCell);
    const row = headers.reduce<ParisCrimeRow>((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});

    if (String(row.CODGEO_2025 ?? "") !== "75056") {
      continue;
    }

    const year = Number(row.annee ?? 0);
    const category = categoryLookup.get(normalizeSourceLabel(String(row.indicateur ?? "")));
    if (!category || year < 2016 || year > 2025) {
      continue;
    }

    years.add(year);
    records.push({
      year,
      districtLabel,
      districtSlug,
      categoryLabel: category.label,
      categorySlug: category.slug,
      count: Number(row.nombre ?? 0),
      ratePer100k: Number(String(row.taux_pour_mille ?? "0").replace(",", ".")) * 100,
    });
  }

  return {
    slug: PARIS_LOCATION.slug,
    label: PARIS_LOCATION.label,
    country: PARIS_LOCATION.country,
    areaLabelSingular: PARIS_LOCATION.areaLabelSingular,
    areaLabelPlural: PARIS_LOCATION.areaLabelPlural,
    chartTitle: PARIS_LOCATION.chartTitle,
    note: PARIS_LOCATION.note,
    sources: PARIS_LOCATION.sources,
    years: [...years].sort((left, right) => left - right),
    districts: [{ label: districtLabel, value: districtSlug }],
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    records,
  };
}

async function main() {
  const [barcelona, berlin, frankfurt, london, luton, milan, paris, rome, valencia] = await Promise.all([
    buildSpainLocation(BARCELONA_LOCATION, "Barcelona", [
      SOURCE_URLS.spanishBalance2021,
      SOURCE_URLS.spanishBalance2022,
      SOURCE_URLS.spanishBalance2023,
      SOURCE_URLS.spanishBalance2024,
      SOURCE_URLS.spanishBalance2025,
    ]),
    buildBerlinLocation(),
    buildFrankfurtLocation(),
    buildLondonLocation(),
    buildLutonLocation(),
    buildMilanLocation(),
    buildParisLocation(),
    buildRomeLocation(),
    buildSpainLocation(VALENCIA_LOCATION, "Valencia", [
      SOURCE_URLS.spanishBalance2021,
      SOURCE_URLS.spanishBalance2022,
      SOURCE_URLS.spanishBalance2023,
      SOURCE_URLS.spanishBalance2024,
      SOURCE_URLS.spanishBalance2025,
    ]),
  ]);
  const payload = {
    generatedAt: new Date().toISOString(),
    locations: [barcelona, berlin, frankfurt, london, luton, milan, paris, rome, valencia].sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
  };

  const outputDir = path.join(ROOT, "src", "generated");
  const locationsDir = path.join(outputDir, "locations");
  const legacyOutputPath = path.join(outputDir, "crime-data.json");
  const indexOutputPath = path.join(outputDir, "locations-index.json");

  await fs.mkdir(locationsDir, { recursive: true });

  await Promise.all(
    payload.locations.map((location) =>
      fs.writeFile(path.join(locationsDir, `${location.slug}.json`), `${JSON.stringify(location, null, 2)}\n`, "utf8"),
    ),
  );

  await fs.writeFile(
    indexOutputPath,
    `${JSON.stringify(
      {
        generatedAt: payload.generatedAt,
        locations: payload.locations.map((location) => ({
          slug: location.slug,
          label: location.label,
          country: location.country,
          areaLabelSingular: location.areaLabelSingular,
          areaLabelPlural: location.areaLabelPlural,
          chartTitle: location.chartTitle,
          note: location.note,
          sources: location.sources,
          years: location.years,
          districtCount: location.districts.length,
          categoryCount: location.categories.length,
          supportsRate: location.records.some((record) => record.ratePer100k !== null),
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await fs.writeFile(legacyOutputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const totalRecords = payload.locations.reduce((sum, location) => sum + location.records.length, 0);
  console.log(`Generated ${totalRecords} records across ${payload.locations.length} locations into src/generated/crime-data.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
