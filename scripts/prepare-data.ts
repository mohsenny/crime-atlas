import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import readline from "node:readline";
import zlib from "node:zlib";

import { PrismaClient } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";

import berlinHistoricalRecords from "../src/data/berlin-historical-records.json";
import { normalizeSourceLabel, slugify } from "../src/lib/crime-taxonomy";
import {
  CANONICAL_COMPARISON_CATEGORIES,
  LOCATION_COMPARISON_MAPPINGS,
} from "../src/lib/comparison-taxonomy";
import {
  AUSTIN_LOCATION,
  BARCELONA_LOCATION,
  BERLIN_LOCATION,
  BIRMINGHAM_LOCATION,
  CHICAGO_LOCATION,
  CLEVELAND_LOCATION,
  DALLAS_LOCATION,
  FRANCE_COUNTRY_LOCATION,
  GERMANY_COUNTRY_LOCATION,
  FRANKFURT_LOCATION,
  HAMBURG_LOCATION,
  HOUSTON_LOCATION,
  ITALY_COUNTRY_LOCATION,
  LONDON_LOCATION,
  LOS_ANGELES_LOCATION,
  LOUISVILLE_LOCATION,
  LUTON_LOCATION,
  MANCHESTER_LOCATION,
  MELBOURNE_LOCATION,
  MILAN_LOCATION,
  MINNEAPOLIS_LOCATION,
  NEW_YORK_CITY_LOCATION,
  PHOENIX_LOCATION,
  MUNICH_LOCATION,
  PARIS_LOCATION,
  ROME_LOCATION,
  SAO_PAULO_LOCATION,
  SAN_FRANCISCO_LOCATION,
  SEATTLE_LOCATION,
  SPAIN_COUNTRY_LOCATION,
  SYDNEY_LOCATION,
  TOKYO_LOCATION,
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
  cityPopulationByYear: Record<string, number>;
  records: CrimeRecord[];
};

type PreparedPayload = {
  generatedAt: string;
  locations: LocationPayload[];
};

type LondonCrimeRow = Record<string, string | number>;
type LondonPopulationRow = Record<string, string | number>;
type FrankfurtRow = Record<string, string>;
type LutonCrimeRow = Record<string, string | number>;
type ParisCrimeRow = Record<string, string>;
type MilanCrimeRow = Record<string, string | number>;
type SpainAnnualSource = {
  year: number;
  type: "pdf" | "zip-pdf" | "xls";
  url: string;
  zipEntryContains?: string;
};
type NewYorkCrimeRow = {
  year: string;
  boro_nm: string;
  ofns_desc: string;
  count: string;
};
type ChicagoCrimeRow = {
  year: string;
  district: string;
  primary_type: string;
  count: string;
};
type AustinCrimeRow = {
  year: string;
  district: string;
  crime_type: string;
  count: string;
};
type DallasCrimeRow = {
  year1: string;
  division: string;
  nibrs_crime: string;
  count: string;
};
type LosAngelesCrimeRow = {
  year: string;
  area_name: string;
  crm_cd_desc: string;
  count: string;
};
type SanFranciscoCrimeRow = {
  incident_year: string;
  police_district: string;
  incident_category?: string;
  count: string;
};
type SeattleCrimeRow = {
  year: string;
  precinct: string;
  nibrs_offense_code_description: string;
  count: string;
};
type MinneapolisCrimeRow = {
  neighborhood: string;
  ucrDescription: string;
  count: string | number;
};
type ClevelandCrimeRow = {
  District: string;
  UCRdesc: string;
  count: string | number;
};
type LouisvilleCrimeRow = {
  LMPD_DIVISION?: string;
  CRIME_TYPE?: string;
  lmpd_division?: string;
  offense_classification?: string;
  count: string | number;
};
type ArcGisFeatureResponse<T> = {
  features?: Array<{ attributes: T }>;
  error?: {
    code?: number;
    message?: string;
    details?: string[];
  };
};

type SpainCountryTerritoryDefinition = {
  slug: string;
  label: string;
  aliases: string[];
};

const ROOT = process.cwd();
const prisma = new PrismaClient();
const TMP_DIR = path.join(ROOT, "tmp_sources");
const BRAZIL_DIR = path.join(TMP_DIR, "brazil");
const SAO_PAULO_DIR = path.join(BRAZIL_DIR, "sao-paulo");
const FRANCE_DIR = path.join(TMP_DIR, "france");
const FRANCE_COUNTRY_DIR = path.join(FRANCE_DIR, "country");
const PARIS_DIR = path.join(FRANCE_DIR, "paris");
const GERMANY_DIR = path.join(TMP_DIR, "germany");
const GERMANY_COUNTRY_DIR = path.join(GERMANY_DIR, "country");
const BERLIN_DIR = path.join(GERMANY_DIR, "berlin");
const FRANKFURT_DIR = path.join(GERMANY_DIR, "frankfurt");
const HAMBURG_DIR = path.join(GERMANY_DIR, "hamburg");
const MUNICH_DIR = path.join(GERMANY_DIR, "munich");
const ITALY_DIR = path.join(TMP_DIR, "italy");
const ITALY_COUNTRY_DIR = path.join(ITALY_DIR, "country");
const MILAN_DIR = path.join(ITALY_DIR, "milan");
const ROME_DIR = path.join(ITALY_DIR, "rome");
const JAPAN_DIR = path.join(TMP_DIR, "japan");
const TOKYO_DIR = path.join(JAPAN_DIR, "tokyo");
const SPAIN_DIR = path.join(TMP_DIR, "spain");
const SPAIN_COUNTRY_DIR = path.join(SPAIN_DIR, "country");
const BARCELONA_DIR = path.join(SPAIN_DIR, "barcelona");
const VALENCIA_DIR = path.join(SPAIN_DIR, "valencia");
const SPAIN_SHARED_DIR = path.join(SPAIN_DIR, "shared");
const AUSTRALIA_DIR = path.join(TMP_DIR, "australia");
const AUSTRALIA_SHARED_DIR = path.join(AUSTRALIA_DIR, "shared");
const MELBOURNE_DIR = path.join(AUSTRALIA_DIR, "melbourne");
const SYDNEY_DIR = path.join(AUSTRALIA_DIR, "sydney");
const UK_DIR = path.join(TMP_DIR, "uk");
const UK_SHARED_DIR = path.join(UK_DIR, "shared");
const LONDON_DIR = path.join(UK_DIR, "london");
const LUTON_DIR = path.join(UK_DIR, "luton");
const US_DIR = path.join(TMP_DIR, "us");
const US_SHARED_DIR = path.join(US_DIR, "shared");
const HOUSTON_DIR = path.join(US_DIR, "houston");
const PHOENIX_DIR = path.join(US_DIR, "phoenix");
const BERLIN_WORKBOOK_PATH = path.join(BERLIN_DIR, "berlin_kriminalitaetsatlas_2015_2024.xlsx");
const FRANCE_COUNTRY_CRIME_WORKBOOK_PATH = path.join(
  FRANCE_COUNTRY_DIR,
  "france_monthly_department_crimes_1996_plus_tableaux_4001_ts.xlsx",
);
const FRANCE_COUNTRY_POPULATION_ZIP_PATH = path.join(
  FRANCE_COUNTRY_DIR,
  "france_populations_legales_2021.zip",
);
const GERMANY_COUNTRY_COUNT_WORKBOOK_BY_YEAR = {
  2019: path.join(GERMANY_COUNTRY_DIR, "germany_2019_counts.xlsx"),
  2020: path.join(GERMANY_COUNTRY_DIR, "germany_2020_counts.xlsx"),
  2021: path.join(GERMANY_COUNTRY_DIR, "germany_2021_counts.xlsx"),
  2022: path.join(GERMANY_COUNTRY_DIR, "germany_2022_counts.xlsx"),
  2023: path.join(GERMANY_COUNTRY_DIR, "germany_2023_counts.xlsx"),
  2024: path.join(GERMANY_COUNTRY_DIR, "germany_2024_counts.xlsx"),
} satisfies Record<number, string>;
const GERMANY_COUNTRY_RATE_WORKBOOK_BY_YEAR = {
  2019: path.join(GERMANY_COUNTRY_DIR, "germany_2019_rates.xlsx"),
  2020: path.join(GERMANY_COUNTRY_DIR, "germany_2020_rates.xlsx"),
  2021: path.join(GERMANY_COUNTRY_DIR, "germany_2021_rates.xlsx"),
  2022: path.join(GERMANY_COUNTRY_DIR, "germany_2022_rates.xlsx"),
  2023: path.join(GERMANY_COUNTRY_DIR, "germany_2023_rates.xlsx"),
  2024: path.join(GERMANY_COUNTRY_DIR, "germany_2024_rates.xlsx"),
} satisfies Record<number, string>;
const ITALY_COUNTRY_CRIME_XML_PATH = path.join(
  ITALY_COUNTRY_DIR,
  "italy_crime_73_1187_other_police_reported_offenses_2018_plus.xml",
);
const ITALY_COUNTRY_POPULATION_XML_PATH = path.join(
  ITALY_COUNTRY_DIR,
  "italy_population_22_289_resident_population_jan1_2019_plus.xml",
);
const SPAIN_COUNTRY_ARCHIVE_2019_PATH = path.join(SPAIN_COUNTRY_DIR, "spain_balance_criminalidad_2019.zip");
const SPAIN_COUNTRY_ARCHIVE_2020_PATH = path.join(SPAIN_COUNTRY_DIR, "spain_balance_criminalidad_2020.zip");
const SPAIN_COUNTRY_PDF_2025_PATH = path.join(SPAIN_COUNTRY_DIR, "spain_balance_criminalidad_q4_2025.pdf");
const ITALY_COUNTRY_REGION_LABEL_BY_CODE = {
  ITC1: "Piemonte",
  ITC2: "Valle d'Aosta / Vallee d'Aoste",
  ITC3: "Liguria",
  ITC4: "Lombardia",
  ITD1: "Provincia Autonoma Bolzano / Bozen",
  ITD2: "Provincia Autonoma Trento",
  ITD3: "Veneto",
  ITD4: "Friuli-Venezia Giulia",
  ITD5: "Emilia-Romagna",
  ITE1: "Toscana",
  ITE2: "Umbria",
  ITE3: "Marche",
  ITE4: "Lazio",
  ITF1: "Abruzzo",
  ITF2: "Molise",
  ITF3: "Campania",
  ITF4: "Puglia",
  ITF5: "Basilicata",
  ITF6: "Calabria",
  ITG1: "Sicilia",
  ITG2: "Sardegna",
} satisfies Record<string, string>;
const ITALY_COUNTRY_REGION_CODES = Object.keys(ITALY_COUNTRY_REGION_LABEL_BY_CODE) as Array<
  keyof typeof ITALY_COUNTRY_REGION_LABEL_BY_CODE
>;
const ITALY_COUNTRY_CRIME_LABEL_BY_CODE: Record<string, string> = {
  CP572: "maltrattamenti contro familiari e conviventi",
  CP612BIS: "atti persecutori (stalking)",
  CP612TER: "diffusione illecita di immagini o video sessualmente espliciti",
  CP314: "peculato",
  CP316: "peculato mediante profitto dell'errore altrui",
  CP316BIS: "malversazione di erogazioni pubbliche",
  CP316TER: "indebita percezione di erogazioni pubbliche",
  CP317: "concussione",
  CP318: "corruzione per l'esercizio della funzione",
  CP319: "corruzione per un atto contrario ai doveri d'ufficio",
  CP319TER: "corruzione in atti giudiziari",
  CP319QUA: "induzione indebita a dare o promettere utilita",
  CP319QUAC1: "induzione indebita a dare o promettere utilita (commessa dal pubblico ufficiale)",
  CP319QUAC2: "induzione indebita a dare o promettere utilita (commessa da chi da o promette)",
  CP320: "corruzione di persona incaricata di un pubblico servizio",
  CP321: "pene per il corruttore",
  CP322: "istigazione alla corruzione",
  CP322BIS: "peculato, concussione, corruzione di membri e funzionari di organi di Comunita europee o internazionali ecc.",
  CP323: "abuso d'ufficio",
  CP325: "utilizzazione d'invenzioni o scoperte conosciute per ragione di ufficio",
  CP326: "rivelazione ed utilizzazione di segreti di ufficio",
  CP328: "rifiuto di atti d'ufficio. Omissione",
  CP329: "rifiuto o ritardo di obbedienza commesso da un militare o da un agente della forza pubblica",
  CP331: "interruzione d'un servizio pubblico o di pubblica necessita",
  CP334: "sottrazione o danneggiamento di cose sottoposte a sequestro ecc.",
  CP335: "violazione colposa di doveri inerenti alla custodia di cose sottoposte a sequestro ecc.",
  CP583QUI: "deformazione dell'aspetto della persona mediante lesioni permanenti al viso",
  CP558BIS: "costrizione o induzione al matrimonio",
};
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
  munichStatisticsPage: "https://stadt.muenchen.de/infos/statistik-sicherheit.html",
  hamburgYearbook2024:
    "https://www.polizei.hamburg/resource/blob/1053710/30efad000cc60586a22280031dad1ea0/pks-2024-jahrbuch-do-data.pdf",
  hamburgYearbook2023:
    "https://www.polizei.hamburg/resource/blob/866922/0958bd62e8c4465d0012ff10cf1f6524/pks-2023-jahrbuch-do-data.pdf",
  hamburgYearbook2022:
    "https://www.polizei.hamburg/resource/blob/790456/7c860a879315fd0d5315d0e671ec2d50/pks-2022-jahrbuch-do-data.pdf",
  hamburgYearbook2021:
    "https://www.polizei.hamburg/resource/blob/790450/ae1d0bf1779164b2bad863d97e21de2f/pks-2021-jahrbuch-do-data.pdf",
  hamburgYearbook2020:
    "https://www.polizei.hamburg/resource/blob/928876/9d2537bc7196fd5fc36986daf9c55e45/pks-2020-jahrbuch-do-data.pdf",
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
  spanishBalance2014Workbook:
    "https://www.interior.gob.es/opencms/pdf/prensa/balances-e-informes/2014/Balance-criminalidad-diciembre-2014.xls",
  spanishBalance2015:
    "https://www.interior.gob.es/opencms/pdf/informe-balance-2015_ene_dic_5607112.pdf",
  spanishArchive2020:
    "https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/dam/jcr%3A8b65244f-3428-46fd-8896-221c32b96d43/informes2020.zip",
  spanishArchive2019:
    "https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/dam/jcr%3A4f3bae25-ea03-409a-b0e4-7230378d6ba1/informes2019.zip",
  spanishArchive2018:
    "https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/dam/jcr%3Aed645370-ead8-4ba9-b217-a2544fe6da7b/informes2018.zip",
  spanishArchive2017:
    "https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/dam/jcr%3A3e7b5499-8efd-45f5-8cfc-92a00dd0cd2e/informes2017.zip",
  spanishArchive2016:
    "https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/dam/jcr%3A88cb5588-9ee7-4614-a7bd-06e8e59658db/informes2016.zip",
  newYorkCrimeHistoricApi: "https://data.cityofnewyork.us/resource/qgea-i56i.json",
  newYorkCrimeCurrentApi: "https://data.cityofnewyork.us/resource/5uac-w243.json",
  austinCrimeApi: "https://data.austintexas.gov/resource/fdj4-gpfu.json",
  chicagoCrimeApi: "https://data.cityofchicago.org/resource/ijzp-q8t2.json",
  dallasCrimeApi: "https://www.dallasopendata.com/resource/qv6i-rri7.json",
  losAngelesCrimeHistoricApi: "https://data.lacity.org/resource/63jg-8b9z.json",
  losAngelesCrimeCurrentApi: "https://data.lacity.org/resource/2nrs-mtv8.json",
  houstonCrimePage: "https://www.houstontx.gov/police/cs/Monthly_Crime_Data_by_Street_and_Police_Beat.htm",
  phoenixCrimeCsv:
    "https://www.phoenixopendata.com/dataset/cc08aace-9ca9-467f-b6c1-f0879ab1a358/resource/0ce3411a-2fc6-4302-a33f-167f68608a20/download/crime-data_crime-data_crimestat.csv",
  sanFranciscoCrimeApi: "https://data.sfgov.org/resource/wg3w-h783.json",
  seattleCrimeApi: "https://data.seattle.gov/resource/tazs-3rd5.json",
  minneapolisCrimeApi:
    "https://services.arcgis.com/afSMGVsC7QlRK1kZ/arcgis/rest/services/NEIGHBORHOOD_CRIME_STATS/FeatureServer/0",
  clevelandCrimeApi:
    "https://services3.arcgis.com/dty2kHktVXHrqO8i/arcgis/rest/services/Crime_Incidents/FeatureServer/0",
  barcelonaPopulationPackage:
    "https://opendata-ajuntament.barcelona.cat/data/api/action/package_show?id=16c11ddf-a783-4b64-aa68-3dc83dc70379",
  valenciaPopulationIndicator: "https://www.valencia.es/estadistica/IndSoc/F02051000.pdf",
  hamburgProfiles2013To2023: "https://www.statistik-nord.de/fileadmin/user_upload/Stadtteilprofile-Berichtsjahre-2013-2023.xlsx",
  hamburgProfiles2024: "https://www.statistik-nord.de/fileadmin/user_upload/Stadtteilprofile2025.xlsx",
  usCityPopulation2000To2010:
    "https://www2.census.gov/programs-surveys/popest/datasets/2000-2010/intercensal/cities/sub-est00int.csv",
  tokyoPopulationCsv: "https://www.toukei.metro.tokyo.lg.jp/tnenkan/2023/tn23qv020100.csv",
  saoPauloPopulationEstimated:
    "https://apisidra.ibge.gov.br/values/t/6579/n6/3550308/v/9324/p/all?formato=json",
  saoPauloPopulation2010:
    "https://apisidra.ibge.gov.br/values/t/761/n6/3550308/v/93/p/2010?formato=json",
  saoPauloPopulation2022:
    "https://apisidra.ibge.gov.br/values/t/4714/n6/3550308/v/93/p/2022?formato=json",
  australiaLgaPopulation:
    "https://www.abs.gov.au/statistics/people/population/regional-population/2024-25/32180DS0004_2001-25.xlsx",
  sydneyCrimeWorkbook: "https://bocsarblob.blob.core.windows.net/bocsar-open-data/RCI_offencebymonth.xlsm",
};

const VICTORIA_LGA_RECORDED_OFFENCES_URL_BY_YEAR = {
  2020: "https://files.crimestatistics.vic.gov.au/2021-07/Data_Tables_LGA_Recorded_Offences_Year_Ending_December_2020.xlsx",
  2021: "https://files.crimestatistics.vic.gov.au/2022-03/Data_Tables_LGA_Recorded_Offences_Year_Ending_December_2021.xlsx",
  2022: "https://files.crimestatistics.vic.gov.au/2023-03/Data_Tables_LGA_Recorded_Offences_Year_Ending_December_2022.xlsx",
  2023: "https://files.crimestatistics.vic.gov.au/2024-06/Data_Tables_LGA_Recorded_Offences_Year_Ending_December_2023_0.xlsx",
  2024: "https://files.crimestatistics.vic.gov.au/2025-06/Data_Tables_LGA_Recorded_Offences_Year_Ending_December_2024.xlsx",
  2025: "https://files.crimestatistics.vic.gov.au/2026-03/Data_Tables_LGA_Recorded_Offences_Year_Ending_December_2025.xlsx",
} satisfies Record<number, string>;

const US_CITY_POPULATION_SOURCES = {
  austin: {
    stateFips: "48",
    cityName: "Austin city, Texas",
  },
  chicago: {
    stateFips: "17",
    cityName: "Chicago city, Illinois",
  },
  cleveland: {
    stateFips: "39",
    cityName: "Cleveland city, Ohio",
  },
  dallas: {
    stateFips: "48",
    cityName: "Dallas city, Texas",
  },
  houston: {
    stateFips: "48",
    cityName: "Houston city, Texas",
  },
  phoenix: {
    stateFips: "04",
    cityName: "Phoenix city, Arizona",
  },
  "new-york-city": {
    stateFips: "36",
    cityName: "New York city, New York",
  },
  "los-angeles": {
    stateFips: "06",
    cityName: "Los Angeles city, California",
  },
  louisville: {
    stateFips: "21",
    cityName: "Louisville/Jefferson County metro government (balance), Kentucky",
  },
  minneapolis: {
    stateFips: "27",
    cityName: "Minneapolis city, Minnesota",
  },
  "san-francisco": {
    stateFips: "06",
    cityName: "San Francisco city, California",
  },
  seattle: {
    stateFips: "53",
    cityName: "Seattle city, Washington",
  },
} as const;

const LOUISVILLE_CRIME_API_BY_YEAR = {
  2010: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Crime_Data_2010/FeatureServer/0",
  2011: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Crime_Data_2011/FeatureServer/0",
  2012: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Crime_Data_2012/FeatureServer/0",
  2013: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Crime_Data_2013/FeatureServer/0",
  2014: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Crime_Data_2014/FeatureServer/0",
  2015: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Crime_Data_2015/FeatureServer/0",
  2016: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Crime_Data_2016/FeatureServer/0",
  2017: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Crime_Data_2017/FeatureServer/0",
  2018: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Crime_Data_2018_/FeatureServer/0",
  2019: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/CRIME_DATA2019/FeatureServer/0",
  2020: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/crime_2020/FeatureServer/0",
  2021: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Louisville_Metro_KY_Crime_Data_2021/FeatureServer/0",
  2022: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Louisville_Metro_KY_Crime_Data_2022/FeatureServer/0",
  2023: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/crime_data_2023/FeatureServer/0",
  2024: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/crimedata2024/FeatureServer/0",
  2025: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/crime_data_2025/FeatureServer/0",
} satisfies Record<number, string>;

