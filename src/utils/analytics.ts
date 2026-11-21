import type {
  AgeBracket,
  CityRecord,
  CountryRecord,
  CountrySortKey,
  DataYear,
  LiveWorldCounters,
  Region,
  RegressionResult,
} from '../types/worldStats';
import { DEFAULT_DATA_YEAR } from '../types/worldStats';
import {
  formatCityDataYear,
  getCitySourceCitation,
  getCountrySourceCitation,
  NATIONAL_OFFICE_BY_COUNTRY,
} from '../data/dataSources';

// Reference epoch: Jan 1, 2026 00:00:00 UTC
const EPOCH_2026_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
const BASE_WORLD_POP_2026 = 8_231_613_070;
// Annual UN estimates: ~132M births/yr (~4.186/sec), ~62M deaths/yr (~1.966/sec), net ~2.22/sec
const BIRTHS_PER_SEC = 4.186;
const DEATHS_PER_SEC = 1.966;
const NET_POP_PER_SEC = BIRTHS_PER_SEC - DEATHS_PER_SEC;
// Global annual GDP ~$115.4 Trillion -> ~$3.659M per second (~$0.003659B/sec)
const GLOBAL_GDP_BILLIONS_PER_SEC = 115_400 / (365.25 * 86400);

export function computeLiveWorldCounters(nowMs: number): LiveWorldCounters {
  const safeMs = Number.isFinite(nowMs) ? nowMs : EPOCH_2026_MS;
  const elapsedSinceEpochSec = Math.max(0, (safeMs - EPOCH_2026_MS) / 1000);

  const nowDate = new Date(safeMs);
  const startOfUtcDayMs = Date.UTC(
    nowDate.getUTCFullYear(),
    nowDate.getUTCMonth(),
    nowDate.getUTCDate()
  );
  const secondsToday = Math.max(0, (safeMs - startOfUtcDayMs) / 1000);

  const birthsToday = Math.floor(secondsToday * BIRTHS_PER_SEC);
  const deathsToday = Math.floor(secondsToday * DEATHS_PER_SEC);
  const netGrowthToday = birthsToday - deathsToday;
  const worldPopulation = Math.floor(
    BASE_WORLD_POP_2026 + elapsedSinceEpochSec * NET_POP_PER_SEC
  );
  const globalGdpTodayBillions = Number(
    (secondsToday * GLOBAL_GDP_BILLIONS_PER_SEC).toFixed(3)
  );

  return {
    worldPopulation,
    birthsToday,
    deathsToday,
    netGrowthToday,
    globalGdpTodayBillions,
    timestampIso: nowDate.toISOString(),
  };
}

export function computeWorkingAgeShare(ageBrackets: AgeBracket[]): number {
  const workingGroups = new Set(['15-24', '25-34', '35-44', '45-54', '55-64']);
  const sum = ageBrackets.reduce((acc, b) => {
    if (workingGroups.has(b.group)) {
      return acc + b.malePct + b.femalePct;
    }
    return acc;
  }, 0);
  return Number(sum.toFixed(1));
}

export function computeDependencyRatio(ageBrackets: AgeBracket[]): number {
  const working = computeWorkingAgeShare(ageBrackets);
  if (working <= 0) return 0;
  const dependent = ageBrackets.reduce((acc, b) => {
    if (b.group === '0-14' || b.group === '65+') {
      return acc + b.malePct + b.femalePct;
    }
    return acc;
  }, 0);
  return Number(((dependent / working) * 100).toFixed(1));
}

/**
 * Projects a country's baseline 2025 record to the selected reporting year (2024, 2025, or 2026)
 * using each nation's annual demographic & macroeconomic trajectory.
 */
