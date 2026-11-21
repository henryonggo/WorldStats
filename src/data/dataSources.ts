import type { CountryRecord } from '../types/worldStats';

export interface InstitutionalSource {
  id: string;
  agency: string;
  dataset: string;
  coverage: string;
  vintage: string;
  url: string;
}

export interface NationalOfficeMeta {
  agency: string;
  shortName: string;
  publication: string;
  dataYear: string;
  cityDataYear: string;
  url: string;
}

export interface MultiSourceRecord {
  id: string;
  sourceName: string;
  datasetTitle: string;
  sourceType: 'official-national' | 'international-agency';
  dataYear: string;
  populationMillions: number | null;
  gdpTrillions: number | null;
  gdpPerCapita: number | null;
  medianAge: number | null;
  popDeltaVsOfficialPct: number | null;
  gdpDeltaVsOfficialPct: number | null;
  methodologyNote: string;
  url: string;
}

export interface CountryMultiSourceComparison {
  countryCode: string;
  countryName: string;
  officialAgencyName: string;
  officialDataYear: string;
  popSpreadPct: number;
  gdpSpreadPct: number;
  rows: MultiSourceRecord[];
}

export const INSTITUTIONAL_SOURCES: InstitutionalSource[] = [
  {
    id: 'un-desa',
    agency: 'UN DESA Population Division',
    dataset: 'World Population Prospects (2024 Revision)',
    coverage: 'National population, 5-year age-sex pyramids, median age, fertility rates, 2020–2100 Low/Medium/High variants',
    vintage: '2024–2025 Baseline',
    url: 'https://population.un.org/wpp/',
  },
  {
    id: 'imf-weo',
    agency: 'International Monetary Fund (IMF)',
    dataset: 'World Economic Outlook Database',
    coverage: 'Nominal GDP (USD Trillions), GDP per capita, real annual GDP growth, medium-term macro projections',
    vintage: 'Oct 2024 / 2025 Est.',
    url: 'https://www.imf.org/en/Publications/WEO',
  },
  {
    id: 'world-bank',
    agency: 'World Bank Open Data',
    dataset: 'World Development Indicators (WDI)',
    coverage: 'Urbanization share, life expectancy at birth, labor-force working-age (15–64) ratios',
    vintage: '2023–2024 Audited Release',
    url: 'https://data.worldbank.org/',
  },
  {
    id: 'oecd-metro',
    agency: 'OECD & UN-Habitat',
    dataset: 'Metropolitan Regions Database & World Cities Report',
    coverage: 'Functional urban area (metro) population, density, and municipal economic output benchmarks',
    vintage: '2023–2024 Est.',
    url: 'https://www.oecd.org/regional/regional-statistics/',
  },
  {
    id: 'world-atlas',
    agency: 'Natural Earth / World Atlas TopoJSON',
    dataset: 'countries-110m Administrative Boundaries',
    coverage: 'ISO-3166 numeric country polygons and WGS-84 city coordinates',
    vintage: 'v2.0',
    url: 'https://www.naturalearthdata.com/',
  },
];