const VALENCIA_OFFICIAL_POPULATION_FALLBACK = {
  2015: 787_266,
  2016: 791_632,
  2017: 792_086,
  2018: 798_538,
  2019: 795_736,
  2020: 801_545,
  2021: 800_180,
  2022: 797_665,
  2023: 809_501,
  2024: 830_606,
} satisfies Record<number, number>;

const MELBOURNE_METRO_LGAS = [
  "Banyule",
  "Bayside",
  "Boroondara",
  "Brimbank",
  "Cardinia",
  "Casey",
  "Darebin",
  "Frankston",
  "Glen Eira",
  "Greater Dandenong",
  "Hobsons Bay",
  "Hume",
  "Kingston",
  "Knox",
  "Manningham",
  "Maribyrnong",
  "Maroondah",
  "Melbourne",
  "Melton",
  "Monash",
  "Moonee Valley",
  "Merri-bek",
  "Mornington Peninsula",
  "Nillumbik",
  "Port Phillip",
  "Stonnington",
  "Whitehorse",
  "Whittlesea",
  "Wyndham",
  "Yarra",
  "Yarra Ranges",
] as const;

const SYDNEY_METRO_LGAS = [
  "Bayside",
  "Blacktown",
  "Blue Mountains",
  "Burwood",
  "Camden",
  "Campbelltown",
  "Canada Bay",
  "Canterbury-Bankstown",
  "Cumberland",
  "Fairfield",
  "Georges River",
  "Hawkesbury",
  "Hornsby",
  "Hunters Hill",
  "Inner West",
  "Ku-ring-gai",
  "Lane Cove",
  "Liverpool",
  "Mosman",
  "North Sydney",
  "Northern Beaches",
  "Parramatta",
  "Penrith",
  "Randwick",
  "Ryde",
  "Strathfield",
  "Sutherland",
  "Sydney",
  "The Hills",
  "Waverley",
  "Willoughby",
  "Wollondilly",
  "Woollahra",
] as const;

const MELBOURNE_ABS_LABEL_BY_LGA = {
  Bayside: "Bayside (Vic.)",
  Kingston: "Kingston (Vic.)",
} satisfies Record<string, string>;

const SYDNEY_ABS_LABEL_BY_LGA = {
  Bayside: "Bayside (NSW)",
  Campbelltown: "Campbelltown (NSW)",
} satisfies Record<string, string>;

const MELBOURNE_CANONICAL_LGA_BY_SOURCE: Record<string, string> = {
  Moreland: "Merri-bek",
};

const SPAIN_COUNTRY_TERRITORIES: SpainCountryTerritoryDefinition[] = [
  { slug: "andalucia", label: "Andalucía", aliases: ["ANDALUCÍA"] },
  { slug: "aragon", label: "Aragón", aliases: ["ARAGÓN"] },
  {
    slug: "asturias",
    label: "Principado de Asturias",
    aliases: ["ASTURIAS (PRINCIPADO DE)", "PRINCIPADO DE ASTURIAS", "ASTURIAS"],
  },
  { slug: "illes-balears", label: "Illes Balears", aliases: ["BALEARS (ILLES)", "ILLES BALEARS", "BALEARES"] },
  { slug: "canarias", label: "Canarias", aliases: ["CANARIAS"] },
  { slug: "cantabria", label: "Cantabria", aliases: ["CANTABRIA"] },
  { slug: "castilla-y-leon", label: "Castilla y León", aliases: ["CASTILLA Y LEÓN", "CASTILLA Y LEON"] },
  {
    slug: "castilla-la-mancha",
    label: "Castilla-La Mancha",
    aliases: ["CASTILLA - LA MANCHA", "CASTILLA -LA MANCHA", "CASTILLA-LA MANCHA", "CASTILLA LA MANCHA"],
  },
  { slug: "cataluna", label: "Cataluña", aliases: ["CATALUÑA"] },
  { slug: "comunitat-valenciana", label: "Comunitat Valenciana", aliases: ["COMUNITAT VALENCIANA", "C. VALENCIANA"] },
  { slug: "extremadura", label: "Extremadura", aliases: ["EXTREMADURA"] },
  { slug: "galicia", label: "Galicia", aliases: ["GALICIA"] },
  {
    slug: "comunidad-de-madrid",
    label: "Comunidad de Madrid",
    aliases: ["MADRID (COMUNIDAD DE)", "COMUNIDAD DE MADRID", "C. DE MADRID", "MADRID"],
  },
  {
    slug: "murcia",
    label: "Región de Murcia",
    aliases: ["MURCIA (REGION DE)", "REGIÓN DE MURCIA", "REGION DE MURCIA", "MURCIA"],
  },
  {
    slug: "navarra",
    label: "Comunidad Foral de Navarra",
    aliases: ["NAVARRA (COMUNIDAD FORAL DE)", "COMUNIDAD FORAL DE NAVARRA", "NAVARRA"],
  },
  { slug: "pais-vasco", label: "País Vasco", aliases: ["PAÍS VASCO", "PAIS VASCO"] },
  { slug: "la-rioja", label: "La Rioja", aliases: ["RIOJA (LA)", "LA RIOJA"] },
  { slug: "ceuta", label: "Ceuta", aliases: ["CIUDAD AUTÓNOMA DE CEUTA", "CIUDAD AUTONOMA DE CEUTA", "CEUTA"] },
  { slug: "melilla", label: "Melilla", aliases: ["CIUDAD AUTÓNOMA DE MELILLA", "CIUDAD AUTONOMA DE MELILLA", "MELILLA"] },
];

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

async function ensureFileWithCurl(filePath: string, url: string, extraArgs: string[] = []) {
  try {
    await fs.access(filePath);
    return;
  } catch {}

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  execFileSync(
    "curl",
    ["-L", "--retry", "3", "--retry-delay", "2", "-A", "Mozilla/5.0", ...extraArgs, "-o", filePath, url],
    {
      cwd: ROOT,
      stdio: "inherit",
      maxBuffer: 256 * 1024 * 1024,
    },
  );
}

async function fetchJsonWithRetry<T>(url: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0",
        },
        signal: AbortSignal.timeout(90_000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

function buildSocrataUrl(baseUrl: string, params: Record<string, string>) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchSocrataRows<T>(baseUrl: string, params: Record<string, string>) {
  return fetchJsonWithRetry<T[]>(buildSocrataUrl(baseUrl, params));
}

function buildArcGisUrl(baseUrl: string, params: Record<string, string>) {
  const url = new URL(`${baseUrl}/query`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchArcGisRows<T extends Record<string, string | number | null | undefined>>(
  baseUrl: string,
  params: Record<string, string>,
) {
  const response = await fetchJsonWithRetry<ArcGisFeatureResponse<T>>(
    buildArcGisUrl(baseUrl, {
      f: "json",
      returnGeometry: "false",
      ...params,
    }),
  );

  if (response.error) {
    const details = response.error.details?.join("; ") ?? "";
    throw new Error(`ArcGIS query failed for ${baseUrl}: ${response.error.message ?? "Unknown error"}${details ? ` (${details})` : ""}`);
  }

  return (response.features ?? []).map((feature) => feature.attributes);
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

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, "") : value));
}