export function projectCountryForYear(
  country: CountryRecord,
  year: DataYear = DEFAULT_DATA_YEAR
): CountryRecord {
  const deltaYears = year - 2025;
  if (deltaYears === 0) return country;

  const popFactor = Math.pow(1 + country.annualPopGrowthPct / 100, deltaYears);
  // Nominal USD GDP growth blends real growth + modest ~1.4% USD deflator trend
  const nominalGdpRate = (country.gdpGrowthPct + 1.4) / 100;
  const gdpFactor = Math.pow(1 + nominalGdpRate, deltaYears);

  const populationMillions = Number((country.populationMillions * popFactor).toFixed(1));
  const gdpTrillions = Number((country.gdpTrillions * gdpFactor).toFixed(2));
  const gdpPerCapita = Math.round((gdpTrillions * 1_000_000) / Math.max(0.1, populationMillions));

  // Estimate annual aging increment from country's 2025->2030 gdpHistory slope
  const h2025 = country.gdpHistory.find((p) => p.year === 2025);
  const h2030 = country.gdpHistory.find((p) => p.year === 2030);
  const annualAgingStep =
    h2025 && h2030 ? (h2030.medianAge - h2025.medianAge) / 5 : 0.22;

  const medianAge = Number(
    Math.max(16, Math.min(58, country.medianAge + deltaYears * annualAgingStep)).toFixed(1)
  );
  const urbanizationPct = Number(
    Math.max(15, Math.min(100, country.urbanizationPct + deltaYears * 0.25)).toFixed(1)
  );
  const lifeExpectancy = Number(
    Math.max(50, Math.min(90, country.lifeExpectancy + deltaYears * 0.12)).toFixed(1)
  );

  // Subtle shift in youth (0-14) vs senior (65+) brackets for the chosen year
  const bracketShift = deltaYears * (annualAgingStep * 0.45);
  const ageBrackets: AgeBracket[] = country.ageBrackets.map((b) => {
    if (b.group === '0-14') {
      const m = Math.max(2, Number((b.malePct - bracketShift * 0.51).toFixed(2)));
      const f = Math.max(2, Number((b.femalePct - bracketShift * 0.49).toFixed(2)));
      return { ...b, malePct: m, femalePct: f };
    }
    if (b.group === '65+') {
      const m = Math.max(1, Number((b.malePct + bracketShift * 0.45).toFixed(2)));
      const f = Math.max(1, Number((b.femalePct + bracketShift * 0.55).toFixed(2)));
      return { ...b, malePct: m, femalePct: f };
    }
    return b;
  });

  return {
    ...country,
    populationMillions,
    gdpTrillions,
    gdpPerCapita,
    medianAge,
    urbanizationPct,
    lifeExpectancy,
    ageBrackets,
  };
}

export function projectCountriesForYear(
  countries: CountryRecord[],
  year: DataYear = DEFAULT_DATA_YEAR
): CountryRecord[] {
  return countries.map((c) => projectCountryForYear(c, year));
}

/**
 * Projects a city's 2025 baseline metrics to the selected reporting year (2024, 2025, or 2026).
 */
export function projectCityForYear(
  city: CityRecord,
  year: DataYear = DEFAULT_DATA_YEAR
): CityRecord {
  const deltaYears = year - 2025;
  if (deltaYears === 0) return city;

  const popFactor = Math.pow(1 + city.annualPopGrowthPct / 100, deltaYears);
  // Metropolitan GDP generally outpaces national growth slightly; approximate from growth profile
  const cityNominalGdpRate = Math.max(0.015, city.annualPopGrowthPct / 100 + 0.032);
  const gdpFactor = Math.pow(1 + cityNominalGdpRate, deltaYears);

  const population = Math.round(city.population * popFactor);
  const metroPopulation = Math.round(city.metroPopulation * popFactor);
  const densityPerKm2 = Math.round(city.densityPerKm2 * popFactor);
  const gdpBillions = Math.max(1, Math.round(city.gdpBillions * gdpFactor));
  const gdpPerCapita = Math.round((city.gdpPerCapita * gdpFactor) / popFactor);
  const medianAge = Number(
    Math.max(18, Math.min(56, city.medianAge + deltaYears * 0.22)).toFixed(1)
  );

  return {
    ...city,
    population,
    metroPopulation,
    densityPerKm2,
    gdpBillions,
    gdpPerCapita,
    medianAge,
  };
}