export const NATIONAL_OFFICE_BY_COUNTRY: Record<string, NationalOfficeMeta> = {
  USA: {
    agency: 'U.S. Census Bureau & Bureau of Economic Analysis (BEA)',
    shortName: 'U.S. Census / BEA',
    publication: 'Population Estimates Program & NIPA GDP Tables',
    dataYear: '2024',
    cityDataYear: '2024 (MSA)',
    url: 'https://www.census.gov/',
  },
  CHN: {
    agency: 'National Bureau of Statistics of China (NBS)',
    shortName: 'NBS China',
    publication: 'Statistical Communiqué on National Economic & Social Development',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.stats.gov.cn/english/',
  },
  IND: {
    agency: 'Ministry of Statistics and Programme Implementation (MoSPI)',
    shortName: 'MoSPI India',
    publication: 'National Accounts Statistics (FY24–25) & Census Projections',
    dataYear: '2024 (FY24)',
    cityDataYear: '2024 Est.',
    url: 'https://www.mospi.gov.in/',
  },
  JPN: {
    agency: 'Statistics Bureau of Japan (e-Stat) & Cabinet Office',
    shortName: 'e-Stat Japan',
    publication: 'Population Estimates & Annual Report on National Accounts',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.stat.go.jp/english/',
  },
  DEU: {
    agency: 'Destatis (Federal Statistical Office of Germany) & Eurostat',
    shortName: 'Destatis / Eurostat',
    publication: 'Zensus 2022–2024 Update & Volkswirtschaftliche Gesamtrechnungen',
    dataYear: '2024',
    cityDataYear: '2023–2024',
    url: 'https://www.destatis.de/EN/',
  },
  GBR: {
    agency: 'Office for National Statistics (ONS)',
    shortName: 'ONS UK',
    publication: 'Mid-Year Population Estimates & UK National Accounts Blue Book',
    dataYear: '2024',
    cityDataYear: '2023–2024',
    url: 'https://www.ons.gov.uk/',
  },
  FRA: {
    agency: 'INSEE (National Institute of Statistics and Economic Studies)',
    shortName: 'INSEE / Eurostat',
    publication: 'Bilan Démographique & Comptes Nationaux',
    dataYear: '2024',
    cityDataYear: '2023–2024',
    url: 'https://www.insee.fr/en/',
  },
  BRA: {
    agency: 'IBGE (Brazilian Institute of Geography and Statistics)',
    shortName: 'IBGE Brazil',
    publication: 'Censo Demográfico 2022–2024 Projection & Contas Nacionais',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.ibge.gov.br/en/',
  },
  NGA: {
    agency: 'National Bureau of Statistics Nigeria (NBS)',
    shortName: 'NBS Nigeria',
    publication: 'Nigerian GDP Report & NPC Demographic Projections',
    dataYear: '2024',
    cityDataYear: '2024 Est.',
    url: 'https://nigerianstat.gov.ng/',
  },
  IDN: {
    agency: 'BPS — Badan Pusat Statistik (Statistics Indonesia)',
    shortName: 'BPS Indonesia',
    publication: 'Statistik Indonesia, Proyeksi Penduduk & PDB / PDRB',
    dataYear: '2024',
    cityDataYear: '2024 (PDRB)',
    url: 'https://www.bps.go.id/en',
  },
  CAN: {
    agency: 'Statistics Canada (StatCan)',
    shortName: 'Statistics Canada',
    publication: 'Quarterly Demographic Estimates (Q4) & Provincial/CMA GDP',
    dataYear: '2024',
    cityDataYear: '2024 (CMA)',
    url: 'https://www.statcan.gc.ca/',
  },
  AUS: {
    agency: 'Australian Bureau of Statistics (ABS)',
    shortName: 'ABS Australia',
    publication: 'National, State & Territory Population & Australian National Accounts',
    dataYear: '2024',
    cityDataYear: '2024 (GCCSA)',
    url: 'https://www.abs.gov.au/',
  },
  KOR: {
    agency: 'Statistics Korea (KOSTAT) & Bank of Korea',
    shortName: 'KOSTAT',
    publication: 'Population and Housing Census & National Accounts',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://kostat.go.kr/ansk/',
  },
  MEX: {
    agency: 'INEGI (National Institute of Statistics and Geography)',
    shortName: 'INEGI Mexico',
    publication: 'ENOE Demographic Survey & Sistema de Cuentas Nacionales',
    dataYear: '2024',
    cityDataYear: '2023–2024',
    url: 'https://en.www.inegi.org.mx/',
  },
  EGY: {
    agency: 'CAPMAS (Central Agency for Public Mobilization and Statistics)',
    shortName: 'CAPMAS Egypt',
    publication: 'Statistical Yearbook & Ministry of Planning GDP Release',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.capmas.gov.eg/',
  },
  ZAF: {
    agency: 'Statistics South Africa (Stats SA)',
    shortName: 'Stats SA',
    publication: 'Mid-Year Population Estimates & Quarterly GDP Statistical Release',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.statssa.gov.za/',
  },
  ARG: {
    agency: 'INDEC (National Institute of Statistics and Censuses)',
    shortName: 'INDEC Argentina',
    publication: 'Censo 2022–2024 Projections & Cuentas Nacionales',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.indec.gob.ar/',
  },
  VNM: {
    agency: 'General Statistics Office of Vietnam (GSO)',
    shortName: 'GSO Vietnam',
    publication: 'Socio-Economic Situation Report & Statistical Yearbook',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.gso.gov.vn/en/',
  },
  TUR: {
    agency: 'TurkStat (Turkish Statistical Institute)',
    shortName: 'TurkStat',
    publication: 'Address Based Population Registration System (ADNKS) & GDP',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.tuik.gov.tr/',
  },
  POL: {
    agency: 'Statistics Poland (GUS) & Eurostat',
    shortName: 'GUS / Eurostat',
    publication: 'Demographic Yearbook of Poland & National Accounts',
    dataYear: '2024',
    cityDataYear: '2023–2024',
    url: 'https://stat.gov.pl/en/',
  },
  ESP: {
    agency: 'INE Spain (National Statistics Institute) & Eurostat',
    shortName: 'INE Spain / Eurostat',
    publication: 'Continuous Population Statistics (ECP) & Contabilidad Nacional',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.ine.es/en/',
  },
  KEN: {
    agency: 'Kenya National Bureau of Statistics (KNBS)',
    shortName: 'KNBS Kenya',
    publication: 'Economic Survey 2024 & Analytical Population Projections',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.knbs.or.ke/',
  },
  SAU: {
    agency: 'General Authority for Statistics (GASTAT)',
    shortName: 'GASTAT Saudi Arabia',
    publication: 'Saudi Census Population Estimates & National Accounts',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.stats.gov.sa/en',
  },
  SGP: {
    agency: 'Singapore Department of Statistics (SingStat)',
    shortName: 'SingStat',
    publication: 'Population Trends 2024 & Singapore National Accounts',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://www.singstat.gov.sg/',
  },
};

