import {
  AVAILABLE_TRADE_YEARS,
  DEFAULT_TRADE_YEAR,
  type CountryRecord,
  type CountryTradeProfile,
  type Region,
  type TradeAnnualObservation,
  type TradeDetailedItemSpec,
  type TradeFlowDirection,
  type TradeReferenceSource,
  type TradeSankeyMode,
  type TradeSortKey,
  type TradeSourceMeta,
  type TradeYear,
} from '../types/worldStats';
import { rowsToCsv } from './analytics';

export interface ResolvedTradeCommodity {
  category: string;
  hsCode: string;
  sharePct: number;
  valueBillions: number;
}

export interface ResolvedTradeDetailedItem extends TradeDetailedItemSpec {
  valueBillions: number;
}

export interface TradeSankeyNodeDatum {
  id: string;
  label: string;
  partnerCode: string;
  side: 'import' | 'hub' | 'export';
  valueBillions: number;
  sharePct: number;
  bilateralBalanceBillions: number;
  counterFlowBillions: number;
  totalBilateralBillions: number;
}

export interface TradeSankeyLinkDatum {
  id: string;
  source: string;
  target: string;
  value: number;
  flow: TradeFlowDirection;
  partnerCode: string;
  partnerName: string;
  sharePct: number;
  bilateralBalanceBillions: number;
  counterFlowBillions: number;
  totalBilateralBillions: number;
}

export interface TradeSankeyGraph {
  mode: TradeSankeyMode;
  countryCode: string;
  countryName: string;
  effectiveYear: TradeYear;
  nodes: TradeSankeyNodeDatum[];
  links: TradeSankeyLinkDatum[];
  top10ImportsBillions: number;
  top10ExportsBillions: number;
  top10ImportSharePct: number;
  top10ExportSharePct: number;
}

export interface ResolvedTradePartner {
  partnerCode: string;
  partnerName: string;
  exportSharePct: number;
  importSharePct: number;
  exportsBillions: number;
  importsBillions: number;
  totalBilateralBillions: number;
  bilateralBalanceBillions: number;
}

export interface ResolvedCountryTradeRow {
  countryCode: string;
  countryName: string;
  region: Region;
  reference: TradeReferenceSource;
  sourceMeta: TradeSourceMeta;
  requestedYear: TradeYear;
  effectiveYear: TradeYear;
  latestAvailableYear: TradeYear;
  otherReference: TradeReferenceSource;
  otherReferenceLatestYear: TradeYear;
  usedFallback: boolean;
  fallbackReason: string | null;
  observation: TradeAnnualObservation;
  goodsExports: number;
  goodsImports: number;
  merchandiseBalance: number;
  servicesExports: number;
  servicesImports: number;
  servicesBalance: number;
  totalExports: number;
  totalImports: number;
  totalTrade: number;
  combinedBalance: number;
  gdpTrillions: number;
  tradeToGdpPct: number;
  exportYoYPct: number | null;
  importYoYPct: number | null;
  topExportsUsd: ResolvedTradeCommodity[];
  topImportsUsd: ResolvedTradeCommodity[];
  detailedExportItems: ResolvedTradeDetailedItem[];
  detailedImportItems: ResolvedTradeDetailedItem[];
  partnerFlows: ResolvedTradePartner[];
}

export interface TradeMultiYearPoint {
  year: TradeYear;
  goodsExports: number;
  goodsImports: number;
  servicesExports: number;
  servicesImports: number;
  totalExports: number;
  totalImports: number;
  merchandiseBalance: number;
  combinedBalance: number;
  vintageLabel: string;
}

export interface TradeReconciliationRow {
  id: 'global' | 'national' | 'bop-benchmark';
  referenceType: 'global' | 'national' | 'benchmark';
  agency: string;
  shortName: string;
  dataset: string;
  valuationBasis: string;
  methodologyNote: string;
  url: string;
  requestedYear: TradeYear;
  effectiveYear: TradeYear;
  vintageLabel: string;
  usedFallback: boolean;
  goodsExports: number;
  goodsImports: number;
  merchandiseBalance: number;
  servicesExports: number;
  servicesImports: number;
  combinedBalance: number;
  exportDeltaVsGlobalPct: number | null;
  importDeltaVsGlobalPct: number | null;
}

