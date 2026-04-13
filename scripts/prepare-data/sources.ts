export type SpainAnnualSource = {
  year: number;
  type: "pdf" | "zip-pdf" | "xls";
  url: string;
  zipEntryContains?: string;
};

export type SpainStructuredSource = {
  year: number;
  url: string;
};

export type SpainCountryTerritoryDefinition = {
  slug: string;
  label: string;
  aliases: string[];
};

export const ARGENTINA_PROVINCE_LABELS: Record<string, string> = {
  buenos_aires: "Buenos Aires",
  caba: "Ciudad Autónoma de Buenos Aires",
  catamarca: "Catamarca",
  chaco: "Chaco",
  chubut: "Chubut",
  cordoba: "Córdoba",
  corrientes: "Corrientes",
  entre_rios: "Entre Ríos",
  formosa: "Formosa",
  jujuy: "Jujuy",
  la_pampa: "La Pampa",
  la_rioja: "La Rioja",
  mendoza: "Mendoza",
  misiones: "Misiones",
  neuquen: "Neuquén",
  rio_negro: "Río Negro",
  salta: "Salta",
  san_juan: "San Juan",
  san_luis: "San Luis",
  santa_cruz: "Santa Cruz",
  santa_fe: "Santa Fe",
  sgo_estero: "Santiago del Estero",
  tierra_fuego: "Tierra del Fuego",
  tucuman: "Tucumán",
};

export const ARGENTINA_PERSON_CODE_TO_CATEGORY: Record<number, string> = {
  1: "Homicide",
  2: "Attempted homicide",
  3: "Assault",
  4: "Sexual violence",
  5: "Other sexual offenses",
  6: "Threats",
};

export const ARGENTINA_PROPERTY_CODE_TO_CATEGORY: Record<number, string> = {
  14: "Robbery",
  15: "Attempted robbery",
  19: "Theft",
  20: "Attempted theft",
  21: "Other property crimes",
};

export const URUGUAY_DELITO_CATEGORY_MAP: Record<string, string> = {
  RAPINA: "Robbery",
  HURTO: "Theft",
  LESIONES: "Assault",
  "VIOLENCIA DOMESTICA": "Domestic violence",
  ABIGEATO: "Livestock theft",
};

export const MALAYSIA_TYPE_CATEGORY_MAP: Record<string, string> = {
  murder: "Homicide",
  rape: "Sexual violence",
  causing_injury: "Assault",
  break_in: "Burglary",
  theft_other: "Theft",
  theft_vehicle_motorcar: "Motor vehicle theft",
  theft_vehicle_motorcycle: "Motor vehicle theft",
  theft_vehicle_lorry: "Motor vehicle theft",
  robbery_gang_armed: "Robbery",
  robbery_gang_unarmed: "Robbery",
  robbery_solo_armed: "Robbery",
  robbery_solo_unarmed: "Robbery",
};

export const MALAYSIA_JOHOR_BAHRU_DISTRICTS = new Set(["Johor Bahru Selatan", "Johor Bahru Utara"]);

export const HONG_KONG_CATEGORY_LABELS: Record<string, string> = {
  "Overall Crime": "All recorded offenses",
  Homicide: "Homicide",
  Robbery: "Robbery",
  Burglary: "Burglary",
  "Wounding and Serious Assault": "Assault",
  Rape: "Sexual violence",
  "All Thefts": "Theft",
  Pickpocketing: "Personal theft",
  "Missing Motor Vehicle": "Motor vehicle theft",
  "Serious Drug Offences": "Drug offenses",
  "Criminal Intimidation": "Threats and harassment",
  Deception: "Fraud and deception",
  "Triad Related Crime": "Public order offenses",
};

