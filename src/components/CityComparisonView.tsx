import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Plus, X } from 'lucide-react';
import { COMPARISON_PRESETS } from '../data/worldDataset';
import type { CityRecord, CountryRecord, DataYear } from '../types/worldStats';
import { computeCityComparisonMatrix, formatCompactNumber } from '../utils/analytics';
import {
  formatCityDataYear,
  getComparisonSourceFootprint,
  NATIONAL_OFFICE_BY_COUNTRY,
} from '../data/dataSources';
import { SourceFootnote } from './SourceFootnote';

interface CityComparisonViewProps {
  cities: CityRecord[];
  countries: CountryRecord[];
  dataYear: DataYear;
  selectedCityIds: string[];
  onChangeCityIds: (ids: string[]) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onOpenSources: () => void;
}

const SERIES_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#E11D48'];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--ws-popover-bg)',
  borderColor: 'var(--ws-border-strong)',
  color: 'var(--ws-text)',
  borderRadius: 'var(--ws-radius-sm)',
  fontSize: '12px',
  boxShadow: 'var(--ws-shadow-popover)',
};

export function CityComparisonView({
  cities,
  countries,
  dataYear,
  selectedCityIds,
  onChangeCityIds,
  onExportCsv,
  onExportPdf,
  onOpenSources,
}: CityComparisonViewProps) {
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [candidateCityId, setCandidateCityId] = useState<string>('');

  const countryByCode = useMemo(
    () => new Map(countries.map((c) => [c.code, c])),
    [countries]
  );

  const citiesGroupedByCountry = useMemo(() => {
    const groups = new Map<string, CityRecord[]>();
    for (const city of cities) {
      const existing = groups.get(city.countryName) ?? [];
      existing.push(city);
      groups.set(city.countryName, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cities]);

  const selectedCities = useMemo(() => {
    const cityMap = new Map(cities.map((c) => [c.id, c]));
    return selectedCityIds
      .map((id) => cityMap.get(id))
      .filter((c): c is CityRecord => Boolean(c));
  }, [cities, selectedCityIds]);

  const isSameCountryComparison = useMemo(() => {
    if (selectedCities.length < 2) return false;
    const first = selectedCities[0].countryCode;
    return selectedCities.every((c) => c.countryCode === first);
  }, [selectedCities]);

  const availableCities = useMemo(() => {
    const selectedSet = new Set(selectedCityIds);
    return cities.filter((c) => {
      if (selectedSet.has(c.id)) return false;
      if (countryFilter === 'SAME_AS_FIRST' && selectedCities[0]) {
        return c.countryCode === selectedCities[0].countryCode;
      }
      if (countryFilter !== 'ALL' && countryFilter !== 'SAME_AS_FIRST') {
        return c.countryCode === countryFilter;
      }
      return true;
    });
  }, [cities, selectedCityIds, countryFilter, selectedCities]);

  const effectiveCandidateId = useMemo(() => {
    if (availableCities.some((c) => c.id === candidateCityId)) return candidateCityId;
    return availableCities[0]?.id ?? '';
  }, [availableCities, candidateCityId]);

  const matrix = useMemo(
    () => computeCityComparisonMatrix(selectedCities, countryByCode),
    [selectedCities, countryByCode]
  );

  const comparisonSourceText = useMemo(
    () => getComparisonSourceFootprint(selectedCities.map((c) => c.countryCode), dataYear),
    [selectedCities, dataYear]
  );

  const ageChartData = useMemo(() => {
    const brackets = [
      { key: 'age0to14', label: '0–14' },
      { key: 'age15to24', label: '15–24' },
      { key: 'age25to44', label: '25–44' },
      { key: 'age45to64', label: '45–64' },
      { key: 'age65plus', label: '65+' },
    ] as const;

    return brackets.map((b) => {
      const row: Record<string, string | number> = { bracket: b.label };
      selectedCities.forEach((city) => {
        row[city.id] = city.ageBreakdown[b.key];
      });
      return row;
    });
  }, [selectedCities]);

  const trajectoryChartData = useMemo(() => {
    const years = [
      { year: String(dataYear), pick: (c: CityRecord) => Number((c.population / 1_000_000).toFixed(2)) },
      { year: '2035', pick: (c: CityRecord) => Number((c.projected2035 / 1_000_000).toFixed(2)) },
      { year: '2050', pick: (c: CityRecord) => Number((c.projected2050 / 1_000_000).toFixed(2)) },
    ];
    return years.map((step) => {
      const row: Record<string, string | number> = { year: step.year };
      selectedCities.forEach((city) => {
        row[city.id] = step.pick(city);
      });
      return row;
    });
  }, [selectedCities, dataYear]);

  const handleAddCity = () => {
    if (!effectiveCandidateId || selectedCityIds.length >= 4) return;
    if (selectedCityIds.includes(effectiveCandidateId)) return;
    onChangeCityIds([...selectedCityIds, effectiveCandidateId]);
  };

  const handleRemoveCity = (idToRemove: string) => {
    if (selectedCityIds.length <= 2) return;
    onChangeCityIds(selectedCityIds.filter((id) => id !== idToRemove));
  };

  const handleSwapCity = (index: number, newCityId: string) => {
    if (selectedCityIds.includes(newCityId)) return;
    const next = [...selectedCityIds];
    next[index] = newCityId;
    onChangeCityIds(next);
  };

  return (
    <div className="space-y-6">
      {/* Header + Presets + City Picker */}
      <section className="ws-panel overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-4 border-b ws-border">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs ws-text-muted">
              <span>Side-by-Side Analysis ({dataYear})</span>
              <span aria-hidden="true">·</span>
              <span className="ws-accent font-medium">
                {isSameCountryComparison
                  ? `Same-Country Mode (${selectedCities[0]?.countryName})`
                  : 'Cross-Country Mode'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{selectedCities.length} of 4 slots active</span>
            </div>
            <h1 className="text-xl font-semibold ws-text mt-1">
              City &amp; Country Side-by-Side Comparison
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ws-btn-subtle transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ws-btn-subtle transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Preset Strip */}
        <div className="px-5 py-3 ws-subpanel border-b ws-border flex flex-wrap items-center gap-2">
          <span className="text-xs ws-text-muted mr-1">Quick Presets:</span>
          {COMPARISON_PRESETS.map((preset) => {
            const isActive =
              preset.cityIds.length === selectedCityIds.length &&
              preset.cityIds.every((id, idx) => selectedCityIds[idx] === id);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChangeCityIds([...preset.cityIds])}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive ? 'ws-nav-active' : 'ws-btn-subtle'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Active City Slots + Add City Control */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {selectedCities.map((city, idx) => (
              <div
                key={city.id}
                className="ws-inset p-3.5 flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: SERIES_COLORS[idx] }}
                    />
                    <span className="text-xs ws-text-muted truncate">
                      {idx === 0 ? 'Baseline · ' : `City ${idx + 1} · `}
                      {city.countryName}
                    </span>
                  </div>
                  {selectedCities.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCity(city.id)}
                      aria-label={`Remove ${city.name} from comparison`}
                      className="ws-text-muted hover:ws-negative p-0.5 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  aria-label={`Select city for slot ${idx + 1}`}
                  value={city.id}
                  onChange={(e) => handleSwapCity(idx, e.target.value)}
                  className="w-full ws-input px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                >
                  {citiesGroupedByCountry.map(([countryName, groupCities]) => (
                    <optgroup key={countryName} label={`${countryName} (${groupCities.length})`}>
                      {groupCities.map((opt) => (
                        <option
                          key={opt.id}
                          value={opt.id}
                          disabled={selectedCityIds.includes(opt.id) && opt.id !== city.id}
                        >
                          {opt.name} — {opt.countryName}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <div className="flex items-center justify-between text-[11px] ws-text-muted font-mono tabular-nums">
                  <span>Pop {formatCompactNumber(city.population)}</span>
                  <span className="ws-positive">${city.gdpBillions}B</span>
                  <span className="ws-warm">{city.medianAge}y</span>
                </div>
              </div>
            ))}

            {/* Add City Slot */}
            {selectedCities.length < 4 && (
              <div className="ws-inset border-dashed ws-border-strong p-3.5 flex flex-col justify-between gap-2">
                <p className="text-xs font-medium ws-text-2">Add City to Compare</p>

                <select
                  aria-label="Filter available cities by country"
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full ws-input px-2 py-1 text-[11px] focus:outline-none"
                >
                  <option value="ALL">All Countries (Cross-Border)</option>
                  {selectedCities[0] && (
                    <option value="SAME_AS_FIRST">
                      Same Country ({selectedCities[0].countryName})
                    </option>
                  )}
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  <select
                    aria-label="Choose city to add"
                    value={effectiveCandidateId}
                    onChange={(e) => setCandidateCityId(e.target.value)}
                    disabled={availableCities.length === 0}
                    className="flex-1 min-w-0 ws-input px-2 py-1.5 text-xs focus:outline-none"
                  >
                    {availableCities.length === 0 ? (
                      <option value="">No remaining cities</option>
                    ) : (
                      availableCities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.countryCode})
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCity}
                    disabled={!effectiveCandidateId}
                    aria-label="Add selected city to comparison"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold ws-btn-primary disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Side-by-Side Charts: Age Cohorts + Population Trajectory */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section
          aria-label="Age distribution comparison chart"
          className="ws-panel overflow-hidden"
        >
          <div className="px-5 py-4 border-b ws-border">
            <h2 className="text-base font-semibold ws-text">
              Age Cohort Distribution Comparison ({dataYear})
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Percentage of municipal population within each demographic age bracket
            </p>
          </div>

          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageChartData} margin={{ top: 10, right: 16, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ws-grid-stroke)" />
                <XAxis
                  dataKey="bracket"
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: 'var(--ws-chart-tick)', fontSize: 11 }}
                  stroke="var(--ws-chart-axis)"
                  width={44}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [`${value ?? ''}%`, String(name ?? '')]}
                />
                <Legend
                  content={() => (
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs ws-text-2">
                      {selectedCities.map((city, idx) => (
                        <span key={city.id} className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: SERIES_COLORS[idx] }}
                          />
                          <span>
                            {city.name} ({city.countryCode})
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                />
                {selectedCities.map((city, idx) => (
                  <Bar
                    key={city.id}
                    dataKey={city.id}
                    name={`${city.name} (${city.countryCode})`}
                    fill={SERIES_COLORS[idx]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section
          aria-label="Population trajectory comparison chart"
          className="ws-panel overflow-hidden"
        >
          <div className="px-5 py-4 border-b ws-border">
            <h2 className="text-base font-semibold ws-text">
              Projected Population Trajectory ({dataYear}–2050)
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Municipal population forecast in millions across selected cities
            </p>
          </div>

          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectoryChartData} margin={{ top: 10, right: 20, left: 4, bottom: 6 }}>
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
                  width={52}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [`${value ?? ''}M`, String(name ?? '')]}
                />
                <Legend
                  content={() => (
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs ws-text-2">
                      {selectedCities.map((city, idx) => (
                        <span key={city.id} className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: SERIES_COLORS[idx] }}
                          />
                          <span>
                            {city.name} ({city.countryCode})
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                />
                {selectedCities.map((city, idx) => (
                  <Line
                    key={city.id}
                    type="monotone"
                    dataKey={city.id}
                    name={`${city.name} (${city.countryCode})`}
                    stroke={SERIES_COLORS[idx]}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: SERIES_COLORS[idx] }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Detailed Side-by-Side Comparison Matrix */}
      <section
        aria-label="Side by side comparison table"
        className="ws-panel overflow-hidden"
      >
        <div className="px-5 py-4 border-b ws-border">
          <h2 className="text-base font-semibold ws-text">
            Indicator Comparison Matrix ({dataYear})
          </h2>
          <p className="text-xs ws-text-muted mt-0.5">
            Percentage deltas are computed relative to baseline city ({selectedCities[0]?.name})
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b ws-border ws-subpanel ws-text-2">
                <th className="py-3 px-4 font-medium min-w-[180px]">Indicator</th>
                {selectedCities.map((city, idx) => (
                  <th key={city.id} className="py-3 px-4 font-medium text-right min-w-[155px]">
                    <span className="inline-flex items-center justify-end gap-1.5 ws-text">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: SERIES_COLORS[idx] }}
                      />
                      <span>{city.name}</span>
                    </span>
                    <span className="block text-[11px] font-normal ws-text-muted mt-0.5">
                      {city.countryName}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="ws-divide">
              {matrix.map((row) => (
                <tr key={row.key} className="ws-row-hover transition-colors">
                  <td className="py-3 px-4 font-medium ws-text">{row.label}</td>
                  {row.values.map((cell, idx) => (
                    <td key={cell.cityId} className="py-3 px-4 text-right font-mono tabular-nums">
                      <span
                        className={
                          cell.isHighest
                            ? 'ws-accent font-semibold'
                            : 'ws-text-2'
                        }
                      >
                        {cell.formatted}
                      </span>
                      {idx === 0 ? (
                        <span className="block text-[10px] ws-text-muted mt-0.5">Baseline</span>
                      ) : cell.deltaFromFirstPct !== null ? (
                        <span
                          className={`block text-[10px] mt-0.5 ${
                            cell.deltaFromFirstPct >= 0 ? 'ws-positive' : 'ws-negative'
                          }`}
                        >
                          {cell.deltaFromFirstPct >= 0 ? '+' : ''}
                          {cell.deltaFromFirstPct}% vs {selectedCities[0]?.name}
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Primary sector qualitative row */}
              <tr className="ws-row-hover">
                <td className="py-3 px-4 font-medium ws-text">Primary Economic Sector</td>
                {selectedCities.map((city) => (
                  <td key={city.id} className="py-3 px-4 text-right ws-text-2">
                    {city.primarySector}
                  </td>
                ))}
              </tr>
              {/* Official National Source & Year rows */}
              <tr className="ws-subpanel ws-row-hover">
                <td className="py-3 px-4 font-medium ws-positive">
                  Official National Statistical Agency
                </td>
                {selectedCities.map((city) => {
                  const office = NATIONAL_OFFICE_BY_COUNTRY[city.countryCode];
                  return (
                    <td key={city.id} className="py-3 px-4 text-right ws-text">
                      <span className="block font-medium">
                        {office?.shortName ?? `${city.countryName} NSO`}
                      </span>
                      {office && (
                        <span className="block text-[10px] ws-text-muted mt-0.5">
                          {office.publication}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr className="ws-subpanel ws-row-hover">
                <td className="py-3 px-4 font-medium ws-accent">
                  Year of Official Data Source
                </td>
                {selectedCities.map((city) => (
                  <td
                    key={city.id}
                    className="py-3 px-4 text-right font-mono tabular-nums ws-accent"
                  >
                    {formatCityDataYear(city.countryCode, dataYear)}
                  </td>
                ))}
              </tr>
              <tr className="ws-subpanel ws-row-hover">
                <td className="py-3 px-4 font-medium ws-text-2">
                  International Cross-Check Benchmark
                </td>
                {selectedCities.map((city) => (
                  <td key={city.id} className="py-3 px-4 text-right ws-text-muted">
                    OECD Metro &amp; UN-Habitat ({dataYear})
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <SourceFootnote
          sourceText={comparisonSourceText}
          vintage={`Harmonized Municipal Benchmark (${dataYear})`}
          onOpenSources={onOpenSources}
        />
      </section>
    </div>
  );
}
