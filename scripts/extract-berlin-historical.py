#!/usr/bin/env python3

import json
import re
from pathlib import Path

from pypdf import PdfReader


DISTRICTS = [
    "Mitte",
    "Friedrichshain-Kreuzberg",
    "Pankow",
    "Charlottenburg-Wilmersdorf",
    "Spandau",
    "Steglitz-Zehlendorf",
    "Tempelhof-Schöneberg",
    "Neukölln",
    "Treptow-Köpenick",
    "Marzahn-Hellersdorf",
    "Lichtenberg",
    "Reinickendorf",
]

CATEGORIES = [
    "Straftaten -insgesamt-",
    "Kieztaten",
    "Raub",
    "Straßenraub, Handtaschenraub",
    "Körperverletzungen -insgesamt-",
    "Gefährl. und schwere Körperverletzung",
    "Freiheitsberaubung, Nötigung, Bedrohung, Nachstellung",
    "Diebstahl -insgesamt-",
    "Diebstahl von Kraftwagen",
    "Diebstahl an/aus Kfz",
    "Fahrraddiebstahl",
    "Wohnraumeinbruch",
    "Branddelikte -insgesamt-",
    "Brandstiftung",
    "Sachbeschädigung -insgesamt-",
    "Sachbeschädigung durch Graffiti",
    "Rauschgiftdelikte",
]

REPORTS = {
    "kbr2007.pdf": {
        "years": (2006, 2007),
        "toc_pages": [8, 22, 36, 49, 62, 75, 88, 101, 114, 127, 140, 153, 166, 179, 192, 205, 218],
    },
    "kriminalitaetsbelastung_2009.pdf": {
        "years": (2008, 2009),
        "toc_pages": [8, 23, 37, 50, 63, 76, 89, 102, 115, 128, 141, 154, 167, 180, 193, 206, 219],
    },
    "krimatlas2011.pdf": {
        "years": (2010, 2011),
        "toc_pages": [17, 32, 46, 59, 72, 85, 98, 111, 124, 137, 150, 163, 176, 189, 202, 215, 228],
    },
    "kriminalitatsatlas_berlin_2013.pdf": {
        "years": (2012, 2013),
        "toc_pages": [17, 30, 43, 56, 69, 82, 95, 108, 121, 134, 147, 160, 173, 186, 199, 212, 225],
    },
    "kriminalitatsatlas_berlin_2015.pdf": {
        "years": (2014, 2015),
        "toc_pages": [17, 30, 43, 56, 69, 82, 95, 108, 121, 134, 147, 160, 173, 186, 199, 212, 225],
    },
}


def clean_text(value: str) -> str:
    return value.replace("\xa0", " ").replace("‐", "-").replace("–", "-").replace("—", "-")


def split_field_candidates(value: str):
    candidates = [[value]]
    merged_split = split_merged_count_and_rate(value)
    if merged_split:
        candidates.append(merged_split)
    return candidates


def normalize_primary_fields(fields):
    candidate_fields = fields[:6]
    best = None

    def search(index, collected):
        nonlocal best
        if len(collected) > 4:
            return
        if len(collected) == 4:
            count_a = to_int(collected[0])
            rate_a = to_int(collected[1])
            count_b = to_int(collected[2])
            rate_b = to_int(collected[3])
            if min(count_a, rate_a, count_b, rate_b) <= 0:
                return
            pop_a = count_a * 100000 / rate_a
            pop_b = count_b * 100000 / rate_b
            if not (50_000 <= pop_a <= 2_000_000 and 50_000 <= pop_b <= 2_000_000):
                return
            score = (
                abs(pop_a - pop_b),
                abs(pop_a - 300_000) + abs(pop_b - 300_000),
                index,
            )
            if best is None or score < best[0]:
                best = (score, list(collected))
            return
        if index >= len(candidate_fields):
            return

        field = candidate_fields[index]
        if not is_numeric_field(field):
            search(index + 1, collected)
            return

        for option in split_field_candidates(field):
            search(index + 1, collected + option)

    search(0, [])
    if best:
        primary_fields = best[1]
        return primary_fields + fields[len(candidate_fields) :]
    return fields


def split_line_fields(line: str):
    return [field.strip() for field in re.split(r"\s{2,}", line.strip()) if field.strip()]


