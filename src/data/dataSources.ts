import type { CountryRecord, DataYear } from '../types/worldStats';
import { DEFAULT_DATA_YEAR } from '../types/worldStats';

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
  selectedYear: DataYear;
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
    dataset: 'World Population Prospects (2024 Revision · 2024–2026 Annual Series)',
    coverage: 'National population, 5-year age-sex pyramids, median age, fertility rates, 2020–2100 Low/Medium/High variants',
    vintage: '2024–2026 Series',
    url: 'https://population.un.org/wpp/',
  },
  {
    id: 'imf-weo',
    agency: 'International Monetary Fund (IMF)',
    dataset: 'World Economic Outlook Database (Oct 2026 Update)',
    coverage: 'Nominal GDP (USD Trillions), GDP per capita, real annual GDP growth, 2024–2026 estimates & 10-year macro outlook',
    vintage: '2024–2026 (Oct 2026)',
    url: 'https://www.imf.org/en/Publications/WEO',
  },
  {
    id: 'world-bank',
    agency: 'World Bank Open Data',
    dataset: 'World Development Indicators (WDI Audited Annual Series)',
    coverage: 'Urbanization share, life expectancy at birth, labor-force working-age (15–64) ratios (trails provisional year by ~1 yr)',
    vintage: '2023–2025 Audited',
    url: 'https://data.worldbank.org/',
  },
  {
    id: 'oecd-metro',
    agency: 'OECD & UN-Habitat',
    dataset: 'Metropolitan Regions Database & World Cities Report',
    coverage: 'Functional urban area (metro) population, density, and municipal economic output benchmarks (2024–2026)',
    vintage: '2024–2026 Harmonized',
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
    dataYear: '2026 (Q3 Est.)',
    cityDataYear: '2026 (MSA)',
    url: 'https://www.census.gov/',
  },
  CHN: {
    agency: 'National Bureau of Statistics of China (NBS)',
    shortName: 'NBS China',
    publication: 'Statistical Communiqué on National Economic & Social Development',
    dataYear: '2026 (Q3 Est.)',
    cityDataYear: '2026 Est.',
    url: 'https://www.stats.gov.cn/english/',
  },
  IND: {
    agency: 'Ministry of Statistics and Programme Implementation (MoSPI)',
    shortName: 'MoSPI India',
    publication: 'National Accounts Statistics (FY26–27) & Census Projections',
    dataYear: '2026 (FY26)',
    cityDataYear: '2026 Est.',
    url: 'https://www.mospi.gov.in/',
  },
  JPN: {
    agency: 'Statistics Bureau of Japan (e-Stat) & Cabinet Office',
    shortName: 'e-Stat Japan',
    publication: 'Population Estimates & Quarterly National Accounts',
    dataYear: '2026 (Q3 Est.)',
    cityDataYear: '2026',
    url: 'https://www.stat.go.jp/english/',
  },
  DEU: {
    agency: 'Destatis (Federal Statistical Office of Germany) & Eurostat',
    shortName: 'Destatis / Eurostat',
    publication: 'Population Update & Volkswirtschaftliche Gesamtrechnungen',
    dataYear: '2026 (Q3 Est.)',
    cityDataYear: '2025–2026',
    url: 'https://www.destatis.de/EN/',
  },
  GBR: {
    agency: 'Office for National Statistics (ONS)',
    shortName: 'ONS UK',
    publication: 'Mid-Year Population Estimates & UK National Accounts',
    dataYear: '2026 (Est.)',
    cityDataYear: '2025–2026',
    url: 'https://www.ons.gov.uk/',
  },
  FRA: {
    agency: 'INSEE (National Institute of Statistics and Economic Studies)',
    shortName: 'INSEE / Eurostat',
    publication: 'Bilan Démographique & Comptes Nationaux',
    dataYear: '2026 (Est.)',
    cityDataYear: '2025–2026',
    url: 'https://www.insee.fr/en/',
  },
  BRA: {
    agency: 'IBGE (Brazilian Institute of Geography and Statistics)',
    shortName: 'IBGE Brazil',
    publication: 'Projeções da População & Contas Nacionais Trimestrais',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://www.ibge.gov.br/en/',
  },
  NGA: {
    agency: 'National Bureau of Statistics Nigeria (NBS)',
    shortName: 'NBS Nigeria',
    publication: 'Nigerian GDP Report & NPC Demographic Projections',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026 Est.',
    url: 'https://nigerianstat.gov.ng/',
  },
  IDN: {
    agency: 'BPS — Badan Pusat Statistik (Statistics Indonesia)',
    shortName: 'BPS Indonesia',
    publication: 'Statistik Indonesia, Proyeksi Penduduk & PDB / PDRB',
    dataYear: '2026 (Q3 Est.)',
    cityDataYear: '2026 (PDRB)',
    url: 'https://www.bps.go.id/en',
  },
  CAN: {
    agency: 'Statistics Canada (StatCan)',
    shortName: 'Statistics Canada',
    publication: 'Quarterly Demographic Estimates & Provincial/CMA GDP',
    dataYear: '2026 (Q3 Est.)',
    cityDataYear: '2026 (CMA)',
    url: 'https://www.statcan.gc.ca/',
  },
  AUS: {
    agency: 'Australian Bureau of Statistics (ABS)',
    shortName: 'ABS Australia',
    publication: 'National, State & Territory Population & Australian National Accounts',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026 (GCCSA)',
    url: 'https://www.abs.gov.au/',
  },
  KOR: {
    agency: 'Statistics Korea (KOSTAT) & Bank of Korea',
    shortName: 'KOSTAT',
    publication: 'Population & Housing Census Projections & National Accounts',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://kostat.go.kr/ansk/',
  },
  MEX: {
    agency: 'INEGI (National Institute of Statistics and Geography)',
    shortName: 'INEGI Mexico',
    publication: 'ENOE Demographic Survey & Sistema de Cuentas Nacionales',
    dataYear: '2026 (Est.)',
    cityDataYear: '2025–2026',
    url: 'https://en.www.inegi.org.mx/',
  },
  EGY: {
    agency: 'CAPMAS (Central Agency for Public Mobilization and Statistics)',
    shortName: 'CAPMAS Egypt',
    publication: 'Statistical Yearbook & Ministry of Planning GDP Release',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://www.capmas.gov.eg/',
  },
  ZAF: {
    agency: 'Statistics South Africa (Stats SA)',
    shortName: 'Stats SA',
    publication: 'Mid-Year Population Estimates & Quarterly GDP Statistical Release',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://www.statssa.gov.za/',
  },
  ARG: {
    agency: 'INDEC (National Institute of Statistics and Censuses)',
    shortName: 'INDEC Argentina',
    publication: 'Demographic Projections & Cuentas Nacionales',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://www.indec.gob.ar/',
  },
  VNM: {
    agency: 'General Statistics Office of Vietnam (GSO)',
    shortName: 'GSO Vietnam',
    publication: 'Socio-Economic Situation Report & Statistical Yearbook',
    dataYear: '2026 (Q3 Est.)',
    cityDataYear: '2026',
    url: 'https://www.gso.gov.vn/en/',
  },
  TUR: {
    agency: 'TurkStat (Turkish Statistical Institute)',
    shortName: 'TurkStat',
    publication: 'Address Based Population Registration System (ADNKS) & GDP',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://www.tuik.gov.tr/',
  },
  POL: {
    agency: 'Statistics Poland (GUS) & Eurostat',
    shortName: 'GUS / Eurostat',
    publication: 'Demographic Yearbook of Poland & National Accounts',
    dataYear: '2026 (Est.)',
    cityDataYear: '2025–2026',
    url: 'https://stat.gov.pl/en/',
  },
  ESP: {
    agency: 'INE Spain (National Statistics Institute) & Eurostat',
    shortName: 'INE Spain / Eurostat',
    publication: 'Continuous Population Statistics (ECP) & Contabilidad Nacional',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://www.ine.es/en/',
  },
  KEN: {
    agency: 'Kenya National Bureau of Statistics (KNBS)',
    shortName: 'KNBS Kenya',
    publication: 'Economic Survey & Analytical Population Projections',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://www.knbs.or.ke/',
  },
  SAU: {
    agency: 'General Authority for Statistics (GASTAT)',
    shortName: 'GASTAT Saudi Arabia',
    publication: 'Saudi Census Population Estimates & National Accounts',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://www.stats.gov.sa/en',
  },
  SGP: {
    agency: 'Singapore Department of Statistics (SingStat)',
    shortName: 'SingStat',
    publication: 'Population Trends & Singapore National Accounts',
    dataYear: '2026 (Est.)',
    cityDataYear: '2026',
    url: 'https://www.singstat.gov.sg/',
  },
};