export interface TradeSourceReconciliation {
  countryCode: string;
  countryName: string;
  requestedYear: TradeYear;
  exportVariancePct: number;
  importVariancePct: number;
  rows: TradeReconciliationRow[];
}

export interface GlobalTradeSummaryStats {
  totalGoodsExportsTrillions: number;
  totalGoodsImportsTrillions: number;
  totalServicesExportsTrillions: number;
  surplusCount: number;
  deficitCount: number;
  exactYearCount: number;
  fallbackCount: number;
}

const DESCENDING_YEARS: TradeYear[] = [...AVAILABLE_TRADE_YEARS].sort((a, b) => b - a);
const ASCENDING_YEARS: TradeYear[] = [...AVAILABLE_TRADE_YEARS].sort((a, b) => a - b);

function round1(n: number): number {
  return Number(n.toFixed(1));
}

function computePctDelta(value: number, baseline: number): number | null {
  if (baseline === 0) return null;
  return round1(((value - baseline) / Math.abs(baseline)) * 100);
}

export function getLatestAvailableTradeYear(
  series: Partial<Record<TradeYear, TradeAnnualObservation>>
): TradeYear {
  for (const yr of DESCENDING_YEARS) {
    if (series[yr]) return yr;
  }
  return 2024;
}

/**
 * Resolves the observation for a country, requested year, and data reference (global vs national).
 * Rule: Always use requestedYear when available; if unavailable, automatically fall back to
 * the most recent earlier year available in that reference series.
 */
export function resolveTradeObservation(
  profile: CountryTradeProfile,
  requestedYear: TradeYear = DEFAULT_TRADE_YEAR,
  reference: TradeReferenceSource = 'global'
): {
  observation: TradeAnnualObservation;
  effectiveYear: TradeYear;
  latestAvailableYear: TradeYear;
  usedFallback: boolean;
  fallbackReason: string | null;
  sourceMeta: TradeSourceMeta;
  previousObservation: TradeAnnualObservation | null;
} {
  const series = reference === 'global' ? profile.globalSeries : profile.nationalSeries;
  const sourceMeta = reference === 'global' ? profile.globalSource : profile.nationalSource;
  const latestAvailableYear = getLatestAvailableTradeYear(series);

  let chosen = series[requestedYear];
  let usedFallback = false;

  if (!chosen) {
    for (const yr of DESCENDING_YEARS) {
      if (yr < requestedYear && series[yr]) {
        chosen = series[yr];
        usedFallback = true;
        break;
      }
    }
  }

  // Edge fallback if requestedYear precedes all recorded years
  if (!chosen) {
    for (const yr of ASCENDING_YEARS) {
      if (series[yr]) {
        chosen = series[yr];
        usedFallback = true;
        break;
      }
    }
  }

  if (!chosen) {
    throw new Error(`No trade observations found for ${profile.countryCode} (${reference})`);
  }

  const prevYear = (chosen.year - 1) as TradeYear;
  const previousObservation = series[prevYear] ?? null;

  const fallbackReason = usedFallback
    ? `Requested ${requestedYear} data is not yet available from ${sourceMeta.shortName}; automatically displaying latest available ${chosen.vintageLabel} release.`
    : null;

  return {
    observation: chosen,
    effectiveYear: chosen.year,
    latestAvailableYear,
    usedFallback,
    fallbackReason,
    sourceMeta,
    previousObservation,
  };
}

