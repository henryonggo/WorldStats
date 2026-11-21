export type Region =
  | 'North America'
  | 'Europe'
  | 'East Asia & Pacific'
  | 'South & Southeast Asia'
  | 'Latin America'
  | 'Middle East & Africa';

export interface AgeBracket {
  group: '0-14' | '15-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  malePct: number;   // % of total population
  femalePct: number; // % of total population
}

export interface CityAgeBreakdown {
  age0to14: number;
  age15to24: number;
  age25to44: number;
  age45to64: number;
  age65plus: number;
}

export interface PopulationProjection {
  year: number;
  low: number;    // millions
  medium: number; // millions
  high: number;   // millions
}

export interface GdpDemographicSeriesPoint {
  year: number;
  gdpTrillions: number;
  gdpPerCapita: number;
  workingAgePct: number;
  medianAge: number;
  populationMillions: number;
}

export interface CityRecord {
  id: string;
  name: string;
  countryCode: string; // ISO alpha-3 e.g. USA
  countryName: string;
  region: Region;
  lat: number;
  lng: number;
  population: number;          // absolute count (metro/urban core)
  metroPopulation: number;     // greater metropolitan area
  densityPerKm2: number;
  medianAge: number;
  gdpBillions: number;         // USD billions
  gdpPerCapita: number;        // USD
  annualPopGrowthPct: number;  // %
  projected2035: number;       // absolute count
  projected2050: number;       // absolute count
  unemploymentPct: number;
  primarySector: string;
  ageBreakdown: CityAgeBreakdown;
}

export interface CountryRecord {
  isoNumeric: string; // 3-digit string matching world-atlas/countries-110m.json
  code: string;       // ISO alpha-3
  name: string;
  region: Region;
  populationMillions: number;
  annualPopGrowthPct: number;
  gdpTrillions: number;
  gdpPerCapita: number;
  gdpGrowthPct: number;
  medianAge: number;
  fertilityRate: number;
  lifeExpectancy: number;
  urbanizationPct: number;
  ageBrackets: AgeBracket[];
  projections: PopulationProjection[];
  gdpHistory: GdpDemographicSeriesPoint[];
}

export type MapMetricKey =
  | 'populationMillions'
  | 'gdpPerCapita'
  | 'medianAge'
  | 'projectedChange2050';

export type CorrelationXAxis =
  | 'medianAge'
  | 'workingAgePct'
  | 'urbanizationPct'
  | 'lifeExpectancy';

export type CorrelationYAxis =
  | 'gdpPerCapita'
  | 'gdpTrillions'
  | 'gdpGrowthPct';

export type ProjectionScenario = 'low' | 'medium' | 'high';

export type AppView = 'overview' | 'country' | 'cities' | 'compare';

export interface LiveWorldCounters {
  worldPopulation: number;
  birthsToday: number;
  deathsToday: number;
  netGrowthToday: number;
  globalGdpTodayBillions: number;
  timestampIso: string;
}

export interface RegressionResult {
  r: number;
  rSquared: number;
  slope: number;
  intercept: number;
  interpretation: string;
}

export type DataYear = 2024 | 2025 | 2026;

export const AVAILABLE_DATA_YEARS: DataYear[] = [2026, 2025, 2024];
export const DEFAULT_DATA_YEAR: DataYear = 2026;

export type CountrySortKey =
  | 'name'
  | 'region'
  | 'populationMillions'
  | 'medianAge'
  | 'workingAgeShare'
  | 'gdpTrillions'
  | 'gdpPerCapita'
  | 'projectedGdp10Yr'
  | 'projectedChange2050';