export const SPAIN_COUNTRY_TERRITORIES: SpainCountryTerritoryDefinition[] = [
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

export const SPAIN_STRUCTURED_COUNTRY_SOURCES: SpainStructuredSource[] = [
  { year: 2019, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/99010.csv_bdsc" },
  { year: 2020, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1009010.csv_bdsc" },
  { year: 2021, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1109010.csv_bdsc" },
  { year: 2022, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1209010.csv_bdsc" },
  { year: 2023, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1309010.csv_bdsc" },
  { year: 2024, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1409010.csv_bdsc" },
  { year: 2025, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAct/l0/09010.csv_bdsc" },
];

export const SPAIN_STRUCTURED_MUNICIPALITY_SOURCES: SpainStructuredSource[] = [
  { year: 2019, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/99012.csv_bdsc" },
  { year: 2020, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1009012.csv_bdsc" },
  { year: 2021, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1109012.csv_bdsc" },
  { year: 2022, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1209012.csv_bdsc" },
  { year: 2023, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1309012.csv_bdsc" },
  { year: 2024, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/1409012.csv_bdsc" },
  { year: 2025, url: "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAct/l0/09012.csv_bdsc" },
];

export const SPAIN_MUNICIPALITY_ALIASES: Record<string, string[]> = {
  Barcelona: ["Municipio de Barcelona", "08019 Barcelona"],
  Valencia: ["Municipio de Valencia", "Municipio de València", "46250 Valencia"],
};

export const SOURCE_URLS = {
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
  malaysiaCrimeDistrictCsv: "https://storage.data.gov.my/publicsafety/crime_district.csv",
  hongKongCrimeDetailsCsv: "https://www.police.gov.hk/info/doc/crime_details.csv",
  hungaryCrimeCountyCsv: "https://www.ksh.hu/stadat_files/iga/en/iga0008.csv",
  hungaryPopulationCountyCsv: "https://www.ksh.hu/stadat_files/nep/en/nep0034.csv",
  argentinaPersonsSeries:
    "https://infra.datos.gob.ar/catalog/seguridad/dataset/2/distribution/2.6/download/snic-provincias-delitos-personas-hechos-series.csv",
  argentinaPropertySeries:
    "https://infra.datos.gob.ar/catalog/seguridad/dataset/2/distribution/2.7/download/snic-provincias-delitos-propiedad-hechos-series.csv",
  uruguayOtherCrimes:
    "https://catalogodatos.gub.uy/dataset/999f2edc-5ef5-4d41-bed7-824a5635ea8d/resource/c8c4cc18-57cf-448b-9c68-901b3752fc11/download/delitos_2013_2025tri4.csv",
  uruguayHomicides:
    "https://catalogodatos.gub.uy/dataset/999f2edc-5ef5-4d41-bed7-824a5635ea8d/resource/5ed98add-f127-4377-b529-aa8ad35b77e3/download/homicidios_dolosos_consumados.csv",
  hamburgYearbook2024:
    "https://www.polizei.hamburg/resource/blob/1053710/30efad000cc60586a22280031dad1ea0/pks-2024-jahrbuch-do-data.pdf",
  hamburgProfiles2013To2023: "https://www.statistik-nord.de/fileadmin/user_upload/Stadtteilprofile-Berichtsjahre-2013-2023.xlsx",
  hamburgProfiles2024: "https://www.statistik-nord.de/fileadmin/user_upload/Stadtteilprofile2025.xlsx",
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
  sanFranciscoCrimeApi: "https://data.sfgov.org/resource/wg3w-h783.json",
  seattleCrimeApi: "https://data.seattle.gov/resource/tazs-3rd5.json",
  minneapolisCrimeApi: "https://opendata.arcgis.com/datasets/2c7a153e1d464f88a7c0d6c14880db99_0.geojson",
  clevelandCrimeApi: "https://services9.arcgis.com/wjxAgu4stjXf8FvC/arcgis/rest/services/Crime_Incidents/FeatureServer/0/query",
  louisvilleCrimeApi: "https://data.louisvilleky.gov/resource/9vhg-z4ps.json",
  phoenixCrimeCsv: "https://phoenixopendata.com/dataset/7a3b25b5-23e0-4a19-9aa5-6e9125b4dfd8/resource/9b8c11d0-5a0b-44b4-8c7a-7ecedbd7a6a8/download/crime_ucr.csv",
  sanFranciscoPopulationCsv:
    "https://data.sfgov.org/resource/wc94-9f8t.csv?$select=year,police_district,population&$where=year%20between%202001%20and%202025",
  londonPopulationTable:
    "https://data.london.gov.uk/download/vd615/20dc1341-e74a-4e20-b1ff-a01c45e9fa10/ons-mye-population-totals.xls",
  australiaLgaPopulation: "https://www.abs.gov.au/statistics/people/population/regional-population/latest-release",
  sydneyCrimeWorkbook:
    "https://www.bocsar.nsw.gov.au/Documents/Other/Summary-of-crime-statistics.csv",
  tokyoPopulationCsv: "https://www.toukei.metro.tokyo.lg.jp/juukiy/juukiy2010.csv",
  saoPauloPopulationEstimated:
    "https://repositorio.seade.gov.br/dataset/6059cbe7-72b3-45f6-93b9-2cf4df424998/resource/273a1316-0a8e-4e3b-97fb-2a88d7c5b7ad/download/populacao_estimativas_municipio.csv",
  saoPauloPopulation2010:
    "https://repositorio.seade.gov.br/dataset/6059cbe7-72b3-45f6-93b9-2cf4df424998/resource/2f51b3ff-0a19-4b77-8590-1d521c4988b7/download/populacao_2010.csv",
  saoPauloPopulation2022:
    "https://repositorio.seade.gov.br/dataset/6059cbe7-72b3-45f6-93b9-2cf4df424998/resource/63b2f2bb-6b3a-4c72-8028-f9752d56377d/download/populacao_2022.csv",
  saoPauloPopulation2023:
    "https://repositorio.seade.gov.br/dataset/6059cbe7-72b3-45f6-93b9-2cf4df424998/resource/2a5f81df-8f76-4687-98e5-75a1a0a5d2c5/download/populacao_2023.csv",
  austinPopulationApi:
    "https://data.austintexas.gov/resource/6k6n-3n8p.json?$select=year,city,estimate&$where=city%20%3D%20%27Austin%27%20and%20year%20between%202003%20and%202024",
  chicagoPopulationApi:
    "https://data.cityofchicago.org/resource/6xus-xa7i.json?$select=year,percent_of_census_age_range&$where=year%20between%202001%20and%202024&$limit=50000",
  usCityPopulation2000To2010:
    "https://www2.census.gov/programs-surveys/popest/datasets/2000-2010/cities/totals/SUB-EST00INT-01.csv",
  usCityPopulation2010Plus:
    "https://www2.census.gov/programs-surveys/popest/datasets/2010-2023/cities/totals/SUB-IP-EST2023-POP.csv",
  sydneyCrimeWorkbookFallback:
    "https://www.bocsar.nsw.gov.au/Documents/Other/Summary-of-crime-statistics.xlsx",
  spainPopulationIndicator:
    "https://www.ine.es/jaxiT3/files/t/es/col/px/px3/px_es.csv",
  valenciaPopulationIndicator:
    "https://www.ine.es/jaxiT3/files/t/es/col/px/px3/px_es.csv",
  barcelonaPopulationPackage:
    "https://opendata-ajuntament.barcelona.cat/data/dataset/2851b2bf-4866-431b-8b7c-5a80f3c3c579/resource/8d3d5c19-4df5-4c9e-9a1b-6a5d1d4e4b7f/download/bcn_ine_pop.zip",
};
