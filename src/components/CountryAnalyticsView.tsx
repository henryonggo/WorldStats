import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRightLeft, Building2, Download, ExternalLink, ShieldCheck, Ship, Sparkles } from 'lucide-react';
import {
  AVAILABLE_DATA_YEARS,
  DEFAULT_DATA_YEAR,
  type CityRecord,
  type CountryRecord,
  type DataYear,
  type ProjectionScenario,
} from '../types/worldStats';
import {
  computeDependencyRatio,
  computeGlobalIndicatorAverages,
  computeProjectedChange2050Pct,
  computeProjectedGdpGrowth10YrPct,
  computeProjectedGdpTrajectory10Yr,
  computeWorkingAgeShare,
  formatCompactNumber,
  formatCurrency,
  formatSignedPct,
} from '../utils/analytics';
import {
  buildCountryMultiSourceComparison,
  getCitySourceCitation,
  getCountrySourceCitation,
} from '../data/dataSources';
import { SourceFootnote } from './SourceFootnote';

interface CountryAnalyticsViewProps {
  countries: CountryRecord[];
  selectedCountry: CountryRecord;
  countryCities: CityRecord[];
  dataYear: DataYear;
  onChangeYear: (year: DataYear) => void;
  onSelectCountry: (countryCode: string) => void;
  onInspectTrade?: (countryCode: string) => void;
  onCompareCities: (cityIds: string[]) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onOpenSources: () => void;
  onAskAi: (prompt: string) => void;
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--ws-popover-bg)',
  borderColor: 'var(--ws-border-strong)',
  color: 'var(--ws-text)',
  borderRadius: 'var(--ws-radius-sm)',
  fontSize: '12px',
  boxShadow: 'var(--ws-shadow-popover)',
};

