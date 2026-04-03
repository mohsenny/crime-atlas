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


def parse_table_rows(page_text: str):
    before_total = clean_text(page_text).split("Berlin -Gesamt-")[0]
    raw_lines = [line for line in before_total.splitlines() if re.search(r"\d", line)]
    rows = []
    index = 0
    while index < len(raw_lines):
        line = raw_lines[index].rstrip()
        fields = [field.strip() for field in re.split(r"\s{2,}", line.strip()) if field.strip()]
        if (len(fields) < 4 or not re.match(r"^\d", fields[0])) and index + 1 < len(raw_lines):
            line = f"{line} {raw_lines[index + 1].lstrip()}"
            index += 1
            fields = [field.strip() for field in re.split(r"\s{2,}", line.strip()) if field.strip()]
        if len(fields) >= 4 and re.match(r"^\d", fields[0]):
            rows.append(fields)
        index += 1
    return rows[:12]


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


def pick_best_page(reader: PdfReader, toc_page: int):
    best = None
    for actual_page in range(max(1, toc_page), min(len(reader.pages), toc_page + 5) + 1):
        rows = parse_table_rows(reader.pages[actual_page - 1].extract_text() or "")
        if len(rows) < 10:
            continue
        if not all(len(row) >= 4 and all(is_numeric_field(field) for field in row[:4]) for row in rows[:10]):
            continue
        score = (to_int(rows[0][2]), len(rows))
        if best is None or score > best["score"]:
            best = {
                "score": score,
                "actual_page": actual_page,
                "rows": rows,
            }
    return best


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