def has_valid_primary_fields(fields):
    if len(fields) < 4 or not all(is_numeric_field(field) for field in fields[:4]):
        return False

    count_a = to_int(fields[0])
    rate_a = to_int(fields[1])
    count_b = to_int(fields[2])
    rate_b = to_int(fields[3])
    if min(count_a, rate_a, count_b, rate_b) <= 0:
        return False

    population_a = count_a * 100000 / rate_a
    population_b = count_b * 100000 / rate_b
    return 50_000 <= population_a <= 2_000_000 and 50_000 <= population_b <= 2_000_000


def parse_table_rows(page_text: str):
    before_total = clean_text(page_text).split("Berlin -Gesamt-")[0]
    raw_lines = [line for line in before_total.splitlines() if re.search(r"\d", line)]
    rows = []
    index = 0
    while index < len(raw_lines):
        line = raw_lines[index].rstrip()
        fields = normalize_primary_fields(split_line_fields(line))
        if not fields or not re.match(r"^\d", fields[0]):
            index += 1
            continue
        if not has_valid_primary_fields(fields) and index + 1 < len(raw_lines):
            line = f"{line}{raw_lines[index + 1]}"
            index += 1
            fields = normalize_primary_fields(split_line_fields(line))
        if has_valid_primary_fields(fields):
            rows.append(fields)
        index += 1
    return rows[-12:]


def to_int(value: str) -> int:
    compact = (
        value.replace(" ", "")
        .replace(".", "")
        .replace(",", "")
        .replace("x", "")
        .replace("(", "")
        .replace(")", "")
        .replace("-", "")
    )
    digits = re.sub(r"[^0-9]", "", compact)
    return int(digits or "0")


def is_numeric_field(value: str) -> bool:
    compact = (
        value.replace(" ", "")
        .replace(".", "")
        .replace(",", "")
        .replace("x", "")
        .replace("(", "")
        .replace(")", "")
        .replace("-", "")
    )
    return compact.isdigit() or compact == ""


def split_merged_count_and_rate(value: str):
    if " " not in value or not re.fullmatch(r"[0-9 ]+", value):
        return None

    digits = value.replace(" ", "")
    if len(digits) < 4:
        return None

    candidates = []
    for split_at in range(1, len(digits)):
        left_digits = digits[:split_at]
        right_digits = digits[split_at:]
        count = int(left_digits)
        rate = int(right_digits)
        if count <= 0 or rate <= 0 or rate > 30000:
            continue
        implied_population = count * 100000 / rate
        if not (50_000 <= implied_population <= 2_000_000):
            continue
        candidates.append((abs(implied_population - 300_000), left_digits, right_digits))

    if not candidates:
        return None

    _, left_digits, right_digits = min(candidates, key=lambda item: item[0])
    return [left_digits, right_digits]


def pick_best_page(reader: PdfReader, toc_page: int):
    for actual_page in range(max(1, toc_page), min(len(reader.pages), toc_page + 5) + 1):
        rows = parse_table_rows(reader.pages[actual_page - 1].extract_text() or "")
        if len(rows) < 10:
            continue
        if not all(len(row) >= 4 and all(is_numeric_field(field) for field in row[:4]) for row in rows[:10]):
            continue
        return {
            "actual_page": actual_page,
            "rows": rows,
        }
    return None


def main():
    base_dir = Path(__file__).resolve().parents[1] / "tmp_sources"
    records = []

    for filename, report in REPORTS.items():
        path = base_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Missing required historical PDF: {path}")
        reader = PdfReader(str(path))
        previous_year, current_year = report["years"]
        for category, toc_page in zip(CATEGORIES, report["toc_pages"]):
            best = pick_best_page(reader, toc_page)
            if not best:
                raise RuntimeError(f"Could not locate a district summary table for {filename} / {category}")
            rows = best["rows"]
            if len(rows) < 12:
                raise RuntimeError(f"Incomplete district table for {filename} / {category} on page {best['actual_page']}")
            for district, fields in zip(DISTRICTS, rows[:12]):
                records.append(
                    {
                        "year": previous_year,
                        "district": district,
                        "category": category,
                        "count": to_int(fields[0]),
                        "rate_per_100k": to_int(fields[1]),
                    }
                )
                records.append(
                    {
                        "year": current_year,
                        "district": district,
                        "category": category,
                        "count": to_int(fields[2]),
                        "rate_per_100k": to_int(fields[3]),
                    }
                )

    print(json.dumps(records, ensure_ascii=False))


if __name__ == "__main__":
    main()
