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

export interface CountryDevelopmentIndicators {
  // Health (WHO / World Bank)
  healthExpenditurePctGdp: number; // % of GDP
  physiciansPer1000: number;       // physicians per 1,000 people
  // Education & Innovation (UNESCO / WIPO)
  literacyRatePct: number;         // adult literacy %
  tertiaryEnrollmentPct: number;   // gross tertiary enrollment %
  rdExpenditurePctGdp: number;     // R&D expenditure % of GDP
  // Energy & Environment (IEA / Global Carbon Project / WHO)
  co2PerCapitaTons: number;        // metric tons CO2 / capita / yr
  renewableEnergyPct: number;      // % of electricity generation from renewables
  pm25AirQuality: number;          // mean annual PM2.5 µg/m³
  // Inequality, Digital & Human Development (UNDP / World Bank / ITU)
  giniIndex: number;               // 0–100 (higher = more unequal)
  internetPenetrationPct: number;  // % of population online
  hdiScore: number;                // 0.000–1.000 UN Human Development Index
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

export interface BaseCountryRecord {
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

export interface CountryRecord extends BaseCountryRecord {
  indicators: CountryDevelopmentIndicators;
}

export type MapMetricKey =
  | 'populationMillions'
  | 'gdpPerCapita'
  | 'medianAge'
  | 'projectedChange2050'
  | 'hdiScore'
  | 'co2PerCapitaTons'
  | 'renewableEnergyPct'
  | 'giniIndex';

export type CorrelationXAxis =
  | 'medianAge'
  | 'workingAgePct'
  | 'urbanizationPct'
  | 'lifeExpectancy'
  | 'hdiScore'
  | 'co2PerCapitaTons'
  | 'renewableEnergyPct'
  | 'healthExpenditurePctGdp'
  | 'rdExpenditurePctGdp'
  | 'tertiaryEnrollmentPct'
  | 'giniIndex';

export type CorrelationYAxis =
  | 'gdpPerCapita'
  | 'gdpTrillions'
  | 'gdpGrowthPct'
  | 'hdiScore'
  | 'co2PerCapitaTons'
  | 'lifeExpectancy';

export type ProjectionScenario = 'low' | 'medium' | 'high';

export type AppView = 'overview' | 'country' | 'cities' | 'compare' | 'trade';

export type LedgerLens = 'macro' | 'healthEducation' | 'energyInequality';

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

export type TradeYear = 2023 | 2024 | 2025 | 2026;

export const AVAILABLE_TRADE_YEARS: TradeYear[] = [2026, 2025, 2024, 2023];
export const DEFAULT_TRADE_YEAR: TradeYear = 2026;

export type TradeReferenceSource = 'global' | 'national';

export type TradeReleaseStatus = 'final' | 'audited' | 'provisional' | 'annualized-q3';

export interface TradeAnnualObservation {
  year: TradeYear;
  goodsExportsBillions: number;
  goodsImportsBillions: number;
  servicesExportsBillions: number;
  servicesImportsBillions: number;
  releaseStatus: TradeReleaseStatus;
  vintageLabel: string;
}

export type TradeFlowDirection = 'export' | 'import';

export type TradeSankeyMode = 'both' | 'exports' | 'imports';

export interface TradeCommodityShare {
  category: string;
  hsCode: string;
  sharePct: number;
}

export interface TradeDetailedItemSpec {
  hsCode: string;
  hsChapter: string;
  hsSection: string;
  itemName: string;
  flow: TradeFlowDirection;
  sharePct: number;
  yoyChangePct: number;
  primaryPartnerCode: string;
  primaryPartnerName: string;
  unitNote: string;
}

export interface TradePartnerRecord {
  partnerCode: string;
  partnerName: string;
  exportSharePct: number;
  importSharePct: number;
}

export interface TradeSourceMeta {
  agency: string;
  shortName: string;
  dataset: string;
  valuationBasis: string;
  methodologyNote: string;
  url: string;
}

export interface CountryTradeProfile {
  countryCode: string;
  globalSource: TradeSourceMeta;
  nationalSource: TradeSourceMeta;
  globalSeries: Partial<Record<TradeYear, TradeAnnualObservation>>;
  nationalSeries: Partial<Record<TradeYear, TradeAnnualObservation>>;
  topExportCommodities: TradeCommodityShare[];
  topImportCommodities: TradeCommodityShare[];
  detailedExportItems: TradeDetailedItemSpec[];
  detailedImportItems: TradeDetailedItemSpec[];
  topPartners: TradePartnerRecord[];
}

export type TradeSortKey =
  | 'name'
  | 'region'
  | 'goodsExports'
  | 'goodsImports'
  | 'merchandiseBalance'
  | 'servicesExports'
  | 'servicesBalance'
  | 'totalTrade'
  | 'combinedBalance'
  | 'tradeToGdpPct'
  | 'exportYoYPct'
  | 'effectiveYear';

export type CountrySortKey =
  | 'name'
  | 'region'
  | 'populationMillions'
  | 'medianAge'
  | 'workingAgeShare'
  | 'gdpTrillions'
  | 'gdpPerCapita'
  | 'projectedGdp10Yr'
  | 'projectedChange2050'
  | 'hdiScore'
  | 'lifeExpectancy'
  | 'healthExpenditurePctGdp'
  | 'physiciansPer1000'
  | 'tertiaryEnrollmentPct'
  | 'rdExpenditurePctGdp'
  | 'co2PerCapitaTons'
  | 'renewableEnergyPct'
  | 'pm25AirQuality'
  | 'giniIndex'
  | 'internetPenetrationPct';

export interface SavedWorkspace {
  id: string;
  name: string;
  view: AppView;
  dataYear: DataYear;
  countryCode: string;
  cityId: string | null;
  compareCityIds: string[];
  tradeReference?: TradeReferenceSource;
  tradeYear?: TradeYear;
  createdAt: string;
}

export interface AiSuggestedAction {
  label: string;
  view: AppView;
  countryCode?: string;
  cityIds?: string[];
}

export interface AiAnalysisResponse {
  model: string;
  dataYear: DataYear;
  headline: string;
  summary: string;
  bulletPoints: string[];
  caveat: string;
  suggestedActions: AiSuggestedAction[];
}
