import * as XLSX from "xlsx";

export const SWEDEN_WORKBOOK_CATEGORY_SOURCE_LABELS = [
  "Totalt (anmälda)",
  "Skadegörelsebrott (anmälda)",
  "Narkotikabrott (anmälda)",
  "Våld utomhus vuxna (anmälda)",
  "Personrån barn (anmälda)",
  "Stöldbrott (anmälda)",
  "Bilbrott (anmälda)",
  "Bostadsinbrott (anmälda)",
] as const;

export type SwedenWorkbookCategorySourceLabel = (typeof SWEDEN_WORKBOOK_CATEGORY_SOURCE_LABELS)[number];

export type SwedenWorkbookRow = {
  geographyLabel: string;
  categorySourceLabel: SwedenWorkbookCategorySourceLabel;
  year: number;
  count: number;
  ratePer100k: number | null;
};

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value ?? "")
    .replace(/\u00a0/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".")
    .trim();

  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function derivePopulationFromCountAndRate(count: number, ratePer100k: number | null) {
  if (!ratePer100k || ratePer100k <= 0) {
    return null;
  }

  return Math.round((count / ratePer100k) * 100_000);
}

export function parseSwedenWorkbook(filePath: string): SwedenWorkbookRow[] {
  const workbook = XLSX.readFile(filePath);
  const rows: SwedenWorkbookRow[] = [];

  for (const sheetName of SWEDEN_WORKBOOK_CATEGORY_SOURCE_LABELS) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }

    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
    if (matrix.length < 3) {
      continue;
    }

    const headerRow = matrix[1]?.map((cell) => String(cell ?? "").trim()) ?? [];
    const countYearColumns = new Map<number, number>();
    const rateYearColumns = new Map<number, number>();

    headerRow.forEach((cell, index) => {
      const countMatch = cell.match(/^Antal (\d{4})$/);
      if (countMatch) {
        countYearColumns.set(Number(countMatch[1]), index);
        return;
      }

      const rateMatch = cell.match(/^Antal per 100 000 inv (\d{4})$/);
      if (rateMatch) {
        rateYearColumns.set(Number(rateMatch[1]), index);
      }
    });

    for (const row of matrix.slice(2)) {
      const geographyLabel = String(row[0] ?? "").trim();
      if (!geographyLabel) {
        continue;
      }

      for (const [year, countIndex] of countYearColumns.entries()) {
        const count = parseNumber(row[countIndex]);
        if (count === null) {
          continue;
        }

        const rateIndex = rateYearColumns.get(year);
        const ratePer100k = rateIndex === undefined ? null : parseNumber(row[rateIndex]);

        rows.push({
          geographyLabel,
          categorySourceLabel: sheetName,
          year,
          count,
          ratePer100k,
        });
      }
    }
  }

  return rows;
}