async function extractZipFile(zipPath: string, entryName: string, outputPath: string) {
  try {
    const existing = await fs.stat(outputPath);
    if (existing.size > 0) {
      return outputPath;
    }
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

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function parseRollingMarchYear(value: string) {
  const match = value.trim().match(/^(\d{4})\/(\d{2})$/);
  if (!match) {
    return null;
  }

  const startYear = Number(match[1]);
  let endYear = Math.floor(startYear / 100) * 100 + Number(match[2]);
  if (endYear < startYear) {
    endYear += 100;
  }

  return endYear;
}

function parseYearFromDateText(value: string) {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function parseDecimalLike(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  return Number(String(value ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .replace(/\bNypd\b/g, "NYPD")
    .replace(/\bLapd\b/g, "LAPD");
}

function formatLouisvilleDivisionLabel(value: string) {
  return toTitleCase(value).replace(/(\d)(St|Nd|Rd|Th)\b/g, (_match, digit, suffix) => `${digit}${String(suffix).toLowerCase()}`);
}

function mapToObject(input: Map<number, number>) {
  return Object.fromEntries(
    [...input.entries()]
      .filter(([, value]) => Number.isFinite(value) && value > 0)
      .sort((left, right) => left[0] - right[0])
      .map(([year, value]) => [String(year), Math.round(value)]),
  );
}

function deriveCityPopulationByYearFromRecords(input: {
  years: number[];
  districts: FilterOption[];
  records: CrimeRecord[];
}) {
  const populationByYear = new Map<number, number>();

  for (const year of input.years) {
    let cityPopulation = 0;

    for (const district of input.districts) {
      const districtCandidates = input.records
        .filter(
          (record) =>
            record.year === year &&
            record.districtSlug === district.value &&
            record.ratePer100k !== null &&
            record.ratePer100k > 0 &&
            record.count > 0,
        )
        .sort((left, right) => right.count - left.count);

      const bestCandidate = districtCandidates[0];
      if (!bestCandidate || !bestCandidate.ratePer100k) {
        cityPopulation = 0;
        break;
      }

      cityPopulation += (bestCandidate.count / bestCandidate.ratePer100k) * 100_000;
    }

    if (cityPopulation > 0) {
      populationByYear.set(year, cityPopulation);
    }
  }

  return mapToObject(populationByYear);
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

function buildDenseCountRecords(input: {
  years: number[];
  districts: FilterOption[];
  categories: FilterOption[];
  countsByKey: Map<string, number>;
}) {
  const records: CrimeRecord[] = [];

  for (const district of input.districts) {
    for (const category of input.categories) {
      for (const year of input.years) {
        records.push({
          year,
          districtLabel: district.label,
          districtSlug: district.value,
          categoryLabel: category.label,
          categorySlug: category.value,
          count: input.countsByKey.get(`${year}__${district.value}__${category.value}`) ?? 0,
          ratePer100k: null,
        });
      }
    }
  }

  return records;
}

function getDenseSheetValue(
  sheet: XLSX.WorkSheet,
  rowIndex: number,
  columnIndex: number,
) {
  const denseSheet = sheet as unknown as Array<Array<XLSX.CellObject | undefined>>;
  const cell = denseSheet?.[rowIndex]?.[columnIndex];
  return cell?.v ?? "";
}

function parseSdmxValueMap(section: string | undefined) {
  const values = new Map<string, string>();

  for (const match of (section ?? "").matchAll(/<generic:Value id="([^"]+)" value="([^"]*)"\s*\/>/g)) {
    values.set(match[1], decodeXmlEntities(match[2]));
  }

  return values;
}

function isItalyCountryRegionCode(value: string): value is keyof typeof ITALY_COUNTRY_REGION_LABEL_BY_CODE {
  return value in ITALY_COUNTRY_REGION_LABEL_BY_CODE;
}

function parseSdmxGenericSeries(xmlText: string) {
  return [...xmlText.matchAll(/<generic:Series>([\s\S]*?)<\/generic:Series>/g)].map((match) => {
    const seriesText = match[1];
    const seriesKeySection = seriesText.match(/<generic:SeriesKey>([\s\S]*?)<\/generic:SeriesKey>/)?.[1];
    const attributeSection = seriesText.match(/<generic:Attributes>([\s\S]*?)<\/generic:Attributes>/)?.[1];
    const observations = [...seriesText.matchAll(/<generic:Obs>[\s\S]*?<generic:ObsDimension id="TIME_PERIOD" value="([^"]+)"\s*\/>[\s\S]*?<generic:ObsValue value="([^"]+)"\s*\/>[\s\S]*?<\/generic:Obs>/g)].map(
      (observationMatch) => ({
        timePeriod: observationMatch[1],
        value: parseCountLike(observationMatch[2]),
      }),
    );

    return {
      seriesKey: parseSdmxValueMap(seriesKeySection),
      attributes: parseSdmxValueMap(attributeSection),
      observations,
    };
  });
}

async function buildFranceCountryLocation(): Promise<LocationPayload> {
  const workbook = XLSX.readFile(FRANCE_COUNTRY_CRIME_WORKBOOK_PATH, { dense: true });
  const summarySheet = workbook.Sheets.France_Entière;

  if (!summarySheet) {
    throw new Error("France country workbook is missing the France_Entière sheet.");
  }

  const departmentCsv = execFileSync("unzip", ["-p", FRANCE_COUNTRY_POPULATION_ZIP_PATH, "donnees_departements.csv"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const departmentRows = departmentCsv.split(/\r?\n/).filter(Boolean);
  const [, ...departmentLines] = departmentRows;
  const departmentLabelByCode = new Map<string, string>();

  for (const line of departmentLines) {
    const [,_regionLabel, departmentCode, departmentLabel] = line.split(";").map(parseSemicolonCell);
    if (departmentCode && departmentLabel) {
      departmentLabelByCode.set(departmentCode, departmentLabel);
    }
  }

  const headerColumns: Array<{ columnIndex: number; year: number; month: number }> = [];
  const monthCountByYear = new Map<number, number>();
  const headerRowLength = (summarySheet as unknown as Array<Array<XLSX.CellObject | undefined>>)?.[0]?.length ?? 0;

  for (let columnIndex = 2; columnIndex < headerRowLength; columnIndex += 1) {
    const rawHeader = String(getDenseSheetValue(summarySheet, 0, columnIndex) ?? "").trim();
    const match = rawHeader.match(/^_(\d{4})_(\d{2})$/);
    if (!match) {
      continue;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    headerColumns.push({ columnIndex, year, month });
    monthCountByYear.set(year, (monthCountByYear.get(year) ?? 0) + 1);
  }

  const years = [...monthCountByYear.entries()]
    .filter(([, monthCount]) => monthCount === 12)
    .map(([year]) => year)
    .sort((left, right) => left - right);
  const fullYearSet = new Set(years);
  const monthlyColumns = headerColumns.filter((column) => fullYearSet.has(column.year));

  const departmentCodes = workbook.SheetNames.filter((sheetName) => departmentLabelByCode.has(sheetName));
  const districts = departmentCodes.map((departmentCode) => ({
    label: departmentLabelByCode.get(departmentCode) ?? departmentCode,
    value: departmentCode,
  }));
  const { lookup: categoryLookup, options: categories } = buildCategoryLookup(FRANCE_COUNTRY_LOCATION);
  const countsByKey = new Map<string, number>();

  for (const departmentCode of departmentCodes) {
    const sheet = workbook.Sheets[departmentCode];
    if (!sheet) {
      continue;
    }

    for (let rowIndex = 1; rowIndex <= 107; rowIndex += 1) {
      const sourceLabel = String(getDenseSheetValue(sheet, rowIndex, 1) ?? "").trim();
      const category = categoryLookup.get(normalizeSourceLabel(sourceLabel));
      if (!category) {
        continue;
      }

      for (const column of monthlyColumns) {
        const rawCount = getDenseSheetValue(sheet, rowIndex, column.columnIndex);
        const count = parseCountLike(typeof rawCount === "string" || typeof rawCount === "number" ? rawCount : null);
        const key = `${column.year}__${departmentCode}__${category.slug}`;
        countsByKey.set(key, (countsByKey.get(key) ?? 0) + count);
      }
    }
  }

  return {
    slug: FRANCE_COUNTRY_LOCATION.slug,
    label: FRANCE_COUNTRY_LOCATION.label,
    country: FRANCE_COUNTRY_LOCATION.country,
    areaLabelSingular: FRANCE_COUNTRY_LOCATION.areaLabelSingular,
    areaLabelPlural: FRANCE_COUNTRY_LOCATION.areaLabelPlural,
    chartTitle: FRANCE_COUNTRY_LOCATION.chartTitle,
    note: FRANCE_COUNTRY_LOCATION.note,
    sources: FRANCE_COUNTRY_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear: {},
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildItalyCountryLocation(): Promise<LocationPayload> {
  const [crimeXml, populationXml] = await Promise.all([
    fs.readFile(ITALY_COUNTRY_CRIME_XML_PATH, "utf8"),
    fs.readFile(ITALY_COUNTRY_POPULATION_XML_PATH, "utf8"),
  ]);

  const { lookup: categoryLookup, options: categories } = buildCategoryLookup(ITALY_COUNTRY_LOCATION);
  const districts = ITALY_COUNTRY_REGION_CODES.map((regionCode) => ({
    label: ITALY_COUNTRY_REGION_LABEL_BY_CODE[regionCode] ?? regionCode,
    value: regionCode,
  }));
  const countsByKey = new Map<string, number>();
  const populationByRegionYear = new Map<string, number>();
  const countryPopulationByYear = new Map<number, number>();
  const crimeYears = new Set<number>();

  for (const series of parseSdmxGenericSeries(crimeXml)) {
    const regionCode = series.seriesKey.get("REF_AREA");
    if (!regionCode || !isItalyCountryRegionCode(regionCode)) {
      continue;
    }

    if (
      series.seriesKey.get("FREQ") !== "A" ||
      series.seriesKey.get("DATA_TYPE") !== "CRIMEN" ||
      series.seriesKey.get("Y_KNOWN_OFFENDER_IDEN") !== "9" ||
      series.seriesKey.get("REFERENCE_PERIOD_CRIME") !== "YRDUR" ||
      series.seriesKey.get("MONTH_CRIME_COMMIT") !== "YEAR"
    ) {
      continue;
    }

    const crimeCode = series.seriesKey.get("TYPE_CRIME");
    const sourceLabel = crimeCode ? ITALY_COUNTRY_CRIME_LABEL_BY_CODE[crimeCode] : undefined;
    const category = sourceLabel ? categoryLookup.get(normalizeSourceLabel(sourceLabel)) : undefined;
    if (!category) {
      continue;
    }

    for (const observation of series.observations) {
      const year = Number(observation.timePeriod);
      if (!Number.isFinite(year)) {
        continue;
      }

      crimeYears.add(year);
      const key = `${year}__${regionCode}__${category.slug}`;
      countsByKey.set(key, (countsByKey.get(key) ?? 0) + observation.value);
    }
  }

  for (const series of parseSdmxGenericSeries(populationXml)) {
    if (
      series.seriesKey.get("FREQ") !== "A" ||
      series.seriesKey.get("DATA_TYPE") !== "JAN" ||
      series.seriesKey.get("SEX") !== "9" ||
      series.seriesKey.get("AGE") !== "TOTAL" ||
      series.seriesKey.get("MARITAL_STATUS") !== "99"
    ) {
      continue;
    }

    const regionCode = series.attributes.get("NOTE_REF_AREA")?.replace(/^FILTER__/, "");
    if (!regionCode || !isItalyCountryRegionCode(regionCode)) {
      continue;
    }

    for (const observation of series.observations) {
      const year = Number(observation.timePeriod);
      if (!Number.isFinite(year)) {
        continue;
      }

      const regionKey = `${year}__${regionCode}`;
      populationByRegionYear.set(regionKey, (populationByRegionYear.get(regionKey) ?? 0) + observation.value);
      countryPopulationByYear.set(year, (countryPopulationByYear.get(year) ?? 0) + observation.value);
    }
  }

  const years = [...crimeYears]
    .filter(
      (year) =>
        countryPopulationByYear.has(year) &&
        ITALY_COUNTRY_REGION_CODES.every((regionCode) => populationByRegionYear.has(`${year}__${regionCode}`)),
    )
    .sort((left, right) => left - right);

  const records: CrimeRecord[] = [];

  for (const district of districts) {
    for (const category of categories) {
      for (const year of years) {
        const count = countsByKey.get(`${year}__${district.value}__${category.value}`) ?? 0;
        const population = populationByRegionYear.get(`${year}__${district.value}`);

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
    slug: ITALY_COUNTRY_LOCATION.slug,
    label: ITALY_COUNTRY_LOCATION.label,
    country: ITALY_COUNTRY_LOCATION.country,
    areaLabelSingular: ITALY_COUNTRY_LOCATION.areaLabelSingular,
    areaLabelPlural: ITALY_COUNTRY_LOCATION.areaLabelPlural,
    chartTitle: ITALY_COUNTRY_LOCATION.chartTitle,
    note: ITALY_COUNTRY_LOCATION.note,
    sources: ITALY_COUNTRY_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear: Object.fromEntries(
      years.map((year) => [String(year), Math.round(countryPopulationByYear.get(year) ?? 0)]),
    ),
    records,
  };
}

function readGermanyCountrySheetRows(filePath: string) {
  const workbook = XLSX.readFile(filePath, { dense: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!firstSheet) {
    throw new Error(`Germany country workbook is missing its first sheet: ${filePath}`);
  }

  return XLSX.utils.sheet_to_json<Array<string | number | null>>(firstSheet, {
    header: 1,
    defval: null,
  });
}

function getGermanyCountryRateColumnIndex(rows: Array<Array<string | number | null>>, year: number) {
  const headers = (rows[4] ?? []).map((value) => normalizeSourceLabel(String(value ?? "")));
  const zensus22Index = headers.findIndex((value) => /^HZ \(Zensus 22\)$/i.test(value));

  if (zensus22Index !== -1) {
    return zensus22Index;
  }

  const fallbackIndex = headers.findIndex((value) => /^HZ(?: nach Zensus)?$/i.test(value) || /^HZ \(/i.test(value));
  if (fallbackIndex !== -1) {
    return fallbackIndex;
  }

  throw new Error(`Could not find Germany HZ column for ${year}`);
}

function isGermanyCountryLandLabel(value: string) {
  if (!value) {
    return false;
  }

  return !/^Bund(?:es|\s)|^Deutschland$/i.test(value);
}

async function buildGermanyCountryLocation(): Promise<LocationPayload> {
  const workbookYears = [2019, 2020, 2021, 2022, 2023, 2024] as const;
  const years = [...workbookYears];
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(GERMANY_COUNTRY_LOCATION);
  const countsByKey = new Map<string, number>();
  const populationByLandYear = new Map<string, number>();
  const countryPopulationByYear = new Map<number, number>();
  const districtLabelBySlug = new Map<string, string>();

  for (const year of workbookYears) {
    const countRows = readGermanyCountrySheetRows(GERMANY_COUNTRY_COUNT_WORKBOOK_BY_YEAR[year]!);
    const rateRows = readGermanyCountrySheetRows(GERMANY_COUNTRY_RATE_WORKBOOK_BY_YEAR[year]!);
    const rateColumnIndex = getGermanyCountryRateColumnIndex(rateRows, year);
    const rateByLandAndCode = new Map<string, number>();

    for (const row of rateRows) {
      const code = String(row[0] ?? "").trim();
      const landLabel = String(row[2] ?? "").trim();
      if (!code || !isGermanyCountryLandLabel(landLabel)) {
        continue;
      }

      const rate = parseDecimalLike(row[rateColumnIndex]);
      if (rate > 0) {
        rateByLandAndCode.set(`${landLabel}__${code}`, rate);
      }
    }

    for (const row of countRows) {
      const code = String(row[0] ?? "").trim();
      const landLabel = String(row[2] ?? "").trim();
      if (!code || !isGermanyCountryLandLabel(landLabel)) {
        continue;
      }

      const category = categoryLookup.get(normalizeSourceLabel(code));
      if (!category) {
        continue;
      }

      const districtSlug = slugify(landLabel);
      const count = parseCountLike(row[3]);
      countsByKey.set(`${year}__${districtSlug}__${category.slug}`, count);
      districtLabelBySlug.set(districtSlug, landLabel);

      if (code === "------") {
        const rate = rateByLandAndCode.get(`${landLabel}__${code}`) ?? 0;
        if (rate > 0) {
          const population = (count / rate) * 100_000;
          populationByLandYear.set(`${year}__${districtSlug}`, population);
          countryPopulationByYear.set(year, (countryPopulationByYear.get(year) ?? 0) + population);
        }
      }
    }
  }

  const districts = [...districtLabelBySlug.entries()]
    .sort((left, right) => left[1].localeCompare(right[1]))
    .map(([value, label]) => ({ label, value }));

  const records: CrimeRecord[] = [];

  for (const district of districts) {
    for (const category of categories) {
      for (const year of years) {
        const count = countsByKey.get(`${year}__${district.value}__${category.value}`) ?? 0;
        const population = populationByLandYear.get(`${year}__${district.value}`);

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
    slug: GERMANY_COUNTRY_LOCATION.slug,
    label: GERMANY_COUNTRY_LOCATION.label,
    country: GERMANY_COUNTRY_LOCATION.country,
    areaLabelSingular: GERMANY_COUNTRY_LOCATION.areaLabelSingular,
    areaLabelPlural: GERMANY_COUNTRY_LOCATION.areaLabelPlural,
    chartTitle: GERMANY_COUNTRY_LOCATION.chartTitle,
    note: GERMANY_COUNTRY_LOCATION.note,
    sources: GERMANY_COUNTRY_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear: mapToObject(countryPopulationByYear),
    records,
  };
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
  const totalSheetName = findSheetName(workbook.SheetNames, [/graf_?14\.1/i, /^graf1\b/i, /tab\.?\s*15\.1/i, /tav_?14\.1/i]);
  const categorySheetName = findSheetName(workbook.SheetNames, [/graf_?14\.2/i, /^graf2\b/i, /tab\.?\s*15\.2/i, /tav_?14\.2/i]);

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

  let totalCount = 0;
  let population: number | null = null;

  for (const row of totalRows) {
    for (let index = 0; index < row.length; index += 1) {
      if (Number(row[index] ?? 0) !== year) {
        continue;
      }

      for (let nextIndex = index + 1; nextIndex < row.length; nextIndex += 1) {
        const candidate = parseCountLike(row[nextIndex]);
        if (candidate > 0) {
          totalCount = candidate;
          break;
        }
      }
    }

    if (totalCount > 0) {
      break;
    }
  }

  const directTotalRow = totalRows.find((row) => Number(row?.[0] ?? 0) === year);
  if (directTotalRow) {
    population = parseCountLike(directTotalRow[2]) || null;
  }

  let fallbackPopulation: number | null = null;
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    });

    for (const row of rows) {
      if (normalizeSourceLabel(String(row?.[0] ?? "")) !== "Roma") {
        continue;
      }

      const numericValues = row
        .map((cell) => parseCountLike(cell))
        .filter((value) => Number.isFinite(value) && value > 500_000);
      if (numericValues.length > 0) {
        fallbackPopulation = Math.max(...numericValues);
        break;
      }
    }

    if (fallbackPopulation) {
      break;
    }
  }

  const headerRowIndex = categoryRows.findIndex((row) =>
    row.some((cell) => /tipo di delitto/i.test(String(cell ?? ""))),
  );
  if (headerRowIndex === -1) {
    throw new Error(`Missing Rome category header row for ${year}`);
  }

  const headerRow = categoryRows[headerRowIndex];
  const categoryColumnIndex = headerRow.findIndex((cell) => /tipo di delitto/i.test(String(cell ?? "")));
  const detectedCountColumnIndex = headerRow.findIndex(
    (cell, index) => index > categoryColumnIndex && /delitti/i.test(String(cell ?? "")),
  );
  const countColumnIndex = detectedCountColumnIndex === -1 ? categoryColumnIndex + 1 : detectedCountColumnIndex;

  const categoryCounts = categoryRows
    .slice(headerRowIndex + 1)
    .map((row) => ({
      category: normalizeSourceLabel(String(row?.[categoryColumnIndex] ?? "")),
      count: parseCountLike(row?.[countColumnIndex]),
    }))
    .filter((row) => row.category.length > 0 && row.count > 0);

  population = population || fallbackPopulation || null;
  if (!totalCount) {
    throw new Error(`Missing Rome total row for ${year}`);
  }

  return {
    totalCount,
    population,
    categoryCounts,
  };
}

function normalizeSpainText(value: string) {
  return normalizeSourceLabel(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

const SPAIN_COUNT_TOKEN_PATTERN = /^\d+(?:\.\d{3})*$/;

function parseSpainInlineCounts(line: string, years: number[]) {
  const tokens = line.split(/\s+/).filter(Boolean);
  const countTokenIndices = tokens
    .map((token, index) => (SPAIN_COUNT_TOKEN_PATTERN.test(token) ? index : -1))
    .filter((index) => index !== -1);

  if (countTokenIndices.length < years.length) {
    return null;
  }

  const valueIndices = countTokenIndices.slice(-years.length);
  const sourceLabel = normalizeSpainText(tokens.slice(0, valueIndices[0]).join(" "));
  if (!sourceLabel) {
    return null;
  }

  return {
    sourceLabel,
    countsByHeaderYear: valueIndices.map((index) => parseCountLike(tokens[index])),
  };
}

function parseSpainTerritorySection(
  text: string,
  territoryAliases: string[],
  stopHeaders: string[],
  expectedYear: number,
) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeSpainText(line))
    .filter(Boolean);
  const normalizedAliases = territoryAliases.map((alias) => normalizeSpainText(alias));
  const normalizedStopHeaders = stopHeaders.map((header) => normalizeSpainText(header));
  const startIndex = lines.findIndex((line, index) => {
    if (!normalizedAliases.some((alias) => line === alias || line === `${alias} Acumulado enero a diciembre`)) {
      return false;
    }

    return lines
      .slice(index, index + 25)
      .some((candidate) => /\b20\d{2}\b/.test(candidate) && /(Var|TIPOLOGIA|INDICADORES|Tipologia)/i.test(candidate));
  });

  if (startIndex === -1) {
    throw new Error(`Could not find Spain territory block for ${territoryAliases[0]}`);
  }

  const block: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (
      index > startIndex &&
      (normalizedStopHeaders.some((header) => line === header || line === `${header} Acumulado enero a diciembre`) ||
        /^Provincia\b/i.test(line) ||
        /^Provincia de\b/i.test(line) ||
        /^Provincia del\b/i.test(line) ||
        /^EN EL EXTRANJERO\b/i.test(line) ||
        /^TOTAL NACIONAL\b/i.test(line))
    ) {
      break;
    }
    block.push(line);
  }

  const headerLine =
    block.find((line) => /\b20\d{2}\b/.test(line) && /(Var|TIPOLOGIA|INDICADORES|Tipologia)/i.test(line)) ??
    block.find((line) => /\b20\d{2}\b/.test(line)) ??
    "";
  const years = [...headerLine.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  const currentYear = years.includes(expectedYear) ? expectedYear : years.at(-1);
  const previousYear = years.length > 1 ? years.at(-2) ?? null : null;

  if (!currentYear) {
    throw new Error(`Could not determine Spain balance year for ${territoryAliases[0]}`);
  }

  const rowsByYear = new Map<number, Map<string, number>>();
  rowsByYear.set(currentYear, new Map());
  if (previousYear) {
    rowsByYear.set(previousYear, new Map());
  }

  const storeSpainCounts = (sourceLabel: string, countsByHeaderYear: number[]) => {
    const currentIndex = years.lastIndexOf(currentYear);
    if (currentIndex !== -1 && countsByHeaderYear[currentIndex] !== undefined) {
      rowsByYear.get(currentYear)?.set(sourceLabel, countsByHeaderYear[currentIndex]!);
    }

    if (previousYear) {
      const previousIndex = years.lastIndexOf(previousYear);
      if (previousIndex !== -1 && countsByHeaderYear[previousIndex] !== undefined) {
        rowsByYear.get(previousYear)?.set(sourceLabel, countsByHeaderYear[previousIndex]!);
      }
    }
  };

  const labelQueue: string[] = [];
  const headerIndex = block.indexOf(headerLine);

  for (let index = headerIndex + 1; index < block.length; index += 1) {
    const line = block[index];
    if (
      line.startsWith("Pagina ") ||
      line.startsWith("Página ") ||
      line.startsWith("-- ") ||
      line.startsWith("INFRACCIONES ") ||
      line.startsWith("LOCALIDADES ") ||
      line.startsWith("CON POBLACION ") ||
      line.startsWith("(Datos") ||
      line.startsWith("Datos pendientes") ||
      line === "Columna1" ||
      line === "a Columna1 Columna2 b"
    ) {
      continue;
    }

    const inlineCounts = parseSpainInlineCounts(line, years);
    if (inlineCounts) {
      storeSpainCounts(inlineCounts.sourceLabel, inlineCounts.countsByHeaderYear);
      continue;
    }

    const splitLineCounts = parseSpainInlineCounts(`__LABEL__ ${line}`, years);
    if (splitLineCounts && labelQueue.length > 0) {
      const sourceLabel = labelQueue.shift()!;
      storeSpainCounts(sourceLabel, splitLineCounts.countsByHeaderYear);
      continue;
    }

    if (/^\d+ de \d+$/.test(line)) {
      continue;
    }

    labelQueue.push(normalizeSpainText(line));
  }

  return { currentYear, previousYear, rowsByYear };
}

function parseSpainMunicipalityWorkbook(filePath: string, municipality: string, expectedYear: number) {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets[firstSheet], {
    header: 1,
    defval: null,
  });

  const headerRow = rows.find(
    (row) =>
      normalizeSpainText(String(row?.[0] ?? "")) === "TERRITORIO" &&
      normalizeSpainText(String(row?.[1] ?? "")) === "TIPOLOGIA PENAL",
  );

  if (!headerRow) {
    throw new Error(`Could not find Spain workbook header for ${municipality}`);
  }

  const numericYears = headerRow
    .slice(2)
    .map((cell) => Number(cell))
    .filter((year) => Number.isInteger(year) && year >= 2000 && year <= expectedYear);
  const currentYear = numericYears.includes(expectedYear) ? expectedYear : numericYears.at(-1);
  const previousYear = numericYears.length > 1 ? numericYears.at(-2) ?? null : null;

  if (!currentYear) {
    throw new Error(`Could not determine Spain workbook years for ${municipality}`);
  }

  const territoryLabel = normalizeSpainText(`Municipio de ${municipality}`);
  const territoryColumnIndex = 0;
  const labelColumnIndex = 1;
  const currentYearColumnIndex = headerRow.findIndex((cell) => Number(cell) === currentYear);
  const previousYearColumnIndex = previousYear ? headerRow.findIndex((cell) => Number(cell) === previousYear) : -1;

  const rowsByYear = new Map<number, Map<string, number>>();
  rowsByYear.set(currentYear, new Map());
  if (previousYear) {
    rowsByYear.set(previousYear, new Map());
  }

  for (const row of rows) {
    if (normalizeSpainText(String(row?.[territoryColumnIndex] ?? "")) !== territoryLabel) {
      continue;
    }

    const sourceLabel = normalizeSpainText(String(row?.[labelColumnIndex] ?? ""));
    if (!sourceLabel) {
      continue;
    }

    const currentCount = parseCountLike(row?.[currentYearColumnIndex]);
    rowsByYear.get(currentYear)?.set(sourceLabel, currentCount);

    if (previousYear && previousYearColumnIndex !== -1) {
      const previousCount = parseCountLike(row?.[previousYearColumnIndex]);
      rowsByYear.get(previousYear)?.set(sourceLabel, previousCount);
    }
  }

  return { currentYear, previousYear, rowsByYear };
}

function parseSpainMunicipalitySection(text: string, municipality: string, expectedYear: number) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeSpainText(line))
    .filter(Boolean);
  const municipalityHeader = normalizeSpainText(`Municipio de ${municipality}`);
  const municipalityHeaderWithPeriod = normalizeSpainText(`Municipio de ${municipality}.`);
  const startIndex = lines.findIndex(
    (line) =>
      line === `${municipalityHeader} Acumulado enero a diciembre` ||
      line === municipalityHeader ||
      line === municipalityHeaderWithPeriod,
  );

  if (startIndex === -1) {
    throw new Error(`Could not find Spain municipality block for ${municipality}`);
  }

  const block: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("Municipio de ") && index > startIndex) {
      break;
    }
    block.push(line);
  }

  const headerLine =
    block.find((line) => /\b20\d{2}\b/.test(line) && /(Var|TIPOLOGIA|INDICADORES|Tipologia)/i.test(line)) ??
    block.find((line) => /\b20\d{2}\b/.test(line)) ??
    "";
  const years = [...headerLine.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  const currentYear = years.includes(expectedYear) ? expectedYear : years.at(-1);
  const previousYear = years.length > 1 ? years.at(-2) ?? null : null;

  if (!currentYear) {
    throw new Error(`Could not determine Spain balance year for ${municipality}`);
  }

  const rowsByYear = new Map<number, Map<string, number>>();
  rowsByYear.set(currentYear, new Map());
  if (previousYear) {
    rowsByYear.set(previousYear, new Map());
  }

  const storeSpainCounts = (sourceLabel: string, countsByHeaderYear: number[]) => {
    const currentIndex = years.lastIndexOf(currentYear);
    if (currentIndex !== -1 && countsByHeaderYear[currentIndex] !== undefined) {
      rowsByYear.get(currentYear)?.set(sourceLabel, countsByHeaderYear[currentIndex]!);
    }

    if (previousYear) {
      const previousIndex = years.lastIndexOf(previousYear);
      if (previousIndex !== -1 && countsByHeaderYear[previousIndex] !== undefined) {
        rowsByYear.get(previousYear)?.set(sourceLabel, countsByHeaderYear[previousIndex]!);
      }
    }
  };

  const labelQueue: string[] = [];
  const headerIndex = block.indexOf(headerLine);

  for (let index = headerIndex + 1; index < block.length; index += 1) {
    const line = block[index];
    if (
      line.startsWith("Pagina ") ||
      line.startsWith("-- ") ||
      line.startsWith("INFRACCIONES ") ||
      line.startsWith("LOCALIDADES ") ||
      line.startsWith("(Datos") ||
      line.startsWith("Datos pendientes")
    ) {
      continue;
    }

    const inlineCounts = parseSpainInlineCounts(line, years);
    if (inlineCounts) {
      storeSpainCounts(inlineCounts.sourceLabel, inlineCounts.countsByHeaderYear);
      continue;
    }

    const splitLineCounts = parseSpainInlineCounts(`__LABEL__ ${line}`, years);
    if (splitLineCounts && labelQueue.length > 0) {
      const sourceLabel = labelQueue.shift()!;
      storeSpainCounts(sourceLabel, splitLineCounts.countsByHeaderYear);
      continue;
    }

    if (/^\d+ de \d+$/.test(line)) {
      continue;
    }

    labelQueue.push(normalizeSpainText(line));
  }

  return { currentYear, previousYear, rowsByYear };
}

async function buildSpainLocation(
  definition: LocationDefinition,
  municipality: string,
  annualSources: SpainAnnualSource[],
  cityPopulationByYear: Record<string, number>,
): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(definition);
  const districtLabel = definition.label;
  const districtSlug = slugify(districtLabel);
  const recordsByKey = new Map<string, CrimeRecord>();
  const years = new Set<number>();

  const earliestSourceYear = Math.min(...annualSources.map((source) => source.year));

  for (const source of annualSources) {
    let targetPath = path.join(SPAIN_SHARED_DIR, `source_${source.year}.pdf`);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    if (source.type === "xls") {
      targetPath = path.join(SPAIN_SHARED_DIR, `source_${source.year}.xls`);
      await ensureFile(targetPath, source.url);
    } else if (source.type === "pdf") {
      await ensureFile(targetPath, source.url);
    } else {
      const zipPath = path.join(SPAIN_SHARED_DIR, `source_${source.year}.zip`);
      await ensureFile(zipPath, source.url);
      const pythonCode = [
        "import sys, zipfile, pathlib",
        "zip_path, needle, out_path = sys.argv[1:]",
        "with zipfile.ZipFile(zip_path) as zf:",
        "    name = next((n for n in zf.namelist() if needle.lower() in n.lower() and n.lower().endswith('.pdf')), None)",
        "    if name is None:",
        "        raise SystemExit(f'No PDF entry found for {needle} in {zip_path}')",
        "    pathlib.Path(out_path).write_bytes(zf.read(name))",
      ].join("\n");
      execFileSync("python3", ["-c", pythonCode, zipPath, source.zipEntryContains ?? "", targetPath], {
        cwd: ROOT,
        maxBuffer: 64 * 1024 * 1024,
      });
    }

    let parsed;
    try {
      if (source.type === "xls") {
        parsed = parseSpainMunicipalityWorkbook(targetPath, municipality, source.year);
      } else {
        const text = await extractPdfText(targetPath);
        parsed = parseSpainMunicipalitySection(text, municipality, source.year);
      }
    } catch (error) {
      throw new Error(`Spain parse failed for ${definition.slug} ${source.year}: ${error instanceof Error ? error.message : String(error)}`);
    }

    parsed.rowsByYear.forEach((rowsForYear, year) => {
      if (year !== source.year && source.year !== earliestSourceYear) {
        return;
      }

      years.add(year);
      rowsForYear.forEach((count, sourceLabel) => {
        const category = categoryLookup.get(normalizeSpainText(sourceLabel));
        if (!category) {
          return;
        }

        addOrMergeRecord(recordsByKey, {
          year,
          districtLabel,
          districtSlug,
          categoryLabel: category.label,
          categorySlug: category.slug,
          count,
          ratePer100k: null,
        });
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
    cityPopulationByYear,
    records: [...recordsByKey.values()].sort((left, right) => left.year - right.year),
  };
}

async function buildSpainCountryLocation(): Promise<LocationPayload> {
  const annualSources: SpainAnnualSource[] = [
    { year: 2019, type: "zip-pdf", url: SOURCE_URLS.spanishArchive2019, zipEntryContains: "cuarto trimestre" },
    { year: 2020, type: "zip-pdf", url: SOURCE_URLS.spanishArchive2020, zipEntryContains: "cuarto trimestre" },
    { year: 2021, type: "pdf", url: SOURCE_URLS.spanishBalance2021 },
    { year: 2022, type: "pdf", url: SOURCE_URLS.spanishBalance2022 },
    { year: 2023, type: "pdf", url: SOURCE_URLS.spanishBalance2023 },
    { year: 2024, type: "pdf", url: SOURCE_URLS.spanishBalance2024 },
    { year: 2025, type: "pdf", url: SOURCE_URLS.spanishBalance2025 },
  ];

  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(SPAIN_COUNTRY_LOCATION);
  const districts = SPAIN_COUNTRY_TERRITORIES.map((territory) => ({
    label: territory.label,
    value: territory.slug,
  }));
  const recordsByKey = new Map<string, CrimeRecord>();
  const years = new Set<number>();
  const earliestSourceYear = Math.min(...annualSources.map((source) => source.year));
  const allStopHeaders = SPAIN_COUNTRY_TERRITORIES.flatMap((territory) => territory.aliases);

  for (const source of annualSources) {
    let targetPath = path.join(SPAIN_COUNTRY_DIR, `spain_country_${source.year}.pdf`);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    if (source.type === "pdf") {
      if (source.year === 2025) {
        await ensureFile(SPAIN_COUNTRY_PDF_2025_PATH, source.url);
        targetPath = SPAIN_COUNTRY_PDF_2025_PATH;
      } else {
        await ensureFile(targetPath, source.url);
      }
    } else {
      const zipPath = source.year === 2019 ? SPAIN_COUNTRY_ARCHIVE_2019_PATH : SPAIN_COUNTRY_ARCHIVE_2020_PATH;
      await ensureFile(zipPath, source.url);
      const pythonCode = [
        "import sys, zipfile, pathlib",
        "zip_path, needle, out_path = sys.argv[1:]",
        "with zipfile.ZipFile(zip_path) as zf:",
        "    name = next((n for n in zf.namelist() if needle.lower() in n.lower() and n.lower().endswith('.pdf')), None)",
        "    if name is None:",
        "        raise SystemExit(f'No PDF entry found for {needle} in {zip_path}')",
        "    pathlib.Path(out_path).write_bytes(zf.read(name))",
      ].join("\n");
      execFileSync("python3", ["-c", pythonCode, zipPath, source.zipEntryContains ?? "", targetPath], {
        cwd: ROOT,
        maxBuffer: 64 * 1024 * 1024,
      });
    }

    const text = await extractPdfText(targetPath);

    for (const territory of SPAIN_COUNTRY_TERRITORIES) {
      const parsed = parseSpainTerritorySection(
        text,
        territory.aliases,
        allStopHeaders.filter((header) => !territory.aliases.includes(header)),
        source.year,
      );

      parsed.rowsByYear.forEach((rowsForYear, year) => {
        if (year !== source.year && source.year !== earliestSourceYear) {
          return;
        }

        years.add(year);
        rowsForYear.forEach((count, sourceLabel) => {
          const category = categoryLookup.get(normalizeSpainText(sourceLabel));
          if (!category) {
            return;
          }

          addOrMergeRecord(recordsByKey, {
            year,
            districtLabel: territory.label,
            districtSlug: territory.slug,
            categoryLabel: category.label,
            categorySlug: category.slug,
            count,
            ratePer100k: null,
          });
        });
      });
    }
  }

  return {
    slug: SPAIN_COUNTRY_LOCATION.slug,
    label: SPAIN_COUNTRY_LOCATION.label,
    country: SPAIN_COUNTRY_LOCATION.country,
    areaLabelSingular: SPAIN_COUNTRY_LOCATION.areaLabelSingular,
    areaLabelPlural: SPAIN_COUNTRY_LOCATION.areaLabelPlural,
    chartTitle: SPAIN_COUNTRY_LOCATION.chartTitle,
    note: SPAIN_COUNTRY_LOCATION.note,
    sources: SPAIN_COUNTRY_LOCATION.sources,
    years: [...years].sort((left, right) => left - right),
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear: {},
    records: [...recordsByKey.values()].sort((left, right) => {
      if (left.year !== right.year) {
        return left.year - right.year;
      }

      if (left.districtLabel !== right.districtLabel) {
        return left.districtLabel.localeCompare(right.districtLabel);
      }

      return left.categoryLabel.localeCompare(right.categoryLabel);
    }),
  };
}

async function parseBarcelonaPopulationByYear(years: number[]) {
  const response = await fetch(SOURCE_URLS.barcelonaPopulationPackage, {
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to load Barcelona population package: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as {
    success: boolean;
    result?: {
      resources?: Array<{ name?: string; format?: string; url?: string }>;
    };
  };

  const resources = payload.result?.resources ?? [];
  const populationByYear = new Map<number, number>();

  for (const year of years) {
    const resource = resources.find(
      (item) => item.format === "CSV" && String(item.name ?? "").startsWith(`${year}_pad_mdbas_sexe`),
    );
    if (!resource?.url) {
      continue;
    }

    const filePath = path.join(BARCELONA_DIR, "population", `${year}.csv`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await ensureFile(filePath, resource.url);
    const workbook = XLSX.readFile(filePath);
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
    const total = rows.reduce((sum, row) => sum + Number(row.Valor ?? 0), 0);
    if (total > 0) {
      populationByYear.set(year, total);
    }
  }

  return mapToObject(populationByYear);
}

async function parseValenciaPopulationByYear() {
  const filePath = path.join(VALENCIA_DIR, "population_total.pdf");
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    try {
      await ensureFile(filePath, SOURCE_URLS.valenciaPopulationIndicator);
      const existing = await fs.readFile(filePath);
      if (!existing.subarray(0, 4).equals(Buffer.from("%PDF"))) {
        throw new Error("Cached Valencia population file is not a PDF");
      }
    } catch {
      execFileSync("curl", ["-L", "--max-time", "60", "-A", "Mozilla/5.0", SOURCE_URLS.valenciaPopulationIndicator, "-o", filePath], {
        cwd: ROOT,
        maxBuffer: 32 * 1024 * 1024,
      });
      const refreshed = await fs.readFile(filePath);
      if (!refreshed.subarray(0, 4).equals(Buffer.from("%PDF"))) {
        throw new Error("Official Valencia population indicator did not return a PDF");
      }
    }
    const text = await extractPdfText(filePath);
    const yearMatches = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
    const populationMatches = [...text.matchAll(/\b\d{3}\.\d{3}\b/g)].map((match) => parseCountLike(match[0]));
    const populationByYear = new Map<number, number>();

    const years = yearMatches.filter((year) => year >= 2015 && year <= 2024).slice(0, 10);
    const populations = populationMatches.slice(0, years.length);

    years.forEach((year, index) => {
      const population = populations[index];
      if (population && population > 0) {
        populationByYear.set(year, population);
      }
    });

    return mapToObject(populationByYear);
  } catch (error) {
    console.warn(
      `Valencia population indicator could not be parsed from the live official source in this environment; using the verified official fallback series instead. (${error instanceof Error ? error.message : String(error)})`,
    );
    return Object.fromEntries(
      Object.entries(VALENCIA_OFFICIAL_POPULATION_FALLBACK).map(([year, population]) => [year, population]),
    );
  }
}

function readHamburgPopulationRow(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, defval: null });
  const row = rows.find((candidate) => String(candidate[0] ?? "").trim() === "Hamburg");
  return row ? Number(row[1] ?? 0) : 0;
}

async function parseHamburgPopulationByYear() {
  const legacyPath = path.join(HAMBURG_DIR, "profiles_2013_2023.xlsx");
  const currentPath = path.join(HAMBURG_DIR, "profiles_2024.xlsx");
  await Promise.all([
    ensureFile(legacyPath, SOURCE_URLS.hamburgProfiles2013To2023),
    ensureFile(currentPath, SOURCE_URLS.hamburgProfiles2024),
  ]);

  const legacyWorkbook = XLSX.readFile(legacyPath);
  const currentWorkbook = XLSX.readFile(currentPath);
  const populationByYear = new Map<number, number>();

  for (const year of Array.from({ length: 5 }, (_, index) => 2019 + index)) {
    const sheetName = year <= 2021 ? `Berichtsjahr_${year}` : `Berichtsjahr ${year}`;
    const sheet = legacyWorkbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }
    const population = readHamburgPopulationRow(sheet);
    if (population > 0) {
      populationByYear.set(year, population);
    }
  }

  const population2024 = readHamburgPopulationRow(currentWorkbook.Sheets[currentWorkbook.SheetNames[0]]);
  if (population2024 > 0) {
    populationByYear.set(2024, population2024);
  }

  return mapToObject(populationByYear);
}

async function parseTokyoPopulationByYear() {
  const filePath = path.join(TOKYO_DIR, "population.csv");
  await ensureFile(filePath, SOURCE_URLS.tokyoPopulationCsv);
  const workbook = XLSX.readFile(filePath, { type: "file", raw: false });
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
    defval: null,
  });
  const populationByYear = new Map<number, number>();

  for (const row of rows.slice(1)) {
    const year = Number(row[1] ?? 0);
    const population = parseCountLike(row[2]);
    if (year >= 2010 && year <= 2023 && population > 0) {
      populationByYear.set(year, population);
    }
  }

  return mapToObject(populationByYear);
}

async function parseSaoPauloPopulationByYear() {
  const populationByYear = new Map<number, number>();

  const estimatedPayload = (await fetchJsonWithRetry<Array<Record<string, string>>>(
    SOURCE_URLS.saoPauloPopulationEstimated,
  )) as Array<Record<string, string>>;

  for (const row of estimatedPayload.slice(1)) {
    const year = Number(row.D3C ?? 0);
    const population = parseCountLike(row.V);
    if (year >= 2010 && year <= 2025 && population > 0) {
      populationByYear.set(year, population);
    }
  }

  for (const [url, year] of [
    [SOURCE_URLS.saoPauloPopulation2010, 2010],
    [SOURCE_URLS.saoPauloPopulation2022, 2022],
  ] as const) {
    const payload = (await fetchJsonWithRetry<Array<Record<string, string>>>(url)) as Array<Record<string, string>>;
    const row = payload[1];
    const population = parseCountLike(row?.V);
    if (population > 0) {
      populationByYear.set(year, population);
    }
  }

  return mapToObject(populationByYear);
}

async function parseUsCityPopulationByYear(config: (typeof US_CITY_POPULATION_SOURCES)[keyof typeof US_CITY_POPULATION_SOURCES]) {
  const output = new Map<number, number>();
  const historicalCsvPath = path.join(US_SHARED_DIR, "population_2000_2010.csv");
  const intercensalPath = path.join(US_SHARED_DIR, `population_2010_2020_${config.stateFips}.xlsx`);
  const currentPath = path.join(US_SHARED_DIR, `population_2020_2024_${config.stateFips}.xlsx`);

  await Promise.all([
    ensureFile(historicalCsvPath, SOURCE_URLS.usCityPopulation2000To2010),
    ensureFile(
      intercensalPath,
      `https://www2.census.gov/programs-surveys/popest/tables/2010-2020/intercensal/cities/sub-ip-est2020int-pop-${config.stateFips}.xlsx`,
    ),
    ensureFile(
      currentPath,
      `https://www2.census.gov/programs-surveys/popest/tables/2020-2024/cities/totals/SUB-IP-EST2024-POP-${config.stateFips}.xlsx`,
    ),
  ]);

  const historicalWorkbook = XLSX.read(await fs.readFile(historicalCsvPath), { type: "buffer" });
  const historicalRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(
    historicalWorkbook.Sheets[historicalWorkbook.SheetNames[0]],
    { defval: "" },
  );
  const [historicalCityName, historicalStateName] = config.cityName.split(",").map((value) => value.trim());
  const historicalRow = historicalRows.find(
    (row) =>
      String(row.SUMLEV ?? "").trim() === "162" &&
      String(row.NAME ?? "").trim() === historicalCityName &&
      String(row.STNAME ?? "").trim() === historicalStateName,
  );
  if (historicalRow) {
    for (let year = 2001; year <= 2010; year += 1) {
      const key = year === 2010 ? "POPESTIMATE2010" : `POPESTIMATE${year}`;
      const population = parseCountLike(historicalRow[key]);
      if (population > 0) {
        output.set(year, population);
      }
    }

    if (!output.get(2010)) {
      const population = parseCountLike(historicalRow.CENSUS2010POP);
      if (population > 0) {
        output.set(2010, population);
      }
    }
  }

  for (const [filePath, startYear, endYear] of [
    [intercensalPath, 2010, 2020],
    [currentPath, 2020, 2024],
  ] as const) {
    const workbook = XLSX.readFile(filePath);
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1,
      defval: null,
    });
    const headerRow = rows[3] ?? [];
    const nameRowIndex = rows.findIndex((row, index) => index >= 4 && String(row[0] ?? "").trim() === config.cityName);
    if (nameRowIndex === -1) {
      continue;
    }
    const row = rows[nameRowIndex];
    for (let year = startYear; year <= endYear; year += 1) {
      const columnIndex = headerRow.findIndex((cell) => Number(cell ?? 0) === year);
      const population = parseCountLike(row[columnIndex]);
      if (population > 0) {
        output.set(year, population);
      }
    }
  }

  return mapToObject(output);
}

async function parseAustraliaLgaPopulationByYear(input: {
  districtLabels: string[];
  absLabelByDistrict?: Record<string, string>;
}) {
  const workbookPath = path.join(AUSTRALIA_SHARED_DIR, "abs_lga_population_2001_2025.xlsx");
  await fs.mkdir(AUSTRALIA_SHARED_DIR, { recursive: true });
  await ensureFile(workbookPath, SOURCE_URLS.australiaLgaPopulation);

  const workbook = XLSX.readFile(workbookPath, { dense: true });
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets["Table 1"], {
    header: 1,
    defval: null,
  });
  const headerYears = rows[4] ?? [];
  const targetDistrictByAbsLabel = new Map(
    input.districtLabels.map((label) => [input.absLabelByDistrict?.[label] ?? label, label] satisfies [string, string]),
  );
  const populationByDistrict = new Map<string, Map<number, number>>();

  for (const row of rows.slice(6)) {
    const absLabel = String(row[1] ?? "").trim();
    const districtLabel = targetDistrictByAbsLabel.get(absLabel);
    if (!districtLabel) {
      continue;
    }

    const populationByYear = new Map<number, number>();
    for (let columnIndex = 2; columnIndex < headerYears.length; columnIndex += 1) {
      const year = Number(headerYears[columnIndex] ?? 0);
      if (!year) {
        continue;
      }

      const population = Number(row[columnIndex] ?? 0);
      if (population > 0) {
        populationByYear.set(year, population);
      }
    }

    populationByDistrict.set(districtLabel, populationByYear);
  }

  const missingDistricts = input.districtLabels.filter((label) => !populationByDistrict.has(label));
  if (missingDistricts.length) {
    throw new Error(`Missing ABS population rows for: ${missingDistricts.join(", ")}`);
  }

  return populationByDistrict;
}

function incrementCount(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function buildAustralianMetroLocationPayload(input: {
  definition: LocationDefinition;
  years: number[];
  districtLabels: string[];
  populationByDistrict: Map<string, Map<number, number>>;
  countsByKey: Map<string, number>;
}) {
  const { options: categories } = buildCategoryLookup(input.definition);
  const districts = input.districtLabels.map((label) => ({ label, value: slugify(label) }));
  const records: CrimeRecord[] = [];
  const cityPopulationByYear = new Map<number, number>();

  for (const year of input.years) {
    const cityPopulation = input.districtLabels.reduce(
      (sum, districtLabel) => sum + (input.populationByDistrict.get(districtLabel)?.get(year) ?? 0),
      0,
    );
    if (cityPopulation > 0) {
      cityPopulationByYear.set(year, cityPopulation);
    }
  }

  for (const district of districts) {
    const populationByYear = input.populationByDistrict.get(district.label) ?? new Map<number, number>();
    for (const category of categories) {
      for (const year of input.years) {
        const count = input.countsByKey.get(`${district.label}__${category.value}__${year}`) ?? 0;
        const population = populationByYear.get(year) ?? null;
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
    slug: input.definition.slug,
    label: input.definition.label,
    country: input.definition.country,
    areaLabelSingular: input.definition.areaLabelSingular,
    areaLabelPlural: input.definition.areaLabelPlural,
    chartTitle: input.definition.chartTitle,
    note: input.definition.note,
    sources: input.definition.sources,
    years: input.years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear: mapToObject(cityPopulationByYear),
    records,
  } satisfies LocationPayload;
}

async function buildSydneyLocation(): Promise<LocationPayload> {
  await fs.mkdir(SYDNEY_DIR, { recursive: true });

  const workbookPath = path.join(SYDNEY_DIR, "nsw_bocsar_offence_by_month.xlsm");
  await ensureFile(workbookPath, SOURCE_URLS.sydneyCrimeWorkbook);

  const districtLabels = [...SYDNEY_METRO_LGAS];
  const years = Array.from({ length: 25 }, (_, index) => 2001 + index);
  const { lookup: categoryLookup, options: categories } = buildCategoryLookup(SYDNEY_LOCATION);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const populationByDistrict = await parseAustraliaLgaPopulationByYear({
    districtLabels,
    absLabelByDistrict: SYDNEY_ABS_LABEL_BY_LGA,
  });

  const workbook = XLSX.readFile(workbookPath, { dense: true });
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets.Data, {
    header: 1,
    defval: null,
  });
  const headerRow = rows[0] ?? [];
  const lgaColumnIndex = headerRow.indexOf("LGA");
  const categoryColumnIndex = headerRow.indexOf("Offence category");
  const subcategoryColumnIndex = headerRow.indexOf("Subcategory");
  const monthColumns = headerRow
    .map((cell, index) => ({ serial: Number(cell ?? 0), index }))
    .filter(({ serial, index }) => index >= 3 && Number.isFinite(serial) && serial > 0)
    .map(({ serial, index }) => {
      const parsedDate = XLSX.SSF.parse_date_code(serial);
      return {
        index,
        year: parsedDate?.y ?? 0,
      };
    })
    .filter(({ year }) => year >= 2001 && year <= 2025);

  const districtSet = new Set<string>(districtLabels);
  const seenDistricts = new Set<string>();
  const countsByKey = new Map<string, number>();

  for (const row of rows.slice(1)) {
    const districtLabel = String(row[lgaColumnIndex] ?? "").trim();
    if (!districtSet.has(districtLabel)) {
      continue;
    }

    seenDistricts.add(districtLabel);
    const sourceCategoryLabel = String(row[subcategoryColumnIndex] ?? "").trim() || String(row[categoryColumnIndex] ?? "").trim();
    const mappedCategory = categoryLookup.get(normalizeSourceLabel(sourceCategoryLabel));

    for (const { index, year } of monthColumns) {
      const count = Number(row[index] ?? 0);
      if (!count) {
        continue;
      }

      if (totalCategory) {
        incrementCount(countsByKey, `${districtLabel}__${totalCategory.value}__${year}`, count);
      }

      if (mappedCategory) {
        incrementCount(countsByKey, `${districtLabel}__${mappedCategory.slug}__${year}`, count);
      }
    }
  }

  const missingDistricts = districtLabels.filter((label) => !seenDistricts.has(label));
  if (missingDistricts.length) {
    throw new Error(`Sydney source missing expected LGAs: ${missingDistricts.join(", ")}`);
  }

  return buildAustralianMetroLocationPayload({
    definition: SYDNEY_LOCATION,
    years,
    districtLabels,
    populationByDistrict,
    countsByKey,
  });
}

async function buildMelbourneLocation(): Promise<LocationPayload> {
  await fs.mkdir(MELBOURNE_DIR, { recursive: true });

  const districtLabels = [...MELBOURNE_METRO_LGAS];
  const years: Array<keyof typeof VICTORIA_LGA_RECORDED_OFFENCES_URL_BY_YEAR> = [2020, 2021, 2022, 2023, 2024, 2025];
  const { lookup: categoryLookup, options: categories } = buildCategoryLookup(MELBOURNE_LOCATION);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const populationByDistrict = await parseAustraliaLgaPopulationByYear({
    districtLabels,
    absLabelByDistrict: MELBOURNE_ABS_LABEL_BY_LGA,
  });

  const workbookPathByYear = Object.fromEntries(
    years.map((year) => [year, path.join(MELBOURNE_DIR, `victoria_lga_recorded_offences_${year}.xlsx`)]),
  ) as Record<number, string>;

  await Promise.all(
    years.map((year) => ensureFile(workbookPathByYear[year], VICTORIA_LGA_RECORDED_OFFENCES_URL_BY_YEAR[year])),
  );

  const districtSet = new Set<string>(districtLabels);
  const seenDistricts = new Set<string>();
  const countsByKey = new Map<string, number>();

  for (const year of years) {
    const workbook = XLSX.readFile(workbookPathByYear[year], { dense: true });
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets["Table 02"], {
      header: 1,
      defval: null,
    });
    const headerRow = (rows[0] ?? []).map((value) => String(value ?? "").trim());
    const lgaColumnIndex = headerRow.indexOf("Local Government Area");
    const subgroupColumnIndex = headerRow.indexOf("Offence Subgroup");
    const countColumnIndex = headerRow.indexOf("Offence Count");

    for (const row of rows.slice(1)) {
      if (Number(row[0] ?? 0) !== year) {
        continue;
      }

      const sourceDistrictLabel = String(row[lgaColumnIndex] ?? "").trim();
      const districtLabel = MELBOURNE_CANONICAL_LGA_BY_SOURCE[sourceDistrictLabel] ?? sourceDistrictLabel;
      if (!districtSet.has(districtLabel)) {
        continue;
      }

      seenDistricts.add(districtLabel);
      const sourceCategoryLabel = String(row[subgroupColumnIndex] ?? "").trim();
      const mappedCategory = categoryLookup.get(normalizeSourceLabel(sourceCategoryLabel));
      const count = Number(row[countColumnIndex] ?? 0);
      if (!count) {
        continue;
      }

      if (totalCategory) {
        incrementCount(countsByKey, `${districtLabel}__${totalCategory.value}__${year}`, count);
      }

      if (mappedCategory) {
        incrementCount(countsByKey, `${districtLabel}__${mappedCategory.slug}__${year}`, count);
      }
    }
  }

  const missingDistricts = districtLabels.filter((label) => !seenDistricts.has(label));
  if (missingDistricts.length) {
    throw new Error(`Melbourne source missing expected LGAs: ${missingDistricts.join(", ")}`);
  }

  return buildAustralianMetroLocationPayload({
    definition: MELBOURNE_LOCATION,
    years,
    districtLabels,
    populationByDistrict,
    countsByKey,
  });
}

function getTokyoSourceUrl(year: number) {
  const yearSuffix = String(year).slice(2);
  return `https://www.toukei.metro.tokyo.lg.jp/tnenkan/${year}/tn${yearSuffix}qv201000.csv`;
}

async function buildTokyoLocation(): Promise<LocationPayload> {
  await fs.mkdir(TOKYO_DIR, { recursive: true });

  const years = Array.from({ length: 14 }, (_, index) => 2010 + index);
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(TOKYO_LOCATION);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();
  const cityPopulationByYear = await parseTokyoPopulationByYear();

  for (const year of years) {
    const filePath = path.join(TOKYO_DIR, `${year}.csv`);
    await ensureFile(filePath, getTokyoSourceUrl(year));

    const workbook = XLSX.read(await fs.readFile(filePath), { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
      header: 1,
      defval: null,
      raw: true,
    });

    const headerRow = rows[0] ?? [];
    const districtColumnIndex = headerRow.findIndex((cell) => String(cell ?? "").trim() === "District");
    const policeStationColumnIndex = headerRow.findIndex((cell) => String(cell ?? "").trim() === "Police station");

    if (districtColumnIndex === -1 || policeStationColumnIndex === -1) {
      throw new Error(`Could not determine Tokyo district columns for ${year}`);
    }

    const categoryColumns = headerRow
      .map((cell, index) => ({
        index,
        sourceLabel: String(cell ?? "").trim(),
      }))
      .filter((column) => categoryLookup.has(normalizeSourceLabel(column.sourceLabel)));

    for (const row of rows.slice(1)) {
      const districtLabel = String(row[districtColumnIndex] ?? "").trim();
      const policeStationLabel = String(row[policeStationColumnIndex] ?? "").trim();

      if (!districtLabel || !policeStationLabel || districtLabel === "Tokyo-to" || districtLabel === "All ku") {
        continue;
      }

      const districtSlug = slugify(districtLabel);
      districtsByLabel.set(districtLabel, { label: districtLabel, value: districtSlug });

      for (const column of categoryColumns) {
        const category = categoryLookup.get(normalizeSourceLabel(column.sourceLabel));
        if (!category) {
          continue;
        }

        countsByKey.set(
          `${year}__${districtSlug}__${category.slug}`,
          (countsByKey.get(`${year}__${districtSlug}__${category.slug}`) ?? 0) + parseCountLike(row[column.index]),
        );
      }
    }
  }

  const districts = [...districtsByLabel.values()].sort((left, right) => left.label.localeCompare(right.label));

  return {
    slug: TOKYO_LOCATION.slug,
    label: TOKYO_LOCATION.label,
    country: TOKYO_LOCATION.country,
    areaLabelSingular: TOKYO_LOCATION.areaLabelSingular,
    areaLabelPlural: TOKYO_LOCATION.areaLabelPlural,
    chartTitle: TOKYO_LOCATION.chartTitle,
    note: TOKYO_LOCATION.note,
    sources: TOKYO_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

function getSaoPauloSourceUrl(year: number) {
  return `https://www.ssp.sp.gov.br/assets/estatistica/trimestral/arquivos/${year}-04.htm`;
}

async function buildSaoPauloLocation(): Promise<LocationPayload> {
  await fs.mkdir(SAO_PAULO_DIR, { recursive: true });

  const years = Array.from({ length: 16 }, (_, index) => 2010 + index);
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(SAO_PAULO_LOCATION);
  const districtLabel = "São Paulo";
  const districtSlug = slugify(districtLabel);
  const recordsByKey = new Map<string, CrimeRecord>();
  const cityPopulationByYear = await parseSaoPauloPopulationByYear();

  for (const year of years) {
    const filePath = path.join(SAO_PAULO_DIR, `${year}.htm`);
    await ensureFile(filePath, getSaoPauloSourceUrl(year));

    const workbook = XLSX.readFile(filePath, {
      raw: true,
      cellText: true,
      cellNF: true,
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
      header: 1,
      defval: null,
      raw: false,
    });

    const summaryHeaderIndex = rows.findIndex(
      (row) => String(row?.[1] ?? "").trim() === "Ocorrências policiais registradas, por natureza" ||
        String(row?.[1] ?? "").trim() === "Ocorr�ncias policiais registradas, por natureza",
    );
    const typeHeaderIndex = rows.findIndex(
      (row) => String(row?.[1] ?? "").trim() === "Ocorrências policiais registradas, por tipo" ||
        String(row?.[1] ?? "").trim() === "Ocorr�ncias policiais registradas, por tipo",
    );

    if (summaryHeaderIndex === -1 || typeHeaderIndex === -1) {
      throw new Error(`Could not determine São Paulo offense tables for ${year}`);
    }

    const summaryHeader = rows[summaryHeaderIndex] ?? [];
    const typeHeader = rows[typeHeaderIndex] ?? [];
    const summaryCapitalColumnIndex = summaryHeader.findIndex((cell) => String(cell ?? "").trim() === "Capital");
    const typeCapitalColumnIndex = typeHeader.findIndex((cell) => String(cell ?? "").trim() === "Capital");

    if (summaryCapitalColumnIndex === -1 || typeCapitalColumnIndex === -1) {
      throw new Error(`Could not determine São Paulo Capital column for ${year}`);
    }

    const collectTableRows = (startIndex: number) => {
      const tableRows: Array<{ sourceLabel: string; count: number }> = [];

      for (const row of rows.slice(startIndex + 1)) {
        const label = String(row?.[1] ?? "").trim();
        if (!label) {
          continue;
        }
        if (String(row?.[0] ?? "").trim() === "ITEM") {
          break;
        }

        const count = parseCountLike(row[startIndex === summaryHeaderIndex ? summaryCapitalColumnIndex : typeCapitalColumnIndex]);
        tableRows.push({
          sourceLabel: label,
          count,
        });
      }

      return tableRows;
    };

    const tableRows = [...collectTableRows(summaryHeaderIndex), ...collectTableRows(typeHeaderIndex)];

    for (const row of tableRows) {
      const category = categoryLookup.get(normalizeSourceLabel(row.sourceLabel));
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
        ratePer100k: null,
      });
    }
  }

  return {
    slug: SAO_PAULO_LOCATION.slug,
    label: SAO_PAULO_LOCATION.label,
    country: SAO_PAULO_LOCATION.country,
    areaLabelSingular: SAO_PAULO_LOCATION.areaLabelSingular,
    areaLabelPlural: SAO_PAULO_LOCATION.areaLabelPlural,
    chartTitle: SAO_PAULO_LOCATION.chartTitle,
    note: SAO_PAULO_LOCATION.note,
    sources: SAO_PAULO_LOCATION.sources,
    years,
    districts: [{ label: districtLabel, value: districtSlug }],
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: [...recordsByKey.values()].sort((left, right) => left.year - right.year),
  };
}

async function parseMunichResourceLinks() {
  await fs.mkdir(MUNICH_DIR, { recursive: true });
  const pagePath = path.join(MUNICH_DIR, "statistics_page.html");
  await ensureFile(pagePath, SOURCE_URLS.munichStatisticsPage);
  const html = await fs.readFile(pagePath, "utf8");

  const yearbookByYear = new Map<number, string>();
  const countPdfByYear = new Map<number, string>();

  for (const match of html.matchAll(/<a href="([^"]+\.pdf)"[^>]*>([^<]+)/gi)) {
    const href = match[1];
    const label = match[2]?.trim() ?? "";
    const absoluteUrl = new URL(href, SOURCE_URLS.munichStatisticsPage).toString();

    if (label.startsWith("Jahreszahlen ")) {
      const year = Number(label.match(/\d{4}/)?.[0] ?? 0);
      if (year > 0) {
        yearbookByYear.set(year, absoluteUrl);
      }
    }

    if (label.startsWith("Erfasste und aufgeklärte Straftaten ")) {
      const year = Number(label.match(/\d{4}/)?.[0] ?? 0);
      if (year > 0) {
        countPdfByYear.set(year, absoluteUrl);
      }
    }
  }

  return { yearbookByYear, countPdfByYear };
}

function flattenPdfText(text: string) {
  return text
    .replace(/\u00ad/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function extractSingleCount(flattenedText: string, pattern: RegExp, context: string) {
  const match = flattenedText.match(pattern);
  if (!match) {
    throw new Error(`Could not parse ${context}`);
  }
  return parseCountLike(match[1]);
}

function extractSingleCountFromPatterns(flattenedText: string, patterns: RegExp[], context: string) {
  for (const pattern of patterns) {
    const match = flattenedText.match(pattern);
    if (match) {
      return parseCountLike(match[1]);
    }
  }

  throw new Error(`Could not parse ${context}`);
}

function extractCurrentYearCountFromPatterns(flattenedText: string, patterns: RegExp[], context: string) {
  for (const pattern of patterns) {
    const match = flattenedText.match(pattern);
    if (match) {
      return parseCountLike(match[2]);
    }
  }

  throw new Error(`Could not parse ${context}`);
}

function extractYearPair(flattenedText: string, pattern: RegExp, context: string) {
  const match = flattenedText.match(pattern);
  if (!match) {
    throw new Error(`Could not parse ${context}`);
  }

  return {
    previous: parseCountLike(match[1]),
    current: parseCountLike(match[2]),
  };
}

function extractLeadingYearPairAfterLabel(flattenedText: string, patterns: RegExp[], context: string) {
  for (const pattern of patterns) {
    const match = flattenedText.match(pattern);
    if (match) {
      return {
        previous: parseCountLike(match[1]),
        current: parseCountLike(match[2]),
      };
    }
  }

  throw new Error(`Could not parse ${context}`);
}

const MUNICH_OFFICIAL_POPULATION_BY_YEAR: Record<number, number> = {
  2001: 1_260_597,
  2002: 1_264_309,
  2010: 1_382_273,
  2011: 1_410_741,
  2012: 1_439_474,
  2013: 1_464_962,
  2014: 1_490_681,
  2015: 1_521_678,
  2016: 1_542_860,
  2017: 1_526_056,
};

function toPdfLines(text: string) {
  return text
    .replace(/\u00ad/g, "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractMunichNumericColumns(value: string) {
  return value
    .split(/\t+|\s{2,}/)
    .flatMap((segment) => {
      const trimmed = segment.trim();

      if (!trimmed) {
        return [];
      }

      if (trimmed === "-") {
        return [0];
      }

      if (!/^-?[\d ]+$/.test(trimmed)) {
        return [];
      }

      const chunks = trimmed.split(/\s+/);

      if (chunks.length > 2 && chunks.length % 2 === 0) {
        const values: number[] = [];

        for (let index = 0; index < chunks.length; index += 2) {
          values.push(parseCountLike(`${chunks[index]} ${chunks[index + 1]}`));
        }

        return values;
      }

      return [parseCountLike(trimmed)];
    });
}

function tryExtractMunichLineCount(
  lines: string[],
  patterns: RegExp[],
  numericTokenIndex: number,
  preferMostColumns = false,
) {
  let bestMatch: { count: number; width: number } | null = null;

  for (const pattern of patterns) {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const candidates = [
        lines[lineIndex],
        [lines[lineIndex], lines[lineIndex + 1]].filter(Boolean).join(" "),
        [lines[lineIndex], lines[lineIndex + 1], lines[lineIndex + 2]].filter(Boolean).join(" "),
      ];

      for (const candidate of candidates) {
        if (!pattern.test(candidate)) {
          continue;
        }

        const match = candidate.match(pattern);

        if (!match) {
          continue;
        }

        const suffix = candidate.slice((match.index ?? 0) + match[0].length);
        const tokens = extractMunichNumericColumns(suffix);

        if (tokens[numericTokenIndex] !== undefined) {
          if (!preferMostColumns) {
            return tokens[numericTokenIndex];
          }

          if (!bestMatch || tokens.length > bestMatch.width) {
            bestMatch = { count: tokens[numericTokenIndex], width: tokens.length };
          }
        }
      }
    }
  }

  return bestMatch?.count ?? null;
}

function extractMunichLineCount(
  lines: string[],
  patterns: RegExp[],
  context: string,
  numericTokenIndex: number,
  preferMostColumns = false,
) {
  const count = tryExtractMunichLineCount(lines, patterns, numericTokenIndex, preferMostColumns);

  if (count !== null) {
    return count;
  }

  throw new Error(`Could not parse ${context}`);
}

function parseMunichArchivedCounts(text: string) {
  const lines = toPdfLines(text);
  const rapeCount = extractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?(?:darunter\s+)?Vergewaltigung/i],
    "Munich archived rape",
    1,
  );
  const sexualTotal = tryExtractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?Straftaten gegen die sexuelle Selbstbestimmung/i],
    1,
  )
    ?? (rapeCount
      + (tryExtractMunichLineCount(
        lines,
        [/^(?:[\d*\s-]+\s+)?Fˆrderung sexueller Handlungen/i],
        1,
      ) ?? 0)
      + (tryExtractMunichLineCount(
        lines,
        [/^(?:[\d*\s-]+\s+)?Sonstige Straftaten gegen die sexuelle Selbstbestimmung/i],
        1,
      ) ?? 0));
  const vehicleTheft = extractMunichLineCount(
    lines,
    [
      /^(?:[\d*\s-]+\s+)?(?:darunter\s+)?Diebstahl von Kraft(?:wagen|fahrzeugen?)/i,
      /^(?:[\d*\s-]+\s+)?Kraftfahrzeugdiebstahl/i,
    ],
    "Munich archived vehicle theft",
    1,
  );
  const bicycleTheft = extractMunichLineCount(
    lines,
    [
      /^(?:[\d*\s-]+\s+)?(?:darunter\s+)?Diebstahl von Fahrr/i,
      /^(?:[\d*\s-]+\s+)?Fahrr/i,
    ],
    "Munich archived bicycle theft",
    1,
  );
  const theftTotal = tryExtractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?Diebstahl insgesamt/i],
    1,
  )
    ?? (vehicleTheft
      + bicycleTheft
      + extractMunichLineCount(
        lines,
        [/^(?:[\d*\s-]+\s+)?Sonstige Diebst/i],
        "Munich archived other theft",
        1,
      ));
  const drugOffenses = extractMunichLineCount(
    lines,
    [
      /^(?:[\d*\s-]+\s+)?Rauschgiftdelikte/i,
      /^(?:[\d*\s-]+\s+)?Rauschgiftkriminalit/i,
      /^(?:[\d*\s-]+\s+)?einschl/i,
    ],
    "Munich archived drug offenses",
    1,
  );
  const combinedFraudAndEmbezzlement = tryExtractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?Betrug und Veruntreuung/i],
    1,
  );
  const fraudAndEmbezzlement = combinedFraudAndEmbezzlement
    ?? (extractMunichLineCount(lines, [/^(?:[\d*\s-]+\s+)?Betrug/i], "Munich archived fraud", 1)
      + extractMunichLineCount(lines, [/^(?:[\d*\s-]+\s+)?Veruntreuung/i], "Munich archived embezzlement", 1));

  return new Map<string, number>([
    [
      "Straftaten insgesamt",
      extractMunichLineCount(lines, [/^(?:[\d*\s-]+\s+)?Straftaten insgesamt/i], "Munich archived total offenses", 1),
    ],
    [
      "Straftaten gegen die sexuelle Selbstbestimmung",
      sexualTotal,
    ],
    ["Vergewaltigung", rapeCount],
    [
      "Raub, räuberische Erpressung und räuberischer Angriff auf Kraftfahrer*innen",
      extractMunichLineCount(
        lines,
        [
          /^(?:[\d*\s-]+\s+)?(?:darunter\s+|und zwar\s+)?Raub,\s*r/i,
          /^(?:[\d*\s-]+\s+)?(?:r‰uber\.\s+)?Angriff auf Kfz/i,
        ],
        "Munich archived robbery",
        1,
      ),
    ],
    ["Diebstahl insgesamt", theftTotal],
    ["Diebstahl von Kraftwagen", vehicleTheft],
    ["Diebstahl von Fahrrädern", bicycleTheft],
    ["Betrug und Veruntreuung", fraudAndEmbezzlement],
    ["Rauschgiftdelikte", drugOffenses],
  ]);
}

function parseMunichCounts(text: string) {
  const lines = toPdfLines(text);
  const rapeCount = extractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?(?:darunter\s+)?Vergewaltigung/i],
    "Munich rape",
    0,
    true,
  );
  const sexualTotal = extractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?Straftaten gegen die sexuelle Selbstbestimmung/i],
    "Munich sexual offenses",
    0,
    true,
  );
  const vehicleTheft = extractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?(?:darunter\s+)?Diebstahl von Kraft(?:wagen|fahrzeugen?)/i],
    "Munich vehicle theft",
    0,
    true,
  );
  const bicycleTheft = extractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?Diebstahl von Fahrr/i],
    "Munich bicycle theft",
    0,
    true,
  );
  const theftTotal = extractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?Diebstahl insgesamt/i],
    "Munich theft",
    0,
    true,
  );
  const fraudAndEmbezzlement =
    extractMunichLineCount(lines, [/^(?:[\d*\s-]+\s+)?(?:darunter\s+)?Betrug/i], "Munich fraud", 0, true) +
    extractMunichLineCount(lines, [/^(?:[\d*\s-]+\s+)?Veruntreuung/i], "Munich embezzlement", 0, true);
  const drugOffenses = extractMunichLineCount(
    lines,
    [/^(?:[\d*\s-]+\s+)?Rauschgiftdelikte(?: nach dem BtMG)?/i],
    "Munich drug offenses",
    0,
    true,
  );

  return new Map<string, number>([
    [
      "Straftaten insgesamt",
      extractMunichLineCount(lines, [/^(?:[\d*\s-]+\s+)?Straftaten insgesamt/i], "Munich total offenses", 0, true),
    ],
    ["Straftaten gegen die sexuelle Selbstbestimmung", sexualTotal],
    ["Vergewaltigung", rapeCount],
    [
      "Raub, räuberische Erpressung und räuberischer Angriff auf Kraftfahrer*innen",
      extractMunichLineCount(
        lines,
        [/^(?:[\d*\s-]+\s+)?(?:darunter\s+|und zwar\s+)?Raub,\s*r/i],
        "Munich robbery",
        0,
        true,
      ),
    ],
    ["Diebstahl insgesamt", theftTotal],
    ["Diebstahl von Kraftwagen", vehicleTheft],
    ["Diebstahl von Fahrrädern", bicycleTheft],
    ["Betrug und Veruntreuung", fraudAndEmbezzlement],
    ["Rauschgiftdelikte", drugOffenses],
  ]);
}