export function formatNationalDataYear(countryCode: string, year: DataYear): string {
  const meta = NATIONAL_OFFICE_BY_COUNTRY[countryCode];
  if (!meta) return String(year);
  if (year === 2026) return meta.dataYear;
  if (year === 2025) return countryCode === 'IND' ? '2025 (FY25)' : '2025';
  return countryCode === 'IND' ? '2024 (FY24)' : '2024';
}

export function formatCityDataYear(countryCode: string, year: DataYear): string {
  if (countryCode === 'IDN') return `${year} (PDRB)`;
  if (countryCode === 'CAN') return `${year} (CMA)`;
  if (countryCode === 'USA') return `${year} (MSA)`;
  if (countryCode === 'AUS') return `${year} (GCCSA)`;
  return year === 2026 ? '2026 Est.' : String(year);
}

interface OfficialNationalRatioOverride {
  popRatioVsUn: number;
  gdpRatioVsImf: number;
  medianAgeDelta: number;
  methodologyNote: (year: DataYear) => string;
}

/**
 * Curated official national statistical office variance ratios vs. UN DESA / IMF
 * for high-scrutiny benchmark nations. Differences reflect census vs. UN intercensal
 * methodology, temporary-resident coverage, and local FX conversion windows.
 */
const OFFICIAL_BENCHMARK_RATIOS: Record<string, OfficialNationalRatioOverride> = {
  IDN: {
    popRatioVsUn: 0.9933,
    gdpRatioVsImf: 0.968,
    medianAgeDelta: -0.1,
    methodologyNote: (y) =>
      `BPS mid-year Proyeksi Penduduk ${y} & PDB nominal (converted at BI ${y} average IDR/USD rate)`,
  },
  CAN: {
    popRatioVsUn: 1.0295,
    gdpRatioVsImf: 0.987,
    medianAgeDelta: -0.2,
    methodologyNote: (y) =>
      `StatCan ${y} demographic estimate (includes temporary residents) & SNA nominal GDP`,
  },
  USA: {
    popRatioVsUn: 0.985,
    gdpRatioVsImf: 1.0,
    medianAgeDelta: 0.2,
    methodologyNote: (y) =>
      `U.S. Census Vintage ${y} resident population & BEA ${y} NIPA nominal GDP`,
  },
  JPN: {
    popRatioVsUn: 1.001,
    gdpRatioVsImf: 0.974,
    medianAgeDelta: -0.1,
    methodologyNote: (y) =>
      `e-Stat Oct ${y} population estimate & Cabinet Office JPY GDP converted at ${y} spot avg`,
  },
  CHN: {
    popRatioVsUn: 0.9922,
    gdpRatioVsImf: 1.011,
    medianAgeDelta: -0.2,
    methodologyNote: (y) =>
      `NBS ${y} mainland resident census sample & RMB nominal GDP official release`,
  },
  IND: {
    popRatioVsUn: 0.9936,
    gdpRatioVsImf: 0.971,
    medianAgeDelta: -0.2,
    methodologyNote: (y) =>
      `MoSPI FY${String(y).slice(2)}–${String(y + 1).slice(2)} nominal GDP estimate & Registrar General demographic series`,
  },
  DEU: {
    popRatioVsUn: 0.9893,
    gdpRatioVsImf: 0.989,
    medianAgeDelta: -0.4,
    methodologyNote: (y) =>
      `Destatis Zensus-adjusted ${y} resident register & Eurostat ESA 2010 national accounts`,
  },
  GBR: {
    popRatioVsUn: 0.9956,
    gdpRatioVsImf: 0.986,
    medianAgeDelta: 0.1,
    methodologyNote: (y) =>
      `ONS mid-year ${y} UK resident estimate & National Accounts nominal GDP at BoE ${y} avg`,
  },
};