export function resolveCountryTradeRow(
  profile: CountryTradeProfile,
  country: CountryRecord | undefined,
  requestedYear: TradeYear = DEFAULT_TRADE_YEAR,
  reference: TradeReferenceSource = 'global'
): ResolvedCountryTradeRow {
  const resolved = resolveTradeObservation(profile, requestedYear, reference);
  const obs = resolved.observation;
  const otherReference: TradeReferenceSource = reference === 'global' ? 'national' : 'global';
  const otherSeries = otherReference === 'global' ? profile.globalSeries : profile.nationalSeries;
  const otherReferenceLatestYear = getLatestAvailableTradeYear(otherSeries);

  const goodsExports = obs.goodsExportsBillions;
  const goodsImports = obs.goodsImportsBillions;
  const merchandiseBalance = round1(goodsExports - goodsImports);
  const servicesExports = obs.servicesExportsBillions;
  const servicesImports = obs.servicesImportsBillions;
  const servicesBalance = round1(servicesExports - servicesImports);
  const totalExports = round1(goodsExports + servicesExports);
  const totalImports = round1(goodsImports + servicesImports);
  const totalTrade = round1(totalExports + totalImports);
  const combinedBalance = round1(merchandiseBalance + servicesBalance);

  const gdpTrillions = country?.gdpTrillions ?? 0.5;
  const gdpBillions = Math.max(1, gdpTrillions * 1000);
  const tradeToGdpPct = round1((totalTrade / gdpBillions) * 100);

  const exportYoYPct = resolved.previousObservation
    ? computePctDelta(goodsExports, resolved.previousObservation.goodsExportsBillions)
    : null;
  const importYoYPct = resolved.previousObservation
    ? computePctDelta(goodsImports, resolved.previousObservation.goodsImportsBillions)
    : null;

  const topExportsUsd: ResolvedTradeCommodity[] = profile.topExportCommodities.map((c) => ({
    ...c,
    valueBillions: round1((goodsExports * c.sharePct) / 100),
  }));

  const topImportsUsd: ResolvedTradeCommodity[] = profile.topImportCommodities.map((c) => ({
    ...c,
    valueBillions: round1((goodsImports * c.sharePct) / 100),
  }));

  const detailedExportItems: ResolvedTradeDetailedItem[] = profile.detailedExportItems.map((item) => ({
    ...item,
    valueBillions: round1((goodsExports * item.sharePct) / 100),
  }));

  const detailedImportItems: ResolvedTradeDetailedItem[] = profile.detailedImportItems.map((item) => ({
    ...item,
    valueBillions: round1((goodsImports * item.sharePct) / 100),
  }));

  const partnerFlows: ResolvedTradePartner[] = profile.topPartners
    .map((p) => {
      const exportsBillions = round1((goodsExports * p.exportSharePct) / 100);
      const importsBillions = round1((goodsImports * p.importSharePct) / 100);
      return {
        ...p,
        exportsBillions,
        importsBillions,
        totalBilateralBillions: round1(exportsBillions + importsBillions),
        bilateralBalanceBillions: round1(exportsBillions - importsBillions),
      };
    })
    .sort((a, b) => b.totalBilateralBillions - a.totalBilateralBillions);

  return {
    countryCode: profile.countryCode,
    countryName: country?.name ?? profile.countryCode,
    region: country?.region ?? 'Europe',
    reference,
    sourceMeta: resolved.sourceMeta,
    requestedYear,
    effectiveYear: resolved.effectiveYear,
    latestAvailableYear: resolved.latestAvailableYear,
    otherReference,
    otherReferenceLatestYear,
    usedFallback: resolved.usedFallback,
    fallbackReason: resolved.fallbackReason,
    observation: obs,
    goodsExports,
    goodsImports,
    merchandiseBalance,
    servicesExports,
    servicesImports,
    servicesBalance,
    totalExports,
    totalImports,
    totalTrade,
    combinedBalance,
    gdpTrillions,
    tradeToGdpPct,
    exportYoYPct,
    importYoYPct,
    topExportsUsd,
    topImportsUsd,
    detailedExportItems,
    detailedImportItems,
    partnerFlows,
  };
}

/**
 * Builds a strictly acyclic D3 Sankey graph representing bilateral merchandise import/export flows
 * between the selected country and its top 10 partners for the resolved trade year.
 */
