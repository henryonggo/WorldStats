import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { REGION_COLORS, REGIONS } from '../data/worldDataset';
import type {
  CorrelationXAxis,
  CorrelationYAxis,
  CountryRecord,
  Region,
} from '../types/worldStats';
import {
  computePearsonCorrelation,
  computeWorkingAgeShare,
  formatCurrency,
} from '../utils/analytics';
import { SourceFootnote } from './SourceFootnote';

interface GdpCorrelationChartProps {
  countries: CountryRecord[];
  selectedCountryCode: string;
  onSelectCountry: (countryCode: string) => void;
  onOpenSources: () => void;
}

const X_LABELS: Record<CorrelationXAxis, string> = {
  medianAge: 'Median Age (Years)',
  workingAgePct: 'Working-Age Share 15–64 (%)',
  urbanizationPct: 'Urbanization Rate (%)',
  lifeExpectancy: 'Life Expectancy (Years)',
};

const Y_LABELS: Record<CorrelationYAxis, string> = {
  gdpPerCapita: 'GDP per Capita (USD)',
  gdpTrillions: 'Total GDP (USD Trillions)',
  gdpGrowthPct: 'Annual GDP Growth (%)',
};

interface ScatterDatum {
  code: string;
  name: string;
  region: Region;
  x: number;
  y: number;
  populationMillions: number;
  gdpTrillions: number;
  gdpPerCapita: number;
  medianAge: number;
}

export function GdpCorrelationChart({
  countries,
  selectedCountryCode,
  onSelectCountry,
  onOpenSources,
}: GdpCorrelationChartProps) {
  const [xAxisKey, setXAxisKey] = useState<CorrelationXAxis>('medianAge');
  const [yAxisKey, setYAxisKey] = useState<CorrelationYAxis>('gdpPerCapita');
  const [regionFilter, setRegionFilter] = useState<Region | 'All'>('All');

  const data: ScatterDatum[] = useMemo(() => {
    return countries
      .filter((c) => regionFilter === 'All' || c.region === regionFilter)
      .map((c) => {
        const x =
          xAxisKey === 'workingAgePct'
            ? computeWorkingAgeShare(c.ageBrackets)
            : c[xAxisKey];
        const y = c[yAxisKey];
        return {
          code: c.code,
          name: c.name,
          region: c.region,
          x,
          y,
          populationMillions: c.populationMillions,
          gdpTrillions: c.gdpTrillions,
          gdpPerCapita: c.gdpPerCapita,
          medianAge: c.medianAge,
        };
      });
  }, [countries, xAxisKey, yAxisKey, regionFilter]);

  const regression = useMemo(
    () => computePearsonCorrelation(data.map((d) => ({ x: d.x, y: d.y }))),
    [data]
  );

  const trendSegment = useMemo(() => {
    if (data.length < 2) return null;
    const xs = data.map((d) => d.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const y1 = Math.max(0, regression.slope * minX + regression.intercept);
    const y2 = Math.max(0, regression.slope * maxX + regression.intercept);
    return [
      { x: minX, y: y1 },
      { x: maxX, y: y2 },
    ] as [{ x: number; y: number }, { x: number; y: number }];
  }, [data, regression]);

  const formatY = (val: number) => {
    if (yAxisKey === 'gdpPerCapita') return `$${Math.round(val / 1000)}K`;
    if (yAxisKey === 'gdpTrillions') return `$${val}T`;
    return `${val}%`;
  };

  return (
    <section
      aria-label="GDP and demographic correlation explorer"
      className="bg-[#111827] border border-slate-800/90 rounded-lg"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            GDP &amp; Demographic Correlation Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Bubble area scales with national population · Click any country node to open its full breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>X-Axis</span>
            <select
              aria-label="Correlation X-axis metric"
              value={xAxisKey}
              onChange={(e) => setXAxisKey(e.target.value as CorrelationXAxis)}
              className="bg-[#0B111D] border border-slate-700/90 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              {Object.entries(X_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Y-Axis</span>
            <select
              aria-label="Correlation Y-axis metric"
              value={yAxisKey}
              onChange={(e) => setYAxisKey(e.target.value as CorrelationYAxis)}
              className="bg-[#0B111D] border border-slate-700/90 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              {Object.entries(Y_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Region</span>
            <select
              aria-label="Filter correlation chart by region"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as Region | 'All')}
              className="bg-[#0B111D] border border-slate-700/90 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="All">All Regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Regression stats strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 bg-[#0D1422] border-b border-slate-800/70 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400">
            Pearson r:{' '}
            <strong className="font-mono tabular-nums text-sky-300">
              {regression.r >= 0 ? '+' : ''}
              {regression.r.toFixed(3)}
            </strong>
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-400">
            R²:{' '}
            <strong className="font-mono tabular-nums text-slate-200">
              {regression.rSquared.toFixed(3)}
            </strong>
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-300">{regression.interpretation}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          {REGIONS.map((r) => (
            <span key={r} className="inline-flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: REGION_COLORS[r] }}
              />
              <span>{r}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-4 h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 14, right: 24, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              type="number"
              dataKey="x"
              name={X_LABELS[xAxisKey]}
              domain={['auto', 'auto']}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              stroke="#334155"
              label={{
                value: X_LABELS[xAxisKey],
                position: 'insideBottom',
                offset: -12,
                fill: '#94A3B8',
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={Y_LABELS[yAxisKey]}
              tickFormatter={formatY}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              stroke="#334155"
              width={64}
            />
            <ZAxis type="number" dataKey="populationMillions" range={[70, 560]} name="Population" />
            {trendSegment && (
              <ReferenceLine
                segment={trendSegment}
                stroke="#64748B"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
            )}
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ScatterDatum;
                return (
                  <div className="bg-[#0B111D] border border-slate-700 rounded-md px-3 py-2 text-xs shadow-xl">
                    <p className="font-semibold text-slate-100">
                      {d.name} <span className="font-normal text-slate-400">· {d.region}</span>
                    </p>
                    <div className="mt-1.5 space-y-0.5 font-mono tabular-nums text-slate-300">
                      <p>
                        {X_LABELS[xAxisKey]}: <span className="text-sky-300">{d.x}</span>
                      </p>
                      <p>
                        GDP / Capita:{' '}
                        <span className="text-emerald-400">{formatCurrency(d.gdpPerCapita)}</span>
                      </p>
                      <p>
                        Total GDP: <span className="text-slate-100">${d.gdpTrillions.toFixed(2)}T</span>
                      </p>
                      <p>
                        Population: <span className="text-slate-200">{d.populationMillions.toFixed(1)}M</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter
              data={data}
              onClick={(entry) => {
                const payload = entry as unknown as ScatterDatum;
                if (payload?.code) onSelectCountry(payload.code);
              }}
              className="cursor-pointer"
            >
              {data.map((entry) => {
                const isSelected = entry.code === selectedCountryCode;
                return (
                  <Cell
                    key={entry.code}
                    fill={REGION_COLORS[entry.region]}
                    fillOpacity={isSelected ? 1 : 0.78}
                    stroke={isSelected ? '#F8FAFC' : '#0B111D'}
                    strokeWidth={isSelected ? 2.2 : 1}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <SourceFootnote
        sourceText="IMF World Economic Outlook · UN DESA WPP 2024 · World Bank WDI (Client-side Pearson OLS)"
        vintage="2024–2025 Cross-Section"
        onOpenSources={onOpenSources}
      />
    </section>
  );
}