async function buildMunichLocation(): Promise<LocationPayload> {
  const munichDir = MUNICH_DIR;
  const approvedPilotYears = new Set([2001, 2002, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]);
  const years = (await fs.readdir(munichDir))
    .map((fileName) => /^([0-9]{4})\.pdf$/i.exec(fileName)?.[1] ?? null)
    .filter((value): value is string => value !== null)
    .map((value) => Number(value))
    .filter((year) => approvedPilotYears.has(year))
    .sort((left, right) => left - right);
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(MUNICH_LOCATION);
  const districtLabel = "Munich";
  const districtSlug = slugify(districtLabel);
  const recordsByKey = new Map<string, CrimeRecord>();

  for (const year of years) {
    const filePath = path.join(MUNICH_DIR, `${year}.pdf`);
    const counts = year < 2010
      ? parseMunichArchivedCounts(await extractPdfText(filePath))
      : parseMunichCounts(await extractPdfText(filePath));

    for (const [sourceLabel, count] of counts) {
      const category = categoryLookup.get(normalizeSourceLabel(sourceLabel));
      if (!category) {
        continue;
      }

      const population = MUNICH_OFFICIAL_POPULATION_BY_YEAR[year];

      recordsByKey.set(`${year}__${districtSlug}__${category.slug}`, {
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
    slug: MUNICH_LOCATION.slug,
    label: MUNICH_LOCATION.label,
    country: MUNICH_LOCATION.country,
    areaLabelSingular: MUNICH_LOCATION.areaLabelSingular,
    areaLabelPlural: MUNICH_LOCATION.areaLabelPlural,
    chartTitle: MUNICH_LOCATION.chartTitle,
    note: MUNICH_LOCATION.note,
    sources: MUNICH_LOCATION.sources,
    years,
    districts: [{ label: districtLabel, value: districtSlug }],
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear: Object.fromEntries(years.map((year) => [String(year), MUNICH_OFFICIAL_POPULATION_BY_YEAR[year]])),
    records: [...recordsByKey.values()].sort((left, right) => left.year - right.year),
  };
}

const HAMBURG_YEARBOOK_SOURCES = [
  { year: 2020, url: SOURCE_URLS.hamburgYearbook2020 },
  { year: 2021, url: SOURCE_URLS.hamburgYearbook2021 },
  { year: 2022, url: SOURCE_URLS.hamburgYearbook2022 },
  { year: 2023, url: SOURCE_URLS.hamburgYearbook2023 },
  { year: 2024, url: SOURCE_URLS.hamburgYearbook2024 },
];

function parseHamburgYearbookCounts(text: string) {
  const flat = flattenPdfText(text);

  return new Map<string, { previous: number; current: number }>([
    [
      "Straftaten insgesamt",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Straftaten insgesamt\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg total offenses",
      ),
    ],
    [
      "Straftaten gegen die sexuelle Selbstbestimmung",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Straftaten gegen die sexuelle Selbstbestimmung\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg sexual offenses",
      ),
    ],
    [
      "Vergewaltigung, sexuelle Nötigung und sexuelle Übergriffe im besonders schweren Fall",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Vergewaltigung[^0-9]{0,180}\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg rape",
      ),
    ],
    [
      "Raub, räuberische Erpressung, räuberischer Angriff auf Kraftfahrer",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Raub\s*\/\s*r[aä]uberische\s+Erpressung\s*\/\s*r[aä]uberischer\s+Angriff\s+auf\s+Kraftfahrer\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg robbery",
      ),
    ],
    [
      "Körperverletzung insgesamt",
      extractLeadingYearPairAfterLabel(
        flat,
        [/K[oö]rperverletzung insgesamt\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg all assaults",
      ),
    ],
    [
      "Gefährliche und schwere Körperverletzung",
      extractLeadingYearPairAfterLabel(
        flat,
        [/gef[aä]hrliche und schwere K[oö]rperverletzung\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg aggravated assault",
      ),
    ],
    [
      "Gewaltkriminalität",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Gewaltkriminalit[aä]t1?\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg violent crime",
      ),
    ],
    [
      "Diebstahl insgesamt",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Diebstahl insgesamt\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg theft",
      ),
    ],
    [
      "Wohnungseinbruchdiebstahl",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Wohnungseinbruchdiebstahl\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg residential burglary",
      ),
    ],
    [
      "Diebstahl/unbefugter Gebrauch eines Kraftwagens",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Diebstahl\s*\/\s*unbefugter Gebrauch(?: eines)? Kraftwagens\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg vehicle theft",
      ),
    ],
    [
      "Diebstahl insgesamt an/aus Kraftfahrzeugen",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Diebstahl insgesamt an\s*\/\s*aus Kraftfahrzeugen\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg theft from vehicles",
      ),
    ],
    [
      "Diebstahl insgesamt von Fahrrädern",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Diebstahl insgesamt von Fahrr[aä]dern\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg bicycle theft",
      ),
    ],
    [
      "Taschendiebstahl",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Taschendiebstahl\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg pickpocketing",
      ),
    ],
    [
      "Betrug",
      extractLeadingYearPairAfterLabel(
        flat,
        [/Betrug\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)/i],
        "Hamburg fraud",
      ),
    ],
    [
      "Rauschgiftkriminalität",
      extractLeadingYearPairAfterLabel(
        flat,
        [
          /891000\s+Rauschgiftkriminalit[aä]t\s+(\d{1,3}(?:\.\d{3})*)\s+\d{1,3}(?:\.\d{3})*\s+\d{1,3}(?:,\d+)?\s+(\d{1,3}(?:\.\d{3})*)/i,
          /Rauschgiftkriminalit[aä]t\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)\s+-?\d{1,3}(?:\.\d{3})*\s+-?\d{1,3}(?:,\d+)?/i,
        ],
        "Hamburg drug crime",
      ),
    ],
    [
      "Computerkriminalität",
      extractLeadingYearPairAfterLabel(
        flat,
        [
          /897000\s+Computerkriminalit[aä]t\s+(\d+(?:\.\d{3})*)\s+\d+(?:\.\d{3})*\s+\d{1,3}(?:,\d+)?\s+(\d+(?:\.\d{3})*)\s+\d+(?:\.\d{3})*\s+\d{1,3}(?:,\d+)?/i,
          /Computerkriminalit[aä]t\s+(\d+(?:\.\d{3})*)\s+(\d+(?:\.\d{3})*)\s+\d{1,3}(?:,\d+)?\s+\d+(?:\.\d{3})*/i,
        ],
        "Hamburg cybercrime",
      ),
    ],
  ]);
}