export function projectCitiesForYear(
  cities: CityRecord[],
  year: DataYear = DEFAULT_DATA_YEAR
): CityRecord[] {
  return cities.map((c) => projectCityForYear(c, year));
}

export function computeProjectedChange2050Pct(country: CountryRecord): number {
  const basePop = country.populationMillions;
  const p2050 = country.projections.find((p) => p.year === 2050)?.medium ?? basePop;
  if (basePop <= 0) return 0;
  return Number((((p2050 - basePop) / basePop) * 100).toFixed(1));
}

export function computeProjectedGdpGrowth10YrPct(
  country: CountryRecord,
  startYear: DataYear = 2025
): number {
  const gdp2025 = country.gdpHistory.find((p) => p.year === 2025)?.gdpTrillions ?? country.gdpTrillions;
  const gdp2035 = country.gdpHistory.find((p) => p.year === 2035)?.gdpTrillions;
  const gdp2040 = country.gdpHistory.find((p) => p.year === 2040)?.gdpTrillions;
  if (gdp2025 <= 0) return 0;

  if (startYear === 2025 && gdp2035 !== undefined) {
    return Number((((gdp2035 - gdp2025) / gdp2025) * 100).toFixed(1));
  }

  // Use trajectory start and end (+10 yrs) so chart and table align exactly
  const series = computeProjectedGdpTrajectory10Yr(country, startYear);
  if (series.length >= 2) {
    return series[series.length - 1].cumulativeGrowthPct;
  }

  if (gdp2040 !== undefined && gdp2035 !== undefined) {
    return Number((((gdp2035 - gdp2025) / gdp2025) * 100).toFixed(1));
  }
  return Number(((Math.pow(1 + country.gdpGrowthPct / 100, 10) - 1) * 100).toFixed(1));
}

export interface GdpTrajectoryPoint10Yr {
  year: number;
  gdpTrillions: number;
  cumulativeGrowthPct: number;
  annualGrowthPct: number;
}

/**
 * Generates an annual 10-year projected GDP trajectory (startYear .. startYear + 10)
 * anchored to the country's 2025, 2030, 2035, and 2040 nominal GDP checkpoints.
 */
export function computeProjectedGdpTrajectory10Yr(
  country: CountryRecord,
  startYear: DataYear = 2025
): GdpTrajectoryPoint10Yr[] {
  const gdp2025 =
    country.gdpHistory.find((p) => p.year === 2025)?.gdpTrillions ??
    country.gdpTrillions;
  if (gdp2025 <= 0) return [];

  const fallbackRate = country.gdpGrowthPct / 100;
  const gdp2030 =
    country.gdpHistory.find((p) => p.year === 2030)?.gdpTrillions ??
    gdp2025 * Math.pow(1 + fallbackRate, 5);
  const gdp2035 =
    country.gdpHistory.find((p) => p.year === 2035)?.gdpTrillions ??
    gdp2025 * Math.pow(1 + fallbackRate, 10);
  const gdp2040 =
    country.gdpHistory.find((p) => p.year === 2040)?.gdpTrillions ??
    gdp2035 * Math.pow(gdp2035 / gdp2030, 1);

  const cagrFirst5 = Math.pow(gdp2030 / gdp2025, 1 / 5) - 1;
  const cagrSecond5 = Math.pow(gdp2035 / gdp2030, 1 / 5) - 1;
  const cagrThird5 = Math.pow(gdp2040 / gdp2035, 1 / 5) - 1;

  const evalGdpAt = (yr: number): { gdp: number; rate: number } => {
    if (yr < 2025) {
      return { gdp: gdp2025 * Math.pow(1 + cagrFirst5, yr - 2025), rate: cagrFirst5 };
    }
    if (yr === 2025) {
      return { gdp: gdp2025, rate: country.gdpGrowthPct / 100 };
    }
    if (yr <= 2030) {
      return { gdp: gdp2025 * Math.pow(1 + cagrFirst5, yr - 2025), rate: cagrFirst5 };
    }
    if (yr <= 2035) {
      return { gdp: gdp2030 * Math.pow(1 + cagrSecond5, yr - 2030), rate: cagrSecond5 };
    }
    return { gdp: gdp2035 * Math.pow(1 + cagrThird5, yr - 2035), rate: cagrThird5 };
  };

  const baseGdp = evalGdpAt(startYear).gdp;
  const points: GdpTrajectoryPoint10Yr[] = [];
  for (let year = startYear; year <= startYear + 10; year += 1) {
    const { gdp: rawGdp, rate: annualRate } = evalGdpAt(year);
    const cumulativeGrowthPct = Number((((rawGdp - baseGdp) / baseGdp) * 100).toFixed(1));
    points.push({
      year,
      gdpTrillions: Number(rawGdp.toFixed(2)),
      cumulativeGrowthPct,
      annualGrowthPct: Number((annualRate * 100).toFixed(2)),
    });
  }

  return points;
}

