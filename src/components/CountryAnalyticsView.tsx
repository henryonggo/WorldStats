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
import { ArrowRightLeft, Building2, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import type { CityRecord, CountryRecord, ProjectionScenario } from '../types/worldStats';
import {
  computeDependencyRatio,
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
  onSelectCountry: (countryCode: string) => void;
  onCompareCities: (cityIds: string[]) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onOpenSources: () => void;
}

export function CountryAnalyticsView({
  countries,
  selectedCountry,
  countryCities,
  onSelectCountry,
  onCompareCities,
  onExportCsv,
  onExportPdf,
  onOpenSources,
}: CountryAnalyticsViewProps) {
  const [scenarioView, setScenarioView] = useState<'all' | ProjectionScenario>('all');

  const workingAgeShare = computeWorkingAgeShare(selectedCountry.ageBrackets);
  const dependencyRatio = computeDependencyRatio(selectedCountry.ageBrackets);
  const proj2050Delta = computeProjectedChange2050Pct(selectedCountry);
  const gdp10YrGrowthPct = computeProjectedGdpGrowth10YrPct(selectedCountry);

  const gdpTrajectory10Yr = useMemo(
    () => computeProjectedGdpTrajectory10Yr(selectedCountry),
    [selectedCountry]
  );

  const gdp2035Target =
    gdpTrajectory10Yr[gdpTrajectory10Yr.length - 1]?.gdpTrillions ??
    selectedCountry.gdpTrillions;
  const impliedCagr10Yr = useMemo(() => {
    const start = gdpTrajectory10Yr[0]?.gdpTrillions ?? selectedCountry.gdpTrillions;
    if (start <= 0) return 0;
    return Number(((Math.pow(gdp2035Target / start, 1 / 10) - 1) * 100).toFixed(2));
  }, [gdpTrajectory10Yr, gdp2035Target, selectedCountry.gdpTrillions]);

  const multiSourceComparison = useMemo(
    () => buildCountryMultiSourceComparison(selectedCountry),
    [selectedCountry]
  );

  const pyramidData = useMemo(() => {
    // Reverse so 65+ is at top, 0-14 at bottom like a true population pyramid
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
      <section className="bg-[#111827] border border-slate-800/90 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 border-b border-slate-800/80">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{selectedCountry.region}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{selectedCountry.code}</span>
              <span aria-hidden="true">·</span>
              <span>{countryCities.length} Tracked Cities</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-50 mt-1">
              {selectedCountry.name} Demographic &amp; Economic Profile
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span className="whitespace-nowrap">Select Country</span>
              <select
                aria-label="Select country to inspect"
                value={selectedCountry.code}
                onChange={(e) => onSelectCountry(e.target.value)}
                className="bg-[#0B111D] border border-slate-700 rounded-md px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-sky-500 min-w-[180px]"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Country Key Indicators Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
          <div className="px-4 py-3.5">
            <p className="text-[11px] text-slate-400">Population</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums text-slate-50">
              {selectedCountry.populationMillions.toFixed(1)}M
            </p>
            <p
              className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                selectedCountry.annualPopGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {selectedCountry.annualPopGrowthPct >= 0 ? '+' : ''}
              {selectedCountry.annualPopGrowthPct}% / yr
            </p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] text-slate-400">Nominal GDP</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums text-slate-50">
              ${selectedCountry.gdpTrillions.toFixed(2)}T
            </p>
            <p className="text-[11px] font-mono tabular-nums text-emerald-400 mt-0.5">
              +{selectedCountry.gdpGrowthPct}% real
            </p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] text-slate-400">GDP / Capita</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums text-sky-300">
              {formatCurrency(selectedCountry.gdpPerCapita)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">USD nominal</p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] text-slate-400">Median Age</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums text-amber-300">
              {selectedCountry.medianAge.toFixed(1)} yrs
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Life exp. {selectedCountry.lifeExpectancy}y
            </p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] text-slate-400">Working Age</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums text-slate-50">
              {workingAgeShare.toFixed(1)}%
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ages 15–64</p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] text-slate-400">Dependency Ratio</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums text-slate-50">
              {dependencyRatio.toFixed(1)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">per 100 workers</p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] text-slate-400">Fertility Rate</p>
            <p className="mt-1 text-base font-semibold font-mono tabular-nums text-slate-50">
              {selectedCountry.fertilityRate.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">births / woman</p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] text-slate-400">2050 Outlook</p>
            <p
              className={`mt-1 text-base font-semibold font-mono tabular-nums ${
                proj2050Delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatSignedPct(proj2050Delta)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
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
          className="bg-[#111827] border border-slate-800/90 rounded-lg"
        >
          <div className="px-5 py-4 border-b border-slate-800/80">
            <h2 className="text-base font-semibold text-slate-100">
              Age Structure Pyramid ({selectedCountry.name})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Share of total population by age bracket and sex · Youth (0–14):{' '}
              <span className="font-mono tabular-nums text-slate-200">{youthShare.toFixed(1)}%</span> · Seniors (65+):{' '}
              <span className="font-mono tabular-nums text-slate-200">{seniorShare.toFixed(1)}%</span>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[-maxBracketVal, maxBracketVal]}
                  tickFormatter={(v) => `${Math.abs(v)}%`}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  stroke="#334155"
                />
                <YAxis
                  type="category"
                  dataKey="group"
                  tick={{ fill: '#CBD5E1', fontSize: 11 }}
                  stroke="#334155"
                  width={48}
                />
                <ReferenceLine x={0} stroke="#475569" />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="bg-[#0B111D] border border-slate-700 rounded-md px-3 py-2 text-xs shadow-xl">
                        <p className="font-semibold text-slate-100">Age Cohort {row.group}</p>
                        <div className="mt-1 space-y-0.5 font-mono tabular-nums">
                          <p className="text-sky-300">Male: {row.maleAbs.toFixed(2)}%</p>
                          <p className="text-amber-300">Female: {row.femaleAbs.toFixed(2)}%</p>
                          <p className="text-slate-200 border-t border-slate-800 pt-1 mt-1">
                            Combined: {row.total.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex items-center justify-center gap-5 pt-2 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#38BDF8]" />
                        <span>Male % (Left)</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B]" />
                        <span>Female % (Right)</span>
                      </span>
                    </div>
                  )}
                />
                <Bar dataKey="male" name="Male %" fill="#38BDF8" stackId="stack" radius={[3, 0, 0, 3]} />
                <Bar dataKey="female" name="Female %" fill="#F59E0B" stackId="stack" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Population Projections 2020-2100 */}
        <section
          aria-label="Population projections 2020 to 2100"
          className="bg-[#111827] border border-slate-800/90 rounded-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-slate-800/80">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Population Projections (2020–2100)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                UN demographic fertility variants in millions
              </p>
            </div>
            <div
              role="group"
              aria-label="Projection scenario selector"
              className="inline-flex items-center p-0.5 bg-[#0B111D] border border-slate-800 rounded-md"
            >
              {(['all', 'low', 'medium', 'high'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScenarioView(sc)}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                    scenarioView === sc
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
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
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  stroke="#334155"
                />
                <YAxis
                  tickFormatter={(v) => `${v}M`}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  stroke="#334155"
                  width={58}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B111D',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [`${value ?? ''}M`, String(name ?? '')]}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
                />
                {(scenarioView === 'all' || scenarioView === 'high') && (
                  <Line
                    type="monotone"
                    dataKey="high"
                    name="High Variant"
                    stroke="#34D399"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#34D399' }}
                  />
                )}
                {(scenarioView === 'all' || scenarioView === 'medium') && (
                  <Area
                    type="monotone"
                    dataKey="medium"
                    name="Medium Variant"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    fill="url(#projMedFill)"
                    dot={{ r: 3.5, fill: '#38BDF8' }}
                  />
                )}
                {(scenarioView === 'all' || scenarioView === 'low') && (
                  <Line
                    type="monotone"
                    dataKey="low"
                    name="Low Variant"
                    stroke="#FB7185"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#FB7185' }}
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
          className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden flex flex-col justify-between"
        >
          <div className="px-5 py-4 border-b border-slate-800/80 space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-base font-semibold text-slate-100">
                10-Year Projected GDP Growth Trajectory (2025–2035)
              </h2>
              <span className="font-mono tabular-nums text-xs font-semibold text-emerald-400">
                {formatSignedPct(gdp10YrGrowthPct)} (10-Yr)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Annual cumulative GDP expansion (%) and nominal output ($T) · Est. CAGR{' '}
              <span className="font-mono tabular-nums text-slate-200">
                {impliedCagr10Yr >= 0 ? '+' : ''}
                {impliedCagr10Yr}%/yr
              </span>{' '}
              · 2035 Target{' '}
              <span className="font-mono tabular-nums text-sky-300">
                ${gdp2035Target.toFixed(2)}T
              </span>
            </p>
          </div>

          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={gdpTrajectory10Yr}
                margin={{ top: 10, right: 16, left: 4, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  stroke="#334155"
                />
                <YAxis
                  yAxisId="pct"
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}%`}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  stroke="#334155"
                  width={52}
                />
                <YAxis
                  yAxisId="usd"
                  orientation="right"
                  tickFormatter={(v) => `$${v}T`}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  stroke="#334155"
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
                      <div className="bg-[#0B111D] border border-slate-700 rounded-md px-3 py-2 text-xs shadow-xl">
                        <p className="font-semibold text-slate-100">
                          {selectedCountry.name} · {pt.year}
                        </p>
                        <div className="mt-1 space-y-0.5 font-mono tabular-nums">
                          <p className="text-emerald-400">
                            Cumulative Growth: {formatSignedPct(pt.cumulativeGrowthPct)}
                          </p>
                          <p className="text-sky-300">
                            Projected GDP: ${pt.gdpTrillions.toFixed(2)}T
                          </p>
                          <p className="text-slate-400">
                            Annual Pace: {pt.annualGrowthPct >= 0 ? '+' : ''}
                            {pt.annualGrowthPct.toFixed(2)}% / yr
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="cumulativeGrowthPct"
                  name="Cumulative Growth (%)"
                  stroke="#34D399"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#34D399' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="usd"
                  type="monotone"
                  dataKey="gdpTrillions"
                  name="Nominal GDP ($T)"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2.5, fill: '#38BDF8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <SourceFootnote
            sourceText={getCountrySourceCitation(selectedCountry.code)}
            vintage="2025–2035 Modeled Compound Trajectory"
            onOpenSources={onOpenSources}
          />
        </section>

        {/* GDP Relationship vs Working Age & Aging */}
        <section
          aria-label="GDP relationship with country demographics"
          className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden flex flex-col justify-between"
        >
          <div className="px-5 py-4 border-b border-slate-800/80">
            <h2 className="text-base font-semibold text-slate-100">
              GDP Trajectory vs. Workforce Demographics (2005–2040)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Nominal GDP ($ Trillions, bars) plotted against Working-Age Share (15–64%) and Median Age shift
            </p>
          </div>

          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={selectedCountry.gdpHistory}
                margin={{ top: 10, right: 20, left: 6, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  stroke="#334155"
                />
                <YAxis
                  yAxisId="gdp"
                  tickFormatter={(v) => `$${v}T`}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  stroke="#334155"
                  width={58}
                />
                <YAxis
                  yAxisId="demo"
                  orientation="right"
                  domain={[15, 78]}
                  tickFormatter={(v) => `${v}`}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  stroke="#334155"
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B111D',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => {
                    const label = String(name ?? '');
                    if (label === 'Nominal GDP ($T)') return [`$${value ?? ''}T`, label];
                    if (label === 'Working Age (%)') return [`${value ?? ''}%`, label];
                    return [`${value ?? ''} yrs`, label];
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
                />
                <Bar
                  yAxisId="gdp"
                  dataKey="gdpTrillions"
                  name="Nominal GDP ($T)"
                  fill="#1D4ED8"
                  fillOpacity={0.75}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
                <Line
                  yAxisId="demo"
                  type="monotone"
                  dataKey="workingAgePct"
                  name="Working Age (%)"
                  stroke="#34D399"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: '#34D399' }}
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
            sourceText={getCountrySourceCitation(selectedCountry.code)}
            vintage="2005–2040 Historical & IMF/UN Trajectory"
            onOpenSources={onOpenSources}
          />
        </section>
      </div>

      {/* Multi-Source Data Comparison: Official National Office vs International Agencies */}
      <section
        aria-label="Multi-source statistical comparison"
        className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Multi-Source Data Comparison &amp; Official National Benchmark ({selectedCountry.name})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cross-checking official national statistical office releases ({multiSourceComparison.officialAgencyName}, {multiSourceComparison.officialDataYear}) against UN DESA, IMF WEO, and World Bank WDI
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-slate-300 shrink-0">
            <span>
              Pop Variance:{' '}
              <strong className="text-sky-300">±{multiSourceComparison.popSpreadPct}%</strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              GDP Variance:{' '}
              <strong className="text-emerald-400">±{multiSourceComparison.gdpSpreadPct}%</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0D1422] text-slate-400">
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
            <tbody className="divide-y divide-slate-800/70">
              {multiSourceComparison.rows.map((src) => {
                const isOfficial = src.sourceType === 'official-national';
                return (
                  <tr
                    key={src.id}
                    className={
                      isOfficial
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors'
                        : 'hover:bg-slate-800/35 transition-colors'
                    }
                  >
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-100">{src.sourceName}</span>
                        {isOfficial && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                            · Official National
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">{src.datasetTitle}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{src.methodologyNote}</p>
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-sky-300 whitespace-nowrap">
                      {src.dataYear}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right text-slate-100 whitespace-nowrap">
                      {src.populationMillions !== null ? `${src.populationMillions.toFixed(1)}M` : '—'}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right text-emerald-400 whitespace-nowrap">
                      {src.gdpTrillions !== null ? `$${src.gdpTrillions.toFixed(2)}T` : '—'}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right text-sky-300 whitespace-nowrap">
                      {src.gdpPerCapita !== null ? formatCurrency(src.gdpPerCapita) : '—'}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right text-amber-300 whitespace-nowrap">
                      {src.medianAge !== null ? `${src.medianAge.toFixed(1)} yrs` : '—'}
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums text-right whitespace-nowrap">
                      {isOfficial ? (
                        <span className="text-emerald-400 font-medium">Reference Baseline</span>
                      ) : (
                        <div className="space-y-0.5">
                          {src.popDeltaVsOfficialPct !== null && (
                            <p className="text-[11px] text-slate-300">
                              Pop: {formatSignedPct(src.popDeltaVsOfficialPct)}
                            </p>
                          )}
                          {src.gdpDeltaVsOfficialPct !== null && (
                            <p className="text-[11px] text-slate-400">
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
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline font-medium"
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
          sourceText={`${multiSourceComparison.officialAgencyName} (${multiSourceComparison.officialDataYear}) · UN DESA WPP (2024–2025) · IMF WEO (2024–2025) · World Bank WDI (2023)`}
          vintage="Cross-Agency Reconciliation Benchmark"
          onOpenSources={onOpenSources}
        />
      </section>

      {/* Country City-Level Breakdown */}
      <section
        aria-label="City level breakdown"
        className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>City-Level Detail Breakdown ({selectedCountry.name})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare municipal population, economic share, median age, and 2050 trajectories
            </p>
          </div>

          {countryCities.length >= 2 && (
            <button
              type="button"
              onClick={() => onCompareCities(countryCities.slice(0, 4).map((c) => c.id))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Compare All {selectedCountry.name} Cities</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0D1422] text-slate-400">
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
            <tbody className="divide-y divide-slate-800/70">
              {countryCities.map((city) => {
                const natlShare = (
                  (city.gdpBillions / (selectedCountry.gdpTrillions * 1000)) *
                  100
                ).toFixed(1);
                return (
                  <tr key={city.id} className="hover:bg-slate-800/35 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-100 whitespace-nowrap">
                      {city.name}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-200">
                      {formatCompactNumber(city.population)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                      {formatCompactNumber(city.metroPopulation)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-emerald-400">
                      ${city.gdpBillions.toLocaleString('en-US')}B
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                      {natlShare}%
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-sky-300">
                      {formatCurrency(city.gdpPerCapita)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-amber-300">
                      {city.medianAge.toFixed(1)} yrs
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-200">
                      {formatCompactNumber(city.projected2050)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
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
                        className="text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
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
          sourceText={getCitySourceCitation(selectedCountry.code)}
          onOpenSources={onOpenSources}
        />
      </section>
    </div>
  );
}