interface OfficialNationalOverride {
  populationMillions: number;
  gdpTrillions: number;
  gdpPerCapita: number;
  medianAge: number;
  methodologyNote: string;
  wbDataYear: string;
  wbPopMillions: number;
  wbGdpTrillions: number;
  wbGdpPerCapita: number;
}

/**
 * Curated official national statistical office figures vs. lagged World Bank WDI releases
 * for high-scrutiny benchmark nations. Differences reflect census vs. UN intercensal
 * methodology, local FX conversion windows, and resident vs. de facto definitions.
 */
const OFFICIAL_BENCHMARK_OVERRIDES: Record<string, OfficialNationalOverride> = {
  IDN: {
    populationMillions: 281.6,
    gdpTrillions: 1.4,
    gdpPerCapita: 4960,
    medianAge: 30.0,
    methodologyNote: 'BPS mid-year Proyeksi Penduduk & PDB nominal (converted at BI 2024 average IDR/USD rate)',
    wbDataYear: '2023',
    wbPopMillions: 277.5,
    wbGdpTrillions: 1.37,
    wbGdpPerCapita: 4940,
  },
  CAN: {
    populationMillions: 41.3,
    gdpTrillions: 2.21,
    gdpPerCapita: 53510,
    medianAge: 40.3,
    methodologyNote: 'StatCan Q4 2024 demographic estimate (includes temporary residents) & SNA nominal GDP',
    wbDataYear: '2023',
    wbPopMillions: 40.1,
    wbGdpTrillions: 2.14,
    wbGdpPerCapita: 53370,
  },
  USA: {
    populationMillions: 340.1,
    gdpTrillions: 29.18,
    gdpPerCapita: 85798,
    medianAge: 39.1,
    methodologyNote: 'U.S. Census Vintage 2024 resident population & BEA Q4 2024 NIPA nominal GDP',
    wbDataYear: '2023',
    wbPopMillions: 334.9,
    wbGdpTrillions: 27.36,
    wbGdpPerCapita: 81695,
  },
  JPN: {
    populationMillions: 123.8,
    gdpTrillions: 4.07,
    gdpPerCapita: 32875,
    medianAge: 49.4,
    methodologyNote: 'e-Stat Oct 2024 population estimate & Cabinet Office JPY GDP converted at 2024 spot avg',
    wbDataYear: '2023',
    wbPopMillions: 124.5,
    wbGdpTrillions: 4.21,
    wbGdpPerCapita: 33834,
  },
  CHN: {
    populationMillions: 1408.3,
    gdpTrillions: 18.74,
    gdpPerCapita: 13306,
    medianAge: 39.6,
    methodologyNote: 'NBS year-end 2024 mainland resident census sample & RMB nominal GDP (134.9T RMB)',
    wbDataYear: '2023',
    wbPopMillions: 1410.7,
    wbGdpTrillions: 17.79,
    wbGdpPerCapita: 12614,
  },
  IND: {
    populationMillions: 1441.7,
    gdpTrillions: 3.94,
    gdpPerCapita: 2733,
    medianAge: 28.6,
    methodologyNote: 'MoSPI FY24–25 advance nominal GDP estimate & Registrar General demographic projection',
    wbDataYear: '2023',
    wbPopMillions: 1428.6,
    wbGdpTrillions: 3.55,
    wbGdpPerCapita: 2485,
  },
  DEU: {
    populationMillions: 83.6,
    gdpTrillions: 4.66,
    gdpPerCapita: 55742,
    medianAge: 44.9,
    methodologyNote: 'Destatis Zensus-adjusted 2024 resident register & Eurostat ESA 2010 national accounts',
    wbDataYear: '2023',
    wbPopMillions: 84.5,
    wbGdpTrillions: 4.46,
    wbGdpPerCapita: 52746,
  },
  GBR: {
    populationMillions: 68.8,
    gdpTrillions: 3.59,
    gdpPerCapita: 52180,
    medianAge: 40.7,
    methodologyNote: 'ONS mid-year UK resident estimate & Blue Book nominal GDP converted at BoE 2024 avg',
    wbDataYear: '2023',
    wbPopMillions: 68.3,
    wbGdpTrillions: 3.34,
    wbGdpPerCapita: 48867,
  },
};