async function buildHamburgLocation(): Promise<LocationPayload> {
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(HAMBURG_LOCATION);
  const districtLabel = "Hamburg";
  const districtSlug = slugify(districtLabel);
  const recordsByKey = new Map<string, CrimeRecord>();

  const recordsPath = path.join(ROOT, "src", "data", "hamburg-citywide-records.json");
  const sourceRecords = JSON.parse(await fs.readFile(recordsPath, "utf8")) as Array<{
    year: number;
    sourceLabel: string;
    count: number;
  }>;

  for (const sourceRecord of sourceRecords) {
    const category = categoryLookup.get(normalizeSourceLabel(sourceRecord.sourceLabel));
    if (!category) {
      continue;
    }

    recordsByKey.set(`${sourceRecord.year}__${districtSlug}__${category.slug}`, {
      year: sourceRecord.year,
      districtLabel,
      districtSlug,
      categoryLabel: category.label,
      categorySlug: category.slug,
      count: sourceRecord.count,
      ratePer100k: null,
    });
  }

  const years = [...new Set([...recordsByKey.values()].map((record) => record.year))].sort((left, right) => left - right);
  const cityPopulationByYear = await parseHamburgPopulationByYear();

  return {
    slug: HAMBURG_LOCATION.slug,
    label: HAMBURG_LOCATION.label,
    country: HAMBURG_LOCATION.country,
    areaLabelSingular: HAMBURG_LOCATION.areaLabelSingular,
    areaLabelPlural: HAMBURG_LOCATION.areaLabelPlural,
    chartTitle: HAMBURG_LOCATION.chartTitle,
    note: HAMBURG_LOCATION.note,
    sources: HAMBURG_LOCATION.sources,
    years,
    districts: [{ label: districtLabel, value: districtSlug }],
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: [...recordsByKey.values()].sort((left, right) => left.year - right.year),
  };
}

