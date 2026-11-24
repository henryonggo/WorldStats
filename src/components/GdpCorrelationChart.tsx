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
  DataYear,
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
  dataYear: DataYear;
  selectedCountryCode: string;
  onSelectCountry: (countryCode: string) => void;
  onOpenSources: () => void;
}

const X_LABELS: Record<CorrelationXAxis, string> = {
  medianAge: 'Median Age (Years)',
  workingAgePct: 'Working-Age Share 15–64 (%)',
  urbanizationPct: 'Urbanization Rate (%)',
  lifeExpectancy: 'Life Expectancy (Years)',
  hdiScore: 'Human Development Index (HDI)',
  healthExpenditurePctGdp: 'Health Spend (% GDP)',
  rdExpenditurePctGdp: 'R&D Spend (% GDP)',
  tertiaryEnrollmentPct: 'Tertiary Enrollment (%)',
  co2PerCapitaTons: 'CO₂ / Capita (Metric Tons)',
  renewableEnergyPct: 'Renewable Electricity (%)',
  giniIndex: 'Gini Inequality Index',
};

const Y_LABELS: Record<CorrelationYAxis, string> = {
  gdpPerCapita: 'GDP per Capita (USD)',
  gdpTrillions: 'Total GDP (USD Trillions)',
  gdpGrowthPct: 'Annual GDP Growth (%)',
  hdiScore: 'Human Development Index (HDI)',
  co2PerCapitaTons: 'CO₂ / Capita (Metric Tons)',
  lifeExpectancy: 'Life Expectancy (Years)',
};

function extractX(country: CountryRecord, key: CorrelationXAxis): number {
  if (key === 'workingAgePct') return computeWorkingAgeShare(country.ageBrackets);
  if (
    key === 'medianAge' ||
    key === 'urbanizationPct' ||
    key === 'lifeExpectancy'
  ) {
    return country[key];
  }
  return country.indicators[key];
}

function extractY(country: CountryRecord, key: CorrelationYAxis): number {
  if (
    key === 'gdpPerCapita' ||
    key === 'gdpTrillions' ||
    key === 'gdpGrowthPct' ||
    key === 'lifeExpectancy'
  ) {
    return country[key];
  }
  return country.indicators[key];
}

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
  hdiScore: number;
}

export function GdpCorrelationChart({
  countries,
  dataYear,
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
      .map((c) => ({
        code: c.code,
        name: c.name,
        region: c.region,
        x: extractX(c, xAxisKey),
        y: extractY(c, yAxisKey),
        populationMillions: c.populationMillions,
        gdpTrillions: c.gdpTrillions,
        gdpPerCapita: c.gdpPerCapita,
        medianAge: c.medianAge,
        hdiScore: c.indicators.hdiScore,
      }));
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
    if (yAxisKey === 'gdpGrowthPct') return `${val}%`;
    if (yAxisKey === 'hdiScore') return val.toFixed(2);
    if (yAxisKey === 'co2PerCapitaTons') return `${val}t`;
    return `${val}y`;
  };

  return (
    <section
      aria-label="GDP and multi-dimensional development correlation explorer"
      className="ws-panel overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-4 border-b ws-border">
        <div>
          <h2 className="text-base font-semibold ws-text">
            Macro, Demographic &amp; Policy Correlation Explorer ({dataYear})
          </h2>
          <p className="text-xs ws-text-muted mt-0.5">
            Compare {data.length} economies across demographics, health, R&amp;D, energy &amp; inequality · Click any bubble to inspect
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-1.5 text-xs ws-text-muted">
            <span>X-Axis</span>
            <select
              aria-label="Correlation X-axis metric"
              value={xAxisKey}
              onChange={(e) => setXAxisKey(e.target.value as CorrelationXAxis)}
              className="ws-input px-2.5 py-1.5 text-xs focus:outline-none"
            >
              {Object.entries(X_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs ws-text-muted">
            <span>Y-Axis</span>
            <select
              aria-label="Correlation Y-axis metric"
              value={yAxisKey}
              onChange={(e) => setYAxisKey(e.target.value as CorrelationYAxis)}
              className="ws-input px-2.5 py-1.5 text-xs focus:outline-none"
            >
              {Object.entries(Y_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs ws-text-muted">
            <span>Region</span>
            <select
              aria-label="Filter correlation chart by region"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as Region | 'All')}
              className="ws-input px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="All">All Regions ({countries.length})</option>
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
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 ws-subpanel border-b ws-border text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="ws-text-muted">
            Pearson r:{' '}
            <strong className="font-mono tabular-nums ws-accent">
              {regression.r >= 0 ? '+' : ''}
              {regression.r.toFixed(3)}
            </strong>
          </span>
          <span className="ws-text-muted" aria-hidden="true">·</span>
          <span className="ws-text-muted">
            R²:{' '}
            <strong className="font-mono tabular-nums ws-text">
              {regression.rSquared.toFixed(3)}
            </strong>
          </span>
          <span className="ws-text-muted" aria-hidden="true">·</span>
          <span className="ws-text-2">{regression.interpretation}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] ws-text-muted">
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ws-grid-stroke)" />
            <XAxis
              type="number"
              dataKey="x"
              name={X_LABELS[xAxisKey]}
              domain={['auto', 'auto']}
              tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
              stroke="var(--ws-chart-axis)"
              label={{
                value: X_LABELS[xAxisKey],
                position: 'insideBottom',
                offset: -12,
                fill: 'var(--ws-chart-tick)',
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={Y_LABELS[yAxisKey]}
              tickFormatter={formatY}
              tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
              stroke="var(--ws-chart-axis)"
              width={64}
            />
            <ZAxis type="number" dataKey="populationMillions" range={[55, 480]} name="Population" />
            {trendSegment && (
              <ReferenceLine
                segment={trendSegment}
                stroke="var(--ws-chart-tick)"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
            )}
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--ws-chart-tick)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ScatterDatum;
                return (
                  <div className="ws-popover px-3 py-2 text-xs">
                    <p className="font-semibold ws-text">
                      {d.name} <span className="font-normal ws-text-muted">· {d.region}</span>
                    </p>
                    <div className="mt-1.5 space-y-0.5 font-mono tabular-nums ws-text-2">
                      <p>
                        {X_LABELS[xAxisKey]}: <span className="ws-accent">{d.x}</span>
                      </p>
                      <p>
                        {Y_LABELS[yAxisKey]}: <span className="ws-positive">{formatY(d.y)}</span>
                      </p>
                      <p>
                        GDP / Cap ({dataYear}): <span className="ws-text">{formatCurrency(d.gdpPerCapita)}</span>
                      </p>
                      <p>
                        HDI / Pop: <span className="ws-text-2">{d.hdiScore.toFixed(3)} · {d.populationMillions.toFixed(1)}M</span>
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
                    fillOpacity={isSelected ? 1 : 0.82}
                    stroke={isSelected ? 'var(--ws-map-selected-stroke)' : 'var(--ws-map-stroke)'}
                    strokeWidth={isSelected ? 2.2 : 1}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <SourceFootnote
        sourceText={`IMF WEO (${dataYear}) · UN DESA WPP (${dataYear}) · WHO · UNDP HDI · UNESCO · IEA (Client-side Pearson OLS)`}
        vintage={`${dataYear} Cross-Section (${data.length} Economies)`}
        onOpenSources={onOpenSources}
      />
    </section>
  );
}