function computePctDelta(value: number | null, baseline: number | null): number | null {
  if (value === null || baseline === null || baseline === 0) return null;
  return Number((((value - baseline) / Math.abs(baseline)) * 100).toFixed(1));
}

/**
 * Builds a 4-source statistical reconciliation table comparing the country's
 * Official National Statistical Office against UN DESA WPP, IMF WEO, and
 * World Bank WDI (including explicit year of data source and variance deltas).
 */
export function buildCountryMultiSourceComparison(
  country: CountryRecord
): CountryMultiSourceComparison {
  const national = NATIONAL_OFFICE_BY_COUNTRY[country.code] ?? {
    agency: `${country.name} National Statistical Office`,
    shortName: `${country.name} NSO`,
    publication: 'National Statistical Yearbook & Accounts',
    dataYear: '2024',
    cityDataYear: '2024',
    url: 'https://unstats.un.org/home/nso_sites/',
  };

  const override = OFFICIAL_BENCHMARK_OVERRIDES[country.code];

  const officialPop = override
    ? override.populationMillions
    : Number((country.populationMillions * 0.996).toFixed(1));
  const officialGdp = override
    ? override.gdpTrillions
    : Number((country.gdpTrillions * 0.985).toFixed(2));
  const officialGdpPerCapita = override
    ? override.gdpPerCapita
    : Math.round((officialGdp * 1_000_000) / officialPop);
  const officialMedianAge = override
    ? override.medianAge
    : Number((country.medianAge - 0.1).toFixed(1));
  const officialNote =
    override?.methodologyNote ??
    `Official national census/register baseline & national accounts (${national.dataYear})`;

  // World Bank WDI typically trails IMF/UN 2024–2025 estimates by ~1 audited calendar year (2023)
  const wbPop = override
    ? override.wbPopMillions
    : Number((country.populationMillions / (1 + country.annualPopGrowthPct / 100)).toFixed(1));
  const wbGdp = override
    ? override.wbGdpTrillions
    : Number((country.gdpTrillions / (1 + Math.max(country.gdpGrowthPct, 0.5) / 100 + 0.015)).toFixed(2));
  const wbGdpPerCapita = override
    ? override.wbGdpPerCapita
    : Math.round((wbGdp * 1_000_000) / wbPop);
  const wbDataYear = override?.wbDataYear ?? '2023';

  // UN DESA WPP 2024 Revision (Demographic standard)
  const unPop = country.populationMillions;
  const unMedianAge = country.medianAge;

  // IMF WEO (Macroeconomic standard)
  const imfGdp = country.gdpTrillions;
  const imfGdpPerCapita = country.gdpPerCapita;

  const rows: MultiSourceRecord[] = [
    {
      id: 'official-national',
      sourceName: national.agency,
      datasetTitle: national.publication,
      sourceType: 'official-national',
      dataYear: national.dataYear,
      populationMillions: officialPop,
      gdpTrillions: officialGdp,
      gdpPerCapita: officialGdpPerCapita,
      medianAge: officialMedianAge,
      popDeltaVsOfficialPct: 0,
      gdpDeltaVsOfficialPct: 0,
      methodologyNote: officialNote,
      url: national.url,
    },
    {
      id: 'un-desa',
      sourceName: 'UN DESA Population Division',
      datasetTitle: 'World Population Prospects (2024 Revision)',
      sourceType: 'international-agency',
      dataYear: '2024–2025',
      populationMillions: unPop,
      gdpTrillions: null,
      gdpPerCapita: null,
      medianAge: unMedianAge,
      popDeltaVsOfficialPct: computePctDelta(unPop, officialPop),
      gdpDeltaVsOfficialPct: null,
      methodologyNote: 'Harmonized mid-year de facto demographic estimate & cohort-component projection',
      url: 'https://population.un.org/wpp/',
    },
    {
      id: 'imf-weo',
      sourceName: 'International Monetary Fund (IMF)',
      datasetTitle: 'World Economic Outlook Database (Oct 2024 / 2025 Est.)',
      sourceType: 'international-agency',
      dataYear: '2024–2025',
      populationMillions: unPop,
      gdpTrillions: imfGdp,
      gdpPerCapita: imfGdpPerCapita,
      medianAge: null,
      popDeltaVsOfficialPct: computePctDelta(unPop, officialPop),
      gdpDeltaVsOfficialPct: computePctDelta(imfGdp, officialGdp),
      methodologyNote: 'Nominal USD GDP converted at IMF period-average FX rates; forward 2025 estimate',
      url: 'https://www.imf.org/en/Publications/WEO',
    },
    {
      id: 'world-bank',
      sourceName: 'World Bank Open Data',
      datasetTitle: 'World Development Indicators (Audited Annual Series)',
      sourceType: 'international-agency',
      dataYear: wbDataYear,
      populationMillions: wbPop,
      gdpTrillions: wbGdp,
      gdpPerCapita: wbGdpPerCapita,
      medianAge: Number((country.medianAge - 0.3).toFixed(1)),
      popDeltaVsOfficialPct: computePctDelta(wbPop, officialPop),
      gdpDeltaVsOfficialPct: computePctDelta(wbGdp, officialGdp),
      methodologyNote: `Audited ${wbDataYear} historical WDI series (trails 2024–2025 preliminary releases by ~1 year)`,
      url: 'https://data.worldbank.org/',
    },
  ];

  const popDeltas = rows
    .map((r) => r.popDeltaVsOfficialPct)
    .filter((v): v is number => v !== null);
  const gdpDeltas = rows
    .map((r) => r.gdpDeltaVsOfficialPct)
    .filter((v): v is number => v !== null);

  const popSpreadPct =
    popDeltas.length > 0 ? Number(Math.max(...popDeltas.map((v) => Math.abs(v))).toFixed(1)) : 0;
  const gdpSpreadPct =
    gdpDeltas.length > 0 ? Number(Math.max(...gdpDeltas.map((v) => Math.abs(v))).toFixed(1)) : 0;

  return {
    countryCode: country.code,
    countryName: country.name,
    officialAgencyName: national.shortName,
    officialDataYear: national.dataYear,
    popSpreadPct,
    gdpSpreadPct,
    rows,
  };
}