async function buildRomeLocation(): Promise<LocationPayload> {
  await fs.mkdir(ROME_DIR, { recursive: true });

  const years = Array.from({ length: 8 }, (_, index) => 2016 + index);
  const districtLabel = "Rome";
  const districtSlug = slugify(districtLabel);
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(ROME_LOCATION);
  const recordsByKey = new Map<string, CrimeRecord>();

  for (const year of years) {
    const workbookPath = path.join(ROME_DIR, `${year}.xlsx`);

    if (year === 2023) {
      await ensureFile(workbookPath, SOURCE_URLS.romeWorkbook2023);
    } else {
      const zipPath = path.join(ROME_DIR, `${year}.zip`);
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
    cityPopulationByYear: deriveCityPopulationByYearFromRecords({
      years,
      districts: [{ label: districtLabel, value: districtSlug }],
      records: [...recordsByKey.values()],
    }),
    records: [...recordsByKey.values()].sort((left, right) => left.year - right.year),
  };
}

async function buildMilanLocation(): Promise<LocationPayload> {
  await fs.mkdir(MILAN_DIR, { recursive: true });

  const crimePath = path.join(MILAN_DIR, "crime_2004_2023.csv");
  const populationPath = path.join(MILAN_DIR, "population_1936_2023.csv");

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
    cityPopulationByYear: mapToObject(populationByYear),
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

function sanitizeBerlinHistoricalRecords(
  records: Array<{ year: number; district: string; category: string; count: number; rate_per_100k: number }>,
) {
  const cleaned = records.filter((record) => {
    if (record.category === "Straftaten -insgesamt-") {
      return record.count <= 200_000;
    }

    if (record.category === "Diebstahl -insgesamt-") {
      return record.count <= 100_000;
    }

    return record.count <= 50_000;
  });

  const removedCount = records.length - cleaned.length;
  if (removedCount > 0) {
    console.warn(`Removed ${removedCount} implausible Berlin historical rows from the PDF-derived archive extract.`);
  }

  return cleaned;
}

async function buildBerlinLocation(): Promise<LocationPayload> {
  const [historicalRecords, currentRecords] = await Promise.all([
    parseBerlinHistoricalRecords(),
    parseBerlinCurrentRecords(),
  ]);
  const dedupedHistoricalRecords = sanitizeBerlinHistoricalRecords(historicalRecords).filter((record) => record.year < 2015);

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
    cityPopulationByYear: deriveCityPopulationByYearFromRecords({
      years,
      districts,
      records: mappedRecords,
    }),
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

  const historicalCrimePath = path.join(LONDON_DIR, "borough_crime_historical.csv");
  const recentCrimePath = path.join(LONDON_DIR, "borough_crime_recent.csv");
  const historicalPopulationPath = path.join(LONDON_DIR, "population_1961_2014.xls");
  const currentPopulationPath = path.join(UK_SHARED_DIR, "ons_england_wales_population_2011_2024.xlsx");

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
  const totalCategory = categoryLookup.get(normalizeSourceLabel("All recorded offenses")) ?? null;
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

    if (!boroughs.has(boroughName)) {
      continue;
    }

    for (const monthKey of extractMonthKeys(row)) {
      const year = Number(monthKey.slice(0, 4));
      if (year < 2010 || year > 2024) {
        continue;
      }
      const count = Number(row[monthKey] ?? 0);
      if (totalCategory) {
        const totalKey = `${boroughName}__${totalCategory.slug}__${year}`;
        countsByKey.set(totalKey, (countsByKey.get(totalKey) ?? 0) + count);
      }
      if (!category) {
        continue;
      }
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
    cityPopulationByYear: mapToObject(
      years.reduce((cityPopulationByYear, year) => {
        const population = districts.reduce((sum, district) => {
          const historicalPopulationByYear = historicalPopulation.get(district.label) ?? new Map<number, number>();
          const currentPopulationByYear = currentPopulation.get(district.label) ?? new Map<number, number>();
          return sum + (currentPopulationByYear.get(year) ?? historicalPopulationByYear.get(year) ?? 0);
        }, 0);

        if (population > 0) {
          cityPopulationByYear.set(year, population);
        }

        return cityPopulationByYear;
      }, new Map<number, number>()),
    ),
    records,
  };
}

async function buildFrankfurtLocation(): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const crimePath = path.join(FRANKFURT_DIR, "crime_by_category.csv");
  const populationPath = path.join(FRANKFURT_DIR, "population_citywide.csv");

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
    cityPopulationByYear: mapToObject(populationByYear),
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

async function parseLutonArchivedRows(filePath: string) {
  const archiveRows: Array<{ year: number; sourceLabel: string; count: number }> = [];
  const unzipProcess = spawn("unzip", ["-p", filePath, "content.xml"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "inherit"],
  });

  if (!unzipProcess.stdout) {
    throw new Error("Could not read Luton archive workbook.");
  }

  unzipProcess.stdout.setEncoding("utf8");

  const rowTerminator = "</table:table-row>";
  let buffer = "";

  const processRow = (rowXml: string) => {
    if (!rowXml.includes("<text:p>Luton</text:p>")) {
      return;
    }

    const values = [...rowXml.matchAll(/<text:p>([\s\S]*?)<\/text:p>/g)]
      .map((match) => decodeXmlEntities(match[1].replace(/<[^>]+>/g, "").trim()))
      .filter(Boolean);

    if (values.length < 9 || values[3] !== "Luton") {
      return;
    }

    const year = parseRollingMarchYear(values[0]);
    if (!year || year < 2019) {
      return;
    }

    archiveRows.push({
      year,
      sourceLabel: values[6],
      count: parseCountLike(values.at(-1)),
    });
  };

  for await (const chunk of unzipProcess.stdout) {
    buffer += chunk;

    while (true) {
      const rowEndIndex = buffer.indexOf(rowTerminator);
      if (rowEndIndex === -1) {
        break;
      }

      processRow(buffer.slice(0, rowEndIndex));
      buffer = buffer.slice(rowEndIndex + rowTerminator.length);
    }
  }

  if (buffer) {
    processRow(buffer);
  }

  await new Promise<void>((resolve, reject) => {
    unzipProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Luton archive extraction failed with exit code ${code ?? "unknown"}.`));
    });
    unzipProcess.on("error", reject);
  });

  return archiveRows;
}

async function buildLutonLocation(): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const crimeZipPath = path.join(LUTON_DIR, "csp_local_authority.zip");
  const crimeWorkbookPath = path.join(LUTON_DIR, "csp_local_authority.xls");
  const archiveWorkbookPath = path.join(LUTON_DIR, "csp-2016-2020.ods");
  const populationZipPath = path.join(UK_SHARED_DIR, "ons_population_timeseries_2001_2020.zip");
  const populationCsvPath = path.join(UK_SHARED_DIR, "ons_population_timeseries_2001_2020.csv");

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
  const totalCategory = categoryLookup.get(normalizeSourceLabel("All recorded offenses")) ?? null;
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
  const recordsByKey = new Map<string, CrimeRecord>();
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

    const rawCategoryLabel = String(row[2] ?? "").trim();
    if (!rawCategoryLabel) {
      continue;
    }
    const category = categoryLookup.get(normalizeSourceLabel(rawCategoryLabel));

    for (const { serial, index } of marchColumns) {
      const parsedDate = XLSX.SSF.parse_date_code(serial);
      const year = parsedDate?.y;
      if (!year) {
        continue;
      }

      const count = Number(row[index] ?? 0);
      const population = populationByYear.get(year);
      years.add(year);
      if (totalCategory) {
        addOrMergeRecord(recordsByKey, {
          year,
          districtLabel,
          districtSlug,
          categoryLabel: totalCategory.label,
          categorySlug: totalCategory.slug,
          count,
          ratePer100k: population ? (count / population) * 100_000 : null,
        });
      }
      if (!category) {
        continue;
      }
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
  }

  const archivedRows = await parseLutonArchivedRows(archiveWorkbookPath);
  for (const archivedRow of archivedRows) {
    const category = categoryLookup.get(normalizeSourceLabel(archivedRow.sourceLabel));
    const population = populationByYear.get(archivedRow.year) ?? null;
    years.add(archivedRow.year);
    if (totalCategory) {
      addOrMergeRecord(recordsByKey, {
        year: archivedRow.year,
        districtLabel,
        districtSlug,
        categoryLabel: totalCategory.label,
        categorySlug: totalCategory.slug,
        count: archivedRow.count,
        ratePer100k: population ? (archivedRow.count / population) * 100_000 : null,
      });
    }
    if (!category) {
      continue;
    }
    addOrMergeRecord(recordsByKey, {
      year: archivedRow.year,
      districtLabel,
      districtSlug,
      categoryLabel: category.label,
      categorySlug: category.slug,
      count: archivedRow.count,
      ratePer100k: population ? (archivedRow.count / population) * 100_000 : null,
    });
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
    cityPopulationByYear: mapToObject(populationByYear),
    records: [...recordsByKey.values()].sort((left, right) => left.year - right.year),
  };
}

async function buildUkLocalAuthorityLocation(
  definition: LocationDefinition,
  areaName: string,
  areaCode: string,
): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const crimeZipPath = path.join(UK_SHARED_DIR, "prc-localauthority.zip");
  const crimeWorkbookPath = path.join(UK_SHARED_DIR, "rec-crime-la-file1.xls");
  const populationZipPath = path.join(UK_SHARED_DIR, "ons_population_timeseries_2001_2020.zip");
  const populationCsvPath = path.join(UK_SHARED_DIR, "ons_population_timeseries_2001_2020.csv");

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

  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(definition);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const populationByYear = await parsePopulationTimeseries2001To2020(populationCsvPath, areaCode);
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

  const districtLabel = areaName;
  const districtSlug = slugify(districtLabel);
  const recordsByKey = new Map<string, CrimeRecord>();
  const years = new Set<number>();
  let currentCsp = "";

  for (const row of rawRows.slice(2)) {
    const rowCsp = String(row[1] ?? "").trim();
    if (rowCsp) {
      currentCsp = rowCsp;
    }

    if (currentCsp !== areaName) {
      continue;
    }

    const rawCategoryLabel = String(row[2] ?? "").trim();
    if (!rawCategoryLabel) {
      continue;
    }

    const category = categoryLookup.get(normalizeSourceLabel(rawCategoryLabel));

    for (const { serial, index } of marchColumns) {
      const parsedDate = XLSX.SSF.parse_date_code(serial);
      const year = parsedDate?.y;
      if (!year || year > 2018) {
        continue;
      }

      const count = Number(row[index] ?? 0);
      const population = populationByYear.get(year);
      years.add(year);

      if (totalCategory) {
        addOrMergeRecord(recordsByKey, {
          year,
          districtLabel,
          districtSlug,
          categoryLabel: totalCategory.label,
          categorySlug: totalCategory.value,
          count,
          ratePer100k: population ? (count / population) * 100_000 : null,
        });
      }

      if (!category) {
        continue;
      }

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
  }

  const filteredPopulationByYear = new Map([...populationByYear.entries()].filter(([year]) => years.has(year)));

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
    cityPopulationByYear: mapToObject(filteredPopulationByYear),
    records: [...recordsByKey.values()].sort((left, right) => left.year - right.year),
  };
}

async function buildParisLocation(): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });

  const crimePath = path.join(PARIS_DIR, "communal_crime.csv.gz");
  await ensureFile(crimePath, SOURCE_URLS.parisCrimeCommunal);

  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(PARIS_LOCATION);
  const totalCategory = categoryLookup.get(normalizeSourceLabel("All recorded offenses")) ?? null;
  const districtLabel = "Paris";
  const districtSlug = slugify(districtLabel);
  const years = new Set<number>();
  const records: CrimeRecord[] = [];
  const totalByYear = new Map<number, { count: number; ratePer100k: number }>();
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
    if (year < 2016 || year > 2025) {
      continue;
    }

    const count = Number(row.nombre ?? 0);
    const ratePer100k = Number(String(row.taux_pour_mille ?? "0").replace(",", ".")) * 100;

    years.add(year);
    if (totalCategory) {
      const currentTotals = totalByYear.get(year) ?? { count: 0, ratePer100k: 0 };
      totalByYear.set(year, {
        count: currentTotals.count + count,
        ratePer100k: currentTotals.ratePer100k + ratePer100k,
      });
    }
    if (!category) {
      continue;
    }

    records.push({
      year,
      districtLabel,
      districtSlug,
      categoryLabel: category.label,
      categorySlug: category.slug,
      count,
      ratePer100k,
    });
  }

  if (totalCategory) {
    for (const [year, total] of totalByYear) {
      records.push({
        year,
        districtLabel,
        districtSlug,
        categoryLabel: totalCategory.label,
        categorySlug: totalCategory.slug,
        count: total.count,
        ratePer100k: total.ratePer100k,
      });
    }
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
    cityPopulationByYear: deriveCityPopulationByYearFromRecords({
      years: [...years].sort((left, right) => left - right),
      districts: [{ label: districtLabel, value: districtSlug }],
      records,
    }),
    records,
  };
}

async function buildNewYorkCityLocation(): Promise<LocationPayload> {
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(NEW_YORK_CITY_LOCATION);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES["new-york-city"]);
  const [historicalRows, currentRows] = await Promise.all([
    fetchSocrataRows<NewYorkCrimeRow>(SOURCE_URLS.newYorkCrimeHistoricApi, {
      $select: "date_extract_y(cmplnt_fr_dt) as year,boro_nm,ofns_desc,count(*) as count",
      $where: "cmplnt_fr_dt between '2006-01-01T00:00:00' and '2024-12-31T23:59:59' and boro_nm is not null",
      $group: "year,boro_nm,ofns_desc",
      $order: "year,boro_nm,ofns_desc",
      $limit: "50000",
    }),
    fetchSocrataRows<NewYorkCrimeRow>(SOURCE_URLS.newYorkCrimeCurrentApi, {
      $select: "date_extract_y(cmplnt_fr_dt) as year,boro_nm,ofns_desc,count(*) as count",
      $where: "cmplnt_fr_dt between '2025-01-01T00:00:00' and '2025-12-31T23:59:59' and boro_nm is not null",
      $group: "year,boro_nm,ofns_desc",
      $order: "year,boro_nm,ofns_desc",
      $limit: "50000",
    }),
  ]);

  const years = Array.from({ length: 20 }, (_, index) => 2006 + index);
  const boroughOrder = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  for (const row of [...historicalRows, ...currentRows]) {
    const year = Number(row.year);
    const boroughName = toTitleCase(String(row.boro_nm ?? "").trim());
    const category = categoryLookup.get(normalizeSourceLabel(String(row.ofns_desc ?? "")));
    const count = parseCountLike(row.count);

    if (!boroughName || boroughName === "(Null)" || !years.includes(year)) {
      continue;
    }

    const districtSlug = slugify(boroughName);
    districtsByLabel.set(boroughName, { label: boroughName, value: districtSlug });
    if (totalCategory) {
      countsByKey.set(
        `${year}__${districtSlug}__${totalCategory.value}`,
        (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count,
      );
    }
    if (!category) {
      continue;
    }
    countsByKey.set(
      `${year}__${districtSlug}__${category.slug}`,
      (countsByKey.get(`${year}__${districtSlug}__${category.slug}`) ?? 0) + count,
    );
  }

  const districts = [...districtsByLabel.values()].sort(
    (left, right) => boroughOrder.indexOf(left.label) - boroughOrder.indexOf(right.label),
  );

  return {
    slug: NEW_YORK_CITY_LOCATION.slug,
    label: NEW_YORK_CITY_LOCATION.label,
    country: NEW_YORK_CITY_LOCATION.country,
    areaLabelSingular: NEW_YORK_CITY_LOCATION.areaLabelSingular,
    areaLabelPlural: NEW_YORK_CITY_LOCATION.areaLabelPlural,
    chartTitle: NEW_YORK_CITY_LOCATION.chartTitle,
    note: NEW_YORK_CITY_LOCATION.note,
    sources: NEW_YORK_CITY_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildChicagoLocation(): Promise<LocationPayload> {
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(CHICAGO_LOCATION);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES.chicago);
  const rows = await fetchSocrataRows<ChicagoCrimeRow>(SOURCE_URLS.chicagoCrimeApi, {
    $select: "year,district,primary_type,count(*) as count",
    $where: "year between 2001 and 2025 and district is not null",
    $group: "year,district,primary_type",
    $order: "year,district,primary_type",
    $limit: "100000",
  });

  const years = Array.from({ length: 25 }, (_, index) => 2001 + index);
  const countsByKey = new Map<string, number>();
  const districtsByCode = new Map<string, FilterOption>();

  for (const row of rows) {
    const year = Number(row.year);
    const districtCode = String(row.district ?? "").trim();
    const category = categoryLookup.get(normalizeSourceLabel(String(row.primary_type ?? "")));
    const count = parseCountLike(row.count);

    if (!districtCode || !years.includes(year)) {
      continue;
    }

    const districtLabel = `District ${districtCode}`;
    const districtSlug = slugify(districtLabel);
    districtsByCode.set(districtCode, { label: districtLabel, value: districtSlug });
    if (totalCategory) {
      countsByKey.set(
        `${year}__${districtSlug}__${totalCategory.value}`,
        (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count,
      );
    }
    if (!category) {
      continue;
    }
    countsByKey.set(
      `${year}__${districtSlug}__${category.slug}`,
      (countsByKey.get(`${year}__${districtSlug}__${category.slug}`) ?? 0) + count,
    );
  }

  const districts = [...districtsByCode.entries()]
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([, district]) => district);

  return {
    slug: CHICAGO_LOCATION.slug,
    label: CHICAGO_LOCATION.label,
    country: CHICAGO_LOCATION.country,
    areaLabelSingular: CHICAGO_LOCATION.areaLabelSingular,
    areaLabelPlural: CHICAGO_LOCATION.areaLabelPlural,
    chartTitle: CHICAGO_LOCATION.chartTitle,
    note: CHICAGO_LOCATION.note,
    sources: CHICAGO_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildLosAngelesLocation(): Promise<LocationPayload> {
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(LOS_ANGELES_LOCATION);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES["los-angeles"]);
  const [historicalRows, currentRows] = await Promise.all([
    fetchSocrataRows<LosAngelesCrimeRow>(SOURCE_URLS.losAngelesCrimeHistoricApi, {
      $select: "date_extract_y(date_occ) as year,area_name,crm_cd_desc,count(*) as count",
      $where: "date_occ between '2010-01-01T00:00:00.000' and '2019-12-31T23:59:59.999' and area_name is not null",
      $group: "year,area_name,crm_cd_desc",
      $order: "year,area_name,crm_cd_desc",
      $limit: "100000",
    }),
    fetchSocrataRows<LosAngelesCrimeRow>(SOURCE_URLS.losAngelesCrimeCurrentApi, {
      $select: "date_extract_y(date_occ) as year,area_name,crm_cd_desc,count(*) as count",
      $where: "date_occ between '2020-01-01T00:00:00.000' and '2024-12-31T23:59:59.999' and area_name is not null",
      $group: "year,area_name,crm_cd_desc",
      $order: "year,area_name,crm_cd_desc",
      $limit: "100000",
    }),
  ]);

  const years = Array.from({ length: 15 }, (_, index) => 2010 + index).filter((year) => year !== 2015 && year !== 2024);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  for (const row of [...historicalRows, ...currentRows]) {
    const year = Number(row.year);
    const areaLabel = String(row.area_name ?? "").trim();
    const category = categoryLookup.get(normalizeSourceLabel(String(row.crm_cd_desc ?? "")));
    const count = parseCountLike(row.count);

    if (!areaLabel || !years.includes(year)) {
      continue;
    }

    const districtSlug = slugify(areaLabel);
    districtsByLabel.set(areaLabel, { label: areaLabel, value: districtSlug });
    if (totalCategory) {
      countsByKey.set(
        `${year}__${districtSlug}__${totalCategory.value}`,
        (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count,
      );
    }
    if (!category) {
      continue;
    }
    countsByKey.set(
      `${year}__${districtSlug}__${category.slug}`,
      (countsByKey.get(`${year}__${districtSlug}__${category.slug}`) ?? 0) + count,
    );
  }

  const districts = [...districtsByLabel.values()].sort((left, right) => left.label.localeCompare(right.label));

  return {
    slug: LOS_ANGELES_LOCATION.slug,
    label: LOS_ANGELES_LOCATION.label,
    country: LOS_ANGELES_LOCATION.country,
    areaLabelSingular: LOS_ANGELES_LOCATION.areaLabelSingular,
    areaLabelPlural: LOS_ANGELES_LOCATION.areaLabelPlural,
    chartTitle: LOS_ANGELES_LOCATION.chartTitle,
    note: LOS_ANGELES_LOCATION.note,
    sources: LOS_ANGELES_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildSanFranciscoLocation(): Promise<LocationPayload> {
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(SAN_FRANCISCO_LOCATION);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES["san-francisco"]);
  const rows = await fetchSocrataRows<SanFranciscoCrimeRow>(SOURCE_URLS.sanFranciscoCrimeApi, {
    $select: "incident_year,police_district,incident_category,count(*) as count",
    $where: "incident_year between '2018' and '2025' and police_district is not null",
    $group: "incident_year,police_district,incident_category",
    $order: "incident_year,police_district,incident_category",
    $limit: "50000",
  });

  const years = Array.from({ length: 8 }, (_, index) => 2018 + index);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  for (const row of rows) {
    const year = Number(row.incident_year);
    const districtLabel = String(row.police_district ?? "").trim();
    const category = categoryLookup.get(normalizeSourceLabel(String(row.incident_category ?? "")));
    const count = parseCountLike(row.count);

    if (!districtLabel || !years.includes(year)) {
      continue;
    }

    const districtSlug = slugify(districtLabel);
    districtsByLabel.set(districtLabel, { label: districtLabel, value: districtSlug });
    if (totalCategory) {
      countsByKey.set(
        `${year}__${districtSlug}__${totalCategory.value}`,
        (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count,
      );
    }
    if (!category) {
      continue;
    }
    countsByKey.set(
      `${year}__${districtSlug}__${category.slug}`,
      (countsByKey.get(`${year}__${districtSlug}__${category.slug}`) ?? 0) + count,
    );
  }

  const districts = [...districtsByLabel.values()].sort((left, right) => left.label.localeCompare(right.label));

  return {
    slug: SAN_FRANCISCO_LOCATION.slug,
    label: SAN_FRANCISCO_LOCATION.label,
    country: SAN_FRANCISCO_LOCATION.country,
    areaLabelSingular: SAN_FRANCISCO_LOCATION.areaLabelSingular,
    areaLabelPlural: SAN_FRANCISCO_LOCATION.areaLabelPlural,
    chartTitle: SAN_FRANCISCO_LOCATION.chartTitle,
    note: SAN_FRANCISCO_LOCATION.note,
    sources: SAN_FRANCISCO_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

function buildCategoryOptionsMap(categories: FilterOption[]) {
  return new Map(categories.map((category) => [category.value, category]));
}

function resolveMappedCategory(categoriesBySlug: Map<string, FilterOption>, label: string | null) {
  return label ? categoriesBySlug.get(slugify(label)) ?? null : null;
}

function mapAustinCrimeType(crimeType: string) {
  const normalized = crimeType.toUpperCase();
  if (normalized.includes("MURDER") || normalized.includes("MANSLAUGHTER")) return "Homicide";
  if (
    normalized.includes("RAPE") ||
    normalized.includes("SEXUAL ASSAULT") ||
    normalized.includes("INDECENT EXPOSURE") ||
    normalized.includes("SEXUAL")
  )
    return "Sexual offenses";
  if (normalized.includes("ROBBERY")) return "Robbery";
  if (normalized.includes("BURGLARY OF RESIDENCE")) return "Residential burglary";
  if (normalized.includes("BURGLARY")) return "Burglary";
  if (normalized.includes("THEFT OF BICYCLE")) return "Bicycle theft";
  if (normalized.includes("BURGLARY OF VEHICLE") || normalized.includes("THEFT FROM AUTO")) return "Theft from vehicles";
  if (normalized.includes("AUTO THEFT")) return "Motor vehicle theft";
  if (normalized.includes("THEFT")) return "Theft";
  if (normalized.includes("AGG")) return "Aggravated assault";
  if (normalized.includes("ASSAULT")) return "Assault";
  if (normalized.includes("MARIJUANA") || normalized.includes("CONTROLLED SUB") || normalized.includes("NARCOTIC") || normalized.includes("DRUG")) return "Drug offenses";
  if (normalized.includes("FRAUD") || normalized.includes("FORGERY") || normalized.includes("IDENTITY THEFT") || normalized.includes("CRED CARD") || normalized.includes("DEBIT CARD")) return "Fraud and forgery";
  if (normalized.includes("CRIMINAL MISCHIEF") || normalized.includes("GRAFFITI") || normalized.includes("DAMAGE")) return "Criminal damage";
  if (normalized.includes("WEAPON")) return "Weapons offenses";
  return null;
}

function mapDallasCrimeType(crimeType: string) {
  const normalized = crimeType.toUpperCase();
  if (normalized.includes("HOMICIDE") || normalized.includes("MURDER") || normalized.includes("MANSLAUGHTER")) return "Homicide";
  if (normalized.includes("ROBBERY")) return "Robbery";
  if (normalized === "THEFT FROM MOTOR VEHICLE" || normalized.includes("MOTOR VEHICLE PARTS")) return "Theft from vehicles";
  if (normalized === "UUMV" || normalized === "MOTOR VEHICLE THEFT") return "Motor vehicle theft";
  if (normalized.includes("BURGLARY")) return "Burglary";
  if (
    normalized === "ALL OTHER LARCENY" ||
    normalized === "SHOPLIFTING" ||
    normalized === "THEFT OF BUILDING" ||
    normalized === "POCKET-PICKING" ||
    normalized === "PURSE-SNATCHING" ||
    normalized.includes("LARCENY")
  )
    return "Theft";
  if (normalized.includes("AGG ASSAULT")) return "Aggravated assault";
  if (normalized === "SIMPLE ASSAULT" || normalized === "INTIMIDATION") return "Assault";
  if (normalized.includes("DRUG") || normalized.includes("NARCOTIC") || normalized.includes("MARIJUANA")) return "Drug offenses";
  if (
    normalized.includes("FRAUD") ||
    normalized.includes("FORGERY") ||
    normalized.includes("COUNTERFEIT") ||
    normalized.includes("CREDIT CARD") ||
    normalized.includes("FALSE PRETENSES") ||
    normalized.includes("IDENTITY THEFT") ||
    normalized.includes("EMBEZZELMENT") ||
    normalized.includes("IMPERSONATION")
  )
    return "Fraud and forgery";
  if (normalized.includes("DAMAGE") || normalized.includes("VANDAL")) return "Criminal damage";
  if (normalized.includes("WEAPON")) return "Weapons offenses";
  if (normalized.includes("ARSON")) return "Arson";
  return null;
}

function mapPhoenixCrimeType(crimeType: string) {
  const normalized = crimeType.toUpperCase();
  if (normalized === "MURDER AND NON-NEGLIGENT MANSLAUGHTER") return "Homicide";
  if (normalized === "RAPE") return "Rape";
  if (normalized === "ROBBERY") return "Robbery";
  if (normalized === "BURGLARY") return "Burglary";
  if (normalized === "LARCENY-THEFT") return "Larceny theft";
  if (normalized === "MOTOR VEHICLE THEFT") return "Motor vehicle theft";
  if (normalized === "SIMPLE ASSAULT") return "Simple assault";
  if (normalized === "AGGRAVATED ASSAULT") return "Aggravated assault";
  if (normalized === "DRUG OFFENSE" || normalized === "DRUG OFFENSES") return "Drug offenses";
  if (normalized === "ARSON") return "Arson";
  return null;
}

function mapHoustonCrimeType(crimeType: string) {
  const normalized = crimeType.toUpperCase();
  if (normalized.includes("MURDER") || normalized.includes("MANSLAUGHTER")) return "Homicide";
  if (normalized === "RAPE" || normalized.includes("FONDLING") || normalized.includes("SODOMY") || normalized.includes("SEXUAL")) return "Sexual offenses";
  if (normalized === "ROBBERY") return "Robbery";
  if (normalized.includes("BURGLARY")) return "Burglary";
  if (normalized === "THEFT FROM MOTOR VEHICLE" || normalized.includes("MOTOR VEHICLE PARTS")) return "Theft from vehicles";
  if (normalized === "MOTOR VEHICLE THEFT") return "Motor vehicle theft";
  if (
    normalized === "ALL OTHER LARCENY" ||
    normalized === "SHOPLIFTING" ||
    normalized === "THEFT FROM BUILDING" ||
    normalized === "PURSE-SNATCHING" ||
    normalized === "POCKET-PICKING"
  )
    return "Theft";
  if (normalized === "AGGRAVATED ASSAULT") return "Aggravated assault";
  if (normalized === "SIMPLE ASSAULT") return "Assault";
  if (normalized.includes("DRUG")) return "Drug offenses";
  if (normalized.includes("WEAPON")) return "Weapons offenses";
  if (
    normalized.includes("FRAUD") ||
    normalized.includes("FORGERY") ||
    normalized.includes("IDENTITY THEFT") ||
    normalized.includes("EMBEZZLEMENT") ||
    normalized.includes("FALSE PRETENSES") ||
    normalized.includes("BAD CHECKS") ||
    normalized.includes("COUNTERFEITING") ||
    normalized.includes("IMPERSONATION")
  )
    return "Fraud and forgery";
  if (normalized.includes("DAMAGE") || normalized.includes("VANDALISM")) return "Criminal damage";
  if (normalized === "ARSON") return "Arson";
  return null;
}

function mapLouisvilleCrimeType(crimeType: string) {
  const normalized = crimeType.toUpperCase();
  if (normalized.includes("HOMICIDE") || normalized.includes("MURDER") || normalized.includes("MANSLAUGHTER")) return "Homicide";
  if (normalized.includes("ROBBERY")) return "Robbery";
  if (normalized.includes("ARSON")) return "Arson";
  if (normalized.includes("WEAPON")) return "Weapons offenses";
  if (normalized.includes("DRUG") || normalized.includes("ALCOHOL") || normalized.includes("NARCOTIC")) return "Drug and alcohol violations";
  if (normalized.includes("SEX") || normalized.includes("RAPE") || normalized.includes("SODOMY") || normalized.includes("SEXUAL")) return "Sex crimes";
  if (normalized.includes("BURGLARY")) return "Burglary";
  if (normalized.includes("MOTOR VEHICLE THEFT") || normalized.includes("AUTO THEFT")) return "Motor vehicle theft";
  if (normalized.includes("FROM MOTOR VEHICLE") || normalized.includes("FROM VEHICLE") || normalized.includes("VEHICLE BREAK")) return "Theft from vehicles";
  if (normalized.includes("THEFT") || normalized.includes("LARCENY") || normalized.includes("SHOPLIFT")) return "Theft";
  if (normalized.includes("ASSAULT") || normalized.includes("BATTERY")) return "Assault";
  if (
    normalized.includes("FRAUD") ||
    normalized.includes("FORGERY") ||
    normalized.includes("COUNTERFEIT") ||
    normalized.includes("IDENTITY") ||
    normalized.includes("EMBEZZLEMENT")
  )
    return "Fraud";
  if (
    normalized.includes("VANDALISM") ||
    normalized.includes("CRIMINAL MISCHIEF") ||
    normalized.includes("CRIMINAL DAMAGE") ||
    normalized.includes("CRIMINAL DAMAGING")
  )
    return "Criminal damage";
  return null;
}

function mapSeattleCrimeType(crimeType: string) {
  const normalized = crimeType.toUpperCase();
  if (normalized.includes("MURDER") || normalized.includes("MANSLAUGHTER")) return "Homicide";
  if (normalized === "RAPE") return "Rape";
  if (normalized.includes("FONDLING") || normalized.includes("SEX OFFENSE")) return "Other sexual offenses";
  if (normalized === "ROBBERY") return "Robbery";
  if (normalized.includes("BURGLARY")) return "Burglary";
  if (normalized === "THEFT FROM MOTOR VEHICLE" || normalized.includes("MOTOR VEHICLE PARTS")) return "Theft from vehicles";
  if (normalized === "MOTOR VEHICLE THEFT") return "Motor vehicle theft";
  if (
    normalized === "ALL OTHER LARCENY" ||
    normalized === "SHOPLIFTING" ||
    normalized === "THEFT FROM BUILDING" ||
    normalized === "POCKET-PICKING" ||
    normalized === "PURSE-SNATCHING"
  )
    return "Theft";
  if (normalized === "AGGRAVATED ASSAULT") return "Aggravated assault";
  if (normalized === "SIMPLE ASSAULT" || normalized === "INTIMIDATION") return "Assault";
  if (normalized.includes("DRUG")) return "Drug offenses";
  if (normalized.includes("WEAPON")) return "Weapons offenses";
  if (
    normalized.includes("FRAUD") ||
    normalized.includes("FORGERY") ||
    normalized.includes("IDENTITY THEFT") ||
    normalized.includes("EMBEZZLEMENT") ||
    normalized.includes("FALSE PRETENSES") ||
    normalized.includes("COUNTERFEITING") ||
    normalized.includes("IMPERSONATION")
  )
    return "Fraud and forgery";
  if (normalized.includes("DAMAGE") || normalized.includes("VANDALISM")) return "Criminal damage";
  if (normalized === "ARSON") return "Arson";
  return null;
}

async function buildAustinLocation(): Promise<LocationPayload> {
  const { options: categories } = buildCategoryLookup(AUSTIN_LOCATION);
  const categoriesBySlug = buildCategoryOptionsMap(categories);
  const totalCategory = categoriesBySlug.get("all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES.austin);
  const rows = await fetchSocrataRows<AustinCrimeRow>(SOURCE_URLS.austinCrimeApi, {
    $select: "date_extract_y(occ_date) as year,district,crime_type,count(*) as count",
    $where: "occ_date between '2003-01-01T00:00:00' and '2025-12-31T23:59:59' and district is not null",
    $group: "year,district,crime_type",
    $order: "year,district,crime_type",
    $limit: "100000",
  });

  const years = Array.from({ length: 23 }, (_, index) => 2003 + index);
  const countsByKey = new Map<string, number>();
  const districtsByCode = new Map<string, FilterOption>();

  for (const row of rows) {
    const year = Number(row.year);
    const districtCode = String(row.district ?? "").trim();
    const category = resolveMappedCategory(categoriesBySlug, mapAustinCrimeType(String(row.crime_type ?? "")));
    const count = parseCountLike(row.count);
    if (!districtCode || !years.includes(year)) {
      continue;
    }

    const districtLabel = `District ${districtCode}`;
    const districtSlug = slugify(districtLabel);
    districtsByCode.set(districtCode, { label: districtLabel, value: districtSlug });
    if (totalCategory) {
      countsByKey.set(`${year}__${districtSlug}__${totalCategory.value}`, (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count);
    }
    if (!category) {
      continue;
    }
    countsByKey.set(`${year}__${districtSlug}__${category.value}`, (countsByKey.get(`${year}__${districtSlug}__${category.value}`) ?? 0) + count);
  }

  const districts = [...districtsByCode.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([, district]) => district);

  return {
    slug: AUSTIN_LOCATION.slug,
    label: AUSTIN_LOCATION.label,
    country: AUSTIN_LOCATION.country,
    areaLabelSingular: AUSTIN_LOCATION.areaLabelSingular,
    areaLabelPlural: AUSTIN_LOCATION.areaLabelPlural,
    chartTitle: AUSTIN_LOCATION.chartTitle,
    note: AUSTIN_LOCATION.note,
    sources: AUSTIN_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildDallasLocation(): Promise<LocationPayload> {
  const { options: categories } = buildCategoryLookup(DALLAS_LOCATION);
  const categoriesBySlug = buildCategoryOptionsMap(categories);
  const totalCategory = categoriesBySlug.get("all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES.dallas);
  const rows = await fetchSocrataRows<DallasCrimeRow>(SOURCE_URLS.dallasCrimeApi, {
    $select: "year1,division,nibrs_crime,count(*) as count",
    $where: "year1 between 2017 and 2025 and division is not null and nibrs_crime is not null",
    $group: "year1,division,nibrs_crime",
    $order: "year1,division,nibrs_crime",
    $limit: "100000",
  });

  const years = Array.from({ length: 9 }, (_, index) => 2017 + index);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  for (const row of rows) {
    const year = Number(row.year1);
    const rawDivision = String(row.division ?? "").trim();
    const divisionLabel = toTitleCase(rawDivision);
    const category = resolveMappedCategory(categoriesBySlug, mapDallasCrimeType(String(row.nibrs_crime ?? "")));
    const count = parseCountLike(row.count);
    if (!divisionLabel || !years.includes(year)) {
      continue;
    }

    const districtSlug = slugify(divisionLabel);
    districtsByLabel.set(divisionLabel, { label: divisionLabel, value: districtSlug });
    if (totalCategory) {
      countsByKey.set(`${year}__${districtSlug}__${totalCategory.value}`, (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count);
    }
    if (!category) {
      continue;
    }
    countsByKey.set(`${year}__${districtSlug}__${category.value}`, (countsByKey.get(`${year}__${districtSlug}__${category.value}`) ?? 0) + count);
  }

  const districts = [...districtsByLabel.values()].sort((a, b) => a.label.localeCompare(b.label));

  return {
    slug: DALLAS_LOCATION.slug,
    label: DALLAS_LOCATION.label,
    country: DALLAS_LOCATION.country,
    areaLabelSingular: DALLAS_LOCATION.areaLabelSingular,
    areaLabelPlural: DALLAS_LOCATION.areaLabelPlural,
    chartTitle: DALLAS_LOCATION.chartTitle,
    note: DALLAS_LOCATION.note,
    sources: DALLAS_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildPhoenixLocation(): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });
  const csvPath = path.join(PHOENIX_DIR, "crime.csv");
  await ensureFileWithCurl(csvPath, SOURCE_URLS.phoenixCrimeCsv, ["-H", "Referer: https://www.phoenixopendata.com/"]);

  const { options: categories } = buildCategoryLookup(PHOENIX_LOCATION);
  const categoriesBySlug = buildCategoryOptionsMap(categories);
  const totalCategory = categoriesBySlug.get("all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES.phoenix);
  const years = Array.from({ length: 10 }, (_, index) => 2016 + index);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  const lineReader = readline.createInterface({
    input: createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headers: string[] | null = null;
  for await (const line of lineReader) {
    if (!line.trim()) {
      continue;
    }
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }
    const values = parseCsvLine(line);
    const row = headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});
    const occurredOn = row["OCCURRED ON"] ?? "";
    const year = parseYearFromDateText(occurredOn) ?? Number.NaN;
    const grid = String(row.GRID ?? "").trim();
    const category = resolveMappedCategory(categoriesBySlug, mapPhoenixCrimeType(String(row["UCR CRIME CATEGORY"] ?? "")));
    if (!grid || !years.includes(year)) {
      continue;
    }

    const districtLabel = `Grid ${grid}`;
    const districtSlug = slugify(districtLabel);
    districtsByLabel.set(districtLabel, { label: districtLabel, value: districtSlug });
    if (totalCategory) {
      countsByKey.set(`${year}__${districtSlug}__${totalCategory.value}`, (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + 1);
    }
    if (!category) {
      continue;
    }
    countsByKey.set(`${year}__${districtSlug}__${category.value}`, (countsByKey.get(`${year}__${districtSlug}__${category.value}`) ?? 0) + 1);
  }

  const districts = [...districtsByLabel.values()].sort((a, b) => a.label.localeCompare(b.label));

  return {
    slug: PHOENIX_LOCATION.slug,
    label: PHOENIX_LOCATION.label,
    country: PHOENIX_LOCATION.country,
    areaLabelSingular: PHOENIX_LOCATION.areaLabelSingular,
    areaLabelPlural: PHOENIX_LOCATION.areaLabelPlural,
    chartTitle: PHOENIX_LOCATION.chartTitle,
    note: PHOENIX_LOCATION.note,
    sources: PHOENIX_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildHoustonLocation(): Promise<LocationPayload> {
  await fs.mkdir(TMP_DIR, { recursive: true });
  const { options: categories } = buildCategoryLookup(HOUSTON_LOCATION);
  const categoriesBySlug = buildCategoryOptionsMap(categories);
  const totalCategory = categoriesBySlug.get("all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES.houston);
  const years = Array.from({ length: 7 }, (_, index) => 2019 + index);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  for (const year of years) {
    const csvPath = path.join(HOUSTON_DIR, `${year}.csv`);
    await ensureFileWithCurl(csvPath, `https://www.houstontx.gov/police/cs/xls/NIBRSPublicView${year}.csv`);
    const lineReader = readline.createInterface({
      input: createReadStream(csvPath),
      crlfDelay: Infinity,
    });

    let headers: string[] | null = null;
    for await (const line of lineReader) {
      if (!line.trim()) {
        continue;
      }
      if (!headers) {
        headers = parseCsvLine(line);
        continue;
      }
      const values = parseCsvLine(line);
      const row = headers.reduce<Record<string, string>>((record, header, index) => {
        record[header] = values[index] ?? "";
        return record;
      }, {});
      const beat = String(row.Beat ?? "").trim();
      const category = resolveMappedCategory(categoriesBySlug, mapHoustonCrimeType(String(row.NIBRSDescription ?? "")));
      const count = parseCountLike(row.OffenseCount);
      if (!beat) {
        continue;
      }

      const districtLabel = `Beat ${beat}`;
      const districtSlug = slugify(districtLabel);
      districtsByLabel.set(districtLabel, { label: districtLabel, value: districtSlug });
      if (totalCategory) {
        countsByKey.set(`${year}__${districtSlug}__${totalCategory.value}`, (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count);
      }
      if (!category) {
        continue;
      }
      countsByKey.set(`${year}__${districtSlug}__${category.value}`, (countsByKey.get(`${year}__${districtSlug}__${category.value}`) ?? 0) + count);
    }
  }

  const districts = [...districtsByLabel.values()].sort((a, b) => a.label.localeCompare(b.label));

  return {
    slug: HOUSTON_LOCATION.slug,
    label: HOUSTON_LOCATION.label,
    country: HOUSTON_LOCATION.country,
    areaLabelSingular: HOUSTON_LOCATION.areaLabelSingular,
    areaLabelPlural: HOUSTON_LOCATION.areaLabelPlural,
    chartTitle: HOUSTON_LOCATION.chartTitle,
    note: HOUSTON_LOCATION.note,
    sources: HOUSTON_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildMinneapolisLocation(): Promise<LocationPayload> {
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(MINNEAPOLIS_LOCATION);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES.minneapolis);
  const years = Array.from({ length: 9 }, (_, index) => 2017 + index);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  for (const year of years) {
    const rows = await fetchArcGisRows<MinneapolisCrimeRow>(SOURCE_URLS.minneapolisCrimeApi, {
      where: `reportYear = ${year} and neighborhood is not null and neighborhood <> '** NOT ASSIGNED **'`,
      groupByFieldsForStatistics: "neighborhood,ucrDescription",
      outStatistics: JSON.stringify([{ statisticType: "sum", onStatisticField: "number", outStatisticFieldName: "count" }]),
      orderByFields: "neighborhood asc,ucrDescription asc",
    });

    for (const row of rows) {
      const rawNeighborhood = String(row.neighborhood ?? "").trim();
      if (!rawNeighborhood || rawNeighborhood === "** NOT ASSIGNED **") {
        continue;
      }

      const districtLabel = toTitleCase(rawNeighborhood.replace(/\s+/g, " "));
      const districtSlug = slugify(districtLabel);
      const category = categoryLookup.get(normalizeSourceLabel(String(row.ucrDescription ?? "")));
      const count = parseCountLike(row.count);

      districtsByLabel.set(districtLabel, { label: districtLabel, value: districtSlug });
      if (totalCategory) {
        countsByKey.set(`${year}__${districtSlug}__${totalCategory.value}`, (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count);
      }
      if (!category) {
        continue;
      }
      countsByKey.set(`${year}__${districtSlug}__${category.slug}`, (countsByKey.get(`${year}__${districtSlug}__${category.slug}`) ?? 0) + count);
    }
  }

  const districts = [...districtsByLabel.values()].sort((left, right) => left.label.localeCompare(right.label));

  return {
    slug: MINNEAPOLIS_LOCATION.slug,
    label: MINNEAPOLIS_LOCATION.label,
    country: MINNEAPOLIS_LOCATION.country,
    areaLabelSingular: MINNEAPOLIS_LOCATION.areaLabelSingular,
    areaLabelPlural: MINNEAPOLIS_LOCATION.areaLabelPlural,
    chartTitle: MINNEAPOLIS_LOCATION.chartTitle,
    note: MINNEAPOLIS_LOCATION.note,
    sources: MINNEAPOLIS_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildClevelandLocation(): Promise<LocationPayload> {
  const { options: categories, lookup: categoryLookup } = buildCategoryLookup(CLEVELAND_LOCATION);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES.cleveland);
  const years = Array.from({ length: 10 }, (_, index) => 2016 + index);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  for (const year of years) {
    const rows = await fetchArcGisRows<ClevelandCrimeRow>(SOURCE_URLS.clevelandCrimeApi, {
      where: `OffenseYear = ${year} and District is not null and District <> ''`,
      groupByFieldsForStatistics: "District,UCRdesc",
      outStatistics: JSON.stringify([{ statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "count" }]),
      orderByFields: "District asc,UCRdesc asc",
    });

    for (const row of rows) {
      const districtLabel = String(row.District ?? "").trim();
      if (!districtLabel) {
        continue;
      }

      const districtSlug = slugify(districtLabel);
      const category = categoryLookup.get(normalizeSourceLabel(String(row.UCRdesc ?? "")));
      const count = parseCountLike(row.count);

      districtsByLabel.set(districtLabel, { label: districtLabel, value: districtSlug });
      if (totalCategory) {
        countsByKey.set(`${year}__${districtSlug}__${totalCategory.value}`, (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count);
      }
      if (!category) {
        continue;
      }
      countsByKey.set(`${year}__${districtSlug}__${category.slug}`, (countsByKey.get(`${year}__${districtSlug}__${category.slug}`) ?? 0) + count);
    }
  }

  const districts = [...districtsByLabel.values()].sort((left, right) => left.label.localeCompare(right.label));

  return {
    slug: CLEVELAND_LOCATION.slug,
    label: CLEVELAND_LOCATION.label,
    country: CLEVELAND_LOCATION.country,
    areaLabelSingular: CLEVELAND_LOCATION.areaLabelSingular,
    areaLabelPlural: CLEVELAND_LOCATION.areaLabelPlural,
    chartTitle: CLEVELAND_LOCATION.chartTitle,
    note: CLEVELAND_LOCATION.note,
    sources: CLEVELAND_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildLouisvilleLocation(): Promise<LocationPayload> {
  const { options: categories } = buildCategoryLookup(LOUISVILLE_LOCATION);
  const categoriesBySlug = buildCategoryOptionsMap(categories);
  const totalCategory = categories.find((category) => category.value === "all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES.louisville);
  const years = Object.keys(LOUISVILLE_CRIME_API_BY_YEAR)
    .map((value) => Number(value) as keyof typeof LOUISVILLE_CRIME_API_BY_YEAR)
    .sort((left, right) => left - right);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  for (const year of years) {
    const isRecentSchema = year >= 2023;
    const divisionField = isRecentSchema ? "lmpd_division" : "LMPD_DIVISION";
    const offenseField = isRecentSchema ? "offense_classification" : "CRIME_TYPE";
    const rows = await fetchArcGisRows<LouisvilleCrimeRow>(LOUISVILLE_CRIME_API_BY_YEAR[year], {
      where: `${divisionField} is not null and ${divisionField} <> ''`,
      groupByFieldsForStatistics: `${divisionField},${offenseField}`,
      outStatistics: JSON.stringify([{ statisticType: "count", onStatisticField: "ObjectId", outStatisticFieldName: "count" }]),
      orderByFields: `${divisionField} asc,${offenseField} asc`,
    });

    for (const row of rows) {
      const rawDivision = String((isRecentSchema ? row.lmpd_division : row.LMPD_DIVISION) ?? "").trim();
      if (!rawDivision) {
        continue;
      }

      const districtLabel = formatLouisvilleDivisionLabel(rawDivision);
      const districtSlug = slugify(districtLabel);
      const mappedCategory = mapLouisvilleCrimeType(String((isRecentSchema ? row.offense_classification : row.CRIME_TYPE) ?? ""));
      const category = resolveMappedCategory(categoriesBySlug, mappedCategory);
      const count = parseCountLike(row.count);

      districtsByLabel.set(districtLabel, { label: districtLabel, value: districtSlug });
      if (totalCategory) {
        countsByKey.set(`${year}__${districtSlug}__${totalCategory.value}`, (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count);
      }
      if (!category) {
        continue;
      }
      countsByKey.set(`${year}__${districtSlug}__${category.value}`, (countsByKey.get(`${year}__${districtSlug}__${category.value}`) ?? 0) + count);
    }
  }

  const districts = [...districtsByLabel.values()].sort((left, right) => {
    const leftNumber = Number.parseInt(left.label, 10);
    const rightNumber = Number.parseInt(right.label, 10);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }
    if (Number.isFinite(leftNumber)) {
      return -1;
    }
    if (Number.isFinite(rightNumber)) {
      return 1;
    }
    return left.label.localeCompare(right.label);
  });

  return {
    slug: LOUISVILLE_LOCATION.slug,
    label: LOUISVILLE_LOCATION.label,
    country: LOUISVILLE_LOCATION.country,
    areaLabelSingular: LOUISVILLE_LOCATION.areaLabelSingular,
    areaLabelPlural: LOUISVILLE_LOCATION.areaLabelPlural,
    chartTitle: LOUISVILLE_LOCATION.chartTitle,
    note: LOUISVILLE_LOCATION.note,
    sources: LOUISVILLE_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

async function buildSeattleLocation(): Promise<LocationPayload> {
  const { options: categories } = buildCategoryLookup(SEATTLE_LOCATION);
  const categoriesBySlug = buildCategoryOptionsMap(categories);
  const totalCategory = categoriesBySlug.get("all-recorded-offenses") ?? null;
  const cityPopulationByYear = await parseUsCityPopulationByYear(US_CITY_POPULATION_SOURCES.seattle);
  const rows = await fetchSocrataRows<SeattleCrimeRow>(SOURCE_URLS.seattleCrimeApi, {
    $select: "date_extract_y(offense_date) as year,precinct,nibrs_offense_code_description,count(*) as count",
    $where: "offense_date between '2008-01-01T00:00:00' and '2025-12-31T23:59:59' and precinct is not null and precinct != '-'",
    $group: "year,precinct,nibrs_offense_code_description",
    $order: "year,precinct,nibrs_offense_code_description",
    $limit: "100000",
  });

  const years = Array.from({ length: 18 }, (_, index) => 2008 + index);
  const countsByKey = new Map<string, number>();
  const districtsByLabel = new Map<string, FilterOption>();

  for (const row of rows) {
    const year = Number(row.year);
    const precinctLabel = toTitleCase(String(row.precinct ?? "").trim());
    const category = resolveMappedCategory(categoriesBySlug, mapSeattleCrimeType(String(row.nibrs_offense_code_description ?? "")));
    const count = parseCountLike(row.count);
    if (!precinctLabel || !years.includes(year)) {
      continue;
    }

    const districtSlug = slugify(precinctLabel);
    districtsByLabel.set(precinctLabel, { label: precinctLabel, value: districtSlug });
    if (totalCategory) {
      countsByKey.set(`${year}__${districtSlug}__${totalCategory.value}`, (countsByKey.get(`${year}__${districtSlug}__${totalCategory.value}`) ?? 0) + count);
    }
    if (!category) {
      continue;
    }
    countsByKey.set(`${year}__${districtSlug}__${category.value}`, (countsByKey.get(`${year}__${districtSlug}__${category.value}`) ?? 0) + count);
  }

  const districts = [...districtsByLabel.values()].sort((a, b) => a.label.localeCompare(b.label));

  return {
    slug: SEATTLE_LOCATION.slug,
    label: SEATTLE_LOCATION.label,
    country: SEATTLE_LOCATION.country,
    areaLabelSingular: SEATTLE_LOCATION.areaLabelSingular,
    areaLabelPlural: SEATTLE_LOCATION.areaLabelPlural,
    chartTitle: SEATTLE_LOCATION.chartTitle,
    note: SEATTLE_LOCATION.note,
    sources: SEATTLE_LOCATION.sources,
    years,
    districts,
    categories,
    defaultCategorySlugs: categories.filter((category) => category.isDefault).map((category) => category.value),
    cityPopulationByYear,
    records: buildDenseCountRecords({ years, districts, categories, countsByKey }),
  };
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function mergeDuplicateRecords(records: CrimeRecord[]) {
  const merged = new Map<string, CrimeRecord>();

  for (const record of records) {
    if (!Number.isFinite(record.year) || !Number.isFinite(record.count)) {
      continue;
    }

    const key = `${record.year}__${record.districtSlug}__${record.categorySlug}`;
    const existing = merged.get(key);
    const safeRate = record.ratePer100k !== null && Number.isFinite(record.ratePer100k) ? record.ratePer100k : null;

    if (!existing) {
      merged.set(key, { ...record, ratePer100k: safeRate });
      continue;
    }

    merged.set(key, {
      ...existing,
      count: existing.count + record.count,
      ratePer100k: existing.ratePer100k ?? safeRate,
    });
  }

  return [...merged.values()];
}

async function syncDatabase(payload: PreparedPayload) {
  await prisma.comparisonMappingSource.deleteMany();
  await prisma.comparisonMapping.deleteMany();
  await prisma.canonicalCategory.deleteMany();
  await prisma.crimeRecord.deleteMany();
  await prisma.locationPopulation.deleteMany();
  await prisma.source.deleteMany();
  await prisma.district.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();

  await prisma.canonicalCategory.createMany({
    data: CANONICAL_COMPARISON_CATEGORIES.map((category) => ({
      key: category.key,
      label: category.label,
      shortLabel: category.shortLabel,
      color: category.color,
      isDefault: category.isDefault,
      sortOrder: category.sortOrder,
    })),
  });

  const canonicalCategories = await prisma.canonicalCategory.findMany();
  const canonicalCategoryIdByKey = new Map(canonicalCategories.map((category) => [category.key, category.id]));

  for (const location of payload.locations) {
    const createdLocation = await prisma.location.create({
      data: {
        slug: location.slug,
        label: location.label,
        country: location.country,
        areaLabelSingular: location.areaLabelSingular,
        areaLabelPlural: location.areaLabelPlural,
        chartTitle: location.chartTitle,
        note: location.note,
      },
    });

    if (location.sources.length) {
      await prisma.source.createMany({
        data: location.sources.map((source, index) => ({
          label: source.label,
          url: source.url,
          sortOrder: index,
          locationId: createdLocation.id,
        })),
      });
    }

    await prisma.district.createMany({
      data: location.districts.map((district, index) => ({
        slug: district.value,
        label: district.label,
        sortOrder: index,
        locationId: createdLocation.id,
      })),
    });

    await prisma.category.createMany({
      data: location.categories.map((category, index) => ({
        slug: category.value,
        label: category.label,
        shortLabel: category.shortLabel,
        color: category.color,
        isDefault: category.isDefault ?? false,
        sortOrder: index,
        locationId: createdLocation.id,
      })),
    });

    const populations = Object.entries(location.cityPopulationByYear).map(([year, population]) => ({
      locationId: createdLocation.id,
      year: Number(year),
      population,
    }));

    if (populations.length) {
      await prisma.locationPopulation.createMany({ data: populations });
    }

    const districts = await prisma.district.findMany({ where: { locationId: createdLocation.id } });
    const categories = await prisma.category.findMany({ where: { locationId: createdLocation.id } });
    const districtIdBySlug = new Map(districts.map((district) => [district.slug, district.id]));
    const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));
    const categoryIdByLabel = new Map(categories.map((category) => [category.label, category.id]));

    const normalizedRecords = mergeDuplicateRecords(location.records);

    for (const recordBatch of chunkArray(normalizedRecords, 1000)) {
      await prisma.crimeRecord.createMany({
        data: recordBatch.map((record) => ({
          year: record.year,
          count: record.count,
          ratePer100k: record.ratePer100k,
          locationId: createdLocation.id,
          districtId: districtIdBySlug.get(record.districtSlug)!,
          categoryId: categoryIdBySlug.get(record.categorySlug)!,
        })),
      });
    }

    for (const mapping of LOCATION_COMPARISON_MAPPINGS[location.slug] ?? []) {
      const canonicalCategoryId = canonicalCategoryIdByKey.get(mapping.canonicalKey);
      if (!canonicalCategoryId) {
        continue;
      }

      const sourceCategoryIds = mapping.sourceLabels
        .map((label) => categoryIdByLabel.get(label))
        .filter((value): value is number => Boolean(value));

      if (sourceCategoryIds.length !== mapping.sourceLabels.length) {
        continue;
      }

      const createdMapping = await prisma.comparisonMapping.create({
        data: {
          locationId: createdLocation.id,
          canonicalCategoryId,
          confidence: mapping.confidence,
        },
      });

      await prisma.comparisonMappingSource.createMany({
        data: sourceCategoryIds.map((categoryId, index) => ({
          mappingId: createdMapping.id,
          categoryId,
          sortOrder: index,
        })),
      });
    }
  }
}

async function main() {
  const spainAnnualSources: SpainAnnualSource[] = [
    { year: 2014, type: "xls", url: SOURCE_URLS.spanishBalance2014Workbook },
    { year: 2020, type: "zip-pdf", url: SOURCE_URLS.spanishArchive2020, zipEntryContains: "cuarto trimestre" },
    { year: 2021, type: "pdf", url: SOURCE_URLS.spanishBalance2021 },
    { year: 2022, type: "pdf", url: SOURCE_URLS.spanishBalance2022 },
    { year: 2023, type: "pdf", url: SOURCE_URLS.spanishBalance2023 },
    { year: 2024, type: "pdf", url: SOURCE_URLS.spanishBalance2024 },
    { year: 2025, type: "pdf", url: SOURCE_URLS.spanishBalance2025 },
  ];

  const [barcelonaPopulationByYear, valenciaPopulationByYear] = await Promise.all([
    parseBarcelonaPopulationByYear(Array.from({ length: 13 }, (_, index) => 2013 + index)),
    parseValenciaPopulationByYear(),
  ]);
  const barcelona = await buildSpainLocation(BARCELONA_LOCATION, "Barcelona", spainAnnualSources, barcelonaPopulationByYear);
  const valencia = await buildSpainLocation(VALENCIA_LOCATION, "Valencia", spainAnnualSources, valenciaPopulationByYear);

  const [austin, berlin, birmingham, chicago, cleveland, dallas, franceCountry, frankfurt, germanyCountry, hamburg, houston, italyCountry, london, losAngeles, louisville, luton, manchester, melbourne, milan, minneapolis, munich, newYorkCity, paris, phoenix, rome, sanFrancisco, saoPaulo, seattle, spainCountry, sydney, tokyo] =
    await Promise.all([
      buildAustinLocation(),
      buildBerlinLocation(),
      buildUkLocalAuthorityLocation(BIRMINGHAM_LOCATION, "Birmingham", "E08000025"),
      buildChicagoLocation(),
      buildClevelandLocation(),
      buildDallasLocation(),
      buildFranceCountryLocation(),
      buildFrankfurtLocation(),
      buildGermanyCountryLocation(),
      buildHamburgLocation(),
      buildHoustonLocation(),
      buildItalyCountryLocation(),
      buildLondonLocation(),
      buildLosAngelesLocation(),
      buildLouisvilleLocation(),
      buildLutonLocation(),
      buildUkLocalAuthorityLocation(MANCHESTER_LOCATION, "Manchester", "E08000003"),
      buildMelbourneLocation(),
      buildMilanLocation(),
      buildMinneapolisLocation(),
      buildMunichLocation(),
      buildNewYorkCityLocation(),
      buildParisLocation(),
      buildPhoenixLocation(),
      buildRomeLocation(),
      buildSanFranciscoLocation(),
      buildSaoPauloLocation(),
      buildSeattleLocation(),
      buildSpainCountryLocation(),
      buildSydneyLocation(),
      buildTokyoLocation(),
    ]);
  const payload = {
    generatedAt: new Date().toISOString(),
    locations: [
      austin,
      barcelona,
      berlin,
      birmingham,
      chicago,
      cleveland,
      dallas,
      franceCountry,
      frankfurt,
      germanyCountry,
      hamburg,
      houston,
      italyCountry,
      london,
      losAngeles,
      louisville,
      luton,
      manchester,
      melbourne,
      milan,
      minneapolis,
      munich,
      newYorkCity,
      paris,
      phoenix,
      rome,
      saoPaulo,
      sanFrancisco,
      seattle,
      spainCountry,
      sydney,
      tokyo,
      valencia,
    ].sort((left, right) => left.label.localeCompare(right.label)),
  };
  await syncDatabase(payload);

  const totalRecords = payload.locations.reduce((sum, location) => sum + location.records.length, 0);
  console.log(`Synced ${totalRecords} records across ${payload.locations.length} locations into prisma/crime-atlas.db`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