export function sortCountries(
  countries: CountryRecord[],
  sortBy: CountrySortKey,
  sortDir: 'asc' | 'desc',
  dataYear: DataYear = DEFAULT_DATA_YEAR
): CountryRecord[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...countries].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
    if (sortBy === 'region') {
      const regCmp = a.region.localeCompare(b.region);
      return (regCmp !== 0 ? regCmp : a.name.localeCompare(b.name)) * dir;
    }
    if (sortBy === 'workingAgeShare') {
      return (computeWorkingAgeShare(a.ageBrackets) - computeWorkingAgeShare(b.ageBrackets)) * dir;
    }
    if (sortBy === 'projectedGdp10Yr') {
      return (
        (computeProjectedGdpGrowth10YrPct(a, dataYear) -
          computeProjectedGdpGrowth10YrPct(b, dataYear)) *
        dir
      );
    }
    if (sortBy === 'projectedChange2050') {
      return (computeProjectedChange2050Pct(a) - computeProjectedChange2050Pct(b)) * dir;
    }
    return (a[sortBy] - b[sortBy]) * dir;
  });
}

export function computePearsonCorrelation(
  points: Array<{ x: number; y: number }>
): RegressionResult {
  const n = points.length;
  if (n < 2) {
    return {
      r: 0,
      rSquared: 0,
      slope: 0,
      intercept: 0,
      interpretation: 'Insufficient data points',
    };
  }

  let sumX = 0;
  let sumY = 0;
  for (const pt of points) {
    sumX += pt.x;
    sumY += pt.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  for (const pt of points) {
    const dx = pt.x - meanX;
    const dy = pt.y - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) {
    return {
      r: 0,
      rSquared: 0,
      slope: 0,
      intercept: meanY,
      interpretation: 'No variance along axis',
    };
  }

  const r = numerator / Math.sqrt(denomX * denomY);
  const rSquared = r * r;
  const slope = numerator / denomX;
  const intercept = meanY - slope * meanX;

  const absR = Math.abs(r);
  const direction = r >= 0 ? 'positive' : 'negative';
  let strength = 'weak';
  if (absR >= 0.7) strength = 'strong';
  else if (absR >= 0.4) strength = 'moderate';

  return {
    r: Number(r.toFixed(3)),
    rSquared: Number(rSquared.toFixed(3)),
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(2)),
    interpretation: `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation`,
  };
}

export interface CityFilterOptions {
  search: string;
  region: Region | 'All';
  countryCode: string | 'All';
  sortBy: 'population' | 'gdpBillions' | 'gdpPerCapita' | 'medianAge' | 'annualPopGrowthPct' | 'densityPerKm2' | 'name';
  sortDir: 'asc' | 'desc';
}

