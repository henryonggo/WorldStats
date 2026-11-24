import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  Building,
  Download,
  ExternalLink,
  Globe2,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AVAILABLE_TRADE_YEARS,
  DEFAULT_TRADE_YEAR,
  type CountryRecord,
  type CountryTradeProfile,
  type Region,
  type TradeReferenceSource,
  type TradeSortKey,
  type TradeYear,
} from '../types/worldStats';
import {
  buildTradeMultiYearSeries,
  buildTradeSourceReconciliation,
  formatSignedTradeBillions,
  formatTradeBillions,
  resolveGlobalTradeLedger,
  sortTradeLedgerRows,
  type ResolvedCountryTradeRow,
  type TradeSourceReconciliation,
} from '../utils/tradeAnalytics';
import { formatSignedPct } from '../utils/analytics';
import { SourceFootnote } from './SourceFootnote';
import { TradeSankeyDiagram } from './TradeSankeyDiagram';
import { TradeHsDetailTable } from './TradeHsDetailTable';

interface GlobalTradeViewProps {
  countries: CountryRecord[];
  tradeProfiles: CountryTradeProfile[];
  selectedCountryCode: string;
  tradeYear: TradeYear;
  tradeReference: TradeReferenceSource;
  onSelectCountry: (countryCode: string) => void;
  onChangeTradeYear: (year: TradeYear) => void;
  onChangeTradeReference: (ref: TradeReferenceSource) => void;
  onExportCountryCsv: (row: ResolvedCountryTradeRow, recon: TradeSourceReconciliation) => void;
  onExportLedgerCsv: (rows: ResolvedCountryTradeRow[]) => void;
  onExportPdf: (
    row: ResolvedCountryTradeRow,
    recon: TradeSourceReconciliation,
    allRows: ResolvedCountryTradeRow[]
  ) => void;
  onOpenSources: () => void;
  onAskAi: (prompt: string) => void;
  onInspectCountryDemographics: (countryCode: string) => void;
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--ws-popover-bg)',
  borderColor: 'var(--ws-border-strong)',
  color: 'var(--ws-text)',
  borderRadius: 'var(--ws-radius-sm)',
  fontSize: '12px',
  boxShadow: 'var(--ws-shadow-popover)',
};

const REGIONS: Array<Region | 'All'> = [
  'All',
  'North America',
  'Europe',
  'East Asia & Pacific',
  'South & Southeast Asia',
  'Latin America',
  'Middle East & Africa',
];

const TRADE_COLUMNS: Array<{
  key: TradeSortKey;
  label: string;
  align: 'left' | 'right';
  defaultDir: 'asc' | 'desc';
}> = [
  { key: 'name', label: 'Economy', align: 'left', defaultDir: 'asc' },
  { key: 'region', label: 'Region', align: 'left', defaultDir: 'asc' },
  { key: 'effectiveYear', label: 'Data Yr', align: 'right', defaultDir: 'desc' },
  { key: 'goodsExports', label: 'Goods Exp', align: 'right', defaultDir: 'desc' },
  { key: 'goodsImports', label: 'Goods Imp', align: 'right', defaultDir: 'desc' },
  { key: 'merchandiseBalance', label: 'Merch. Bal.', align: 'right', defaultDir: 'desc' },
  { key: 'servicesExports', label: 'Services Exp', align: 'right', defaultDir: 'desc' },
  { key: 'combinedBalance', label: 'Total Bal.', align: 'right', defaultDir: 'desc' },
  { key: 'tradeToGdpPct', label: 'Trade % GDP', align: 'right', defaultDir: 'desc' },
  { key: 'exportYoYPct', label: 'Exp YoY', align: 'right', defaultDir: 'desc' },
];