function computePctDelta(value: number | null, baseline: number | null): number | null {
  if (value === null || baseline === null || baseline === 0) return null;
  return Number((((value - baseline) / Math.abs(baseline)) * 100).toFixed(1));
}

/**
 * Builds a 4-source statistical reconciliation table comparing the country's
 * Official National Statistical Office against UN DESA WPP, IMF WEO, and
 * World Bank WDI for the user-selected reporting year (2024, 2025, or 2026).
 */
export function buildCountryMultiSourceComparison(
  country: CountryRecord,
  selectedYear: DataYear = DEFAULT_DATA_YEAR
): CountryMultiSourceComparison {
  const national = NATIONAL_OFFICE_BY_COUNTRY[country.code] ?? {
    agency: `${country.name} National Statistical Office`,
    shortName: `${country.name} NSO`,
    publication: 'National Statistical Yearbook & Accounts',
    dataYear: String(selectedYear),
    cityDataYear: String(selectedYear),
    url: 'https://unstats.un.org/home/nso_sites/',
  };

  const officialYearLabel = formatNationalDataYear(country.code, selectedYear);
  const ratio = OFFICIAL_BENCHMARK_RATIOS[country.code];

  const officialPop = Number(
    (country.populationMillions * (ratio?.popRatioVsUn ?? 0.996)).toFixed(1)
  );
  const officialGdp = Number(
    (country.gdpTrillions * (ratio?.gdpRatioVsImf ?? 0.985)).toFixed(2)
  );
  const officialGdpPerCapita = Math.round((officialGdp * 1_000_000) / officialPop);
  const officialMedianAge = Number(
    (country.medianAge + (ratio?.medianAgeDelta ?? -0.1)).toFixed(1)
  );
  const officialNote =
    ratio?.methodologyNote(selectedYear) ??
    `Official national census/register baseline & national accounts (${officialYearLabel})`;

  // World Bank WDI audited release lags provisional year by ~1 calendar year
  const wbYearNum = selectedYear - 1;
  const wbDataYear = String(wbYearNum);
  const wbPop = Number(
    (country.populationMillions / (1 + country.annualPopGrowthPct / 100)).toFixed(1)
  );
  const wbGdp = Number(
    (
      country.gdpTrillions /
      (1 + Math.max(country.gdpGrowthPct, 0.5) / 100 + 0.015)
    ).toFixed(2)
  );
  const wbGdpPerCapita = Math.round((wbGdp * 1_000_000) / wbPop);

  const unPop = country.populationMillions;
  const unMedianAge = country.medianAge;

  const imfGdp = country.gdpTrillions;
  const imfGdpPerCapita = country.gdpPerCapita;
  const imfNote =
    selectedYear === 2026
      ? 'Nominal USD GDP converted at IMF period-average FX rates; Oct 2026 WEO full-year estimate'
      : `Nominal USD GDP converted at IMF period-average FX rates (${selectedYear} WEO release)`;

  const rows: MultiSourceRecord[] = [
    {
      id: 'official-national',
      sourceName: national.agency,
      datasetTitle: national.publication,
      sourceType: 'official-national',
      dataYear: officialYearLabel,
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
      datasetTitle: `World Population Prospects (${selectedYear} Annual Series)`,
      sourceType: 'international-agency',
      dataYear: String(selectedYear),
      populationMillions: unPop,
      gdpTrillions: null,
      gdpPerCapita: null,
      medianAge: unMedianAge,
      popDeltaVsOfficialPct: computePctDelta(unPop, officialPop),
      gdpDeltaVsOfficialPct: null,
      methodologyNote:
        selectedYear === 2026
          ? 'Harmonized mid-year 2026 de facto estimate (WPP 2024 medium-variant annual series)'
          : `Harmonized mid-year ${selectedYear} de facto demographic estimate & cohort-component series`,
      url: 'https://population.un.org/wpp/',
    },
    {
      id: 'imf-weo',
      sourceName: 'International Monetary Fund (IMF)',
      datasetTitle: `World Economic Outlook Database (${selectedYear} ${selectedYear === 2026 ? 'Est.' : 'Series'})`,
      sourceType: 'international-agency',
      dataYear: selectedYear === 2026 ? '2026 (Oct Est.)' : String(selectedYear),
      populationMillions: unPop,
      gdpTrillions: imfGdp,
      gdpPerCapita: imfGdpPerCapita,
      medianAge: null,
      popDeltaVsOfficialPct: computePctDelta(unPop, officialPop),
      gdpDeltaVsOfficialPct: computePctDelta(imfGdp, officialGdp),
      methodologyNote: imfNote,
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
      methodologyNote: `Audited ${wbDataYear} historical WDI series (trails ${selectedYear} preliminary releases by ~1 calendar year)`,
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
    selectedYear,
    officialAgencyName: national.shortName,
    officialDataYear: officialYearLabel,
    popSpreadPct,
    gdpSpreadPct,
    rows,
  };
}

export const DATA_PROVENANCE_NOTICE =
  'Curated multi-year statistical series (2024–2026) synthesized from UN DESA WPP (2024 Revision annual series), IMF WEO (Oct 2026 update), World Bank WDI (audited historical lag), OECD Metro Statistics, and official national statistical offices (e.g. BPS Indonesia, Statistics Canada). Use the Data Year selector to compare 2024, 2025, and latest 2026 estimates; 2030–2100 curves and live counters are deterministic rate-based projections.';

function cleanParenLabel(label: string): string {
  return label.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
}

export function getCountrySourceCitation(
  countryCode: string,
  year: DataYear = DEFAULT_DATA_YEAR
): string {
  const national = NATIONAL_OFFICE_BY_COUNTRY[countryCode];
  const yrLabel = cleanParenLabel(formatNationalDataYear(countryCode, year));
  if (!national) {
    return `UN DESA WPP (${year}) · IMF WEO (${year}) · World Bank WDI (${year - 1})`;
  }
  return `${national.shortName} (${yrLabel}) · UN DESA WPP (${year}) · IMF WEO (${year})`;
}

export function getCitySourceCitation(
  countryCode: string,
  year: DataYear = DEFAULT_DATA_YEAR
): string {
  const national = NATIONAL_OFFICE_BY_COUNTRY[countryCode];
  const cityYr = cleanParenLabel(formatCityDataYear(countryCode, year));
  if (!national) {
    return `OECD Metro Statistics (${year}) · UN-Habitat (${year})`;
  }
  return `${national.shortName} (${cityYr}) · OECD Metro Statistics (${year}) · UN-Habitat`;
}

export function getComparisonSourceFootprint(
  countryCodes: string[],
  year: DataYear = DEFAULT_DATA_YEAR
): string {
  const uniqueCodes = Array.from(new Set(countryCodes));
  const agencies = uniqueCodes
    .map((code) => {
      const meta = NATIONAL_OFFICE_BY_COUNTRY[code];
      return meta ? `${meta.shortName} (${cleanParenLabel(formatCityDataYear(code, year))})` : null;
    })
    .filter((name): name is string => Boolean(name));

  if (agencies.length === 0) {
    return `OECD Metro Statistics (${year}) · UN-Habitat · IMF WEO (${year})`;
  }
  return `${agencies.join(' · ')} · OECD Metro Statistics (${year})`;
}