export function buildTradeSankeyGraph(
  row: ResolvedCountryTradeRow,
  mode: TradeSankeyMode = 'both'
): TradeSankeyGraph {
  const top10 = row.partnerFlows.slice(0, 10);
  const top10ByImports = [...top10].sort((a, b) => b.importsBillions - a.importsBillions);
  const top10ByExports = [...top10].sort((a, b) => b.exportsBillions - a.exportsBillions);

  const top10ImportsBillions = round1(top10.reduce((s, p) => s + p.importsBillions, 0));
  const top10ExportsBillions = round1(top10.reduce((s, p) => s + p.exportsBillions, 0));
  const top10ImportSharePct = round1(top10.reduce((s, p) => s + p.importSharePct, 0));
  const top10ExportSharePct = round1(top10.reduce((s, p) => s + p.exportSharePct, 0));

  const hubId = `hub:${row.countryCode}`;
  const nodes: TradeSankeyNodeDatum[] = [];
  const links: TradeSankeyLinkDatum[] = [];

  if (mode === 'both' || mode === 'imports') {
    for (const partner of top10ByImports) {
      const nodeId = `imp:${partner.partnerCode}`;
      const val = Math.max(0.05, partner.importsBillions);
      nodes.push({
        id: nodeId,
        label: partner.partnerName,
        partnerCode: partner.partnerCode,
        side: 'import',
        valueBillions: partner.importsBillions,
        sharePct: partner.importSharePct,
        bilateralBalanceBillions: partner.bilateralBalanceBillions,
        counterFlowBillions: partner.exportsBillions,
        totalBilateralBillions: partner.totalBilateralBillions,
      });
      links.push({
        id: `link-imp-${partner.partnerCode}`,
        source: nodeId,
        target: hubId,
        value: val,
        flow: 'import',
        partnerCode: partner.partnerCode,
        partnerName: partner.partnerName,
        sharePct: partner.importSharePct,
        bilateralBalanceBillions: partner.bilateralBalanceBillions,
        counterFlowBillions: partner.exportsBillions,
        totalBilateralBillions: partner.totalBilateralBillions,
      });
    }
  }

  nodes.push({
    id: hubId,
    label: row.countryName,
    partnerCode: row.countryCode,
    side: 'hub',
    valueBillions:
      mode === 'exports'
        ? top10ExportsBillions
        : mode === 'imports'
          ? top10ImportsBillions
          : Math.max(top10ImportsBillions, top10ExportsBillions),
    sharePct: 100,
    bilateralBalanceBillions: row.merchandiseBalance,
    counterFlowBillions: round1(top10ImportsBillions + top10ExportsBillions),
    totalBilateralBillions: round1(top10ImportsBillions + top10ExportsBillions),
  });

  if (mode === 'both' || mode === 'exports') {
    for (const partner of top10ByExports) {
      const nodeId = `exp:${partner.partnerCode}`;
      const val = Math.max(0.05, partner.exportsBillions);
      nodes.push({
        id: nodeId,
        label: partner.partnerName,
        partnerCode: partner.partnerCode,
        side: 'export',
        valueBillions: partner.exportsBillions,
        sharePct: partner.exportSharePct,
        bilateralBalanceBillions: partner.bilateralBalanceBillions,
        counterFlowBillions: partner.importsBillions,
        totalBilateralBillions: partner.totalBilateralBillions,
      });
      links.push({
        id: `link-exp-${partner.partnerCode}`,
        source: hubId,
        target: nodeId,
        value: val,
        flow: 'export',
        partnerCode: partner.partnerCode,
        partnerName: partner.partnerName,
        sharePct: partner.exportSharePct,
        bilateralBalanceBillions: partner.bilateralBalanceBillions,
        counterFlowBillions: partner.importsBillions,
        totalBilateralBillions: partner.totalBilateralBillions,
      });
    }
  }

  return {
    mode,
    countryCode: row.countryCode,
    countryName: row.countryName,
    effectiveYear: row.effectiveYear,
    nodes,
    links,
    top10ImportsBillions,
    top10ExportsBillions,
    top10ImportSharePct,
    top10ExportSharePct,
  };
}

export function buildTradeMultiYearSeries(
  profile: CountryTradeProfile,
  reference: TradeReferenceSource
): TradeMultiYearPoint[] {
  const series = reference === 'global' ? profile.globalSeries : profile.nationalSeries;
  const points: TradeMultiYearPoint[] = [];

  for (const yr of ASCENDING_YEARS) {
    const obs = series[yr];
    if (!obs) continue;
    const totalExports = round1(obs.goodsExportsBillions + obs.servicesExportsBillions);
    const totalImports = round1(obs.goodsImportsBillions + obs.servicesImportsBillions);
    const merchandiseBalance = round1(obs.goodsExportsBillions - obs.goodsImportsBillions);
    const combinedBalance = round1(totalExports - totalImports);
    points.push({
      year: yr,
      goodsExports: obs.goodsExportsBillions,
      goodsImports: obs.goodsImportsBillions,
      servicesExports: obs.servicesExportsBillions,
      servicesImports: obs.servicesImportsBillions,
      totalExports,
      totalImports,
      merchandiseBalance,
      combinedBalance,
      vintageLabel: obs.vintageLabel,
    });
  }

  return points;
}