export function CountryAnalyticsView({
  countries,
  selectedCountry,
  countryCities,
  dataYear,
  onChangeYear,
  onSelectCountry,
  onInspectTrade,
  onCompareCities,
  onExportCsv,
  onExportPdf,
  onOpenSources,
  onAskAi,
}: CountryAnalyticsViewProps) {
  const [scenarioView, setScenarioView] = useState<'all' | ProjectionScenario>('all');

  const workingAgeShare = computeWorkingAgeShare(selectedCountry.ageBrackets);
  const dependencyRatio = computeDependencyRatio(selectedCountry.ageBrackets);
  const proj2050Delta = computeProjectedChange2050Pct(selectedCountry);
  const gdp10YrGrowthPct = computeProjectedGdpGrowth10YrPct(selectedCountry, dataYear);

  const gdpTrajectory10Yr = useMemo(
    () => computeProjectedGdpTrajectory10Yr(selectedCountry, dataYear),
    [selectedCountry, dataYear]
  );

  const trajectoryEndYear = dataYear + 10;
  const gdpTargetEndYear =
    gdpTrajectory10Yr[gdpTrajectory10Yr.length - 1]?.gdpTrillions ??
    selectedCountry.gdpTrillions;
  const impliedCagr10Yr = useMemo(() => {
    const start = gdpTrajectory10Yr[0]?.gdpTrillions ?? selectedCountry.gdpTrillions;
    if (start <= 0) return 0;
    return Number(((Math.pow(gdpTargetEndYear / start, 1 / 10) - 1) * 100).toFixed(2));
  }, [gdpTrajectory10Yr, gdpTargetEndYear, selectedCountry.gdpTrillions]);

  const multiSourceComparison = useMemo(
    () => buildCountryMultiSourceComparison(selectedCountry, dataYear),
    [selectedCountry, dataYear]
  );

  const globalAvg = useMemo(
    () => computeGlobalIndicatorAverages(countries),
    [countries]
  );

  const pyramidData = useMemo(() => {
    return [...selectedCountry.ageBrackets].reverse().map((b) => ({
      group: b.group,
      male: -b.malePct,
      female: b.femalePct,
      maleAbs: b.malePct,
      femaleAbs: b.femalePct,
      total: Number((b.malePct + b.femalePct).toFixed(2)),
    }));
  }, [selectedCountry]);

  const maxBracketVal = useMemo(() => {
    const peak = Math.max(
      ...selectedCountry.ageBrackets.map((b) => Math.max(b.malePct, b.femalePct))
    );
    return Math.ceil((peak + 2) / 5) * 5;
  }, [selectedCountry]);

  const youthShare =
    (selectedCountry.ageBrackets[0]?.malePct ?? 0) +
    (selectedCountry.ageBrackets[0]?.femalePct ?? 0);
  const seniorShare =
    (selectedCountry.ageBrackets[6]?.malePct ?? 0) +
    (selectedCountry.ageBrackets[6]?.femalePct ?? 0);

  return (
    <div className="space-y-6">
      {/* Country Selector & Overview Header */}
      <section className="ws-panel overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 border-b ws-border">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs ws-text-muted">
              <span>{selectedCountry.region}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{selectedCountry.code}</span>
              <span aria-hidden="true">·</span>
              <span>{countryCities.length} Tracked Cities</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono ws-accent">{dataYear} Series</span>
            </div>
            <h1 className="text-xl font-semibold ws-text mt-1">
              {selectedCountry.name} Demographic &amp; Economic Profile
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 text-xs ws-text-muted">
              <span className="whitespace-nowrap">Country</span>
              <select
                aria-label="Select country to inspect"
                value={selectedCountry.code}
                onChange={(e) => onSelectCountry(e.target.value)}
                className="ws-input px-3 py-2 text-xs font-medium focus:outline-none min-w-[170px]"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-xs ws-text-muted">
              <span className="whitespace-nowrap">Year</span>
              <select
                aria-label="Select country analytics data year"
                value={dataYear}
                onChange={(e) => onChangeYear(Number(e.target.value) as DataYear)}
                className="ws-input px-2.5 py-2 text-xs font-mono tabular-nums font-medium focus:outline-none"
              >
                {AVAILABLE_DATA_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr === DEFAULT_DATA_YEAR ? `${yr} (Latest)` : String(yr)}
                  </option>
                ))}
              </select>
            </label>

            {onInspectTrade && (
              <button
                type="button"
                onClick={() => onInspectTrade(selectedCountry.code)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium ws-btn-subtle transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Ship className="w-3.5 h-3.5 ws-accent" />
                <span>Trade Flows</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onAskAi(
                  `Provide a concise ${dataYear} policy & economic briefing for ${selectedCountry.name} covering aging, 10-year GDP outlook, health/R&D capacity, renewable energy, and inequality.`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium ws-nav-active transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Brief</span>
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium ws-btn-subtle transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium ws-btn-subtle transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Country Key Indicators Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 divide-y sm:divide-y-0 sm:divide-x ws-divider-border">
          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Population ({dataYear})</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums ws-text">
              {selectedCountry.populationMillions.toFixed(1)}M
            </p>
            <p
              className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                selectedCountry.annualPopGrowthPct >= 0 ? 'ws-positive' : 'ws-negative'
              }`}
            >
              {selectedCountry.annualPopGrowthPct >= 0 ? '+' : ''}
              {selectedCountry.annualPopGrowthPct}% / yr
            </p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Nominal GDP</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums ws-text">
              ${selectedCountry.gdpTrillions.toFixed(2)}T
            </p>
            <p className="text-[11px] font-mono tabular-nums ws-positive mt-0.5">
              +{selectedCountry.gdpGrowthPct}% real
            </p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">GDP / Capita</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums ws-accent">
              {formatCurrency(selectedCountry.gdpPerCapita)}
            </p>
            <p className="text-[11px] ws-text-muted mt-0.5">USD nominal</p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Median Age</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums ws-warm">
              {selectedCountry.medianAge.toFixed(1)} yrs
            </p>
            <p className="text-[11px] ws-text-muted mt-0.5">
              Life exp. {selectedCountry.lifeExpectancy}y
            </p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Working Age</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums ws-text">
              {workingAgeShare.toFixed(1)}%
            </p>
            <p className="text-[11px] ws-text-muted mt-0.5">Ages 15–64</p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Dependency Ratio</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums ws-text">
              {dependencyRatio.toFixed(1)}
            </p>
            <p className="text-[11px] ws-text-muted mt-0.5">per 100 workers</p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">Fertility Rate</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums ws-text">
              {selectedCountry.fertilityRate.toFixed(2)}
            </p>
            <p className="text-[11px] ws-text-muted mt-0.5">births / woman</p>
          </div>

          <div className="px-4 py-3.5 ws-divider-border">
            <p className="text-[11px] ws-text-muted">2050 Outlook</p>
            <p
              className={`mt-1 text-base font-semibold font-mono tabular-nums ${
                proj2050Delta >= 0 ? 'ws-positive' : 'ws-negative'
              }`}
            >
              {formatSignedPct(proj2050Delta)}
            </p>
            <p className="text-[11px] ws-text-muted mt-0.5">
              Urban {selectedCountry.urbanizationPct}%
            </p>
          </div>
        </div>
      </section>

      {/* Age Pyramid + Population Projections Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Population Age Pyramid */}
        <section
          aria-label="Country age demographics pyramid"
          className="ws-panel overflow-hidden"
        >
          <div className="px-5 py-4 border-b ws-border">
            <h2 className="text-base font-semibold ws-text">
              Age Structure Pyramid ({selectedCountry.name} · {dataYear})
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Share of total population by age bracket and sex · Youth (0–14):{' '}
              <span className="font-mono tabular-nums ws-text-2">{youthShare.toFixed(1)}%</span> · Seniors (65+):{' '}
              <span className="font-mono tabular-nums ws-text-2">{seniorShare.toFixed(1)}%</span>
            </p>
          </div>

          <div className="p-4 h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pyramidData}
                layout="vertical"
                stackOffset="sign"
                margin={{ top: 8, right: 20, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ws-grid-stroke)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[-maxBracketVal, maxBracketVal]}
                  tickFormatter={(v) => `${Math.abs(v)}%`}
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                />
                <YAxis
                  type="category"
                  dataKey="group"
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                  width={48}
                />
                <ReferenceLine x={0} stroke="var(--ws-chart-axis)" />
                <Tooltip
                  cursor={{ fill: 'var(--ws-hover)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="ws-popover px-3 py-2 text-xs">
                        <p className="font-semibold ws-text">Age Cohort {row.group}</p>
                        <div className="mt-1 space-y-0.5 font-mono tabular-nums">
                          <p className="ws-accent">Male: {row.maleAbs.toFixed(2)}%</p>
                          <p className="ws-warm">Female: {row.femaleAbs.toFixed(2)}%</p>
                          <p className="ws-text border-t ws-border pt-1 mt-1">
                            Combined: {row.total.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex items-center justify-center gap-5 pt-2 text-xs ws-text-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#0EA5E9]" />
                        <span>Male % (Left)</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B]" />
                        <span>Female % (Right)</span>
                      </span>
                    </div>
                  )}
                />
                <Bar dataKey="male" name="Male %" fill="#0EA5E9" stackId="stack" radius={[3, 0, 0, 3]} />
                <Bar dataKey="female" name="Female %" fill="#F59E0B" stackId="stack" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Population Projections 2020-2100 */}
        <section
          aria-label="Population projections 2020 to 2100"
          className="ws-panel overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b ws-border">
            <div>
              <h2 className="text-base font-semibold ws-text">
                Population Projections (2020–2100)
              </h2>
              <p className="text-xs ws-text-muted mt-0.5">
                UN demographic fertility variants in millions
              </p>
            </div>
            <div
              role="group"
              aria-label="Projection scenario selector"
              className="inline-flex items-center p-0.5 ws-inset"
            >
              {(['all', 'low', 'medium', 'high'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScenarioView(sc)}
                  className={`px-2 py-1 text-[11px] font-medium transition-colors capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                    scenarioView === sc
                      ? 'ws-nav-active'
                      : 'ws-text-muted hover:ws-text border border-transparent ws-radius-sm'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={selectedCountry.projections}
                margin={{ top: 10, right: 20, left: 6, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="projMedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ws-grid-stroke)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                />
                <YAxis
                  tickFormatter={(v) => `${v}M`}
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                  width={58}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [`${value ?? ''}M`, String(name ?? '')]}
                />
                <Legend
                  formatter={(value) => <span className="text-xs ws-text-2">{value}</span>}
                />
                {(scenarioView === 'all' || scenarioView === 'high') && (
                  <Line
                    type="monotone"
                    dataKey="high"
                    name="High Variant"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#10B981' }}
                  />
                )}
                {(scenarioView === 'all' || scenarioView === 'medium') && (
                  <Area
                    type="monotone"
                    dataKey="medium"
                    name="Medium Variant"
                    stroke="#0EA5E9"
                    strokeWidth={2.5}
                    fill="url(#projMedFill)"
                    dot={{ r: 3.5, fill: '#0EA5E9' }}
                  />
                )}
                {(scenarioView === 'all' || scenarioView === 'low') && (
                  <Line
                    type="monotone"
                    dataKey="low"
                    name="Low Variant"
                    stroke="#E11D48"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#E11D48' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* 10-Year GDP Growth Trajectory + Workforce Relationship Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 10-Year Projected GDP Growth Trajectory Line Chart */}
        <section
          aria-label="10-year projected GDP growth trajectory"
          className="ws-panel overflow-hidden flex flex-col justify-between"
        >
          <div className="px-5 py-4 border-b ws-border space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-base font-semibold ws-text">
                10-Year Projected GDP Growth Trajectory ({dataYear}–{trajectoryEndYear})
              </h2>
              <span className="font-mono tabular-nums text-xs font-semibold ws-positive">
                {formatSignedPct(gdp10YrGrowthPct)} (10-Yr)
              </span>
            </div>
            <p className="text-xs ws-text-muted">
              Annual cumulative GDP expansion (%) and nominal output ($T) · Est. CAGR{' '}
              <span className="font-mono tabular-nums ws-text-2">
                {impliedCagr10Yr >= 0 ? '+' : ''}
                {impliedCagr10Yr}%/yr
              </span>{' '}
              · {trajectoryEndYear} Target{' '}
              <span className="font-mono tabular-nums ws-accent">
                ${gdpTargetEndYear.toFixed(2)}T
              </span>
            </p>
          </div>

          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={gdpTrajectory10Yr}
                margin={{ top: 10, right: 16, left: 4, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ws-grid-stroke)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                />
                <YAxis
                  yAxisId="pct"
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}%`}
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                  width={52}
                />
                <YAxis
                  yAxisId="usd"
                  orientation="right"
                  tickFormatter={(v) => `$${v}T`}
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                  width={56}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const pt = payload[0].payload as {
                      year: number;
                      gdpTrillions: number;
                      cumulativeGrowthPct: number;
                      annualGrowthPct: number;
                    };
                    return (
                      <div className="ws-popover px-3 py-2 text-xs">
                        <p className="font-semibold ws-text">
                          {selectedCountry.name} · {pt.year}
                        </p>
                        <div className="mt-1 space-y-0.5 font-mono tabular-nums">
                          <p className="ws-positive">
                            Cumulative Growth: {formatSignedPct(pt.cumulativeGrowthPct)}
                          </p>
                          <p className="ws-accent">
                            Projected GDP: ${pt.gdpTrillions.toFixed(2)}T
                          </p>
                          <p className="ws-text-muted">
                            Annual Pace: {pt.annualGrowthPct >= 0 ? '+' : ''}
                            {pt.annualGrowthPct.toFixed(2)}% / yr
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs ws-text-2">{value}</span>}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="cumulativeGrowthPct"
                  name="Cumulative Growth (%)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#10B981' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="usd"
                  type="monotone"
                  dataKey="gdpTrillions"
                  name="Nominal GDP ($T)"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2.5, fill: '#0EA5E9' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <SourceFootnote
            sourceText={getCountrySourceCitation(selectedCountry.code, dataYear)}
            vintage={`${dataYear}–${trajectoryEndYear} Modeled Compound Trajectory`}
            onOpenSources={onOpenSources}
          />
        </section>

        {/* GDP Relationship vs Working Age & Aging */}
        <section
          aria-label="GDP relationship with country demographics"
          className="ws-panel overflow-hidden flex flex-col justify-between"
        >
          <div className="px-5 py-4 border-b ws-border">
            <h2 className="text-base font-semibold ws-text">
              GDP Trajectory vs. Workforce Demographics (2005–2040)
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Nominal GDP ($ Trillions, bars) plotted against Working-Age Share (15–64%) and Median Age shift
            </p>
          </div>

          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={selectedCountry.gdpHistory}
                margin={{ top: 10, right: 20, left: 6, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ws-grid-stroke)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                />
                <YAxis
                  yAxisId="gdp"
                  tickFormatter={(v) => `$${v}T`}
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                  width={58}
                />
                <YAxis
                  yAxisId="demo"
                  orientation="right"
                  domain={[15, 78]}
                  tickFormatter={(v) => `${v}`}
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                  width={42}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => {
                    const label = String(name ?? '');
                    if (label === 'Nominal GDP ($T)') return [`$${value ?? ''}T`, label];
                    if (label === 'Working Age (%)') return [`${value ?? ''}%`, label];
                    return [`${value ?? ''} yrs`, label];
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs ws-text-2">{value}</span>}
                />
                <Bar
                  yAxisId="gdp"
                  dataKey="gdpTrillions"
                  name="Nominal GDP ($T)"
                  fill="#2563EB"
                  fillOpacity={0.78}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
                <Line
                  yAxisId="demo"
                  type="monotone"
                  dataKey="workingAgePct"
                  name="Working Age (%)"
                  stroke="#10B981"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: '#10B981' }}
                />
                <Line
                  yAxisId="demo"
                  type="monotone"
                  dataKey="medianAge"
                  name="Median Age (yrs)"
                  stroke="#F59E0B"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: '#F59E0B' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <SourceFootnote
            sourceText={getCountrySourceCitation(selectedCountry.code, dataYear)}
            vintage="2005–2040 Historical & IMF/UN Trajectory"
            onOpenSources={onOpenSources}
          />
        </section>
      </div>

      {/* Multi-Dimensional Policy & Development Scorecard (vs 48-Nation Benchmark) */}
      <section
        aria-label="Multi-dimensional development and policy scorecard"
        className="ws-panel overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b ws-border">
          <div>
            <h2 className="text-base font-semibold ws-text">
              Development, Health, Energy &amp; Inequality Scorecard ({selectedCountry.name} · {dataYear})
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Benchmarked against the {countries.length}-economy tracked average (vertical marker on each bar)
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums ws-accent shrink-0">
            HDI {selectedCountry.indicators.hdiScore.toFixed(3)} · avg {globalAvg.hdiScore.toFixed(3)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x ws-divider-border">
          {[
            {
              pillar: 'Health & Clinical Capacity',
              rows: [
                {
                  label: 'Health Spend (% GDP)',
                  val: selectedCountry.indicators.healthExpenditurePctGdp,
                  avg: globalAvg.healthExpenditurePctGdp,
                  max: 18,
                  fmt: (v: number) => `${v.toFixed(1)}%`,
                  tone: 'bg-sky-500',
                },
                {
                  label: 'Physicians / 1,000',
                  val: selectedCountry.indicators.physiciansPer1000,
                  avg: globalAvg.physiciansPer1000,
                  max: 6.5,
                  fmt: (v: number) => v.toFixed(1),
                  tone: 'bg-sky-400',
                },
                {
                  label: 'Life Expectancy',
                  val: selectedCountry.lifeExpectancy,
                  avg: 78.2,
                  max: 90,
                  fmt: (v: number) => `${v.toFixed(1)}y`,
                  tone: 'bg-emerald-500',
                },
              ],
            },
            {
              pillar: 'Education & Innovation',
              rows: [
                {
                  label: 'Adult Literacy',
                  val: selectedCountry.indicators.literacyRatePct,
                  avg: globalAvg.literacyRatePct,
                  max: 100,
                  fmt: (v: number) => `${v.toFixed(1)}%`,
                  tone: 'bg-indigo-500',
                },
                {
                  label: 'Tertiary Enrollment',
                  val: selectedCountry.indicators.tertiaryEnrollmentPct,
                  avg: globalAvg.tertiaryEnrollmentPct,
                  max: 100,
                  fmt: (v: number) => `${v.toFixed(1)}%`,
                  tone: 'bg-indigo-400',
                },
                {
                  label: 'R&D Spend (% GDP)',
                  val: selectedCountry.indicators.rdExpenditurePctGdp,
                  avg: globalAvg.rdExpenditurePctGdp,
                  max: 6.2,
                  fmt: (v: number) => `${v.toFixed(2)}%`,
                  tone: 'bg-violet-500',
                },
              ],
            },
            {
              pillar: 'Energy & Environment',
              rows: [
                {
                  label: 'Renewable Electricity',
                  val: selectedCountry.indicators.renewableEnergyPct,
                  avg: globalAvg.renewableEnergyPct,
                  max: 100,
                  fmt: (v: number) => `${v.toFixed(1)}%`,
                  tone: 'bg-emerald-500',
                },
                {
                  label: 'CO₂ / Capita (tons)',
                  val: selectedCountry.indicators.co2PerCapitaTons,
                  avg: globalAvg.co2PerCapitaTons,
                  max: 21,
                  fmt: (v: number) => `${v.toFixed(1)}t`,
                  tone: 'bg-amber-500',
                },
                {
                  label: 'PM2.5 Air (µg/m³)',
                  val: selectedCountry.indicators.pm25AirQuality,
                  avg: globalAvg.pm25AirQuality,
                  max: 70,
                  fmt: (v: number) => `${v.toFixed(1)}`,
                  tone: 'bg-rose-500',
                },
              ],
            },
            {
              pillar: 'Inequality & Digital Access',
              rows: [
                {
                  label: 'Gini Index (0–100)',
                  val: selectedCountry.indicators.giniIndex,
                  avg: globalAvg.giniIndex,
                  max: 65,
                  fmt: (v: number) => v.toFixed(1),
                  tone: 'bg-amber-500',
                },
                {
                  label: 'Internet Penetration',
                  val: selectedCountry.indicators.internetPenetrationPct,
                  avg: globalAvg.internetPenetrationPct,
                  max: 100,
                  fmt: (v: number) => `${v.toFixed(1)}%`,
                  tone: 'bg-sky-500',
                },
                {
                  label: 'UN HDI Score',
                  val: selectedCountry.indicators.hdiScore,
                  avg: globalAvg.hdiScore,
                  max: 1.0,
                  fmt: (v: number) => v.toFixed(3),
                  tone: 'bg-emerald-500',
                },
              ],
            },
          ].map((group) => (
            <div key={group.pillar} className="p-4 space-y-3 ws-divider-border">
              <h3 className="text-xs font-semibold ws-text">{group.pillar}</h3>
              <div className="space-y-3">
                {group.rows.map((item) => {
                  const pct = Math.max(2, Math.min(100, (item.val / item.max) * 100));
                  const avgPct = Math.max(2, Math.min(98, (item.avg / item.max) * 100));
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-[11px]">
                        <span className="ws-text-2">{item.label}</span>
                        <span className="font-mono tabular-nums ws-text font-medium">
                          {item.fmt(item.val)}{' '}
                          <span className="ws-text-muted font-normal">
                            (avg {item.fmt(item.avg)})
                          </span>
                        </span>
                      </div>
                      <div className="relative h-2 w-full ws-inset overflow-hidden">
                        <div
                          className={`h-full ${item.tone} opacity-85`}
                          style={{ width: `${pct}%` }}
                        />
                        <div
                          aria-hidden="true"
                          title={`Tracked avg: ${item.fmt(item.avg)}`}
                          className="absolute top-0 bottom-0 w-0.5 bg-current ws-text opacity-80"
                          style={{ left: `${avgPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <SourceFootnote
          sourceText={`WHO Global Health Observatory · UNESCO UIS · UNDP HDI · IEA & Global Carbon Project · World Bank WDI (${dataYear} Series)`}
          vintage={`${dataYear} Multi-Dimensional Indicators`}
          onOpenSources={onOpenSources}
        />
      </section>

      {/* Multi-Source Data Comparison: Official National Office vs International Agencies */}
      <section
        aria-label="Multi-source statistical comparison"
        className="ws-panel overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b ws-border">
          <div>
            <h2 className="text-base font-semibold ws-text flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 ws-positive" />
              <span>Multi-Source Data Comparison &amp; Official National Benchmark ({selectedCountry.name} · {dataYear})</span>
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Cross-checking official national statistical office releases ({multiSourceComparison.officialAgencyName}, {multiSourceComparison.officialDataYear}) against UN DESA, IMF WEO, and World Bank WDI
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums ws-text-2 shrink-0">
            <span>
              Pop Variance:{' '}
              <strong className="ws-accent">±{multiSourceComparison.popSpreadPct}%</strong>
            </span>
            <span aria-hidden="true" className="opacity-45">·</span>
            <span>
              GDP Variance:{' '}
              <strong className="ws-positive">±{multiSourceComparison.gdpSpreadPct}%</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b ws-border ws-subpanel ws-text-2">
                <th className="py-2.5 px-4 font-medium min-w-[240px]">Statistical Source &amp; Series</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">Data Year</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Population</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Nominal GDP</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">GDP / Cap</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Median Age</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">vs. Official National</th>
                <th className="py-2.5 px-4 font-medium text-right whitespace-nowrap">Portal</th>
              </tr>
            </thead>
            <tbody className="ws-divide">
              {multiSourceComparison.rows.map((src) => {
                const isOfficial = src.sourceType === 'official-national';
                return (
                  <tr
                    key={src.id}
                    className={
                      isOfficial
                        ? 'ws-row-selected transition-colors'
                        : 'ws-row-hover transition-colors'
                    }
                  >
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold ws-text">{src.sourceName}</span>
                        {isOfficial && (
                          <span className="text-[10px] font-medium uppercase tracking-wide ws-positive">
                            · Official National
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] ws-text-2 mt-0.5">{src.datasetTitle}</p>
                      <p className="text-[11px] ws-text-muted mt-0.5">{src.methodologyNote}</p>
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums ws-accent whitespace-nowrap">
                      {src.dataYear}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right ws-text whitespace-nowrap">
                      {src.populationMillions !== null ? `${src.populationMillions.toFixed(1)}M` : '—'}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right ws-positive whitespace-nowrap">
                      {src.gdpTrillions !== null ? `$${src.gdpTrillions.toFixed(2)}T` : '—'}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right ws-accent whitespace-nowrap">
                      {src.gdpPerCapita !== null ? formatCurrency(src.gdpPerCapita) : '—'}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right ws-warm whitespace-nowrap">
                      {src.medianAge !== null ? `${src.medianAge.toFixed(1)} yrs` : '—'}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right whitespace-nowrap">
                      {isOfficial ? (
                        <span className="ws-positive font-medium">Reference Baseline</span>
                      ) : (
                        <div className="space-y-0.5">
                          {src.popDeltaVsOfficialPct !== null && (
                            <p className="text-[11px] ws-text-2">
                              Pop: {formatSignedPct(src.popDeltaVsOfficialPct)}
                            </p>
                          )}
                          {src.gdpDeltaVsOfficialPct !== null && (
                            <p className="text-[11px] ws-text-muted">
                              GDP: {formatSignedPct(src.gdpDeltaVsOfficialPct)}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 ws-accent-link hover:underline font-medium"
                      >
                        <span>Verify</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SourceFootnote
          sourceText={`${multiSourceComparison.officialAgencyName} (${multiSourceComparison.officialDataYear}) · UN DESA WPP (${dataYear}) · IMF WEO (${dataYear}) · World Bank WDI (${dataYear - 1} Audited)`}
          vintage={`Cross-Agency Reconciliation (${dataYear})`}
          onOpenSources={onOpenSources}
        />
      </section>

      {/* Country City-Level Breakdown */}
      <section
        aria-label="City level breakdown"
        className="ws-panel overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b ws-border">
          <div>
            <h2 className="text-base font-semibold ws-text flex items-center gap-2">
              <Building2 className="w-4 h-4 ws-accent" />
              <span>City-Level Detail Breakdown ({selectedCountry.name} · {dataYear})</span>
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Compare municipal population, economic share, median age, and 2050 trajectories
            </p>
          </div>

          {countryCities.length >= 2 && (
            <button
              type="button"
              onClick={() => onCompareCities(countryCities.slice(0, 4).map((c) => c.id))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ws-nav-active transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Compare All {selectedCountry.name} Cities</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b ws-border ws-subpanel ws-text-2">
                <th className="py-2.5 px-4 font-medium">City</th>
                <th className="py-2.5 px-4 font-medium text-right">Population</th>
                <th className="py-2.5 px-4 font-medium text-right">Metro Area</th>
                <th className="py-2.5 px-4 font-medium text-right">City GDP</th>
                <th className="py-2.5 px-4 font-medium text-right">Natl. Share</th>
                <th className="py-2.5 px-4 font-medium text-right">GDP / Cap</th>
                <th className="py-2.5 px-4 font-medium text-right">Median Age</th>
                <th className="py-2.5 px-4 font-medium text-right">2050 Proj</th>
                <th className="py-2.5 px-4 font-medium">Primary Sector</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="ws-divide">
              {countryCities.map((city) => {
                const natlShare = (
                  (city.gdpBillions / (selectedCountry.gdpTrillions * 1000)) *
                  100
                ).toFixed(1);
                return (
                  <tr key={city.id} className="ws-row-hover transition-colors">
                    <td className="py-3 px-4 font-medium ws-text whitespace-nowrap">
                      {city.name}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right ws-text-2">
                      {formatCompactNumber(city.population)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right ws-text-2">
                      {formatCompactNumber(city.metroPopulation)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right ws-positive">
                      ${city.gdpBillions.toLocaleString('en-US')}B
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right ws-text-2">
                      {natlShare}%
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right ws-accent">
                      {formatCurrency(city.gdpPerCapita)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right ws-warm">
                      {city.medianAge.toFixed(1)} yrs
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right ws-text-2">
                      {formatCompactNumber(city.projected2050)}
                    </td>
                    <td className="py-3 px-4 ws-text-muted whitespace-nowrap">
                      {city.primarySector}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          const secondCity = countryCities.find((c) => c.id !== city.id);
                          onCompareCities(secondCity ? [city.id, secondCity.id] : [city.id, 'usa-nyc']);
                        }}
                        aria-label={`Compare ${city.name}`}
                        className="text-xs font-medium ws-accent-link hover:underline cursor-pointer"
                      >
                        Compare
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SourceFootnote
          sourceText={getCitySourceCitation(selectedCountry.code, dataYear)}
          vintage={`${dataYear} Municipal Series`}
          onOpenSources={onOpenSources}
        />
      </section>
    </div>
  );
}