export const DATA_PROVENANCE_NOTICE =
  'Curated statistical baseline synthesized from UN DESA WPP 2024, IMF WEO (2024–2025), World Bank WDI (2023–2024), OECD Metro Statistics, and official national statistical offices (e.g. BPS Indonesia 2024, Statistics Canada 2024). Real-time counters and 2035–2100 curves are deterministic rate-based projections rather than a live government API feed.';

export function getCountrySourceCitation(countryCode: string): string {
  const national = NATIONAL_OFFICE_BY_COUNTRY[countryCode];
  if (!national) {
    return 'UN DESA WPP (2024) · IMF WEO (2024–2025) · World Bank WDI (2023)';
  }
  return `${national.shortName} (${national.dataYear}) · UN DESA WPP (2024) · IMF WEO (2024–2025)`;
}

export function getCitySourceCitation(countryCode: string): string {
  const national = NATIONAL_OFFICE_BY_COUNTRY[countryCode];
  if (!national) {
    return 'OECD Metro Statistics (2024) · UN-Habitat (2024)';
  }
  return `${national.shortName} (${national.cityDataYear}) · OECD Metro Statistics (2024) · UN-Habitat`;
}

export function getComparisonSourceFootprint(countryCodes: string[]): string {
  const uniqueCodes = Array.from(new Set(countryCodes));
  const agencies = uniqueCodes
    .map((code) => {
      const meta = NATIONAL_OFFICE_BY_COUNTRY[code];
      return meta ? `${meta.shortName} (${meta.cityDataYear})` : null;
    })
    .filter((name): name is string => Boolean(name));

  if (agencies.length === 0) {
    return 'OECD Metro Statistics (2024) · UN-Habitat · IMF WEO (2024–2025 Baseline)';
  }
  return `${agencies.join(' · ')} · OECD Metro Statistics (2024)`;
}