/**
 * Side-by-side reconciliation comparing Global Agency (WTO / UN Comtrade / IMF DOTS),
 * Official National Customs / NSO, and World Bank / UNCTAD Balance-of-Payments cross-check.
 */
export function buildTradeSourceReconciliation(
  profile: CountryTradeProfile,
  countryName: string,
  requestedYear: TradeYear = DEFAULT_TRADE_YEAR
): TradeSourceReconciliation {
  const globalRes = resolveTradeObservation(profile, requestedYear, 'global');
  const nationalRes = resolveTradeObservation(profile, requestedYear, 'national');

  const gObs = globalRes.observation;
  const nObs = nationalRes.observation;

  // World Bank / UNCTAD BoP audited benchmark always trails provisional year by ~1 yr (max 2025)
  const bopTargetYear = (requestedYear === 2026 ? 2025 : requestedYear) as TradeYear;
  const bopRes = resolveTradeObservation(profile, bopTargetYear, 'global');
  const bopObs = bopRes.observation;
  // BoP valuation removes ~2.2% CIF freight from imports to approximate FOB/FOB parity
  const bopGoodsExports = round1(bopObs.goodsExportsBillions * 0.996);
  const bopGoodsImports = round1(bopObs.goodsImportsBillions * 0.978);
  const bopServicesExports = round1(bopObs.servicesExportsBillions * 1.004);
  const bopServicesImports = round1(bopObs.servicesImportsBillions * 0.998);

  const gMerchBal = round1(gObs.goodsExportsBillions - gObs.goodsImportsBillions);
  const gCombBal = round1(
    gMerchBal + (gObs.servicesExportsBillions - gObs.servicesImportsBillions)
  );

  const nMerchBal = round1(nObs.goodsExportsBillions - nObs.goodsImportsBillions);
  const nCombBal = round1(
    nMerchBal + (nObs.servicesExportsBillions - nObs.servicesImportsBillions)
  );

  const bopMerchBal = round1(bopGoodsExports - bopGoodsImports);
  const bopCombBal = round1(bopMerchBal + (bopServicesExports - bopServicesImports));

  const natExpDelta = computePctDelta(nObs.goodsExportsBillions, gObs.goodsExportsBillions);
  const natImpDelta = computePctDelta(nObs.goodsImportsBillions, gObs.goodsImportsBillions);

  const rows: TradeReconciliationRow[] = [
    {
      id: 'global',
      referenceType: 'global',
      agency: profile.globalSource.agency,
      shortName: profile.globalSource.shortName,
      dataset: profile.globalSource.dataset,
      valuationBasis: profile.globalSource.valuationBasis,
      methodologyNote: profile.globalSource.methodologyNote,
      url: profile.globalSource.url,
      requestedYear,
      effectiveYear: globalRes.effectiveYear,
      vintageLabel: gObs.vintageLabel,
      usedFallback: globalRes.usedFallback,
      goodsExports: gObs.goodsExportsBillions,
      goodsImports: gObs.goodsImportsBillions,
      merchandiseBalance: gMerchBal,
      servicesExports: gObs.servicesExportsBillions,
      servicesImports: gObs.servicesImportsBillions,
      combinedBalance: gCombBal,
      exportDeltaVsGlobalPct: 0,
      importDeltaVsGlobalPct: 0,
    },
    {
      id: 'national',
      referenceType: 'national',
      agency: profile.nationalSource.agency,
      shortName: profile.nationalSource.shortName,
      dataset: profile.nationalSource.dataset,
      valuationBasis: profile.nationalSource.valuationBasis,
      methodologyNote: profile.nationalSource.methodologyNote,
      url: profile.nationalSource.url,
      requestedYear,
      effectiveYear: nationalRes.effectiveYear,
      vintageLabel: nObs.vintageLabel,
      usedFallback: nationalRes.usedFallback,
      goodsExports: nObs.goodsExportsBillions,
      goodsImports: nObs.goodsImportsBillions,
      merchandiseBalance: nMerchBal,
      servicesExports: nObs.servicesExportsBillions,
      servicesImports: nObs.servicesImportsBillions,
      combinedBalance: nCombBal,
      exportDeltaVsGlobalPct: natExpDelta,
      importDeltaVsGlobalPct: natImpDelta,
    },
    {
      id: 'bop-benchmark',
      referenceType: 'benchmark',
      agency: 'UNCTADstat & World Bank WDI (BPM6)',
      shortName: 'UNCTAD / World Bank BoP',
      dataset: 'Balance of Payments Trade in Goods & Services (BPM6 FOB/FOB)',
      valuationBasis: 'Exports FOB / Imports FOB (Freight shifted to Services)',
      methodologyNote: `Audited ${bopRes.effectiveYear} BoP reconciliation adjusts CIF customs imports to FOB valuation for cross-country current-account parity.`,
      url: 'https://unctadstat.unctad.org/',
      requestedYear,
      effectiveYear: bopRes.effectiveYear,
      vintageLabel: `${bopRes.effectiveYear} (Audited BoP)`,
      usedFallback: bopRes.effectiveYear < requestedYear,
      goodsExports: bopGoodsExports,
      goodsImports: bopGoodsImports,
      merchandiseBalance: bopMerchBal,
      servicesExports: bopServicesExports,
      servicesImports: bopServicesImports,
      combinedBalance: bopCombBal,
      exportDeltaVsGlobalPct: computePctDelta(bopGoodsExports, gObs.goodsExportsBillions),
      importDeltaVsGlobalPct: computePctDelta(bopGoodsImports, gObs.goodsImportsBillions),
    },
  ];

  return {
    countryCode: profile.countryCode,
    countryName,
    requestedYear,
    exportVariancePct: Math.abs(natExpDelta ?? 0),
    importVariancePct: Math.abs(natImpDelta ?? 0),
    rows,
  };
}