export function filterAndSortCities(
  cities: CityRecord[],
  options: CityFilterOptions
): CityRecord[] {
  const q = options.search.trim().toLowerCase();

  const filtered = cities.filter((city) => {
    if (options.region !== 'All' && city.region !== options.region) return false;
    if (options.countryCode !== 'All' && city.countryCode !== options.countryCode) return false;
    if (q) {
      const hay = `${city.name} ${city.countryName} ${city.primarySector} ${city.region}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    const dir = options.sortDir === 'asc' ? 1 : -1;
    if (options.sortBy === 'name') {
      return a.name.localeCompare(b.name) * dir;
    }
    return (a[options.sortBy] - b[options.sortBy]) * dir;
  });
}

export interface ComparisonMetricRow {
  key: string;
  label: string;
  unit: string;
  higherIsBetter?: boolean;
  values: Array<{
    cityId: string;
    raw: number;
    formatted: string;
    deltaFromFirstPct: number | null;
    isHighest: boolean;
    isLowest: boolean;
  }>;
}

export function computeCityComparisonMatrix(
  selectedCities: CityRecord[],
  countryByCode: Map<string, CountryRecord>
): ComparisonMetricRow[] {
  if (selectedCities.length === 0) return [];

  const specs: Array<{
    key: string;
    label: string;
    unit: string;
    higherIsBetter?: boolean;
    extract: (c: CityRecord) => number;
    format: (v: number) => string;
  }> = [
    {
      key: 'population',
      label: 'City Population',
      unit: 'residents',
      extract: (c) => c.population,
      format: (v) => formatCompactNumber(v),
    },
    {
      key: 'metroPopulation',
      label: 'Metro Population',
      unit: 'residents',
      extract: (c) => c.metroPopulation,
      format: (v) => formatCompactNumber(v),
    },
    {
      key: 'gdpBillions',
      label: 'City GDP Output',
      unit: 'USD',
      higherIsBetter: true,
      extract: (c) => c.gdpBillions,
      format: (v) => `$${v.toLocaleString('en-US')}B`,
    },
    {
      key: 'gdpPerCapita',
      label: 'GDP per Capita',
      unit: 'USD',
      higherIsBetter: true,
      extract: (c) => c.gdpPerCapita,
      format: (v) => `$${v.toLocaleString('en-US')}`,
    },
    {
      key: 'nationalGdpShare',
      label: 'Share of National GDP',
      unit: '%',
      extract: (c) => {
        const country = countryByCode.get(c.countryCode);
        if (!country || country.gdpTrillions <= 0) return 0;
        return Number(((c.gdpBillions / (country.gdpTrillions * 1000)) * 100).toFixed(1));
      },
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'medianAge',
      label: 'Median Age',
      unit: 'years',
      extract: (c) => c.medianAge,
      format: (v) => `${v.toFixed(1)} yrs`,
    },
    {
      key: 'seniorShare',
      label: 'Senior Share (65+)',
      unit: '%',
      extract: (c) => c.ageBreakdown.age65plus,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'youthShare',
      label: 'Youth Share (0–14)',
      unit: '%',
      extract: (c) => c.ageBreakdown.age0to14,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'densityPerKm2',
      label: 'Population Density',
      unit: '/km²',
      extract: (c) => c.densityPerKm2,
      format: (v) => `${v.toLocaleString('en-US')}/km²`,
    },
    {
      key: 'annualPopGrowthPct',
      label: 'Annual Pop Growth',
      unit: '%',
      extract: (c) => c.annualPopGrowthPct,
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
    },
    {
      key: 'projected2050',
      label: '2050 Projected Pop',
      unit: 'residents',
      extract: (c) => c.projected2050,
      format: (v) => formatCompactNumber(v),
    },
    {
      key: 'unemploymentPct',
      label: 'Unemployment Rate',
      unit: '%',
      higherIsBetter: false,
      extract: (c) => c.unemploymentPct,
      format: (v) => `${v.toFixed(1)}%`,
    },
  ];

  return specs.map((spec) => {
    const raws = selectedCities.map(spec.extract);
    const maxVal = Math.max(...raws);
    const minVal = Math.min(...raws);
    const baseline = raws[0];

    return {
      key: spec.key,
      label: spec.label,
      unit: spec.unit,
      higherIsBetter: spec.higherIsBetter,
      values: selectedCities.map((city, idx) => {
        const raw = raws[idx];
        let deltaFromFirstPct: number | null = null;
        if (idx > 0 && baseline !== 0) {
          deltaFromFirstPct = Number((((raw - baseline) / Math.abs(baseline)) * 100).toFixed(1));
        }
        return {
          cityId: city.id,
          raw,
          formatted: spec.format(raw),
          deltaFromFirstPct,
          isHighest: selectedCities.length > 1 && raw === maxVal && maxVal !== minVal,
          isLowest: selectedCities.length > 1 && raw === minVal && maxVal !== minVal,
        };
      }),
    };
  });
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString('en-US');
}

export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function formatSignedPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return lines.join('\n');
}

export function buildCountriesCsv(
  countries: CountryRecord[],
  dataYear: DataYear = DEFAULT_DATA_YEAR
): string {
  const headers = [
    'Data Year',
    'Code',
    'Country',
    'Region',
    'Population (M)',
    'Annual Pop Growth (%)',
    'GDP (USD Trillions)',
    'GDP per Capita (USD)',
    'GDP Growth (%)',
    '10-Yr Projected GDP Growth (%)',
    'Median Age (Years)',
    'Working Age 15-64 (%)',
    'Dependency Ratio',
    'Fertility Rate',
    'Life Expectancy (Years)',
    'Urbanization (%)',
    '2050 Projected Pop (M)',
    'Data Source',
  ];

  const rows = countries.map((c) => {
    const p2050 = c.projections.find((p) => p.year === 2050)?.medium ?? c.populationMillions;
    return [
      dataYear,
      c.code,
      c.name,
      c.region,
      c.populationMillions,
      c.annualPopGrowthPct,
      c.gdpTrillions,
      c.gdpPerCapita,
      c.gdpGrowthPct,
      computeProjectedGdpGrowth10YrPct(c, dataYear),
      c.medianAge,
      computeWorkingAgeShare(c.ageBrackets),
      computeDependencyRatio(c.ageBrackets),
      c.fertilityRate,
      c.lifeExpectancy,
      c.urbanizationPct,
      p2050,
      getCountrySourceCitation(c.code, dataYear),
    ];
  });

  return rowsToCsv(headers, rows);
}

export function buildCitiesCsv(
  cities: CityRecord[],
  dataYear: DataYear = DEFAULT_DATA_YEAR
): string {
  const headers = [
    'Data Year',
    'City',
    'Country',
    'Region',
    'Population',
    'Metro Population',
    'Density (/km2)',
    'City GDP ($B)',
    'GDP per Capita ($)',
    'Median Age',
    'Age 0-14 (%)',
    'Age 15-24 (%)',
    'Age 25-44 (%)',
    'Age 45-64 (%)',
    'Age 65+ (%)',
    'Annual Growth (%)',
    '2035 Projected',
    '2050 Projected',
    'Primary Sector',
    'Data Source',
  ];

  const rows = cities.map((c) => [
    dataYear,
    c.name,
    c.countryName,
    c.region,
    c.population,
    c.metroPopulation,
    c.densityPerKm2,
    c.gdpBillions,
    c.gdpPerCapita,
    c.medianAge,
    c.ageBreakdown.age0to14,
    c.ageBreakdown.age15to24,
    c.ageBreakdown.age25to44,
    c.ageBreakdown.age45to64,
    c.ageBreakdown.age65plus,
    c.annualPopGrowthPct,
    c.projected2035,
    c.projected2050,
    c.primarySector,
    getCitySourceCitation(c.countryCode, dataYear),
  ]);

  return rowsToCsv(headers, rows);
}

export function buildComparisonCsv(
  selectedCities: CityRecord[],
  countryByCode: Map<string, CountryRecord>,
  dataYear: DataYear = DEFAULT_DATA_YEAR
): string {
  const matrix = computeCityComparisonMatrix(selectedCities, countryByCode);
  const headers = ['Metric', 'Unit', ...selectedCities.map((c) => `${c.name} (${c.countryCode})`)];
  const rows = [
    ...matrix.map((row) => [
      row.label,
      row.unit,
      ...row.values.map((v) => v.formatted),
    ]),
    [
      'Official National Agency',
      'agency',
      ...selectedCities.map(
        (c) => NATIONAL_OFFICE_BY_COUNTRY[c.countryCode]?.shortName ?? `${c.countryName} NSO`
      ),
    ],
    [
      'Official Data Year',
      'year',
      ...selectedCities.map((c) => formatCityDataYear(c.countryCode, dataYear)),
    ],
    [
      'Data Source Footprint',
      'sources',
      ...selectedCities.map((c) => getCitySourceCitation(c.countryCode, dataYear)),
    ],
  ];
  return rowsToCsv(headers, rows);
}

export interface GlobalSearchResults {
  countries: CountryRecord[];
  cities: CityRecord[];
  totalMatches: number;
}

/**
 * Ranks matching countries and cities by relevance (exact/prefix name match >
 * substring match > ISO code / country / sector match, tie-broken by scale).
 */
export function searchGlobalEntities(
  rawQuery: string,
  countries: CountryRecord[],
  cities: CityRecord[],
  limits: { maxCountries?: number; maxCities?: number } = {}
): GlobalSearchResults {
  const query = rawQuery.trim().toLowerCase();
  const maxCountries = limits.maxCountries ?? 5;
  const maxCities = limits.maxCities ?? 8;

  if (!query) {
    return { countries: [], cities: [], totalMatches: 0 };
  }

  const scoredCountries: Array<{ item: CountryRecord; score: number }> = [];
  for (const country of countries) {
    const name = country.name.toLowerCase();
    const code = country.code.toLowerCase();
    const region = country.region.toLowerCase();

    let score = 0;
    if (name === query || code === query) {
      score = 100;
    } else if (name.startsWith(query)) {
      score = 80;
    } else if (code.startsWith(query)) {
      score = 70;
    } else if (name.includes(query)) {
      score = 55;
    } else if (region.includes(query)) {
      score = 30;
    }

    if (score > 0) {
      scoredCountries.push({ item: country, score });
    }
  }

  scoredCountries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.item.gdpTrillions - a.item.gdpTrillions;
  });

  const scoredCities: Array<{ item: CityRecord; score: number }> = [];
  for (const city of cities) {
    const name = city.name.toLowerCase();
    const countryName = city.countryName.toLowerCase();
    const countryCode = city.countryCode.toLowerCase();
    const sector = city.primarySector.toLowerCase();

    let score = 0;
    if (name === query) {
      score = 100;
    } else if (name.startsWith(query)) {
      score = 85;
    } else if (name.includes(query)) {
      score = 65;
    } else if (countryName === query || countryCode === query) {
      score = 50;
    } else if (countryName.startsWith(query)) {
      score = 45;
    } else if (countryName.includes(query)) {
      score = 35;
    } else if (sector.includes(query)) {
      score = 25;
    }

    if (score > 0) {
      scoredCities.push({ item: city, score });
    }
  }

  scoredCities.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.item.population - a.item.population;
  });

  return {
    countries: scoredCountries.slice(0, maxCountries).map((s) => s.item),
    cities: scoredCities.slice(0, maxCities).map((s) => s.item),
    totalMatches: scoredCountries.length + scoredCities.length,
  };
}