export function GlobalTradeView({
  countries,
  tradeProfiles,
  selectedCountryCode,
  tradeYear,
  tradeReference,
  onSelectCountry,
  onChangeTradeYear,
  onChangeTradeReference,
  onExportCountryCsv,
  onExportLedgerCsv,
  onExportPdf,
  onOpenSources,
  onAskAi,
  onInspectCountryDemographics,
}: GlobalTradeViewProps) {
  const [seriesScope, setSeriesScope] = useState<'goods' | 'combined'>('goods');
  const [ledgerRegion, setLedgerRegion] = useState<Region | 'All'>('All');
  const [ledgerQuery, setLedgerQuery] = useState('');
  const [fallbackOnly, setFallbackOnly] = useState(false);
  const [sortBy, setSortBy] = useState<TradeSortKey>('goodsExports');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const countryByCode = useMemo(
    () => new Map(countries.map((c) => [c.code, c])),
    [countries]
  );

  const validCountryCodes = useMemo(
    () => new Set(countries.map((c) => c.code)),
    [countries]
  );

  const profileByCode = useMemo(
    () => new Map(tradeProfiles.map((p) => [p.countryCode, p])),
    [tradeProfiles]
  );

  const { rows: allResolvedRows, summary: globalSummary } = useMemo(
    () => resolveGlobalTradeLedger(tradeProfiles, countryByCode, tradeYear, tradeReference),
    [tradeProfiles, countryByCode, tradeYear, tradeReference]
  );

  const selectedRow = useMemo(
    () =>
      allResolvedRows.find((r) => r.countryCode === selectedCountryCode) ??
      allResolvedRows[0],
    [allResolvedRows, selectedCountryCode]
  );

  const selectedProfile = useMemo(
    () => profileByCode.get(selectedRow.countryCode) ?? tradeProfiles[0],
    [profileByCode, selectedRow.countryCode, tradeProfiles]
  );

  const multiYearSeries = useMemo(
    () => buildTradeMultiYearSeries(selectedProfile, tradeReference),
    [selectedProfile, tradeReference]
  );

  const reconciliation = useMemo(
    () => buildTradeSourceReconciliation(selectedProfile, selectedRow.countryName, tradeYear),
    [selectedProfile, selectedRow.countryName, tradeYear]
  );

  const filteredSortedLedger = useMemo(() => {
    const q = ledgerQuery.trim().toLowerCase();
    const filtered = allResolvedRows.filter((row) => {
      if (ledgerRegion !== 'All' && row.region !== ledgerRegion) return false;
      if (fallbackOnly && !row.usedFallback) return false;
      if (q) {
        const hay = `${row.countryName} ${row.countryCode} ${row.region} ${row.sourceMeta.shortName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortTradeLedgerRows(filtered, sortBy, sortDir);
  }, [allResolvedRows, ledgerRegion, ledgerQuery, fallbackOnly, sortBy, sortDir]);

  const handleSort = (key: TradeSortKey, defaultDir: 'asc' | 'desc') => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(key);
      setSortDir(defaultDir);
    }
  };

  const handleRowDrilldown = (code: string) => {
    onSelectCountry(code);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6" data-testid="global-trade-view">
      {/* Header Control Surface & Trade KPIs */}
      <section className="ws-panel overflow-hidden">
        <div className="px-5 py-4 border-b ws-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ws-text-muted">
                <span>{selectedRow.region}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{selectedRow.countryCode}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono ws-accent" data-testid="trade-active-vintage">
                  {selectedRow.observation.vintageLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="ws-text-2 font-medium" data-testid="trade-active-source">
                  {selectedRow.sourceMeta.shortName}
                </span>
              </div>
              <h1 className="text-xl font-semibold ws-text mt-1">
                {selectedRow.countryName} Export &amp; Import Trade Intelligence
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onAskAi(
                    `Analyze ${selectedRow.countryName}'s export-import trade structure (${selectedRow.effectiveYear}, ${selectedRow.sourceMeta.shortName}): merchandise exports ${formatTradeBillions(selectedRow.goodsExports)}, imports ${formatTradeBillions(selectedRow.goodsImports)}, combined balance ${formatSignedTradeBillions(selectedRow.combinedBalance)}, key commodity dependencies, and bilateral concentration risks.`
                  )
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ws-nav-active whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Brief</span>
              </button>

              <button
                type="button"
                onClick={() => onExportCountryCsv(selectedRow, reconciliation)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ws-btn-subtle whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={() => onExportPdf(selectedRow, reconciliation, allResolvedRows)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ws-btn-subtle whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t ws-border">
            {/* Country Selector */}
            <label className="flex items-center gap-1.5 text-xs ws-text-muted">
              <span className="whitespace-nowrap">Economy</span>
              <select
                aria-label="Select economy for trade details"
                data-testid="trade-country-select"
                value={selectedRow.countryCode}
                onChange={(e) => onSelectCountry(e.target.value)}
                className="ws-input px-2.5 py-1.5 text-xs font-medium focus:outline-none min-w-[175px]"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            {/* Reference Source Switch: Global vs National */}
            <div
              role="group"
              aria-label="Select trade data reference source"
              className="inline-flex items-center p-0.5 ws-inset"
            >
              <button
                type="button"
                data-trade-ref="global"
                aria-pressed={tradeReference === 'global'}
                onClick={() => onChangeTradeReference('global')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  tradeReference === 'global'
                    ? 'ws-nav-active'
                    : 'ws-text-muted hover:ws-text border border-transparent ws-radius-sm'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5 shrink-0" />
                <span>Global (WTO / UN)</span>
              </button>
              <button
                type="button"
                data-trade-ref="national"
                aria-pressed={tradeReference === 'national'}
                onClick={() => onChangeTradeReference('national')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  tradeReference === 'national'
                    ? 'ws-nav-active'
                    : 'ws-text-muted hover:ws-text border border-transparent ws-radius-sm'
                }`}
              >
                <Building className="w-3.5 h-3.5 shrink-0" />
                <span>National (Customs)</span>
              </button>
            </div>

            {/* Trade Year Selector */}
            <label className="flex items-center gap-1.5 text-xs ws-text-muted">
              <span className="whitespace-nowrap">Year</span>
              <select
                aria-label="Select trade reporting year"
                data-testid="trade-year-select"
                value={tradeYear}
                onChange={(e) => onChangeTradeYear(Number(e.target.value) as TradeYear)}
                className="ws-input px-2.5 py-1.5 text-xs font-mono tabular-nums font-medium focus:outline-none"
              >
                {AVAILABLE_TRADE_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr === DEFAULT_TRADE_YEAR ? `${yr} (Latest)` : String(yr)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Automatic Fallback Notice when Requested Year is Pending for Selected Source */}
        {selectedRow.usedFallback && selectedRow.fallbackReason && (
          <div
            role="status"
            data-testid="trade-fallback-banner"
            className="px-5 py-3 border-b ws-border ws-subpanel flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 ws-warm shrink-0 mt-0.5 sm:mt-0" />
              <p className="ws-text-2 leading-relaxed">
                <strong className="ws-warm font-semibold">Auto-Fallback Active:</strong>{' '}
                {selectedRow.fallbackReason}
              </p>
            </div>
            {selectedRow.otherReferenceLatestYear > selectedRow.effectiveYear && (
              <button
                type="button"
                data-testid="trade-switch-newer-ref-btn"
                onClick={() => onChangeTradeReference(selectedRow.otherReference)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium ws-nav-active whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>
                  Switch to {selectedRow.otherReference === 'national' ? 'National Customs' : 'Global WTO'} (
                  {selectedRow.otherReferenceLatestYear} available)
                </span>
              </button>
            )}
          </div>
        )}

        {/* 6-KPI Macro Trade Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x ws-divider-border">
          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">
              Goods Exports ({selectedRow.effectiveYear})
            </p>
            <p
              className="mt-1 text-base font-semibold font-mono tabular-nums ws-accent"
              data-testid="kpi-goods-exports"
            >
              {formatTradeBillions(selectedRow.goodsExports)}
            </p>
            <p
              className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                (selectedRow.exportYoYPct ?? 0) >= 0 ? 'ws-positive' : 'ws-negative'
              }`}
            >
              {selectedRow.exportYoYPct !== null
                ? `${formatSignedPct(selectedRow.exportYoYPct)} YoY`
                : 'Base year series'}
            </p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">
              Goods Imports ({selectedRow.effectiveYear})
            </p>
            <p
              className="mt-1 text-base font-semibold font-mono tabular-nums ws-warm"
              data-testid="kpi-goods-imports"
            >
              {formatTradeBillions(selectedRow.goodsImports)}
            </p>
            <p className="text-[11px] font-mono tabular-nums ws-text-muted mt-0.5">
              {selectedRow.importYoYPct !== null
                ? `${formatSignedPct(selectedRow.importYoYPct)} YoY`
                : 'Base year series'}
            </p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Merchandise Balance</p>
            <p
              className={`mt-1 text-base font-semibold font-mono tabular-nums ${
                selectedRow.merchandiseBalance >= 0 ? 'ws-positive' : 'ws-negative'
              }`}
              data-testid="kpi-merch-balance"
            >
              {formatSignedTradeBillions(selectedRow.merchandiseBalance)}
            </p>
            <p className="text-[11px] ws-text-muted mt-0.5">
              {selectedRow.merchandiseBalance >= 0 ? 'Goods surplus' : 'Goods deficit'}
            </p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Services Balance</p>
            <p
              className={`mt-1 text-base font-semibold font-mono tabular-nums ${
                selectedRow.servicesBalance >= 0 ? 'ws-positive' : 'ws-negative'
              }`}
            >
              {formatSignedTradeBillions(selectedRow.servicesBalance)}
            </p>
            <p className="text-[11px] font-mono tabular-nums ws-text-muted mt-0.5">
              Exp {formatTradeBillions(selectedRow.servicesExports)} / Imp{' '}
              {formatTradeBillions(selectedRow.servicesImports)}
            </p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Combined Trade Balance</p>
            <p
              className={`mt-1 text-base font-semibold font-mono tabular-nums ${
                selectedRow.combinedBalance >= 0 ? 'ws-positive' : 'ws-negative'
              }`}
            >
              {formatSignedTradeBillions(selectedRow.combinedBalance)}
            </p>
            <p className="text-[11px] ws-text-muted mt-0.5">Goods + Commercial Services</p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Trade Openness</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums ws-text">
              {selectedRow.tradeToGdpPct.toFixed(1)}%
            </p>
            <p className="text-[11px] font-mono tabular-nums ws-text-muted mt-0.5">
              Vol. {formatTradeBillions(selectedRow.totalTrade)} (% GDP)
            </p>
          </div>
        </div>
      </section>

      {/* D3 Interactive Bilateral Trade Flow Sankey Diagram (Top 10 Partners) */}
      <TradeSankeyDiagram
        row={selectedRow}
        validCountryCodes={validCountryCodes}
        onSelectCountry={onSelectCountry}
        onOpenSources={onOpenSources}
      />

      {/* Interactive Charts Row 1: Multi-Year Trajectory + Top 10 Bilateral Partner Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Multi-Year Exports vs. Imports & Net Balance */}
        <section
          aria-label="Multi-year export and import trend"
          className="ws-panel overflow-hidden flex flex-col justify-between"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b ws-border">
            <div>
              <h2 className="text-base font-semibold ws-text">
                Exports vs. Imports Trajectory ({multiYearSeries[0]?.year}–
                {multiYearSeries[multiYearSeries.length - 1]?.year})
              </h2>
              <p className="text-xs ws-text-muted mt-0.5">
                Annual trade flows ($B) &amp; net balance · {selectedRow.sourceMeta.shortName}
              </p>
            </div>
            <div
              role="group"
              aria-label="Select trade scope for chart"
              className="inline-flex items-center p-0.5 ws-inset"
            >
              <button
                type="button"
                onClick={() => setSeriesScope('goods')}
                className={`px-2 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                  seriesScope === 'goods'
                    ? 'ws-nav-active'
                    : 'ws-text-muted hover:ws-text border border-transparent ws-radius-sm'
                }`}
              >
                Merchandise
              </button>
              <button
                type="button"
                onClick={() => setSeriesScope('combined')}
                className={`px-2 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                  seriesScope === 'combined'
                    ? 'ws-nav-active'
                    : 'ws-text-muted hover:ws-text border border-transparent ws-radius-sm'
                }`}
              >
                Goods + Services
              </button>
            </div>
          </div>

          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={multiYearSeries}
                margin={{ top: 10, right: 16, left: 6, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ws-grid-stroke)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                />
                <YAxis
                  yAxisId="flow"
                  tickFormatter={(v) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}T` : `$${v}B`)}
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                  width={62}
                />
                <YAxis
                  yAxisId="bal"
                  orientation="right"
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}$${v}B`}
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                  width={64}
                />
                <ReferenceLine yAxisId="bal" y={0} stroke="var(--ws-chart-axis)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [
                    formatTradeBillions(Number(value ?? 0)),
                    String(name ?? ''),
                  ]}
                />
                <Legend
                  formatter={(value) => <span className="text-xs ws-text-2">{value}</span>}
                />
                <Bar
                  yAxisId="flow"
                  dataKey={seriesScope === 'goods' ? 'goodsExports' : 'totalExports'}
                  name={seriesScope === 'goods' ? 'Goods Exports' : 'Total Exports'}
                  fill="#0EA5E9"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  yAxisId="flow"
                  dataKey={seriesScope === 'goods' ? 'goodsImports' : 'totalImports'}
                  name={seriesScope === 'goods' ? 'Goods Imports' : 'Total Imports'}
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  yAxisId="bal"
                  type="monotone"
                  dataKey={seriesScope === 'goods' ? 'merchandiseBalance' : 'combinedBalance'}
                  name="Net Trade Balance"
                  stroke="#10B981"
                  strokeWidth={2.4}
                  dot={{ r: 3.5, fill: '#10B981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <SourceFootnote
            sourceText={`${selectedRow.sourceMeta.agency} (${selectedRow.reference === 'global' ? 'Exports FOB / Imports CIF' : 'Official National Customs'})`}
            vintage={`Latest Available: ${selectedRow.latestAvailableYear}`}
            onOpenSources={onOpenSources}
          />
        </section>

        {/* Top 10 Bilateral Trading Partners Breakdown */}
        <section
          aria-label="Top 10 bilateral trading partners"
          className="ws-panel overflow-hidden flex flex-col justify-between"
        >
          <div className="px-5 py-4 border-b ws-border">
            <h2 className="text-base font-semibold ws-text">
              Top 10 Bilateral Trading Partners ({selectedRow.countryName} · {selectedRow.effectiveYear})
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Ranked by two-way merchandise volume ($B) — click any tracked economy to inspect its trade profile
            </p>
          </div>

          <div className="overflow-x-auto flex-1">
            <table
              className="w-full text-left border-collapse text-[11px]"
              data-testid="trade-top10-partners-table"
            >
              <thead>
                <tr className="ws-subpanel border-b ws-border ws-text-muted">
                  <th className="py-2 px-3.5 font-medium w-8">#</th>
                  <th className="py-2 px-2 font-medium">Partner</th>
                  <th className="py-2 px-2 font-medium text-right">Exports To</th>
                  <th className="py-2 px-2 font-medium text-right">Imports From</th>
                  <th className="py-2 px-2 font-medium text-right">Total Vol.</th>
                  <th className="py-2 px-3.5 font-medium text-right">Bilateral Bal.</th>
                </tr>
              </thead>
              <tbody className="ws-divide">
                {selectedRow.partnerFlows.slice(0, 10).map((p, idx) => {
                  const canJump = validCountryCodes.has(p.partnerCode);
                  return (
                    <tr key={p.partnerCode} className="ws-row-hover">
                      <td className="py-2 px-3.5 font-mono tabular-nums ws-text-muted">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 font-medium ws-text whitespace-nowrap">
                        {canJump ? (
                          <button
                            type="button"
                            onClick={() => onSelectCountry(p.partnerCode)}
                            className="ws-accent-link hover:underline cursor-pointer"
                          >
                            {p.partnerName} ({p.partnerCode})
                          </button>
                        ) : (
                          <span>{p.partnerName}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums ws-accent whitespace-nowrap">
                        {formatTradeBillions(p.exportsBillions)} ({p.exportSharePct.toFixed(1)}%)
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums ws-warm whitespace-nowrap">
                        {formatTradeBillions(p.importsBillions)} ({p.importSharePct.toFixed(1)}%)
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums ws-text-2 whitespace-nowrap">
                        {formatTradeBillions(p.totalBilateralBillions)}
                      </td>
                      <td
                        className={`py-2 px-3.5 text-right font-mono tabular-nums font-medium whitespace-nowrap ${
                          p.bilateralBalanceBillions >= 0 ? 'ws-positive' : 'ws-negative'
                        }`}
                      >
                        {formatSignedTradeBillions(p.bilateralBalanceBillions)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <SourceFootnote
            sourceText={`IMF Direction of Trade Statistics (DOTS) · UN Comtrade · ${selectedRow.sourceMeta.shortName}`}
            vintage={`${selectedRow.effectiveYear} Top 10 Bilateral Flows`}
            onOpenSources={onOpenSources}
          />
        </section>
      </div>

      {/* HS Commodity Structure: Top Exports vs Top Imports */}
      <section aria-label="Commodity export and import composition" className="ws-panel overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b ws-border">
          <div>
            <h2 className="text-base font-semibold ws-text flex items-center gap-2">
              <Package className="w-4 h-4 ws-accent" />
              <span>
                Commodity Structure by HS Section ({selectedRow.countryName} · {selectedRow.effectiveYear})
              </span>
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Merchandise export &amp; import composition scaled to {selectedRow.sourceMeta.shortName} totals (100% basket)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onInspectCountryDemographics(selectedRow.countryCode)}
            className="text-xs font-medium ws-accent-link hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Inspect {selectedRow.countryName} Demographics &amp; GDP →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x ws-divider-border">
          {/* Top Exports */}
          <div className="p-5 space-y-3.5 ws-divider-border">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide ws-accent">
                Top Export Categories
              </h3>
              <span className="font-mono tabular-nums text-xs font-semibold ws-text">
                {formatTradeBillions(selectedRow.goodsExports)}
              </span>
            </div>
            <div className="space-y-3">
              {selectedRow.topExportsUsd.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="ws-text font-medium truncate">
                      {item.category}{' '}
                      <span className="font-mono text-[11px] ws-text-muted">({item.hsCode})</span>
                    </span>
                    <span className="font-mono tabular-nums ws-text-2 shrink-0">
                      <strong className="ws-accent">{formatTradeBillions(item.valueBillions)}</strong>{' '}
                      <span className="ws-text-muted">({item.sharePct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full ws-inset overflow-hidden">
                    <div
                      className="h-full bg-sky-500 opacity-85"
                      style={{ width: `${Math.max(2, Math.min(100, item.sharePct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Imports */}
          <div className="p-5 space-y-3.5 ws-divider-border">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide ws-warm">
                Top Import Categories
              </h3>
              <span className="font-mono tabular-nums text-xs font-semibold ws-text">
                {formatTradeBillions(selectedRow.goodsImports)}
              </span>
            </div>
            <div className="space-y-3">
              {selectedRow.topImportsUsd.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="ws-text font-medium truncate">
                      {item.category}{' '}
                      <span className="font-mono text-[11px] ws-text-muted">({item.hsCode})</span>
                    </span>
                    <span className="font-mono tabular-nums ws-text-2 shrink-0">
                      <strong className="ws-warm">{formatTradeBillions(item.valueBillions)}</strong>{' '}
                      <span className="ws-text-muted">({item.sharePct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full ws-inset overflow-hidden">
                    <div
                      className="h-full bg-amber-500 opacity-85"
                      style={{ width: `${Math.max(2, Math.min(100, item.sharePct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <TradeHsDetailTable
          row={selectedRow}
          validCountryCodes={validCountryCodes}
          onSelectCountry={onSelectCountry}
        />

        <SourceFootnote
          sourceText={`UN Comtrade HS2022 4/6-Digit Classification · WTO Tariff & Trade Profiles · ${selectedRow.sourceMeta.agency}`}
          vintage={`${selectedRow.effectiveYear} HS2022 Commodity Mix & Line Items`}
          onOpenSources={onOpenSources}
        />
      </section>

      {/* Global vs. Official National Trade Reference Reconciliation Table */}
      <section
        aria-label="Global and national trade data reference comparison"
        className="ws-panel overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b ws-border">
          <div>
            <h2 className="text-base font-semibold ws-text flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 ws-positive" />
              <span>
                Global vs. Official National Trade Data Reference ({selectedRow.countryName} · Requested {tradeYear})
              </span>
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Compare WTO / UN Comtrade harmonized figures directly against {selectedProfile.nationalSource.shortName} customs releases, CIF/FOB basis, and publication vintage
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums ws-text-2 shrink-0">
            <span>
              Export Variance:{' '}
              <strong className="ws-accent">±{reconciliation.exportVariancePct.toFixed(1)}%</strong>
            </span>
            <span aria-hidden="true" className="opacity-45">·</span>
            <span>
              Import Variance:{' '}
              <strong className="ws-warm">±{reconciliation.importVariancePct.toFixed(1)}%</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full text-left border-collapse text-xs"
            data-testid="trade-reconciliation-table"
          >
            <thead>
              <tr className="border-b ws-border ws-subpanel ws-text-2">
                <th className="py-2.5 px-4 font-medium min-w-[260px]">Reference Agency &amp; Valuation</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">Effective Year</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Goods Exp</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Goods Imp</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Merch. Bal.</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Services Exp / Imp</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">vs. Global</th>
                <th className="py-2.5 px-4 font-medium text-right whitespace-nowrap">Action / Portal</th>
              </tr>
            </thead>
            <tbody className="ws-divide">
              {reconciliation.rows.map((src) => {
                const isSelectedSource =
                  (src.referenceType === 'global' && tradeReference === 'global') ||
                  (src.referenceType === 'national' && tradeReference === 'national');
                return (
                  <tr
                    key={src.id}
                    data-recon-source={src.id}
                    className={
                      isSelectedSource
                        ? 'ws-row-selected transition-colors'
                        : 'ws-row-hover transition-colors'
                    }
                  >
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold ws-text">{src.agency}</span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide ${
                            src.referenceType === 'global'
                              ? 'ws-accent'
                              : src.referenceType === 'national'
                                ? 'ws-positive'
                                : 'ws-text-muted'
                          }`}
                        >
                          ·{' '}
                          {src.referenceType === 'global'
                            ? 'Global Data'
                            : src.referenceType === 'national'
                              ? 'National Data'
                              : 'BoP Cross-Check'}
                        </span>
                        {isSelectedSource && (
                          <span className="text-[10px] font-mono uppercase ws-accent">
                            [Active]
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] ws-text-2 mt-0.5">{src.dataset}</p>
                      <p className="text-[11px] ws-text-muted mt-0.5">
                        {src.valuationBasis} — {src.methodologyNote}
                      </p>
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums whitespace-nowrap">
                      <span className={src.usedFallback ? 'ws-warm font-medium' : 'ws-accent'}>
                        {src.vintageLabel}
                      </span>
                      {src.usedFallback && (
                        <p className="text-[10px] ws-warm mt-0.5">
                          Fallback from {src.requestedYear}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right ws-accent whitespace-nowrap">
                      {formatTradeBillions(src.goodsExports)}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right ws-warm whitespace-nowrap">
                      {formatTradeBillions(src.goodsImports)}
                    </td>
                    <td
                      className={`py-3 px-3 align-top font-mono tabular-nums text-right font-medium whitespace-nowrap ${
                        src.merchandiseBalance >= 0 ? 'ws-positive' : 'ws-negative'
                      }`}
                    >
                      {formatSignedTradeBillions(src.merchandiseBalance)}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right ws-text-2 whitespace-nowrap">
                      {formatTradeBillions(src.servicesExports)} /{' '}
                      {formatTradeBillions(src.servicesImports)}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right whitespace-nowrap">
                      {src.referenceType === 'global' ? (
                        <span className="ws-accent font-medium">Global Baseline</span>
                      ) : (
                        <div className="space-y-0.5 text-[11px]">
                          <p className="ws-text-2">
                            Exp: {formatSignedPct(src.exportDeltaVsGlobalPct ?? 0)}
                          </p>
                          <p className="ws-text-muted">
                            Imp: {formatSignedPct(src.importDeltaVsGlobalPct ?? 0)}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1.5">
                        {(src.referenceType === 'global' || src.referenceType === 'national') &&
                          !isSelectedSource && (
                            <button
                              type="button"
                              onClick={() =>
                                onChangeTradeReference(
                                  src.referenceType === 'global' ? 'global' : 'national'
                                )
                              }
                              className="px-2 py-1 text-[11px] font-medium ws-btn-subtle cursor-pointer"
                            >
                              Use Source
                            </button>
                          )}
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ws-accent-link hover:underline font-medium"
                        >
                          <span>Verify</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <SourceFootnote
          sourceText={`Global: WTO / UN Comtrade / IMF DOTS · National: ${selectedProfile.nationalSource.agency} · Cross-Check: UNCTAD / World Bank BPM6`}
          vintage={`Dual-Reference Verification (${tradeYear})`}
          onOpenSources={onOpenSources}
        />
      </section>

      {/* Sortable 48-Economy Global Export & Import Ledger */}
      <section aria-label="Global 48-economy export and import ledger" className="ws-panel overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b ws-border">
          <div>
            <h2 className="text-base font-semibold ws-text">
              Global Export &amp; Import Ledger ({allResolvedRows.length} Economies · Requested {tradeYear})
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Active Reference:{' '}
              <span className="ws-text-2 font-medium">
                {tradeReference === 'global'
                  ? 'Global Harmonized (WTO / UN Comtrade)'
                  : 'Official National Customs / NSO'}
              </span>{' '}
              · Tracked Goods Exports{' '}
              <span className="font-mono tabular-nums ws-accent">
                ${globalSummary.totalGoodsExportsTrillions.toFixed(2)}T
              </span>{' '}
              ·{' '}
              <span className="font-mono tabular-nums ws-positive">
                {globalSummary.exactYearCount} at {tradeYear}
              </span>
              {globalSummary.fallbackCount > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span className="font-mono tabular-nums ws-warm">
                    {globalSummary.fallbackCount} auto-fallback to prior year
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex items-center">
              <Search className="w-3.5 h-3.5 ws-text-muted absolute left-2.5 pointer-events-none" />
              <input
                type="search"
                value={ledgerQuery}
                onChange={(e) => setLedgerQuery(e.target.value)}
                placeholder="Filter economy or agency..."
                aria-label="Filter trade ledger"
                className="ws-input pl-8 pr-2.5 py-1.5 text-xs focus:outline-none w-44"
              />
            </label>

            <select
              aria-label="Filter trade ledger by region"
              value={ledgerRegion}
              onChange={(e) => setLedgerRegion(e.target.value as Region | 'All')}
              className="ws-input px-2.5 py-1.5 text-xs focus:outline-none"
            >
              {REGIONS.map((reg) => (
                <option key={reg} value={reg}>
                  {reg === 'All' ? 'All Regions' : reg}
                </option>
              ))}
            </select>

            {globalSummary.fallbackCount > 0 && (
              <button
                type="button"
                aria-pressed={fallbackOnly}
                onClick={() => setFallbackOnly((prev) => !prev)}
                className={`px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                  fallbackOnly ? 'ws-nav-active' : 'ws-btn-subtle'
                }`}
              >
                Fallback Only ({globalSummary.fallbackCount})
              </button>
            )}

            <button
              type="button"
              onClick={() => onExportLedgerCsv(filteredSortedLedger)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ws-btn-subtle whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Table CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full text-left border-collapse text-xs"
            data-testid="global-trade-ledger"
          >
            <thead>
              <tr className="border-b ws-border ws-subpanel ws-text-2">
                {TRADE_COLUMNS.map((col, idx) => {
                  const isSorted = sortBy === col.key;
                  const SortIcon = !isSorted
                    ? ArrowUpDown
                    : sortDir === 'asc'
                      ? ArrowUp
                      : ArrowDown;
                  const ariaSort = isSorted
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none';
                  return (
                    <th
                      key={col.key}
                      aria-sort={ariaSort}
                      className={`py-2.5 ${idx === 0 ? 'px-4 sticky left-0 z-10 ws-subpanel' : 'px-3'} font-medium whitespace-nowrap ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <button
                        type="button"
                        data-trade-sort-col={col.key}
                        onClick={() => handleSort(col.key, col.defaultDir)}
                        className={`inline-flex items-center gap-1 hover:ws-text transition-colors cursor-pointer ${
                          col.align === 'right' ? 'justify-end ml-auto' : 'justify-start'
                        } ${isSorted ? 'ws-accent font-semibold' : 'ws-text-2'}`}
                      >
                        <span>{col.label}</span>
                        <SortIcon className={`w-3 h-3 shrink-0 ${isSorted ? 'opacity-100' : 'opacity-45'}`} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="ws-divide">
              {filteredSortedLedger.map((row) => {
                const isSelected = row.countryCode === selectedRow.countryCode;
                return (
                  <tr
                    key={row.countryCode}
                    data-trade-country-code={row.countryCode}
                    onClick={() => handleRowDrilldown(row.countryCode)}
                    className={`${
                      isSelected ? 'ws-row-selected' : 'ws-row-hover'
                    } cursor-pointer transition-colors`}
                  >
                    <td className="py-2.5 px-4 font-medium ws-text whitespace-nowrap sticky left-0 ws-subpanel">
                      <span>{row.countryName}</span>
                      <span className="ml-1.5 font-mono text-[10px] ws-text-muted">
                        {row.countryCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 ws-text-muted whitespace-nowrap">{row.region}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right whitespace-nowrap">
                      <span className={row.usedFallback ? 'ws-warm font-medium' : 'ws-text-2'}>
                        {row.effectiveYear}
                        {row.usedFallback ? ' (prev)' : ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-accent whitespace-nowrap">
                      {formatTradeBillions(row.goodsExports)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-warm whitespace-nowrap">
                      {formatTradeBillions(row.goodsImports)}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-mono tabular-nums text-right whitespace-nowrap ${
                        row.merchandiseBalance >= 0 ? 'ws-positive' : 'ws-negative'
                      }`}
                    >
                      {formatSignedTradeBillions(row.merchandiseBalance)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-text-2 whitespace-nowrap">
                      {formatTradeBillions(row.servicesExports)}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-mono tabular-nums text-right font-medium whitespace-nowrap ${
                        row.combinedBalance >= 0 ? 'ws-positive' : 'ws-negative'
                      }`}
                    >
                      {formatSignedTradeBillions(row.combinedBalance)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-text-2 whitespace-nowrap">
                      {row.tradeToGdpPct.toFixed(1)}%
                    </td>
                    <td
                      className={`py-2.5 px-3 font-mono tabular-nums text-right whitespace-nowrap ${
                        (row.exportYoYPct ?? 0) >= 0 ? 'ws-positive' : 'ws-negative'
                      }`}
                    >
                      {row.exportYoYPct !== null ? formatSignedPct(row.exportYoYPct) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <SourceFootnote
          sourceText={
            tradeReference === 'global'
              ? 'WTO Merchandise & Commercial Services Trade · UN Comtrade · IMF Direction of Trade Statistics (DOTS)'
              : 'Official National Customs Authorities & Statistical Offices across 48 Economies (e.g., U.S. Census FT-900, GACC, BPS Indonesia, Statistics Canada, Destatis, MOF Japan)'
          }
          vintage={`Requested ${tradeYear} · Auto-Fallback to Latest Prior Year`}
          onOpenSources={onOpenSources}
        />
      </section>
    </div>
  );
}