export function resolveGlobalTradeLedger(
  profiles: CountryTradeProfile[],
  countryByCode: Map<string, CountryRecord>,
  requestedYear: TradeYear = DEFAULT_TRADE_YEAR,
  reference: TradeReferenceSource = 'global'
): {
  rows: ResolvedCountryTradeRow[];
  summary: GlobalTradeSummaryStats;
} {
  const rows = profiles.map((p) =>
    resolveCountryTradeRow(p, countryByCode.get(p.countryCode), requestedYear, reference)
  );

  let totalGoodsExportsB = 0;
  let totalGoodsImportsB = 0;
  let totalServicesExportsB = 0;
  let surplusCount = 0;
  let deficitCount = 0;
  let exactYearCount = 0;
  let fallbackCount = 0;

  for (const row of rows) {
    totalGoodsExportsB += row.goodsExports;
    totalGoodsImportsB += row.goodsImports;
    totalServicesExportsB += row.servicesExports;
    if (row.combinedBalance >= 0) surplusCount += 1;
    else deficitCount += 1;
    if (row.usedFallback) fallbackCount += 1;
    else exactYearCount += 1;
  }

  return {
    rows,
    summary: {
      totalGoodsExportsTrillions: Number((totalGoodsExportsB / 1000).toFixed(2)),
      totalGoodsImportsTrillions: Number((totalGoodsImportsB / 1000).toFixed(2)),
      totalServicesExportsTrillions: Number((totalServicesExportsB / 1000).toFixed(2)),
      surplusCount,
      deficitCount,
      exactYearCount,
      fallbackCount,
    },
  };
}

export function sortTradeLedgerRows(
  rows: ResolvedCountryTradeRow[],
  sortBy: TradeSortKey,
  sortDir: 'asc' | 'desc'
): ResolvedCountryTradeRow[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortBy === 'name') return a.countryName.localeCompare(b.countryName) * dir;
    if (sortBy === 'region') {
      const reg = a.region.localeCompare(b.region);
      return (reg !== 0 ? reg : a.countryName.localeCompare(b.countryName)) * dir;
    }
    if (sortBy === 'exportYoYPct') {
      const av = a.exportYoYPct ?? -999;
      const bv = b.exportYoYPct ?? -999;
      return (av - bv) * dir;
    }
    return (a[sortBy] - b[sortBy]) * dir;
  });
}

export function formatTradeBillions(valueBillions: number): string {
  const abs = Math.abs(valueBillions);
  const sign = valueBillions < 0 ? '-' : '';
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(2)}T`;
  }
  return `${sign}$${abs.toFixed(1)}B`;
}

export function formatSignedTradeBillions(valueBillions: number): string {
  const abs = Math.abs(valueBillions);
  const sign = valueBillions > 0 ? '+' : valueBillions < 0 ? '-' : '';
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(2)}T`;
  }
  return `${sign}$${abs.toFixed(1)}B`;
}

export function buildTradeLedgerCsv(
  rows: ResolvedCountryTradeRow[],
  requestedYear: TradeYear,
  reference: TradeReferenceSource
): string {
  const headers = [
    'Requested Year',
    'Effective Data Year',
    'Used Fallback',
    'Reference Mode',
    'Code',
    'Country',
    'Region',
    'Goods Exports ($B)',
    'Goods Imports ($B)',
    'Merchandise Balance ($B)',
    'Services Exports ($B)',
    'Services Imports ($B)',
    'Services Balance ($B)',
    'Total Trade ($B)',
    'Combined Balance ($B)',
    'Trade Openness (% GDP)',
    'Goods Export YoY (%)',
    'Release Status',
    'Source Agency',
  ];

  const dataRows = rows.map((r) => [
    requestedYear,
    r.effectiveYear,
    r.usedFallback ? 'Yes (Prev Available)' : 'No',
    reference === 'global' ? 'Global Harmonized (WTO/UN Comtrade)' : 'Official National Customs/NSO',
    r.countryCode,
    r.countryName,
    r.region,
    r.goodsExports,
    r.goodsImports,
    r.merchandiseBalance,
    r.servicesExports,
    r.servicesImports,
    r.servicesBalance,
    r.totalTrade,
    r.combinedBalance,
    r.tradeToGdpPct,
    r.exportYoYPct ?? '',
    r.observation.vintageLabel,
    r.sourceMeta.agency,
  ]);

  return rowsToCsv(headers, dataRows);
}

export function buildCountryTradeDetailCsv(
  row: ResolvedCountryTradeRow,
  reconciliation: TradeSourceReconciliation
): string {
  const headers = [
    'Section',
    'Item / Source',
    'Code / Reference',
    'Effective Year',
    'Exports ($B)',
    'Imports ($B)',
    'Balance / Share',
    'Notes',
  ];

  const lines: Array<Array<string | number>> = [
    ...reconciliation.rows.map((src) => [
      'Source Reconciliation',
      src.agency,
      src.referenceType.toUpperCase(),
      src.vintageLabel,
      src.goodsExports,
      src.goodsImports,
      `${src.merchandiseBalance >= 0 ? '+' : ''}${src.merchandiseBalance}B (Combined ${src.combinedBalance >= 0 ? '+' : ''}${src.combinedBalance}B)`,
      src.valuationBasis,
    ]),
    ...row.topExportsUsd.map((c) => [
      'Top Export Commodity',
      c.category,
      c.hsCode,
      row.effectiveYear,
      c.valueBillions,
      '',
      `${c.sharePct}% of goods exports`,
      row.sourceMeta.shortName,
    ]),
    ...row.topImportsUsd.map((c) => [
      'Top Import Commodity',
      c.category,
      c.hsCode,
      row.effectiveYear,
      '',
      c.valueBillions,
      `${c.sharePct}% of goods imports`,
      row.sourceMeta.shortName,
    ]),
    ...row.detailedExportItems.map((item) => [
      'Detailed Export Item (HS)',
      item.itemName,
      item.hsCode,
      row.effectiveYear,
      item.valueBillions,
      '',
      `${item.sharePct}% share (${item.yoyChangePct >= 0 ? '+' : ''}${item.yoyChangePct}% YoY)`,
      `${item.hsSection} · Top Destination: ${item.primaryPartnerName} (${item.unitNote})`,
    ]),
    ...row.detailedImportItems.map((item) => [
      'Detailed Import Item (HS)',
      item.itemName,
      item.hsCode,
      row.effectiveYear,
      '',
      item.valueBillions,
      `${item.sharePct}% share (${item.yoyChangePct >= 0 ? '+' : ''}${item.yoyChangePct}% YoY)`,
      `${item.hsSection} · Top Origin: ${item.primaryPartnerName} (${item.unitNote})`,
    ]),
    ...row.partnerFlows.map((p) => [
      'Bilateral Partner (Top 10)',
      p.partnerName,
      p.partnerCode,
      row.effectiveYear,
      p.exportsBillions,
      p.importsBillions,
      `${p.bilateralBalanceBillions >= 0 ? '+' : ''}${p.bilateralBalanceBillions}B`,
      `Exp share ${p.exportSharePct}% / Imp share ${p.importSharePct}%`,
    ]),
  ];

  return rowsToCsv(headers, lines);
}
