import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowRightLeft, Search } from 'lucide-react';
import { REGIONS } from '../data/worldDataset';
import type { CityRecord, CountryRecord, Region } from '../types/worldStats';
import {
  filterAndSortCities,
  formatCompactNumber,
  formatCurrency,
  type CityFilterOptions,
} from '../utils/analytics';
import { getCitySourceCitation } from '../data/dataSources';
import { SourceFootnote } from './SourceFootnote';

interface CitiesExplorerViewProps {
  cities: CityRecord[];
  countries: CountryRecord[];
  selectedCityId: string | null;
  onSelectCity: (cityId: string) => void;
  onAddToComparison: (cityId: string) => void;
  onInspectCountry: (countryCode: string) => void;
  onOpenSources: () => void;
  onFilteredCitiesChange?: (filtered: CityRecord[], summary: string) => void;
}

export function CitiesExplorerView({
  cities,
  countries,
  selectedCityId,
  onSelectCity,
  onAddToComparison,
  onInspectCountry,
  onOpenSources,
}: CitiesExplorerViewProps) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<Region | 'All'>('All');
  const [countryCode, setCountryCode] = useState<string | 'All'>('All');
  const [sortBy, setSortBy] = useState<CityFilterOptions['sortBy']>('gdpBillions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const countryByCode = useMemo(
    () => new Map(countries.map((c) => [c.code, c])),
    [countries]
  );

  const filteredCities = useMemo(
    () =>
      filterAndSortCities(cities, {
        search,
        region,
        countryCode,
        sortBy,
        sortDir,
      }),
    [cities, search, region, countryCode, sortBy, sortDir]
  );

  const activeCity = useMemo(() => {
    return (
      cities.find((c) => c.id === selectedCityId) ??
      filteredCities[0] ??
      cities[0]
    );
  }, [cities, filteredCities, selectedCityId]);

  const activeCountry = activeCity ? countryByCode.get(activeCity.countryCode) : undefined;

  const toggleSort = (column: CityFilterOptions['sortBy']) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'name' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (column: CityFilterOptions['sortBy']) => {
    if (sortBy !== column) return null;
    return sortDir === 'desc' ? (
      <ArrowDown className="w-3 h-3 inline ml-1 text-sky-400" />
    ) : (
      <ArrowUp className="w-3 h-3 inline ml-1 text-sky-400" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-50">
              Global City-Level Statistical Explorer
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Showing{' '}
              <span className="font-mono tabular-nums text-slate-200">
                {filteredCities.length}
              </span>{' '}
              of {cities.length} tracked metropolitan hubs · Click any row to inspect age distribution and economic profile
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city, country, sector..."
                aria-label="Search cities"
                className="bg-[#0B111D] border border-slate-700/90 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-56"
              />
            </div>

            <select
              aria-label="Filter cities by region"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value as Region | 'All');
                setCountryCode('All');
              }}
              className="bg-[#0B111D] border border-slate-700/90 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="All">All Regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter cities by country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="bg-[#0B111D] border border-slate-700/90 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="All">All Countries</option>
              {countries
                .filter((c) => region === 'All' || c.region === region)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Split: Cities Table + Selected City Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Table */}
        <section
          aria-label="Cities data grid"
          className="xl:col-span-8 bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0D1422] text-slate-400">
                  <th className="py-2.5 px-4 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      City {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium">Country</th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('population')}
                      className="hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      Population {renderSortIcon('population')}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('gdpBillions')}
                      className="hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      City GDP {renderSortIcon('gdpBillions')}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('gdpPerCapita')}
                      className="hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      GDP/Cap {renderSortIcon('gdpPerCapita')}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('medianAge')}
                      className="hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      Med. Age {renderSortIcon('medianAge')}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('annualPopGrowthPct')}
                      className="hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      Growth {renderSortIcon('annualPopGrowthPct')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredCities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center text-slate-400">
                      <p className="text-sm font-medium text-slate-200">No cities match your filters</p>
                      <p className="text-xs mt-1">Adjust your search term or clear regional filters.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setRegion('All');
                          setCountryCode('All');
                        }}
                        className="mt-3 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-md hover:bg-sky-500/20 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredCities.map((city) => {
                    const isSelected = activeCity?.id === city.id;
                    return (
                      <tr
                        key={city.id}
                        onClick={() => onSelectCity(city.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-500/12' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-medium text-slate-100 whitespace-nowrap">
                          {city.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {city.countryName}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-200">
                          {formatCompactNumber(city.population)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-emerald-400">
                          ${city.gdpBillions.toLocaleString('en-US')}B
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-sky-300">
                          {formatCurrency(city.gdpPerCapita)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-amber-300">
                          {city.medianAge.toFixed(1)}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-mono tabular-nums text-right ${
                            city.annualPopGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {city.annualPopGrowthPct >= 0 ? '+' : ''}
                          {city.annualPopGrowthPct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <SourceFootnote
            sourceText="National Statistical Offices (incl. BPS Indonesia, Statistics Canada, U.S. Census, e-Stat) · OECD Metro Statistics · UN-Habitat"
            onOpenSources={onOpenSources}
          />
        </section>

        {/* City Detail Panel */}
        {activeCity && (
          <aside
            aria-label={`Detailed statistics for ${activeCity.name}`}
            className="xl:col-span-4 bg-[#111827] border border-slate-800/90 rounded-lg divide-y divide-slate-800/80"
          >
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{activeCity.countryName}</span>
                <span aria-hidden="true">·</span>
                <span>{activeCity.region}</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-50 mt-1">{activeCity.name}</h2>
              <p className="text-xs text-slate-400 mt-1">{activeCity.primarySector}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAddToComparison(activeCity.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Add to Comparison</span>
                </button>
                <button
                  type="button"
                  onClick={() => onInspectCountry(activeCity.countryCode)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>View {activeCity.countryName}</span>
                </button>
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400">City Population</p>
                <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-100">
                  {activeCity.population.toLocaleString('en-US')}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Metro Population</p>
                <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-100">
                  {activeCity.metroPopulation.toLocaleString('en-US')}
                </p>
              </div>
              <div>
                <p className="text-slate-400">City GDP</p>
                <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-emerald-400">
                  ${activeCity.gdpBillions.toLocaleString('en-US')}B
                </p>
              </div>
              <div>
                <p className="text-slate-400">National GDP Share</p>
                <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-100">
                  {activeCountry
                    ? `${((activeCity.gdpBillions / (activeCountry.gdpTrillions * 1000)) * 100).toFixed(1)}%`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Density</p>
                <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-100">
                  {activeCity.densityPerKm2.toLocaleString('en-US')}/km²
                </p>
              </div>
              <div>
                <p className="text-slate-400">Unemployment</p>
                <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-100">
                  {activeCity.unemploymentPct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-slate-400">2035 Projection</p>
                <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-sky-300">
                  {formatCompactNumber(activeCity.projected2035)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">2050 Projection</p>
                <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-sky-300">
                  {formatCompactNumber(activeCity.projected2050)}
                </p>
              </div>
            </div>

            {/* City Age Breakdown Bars */}
            <div className="p-5">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-medium text-slate-200">City Age Distribution</span>
                <span className="font-mono tabular-nums text-amber-300">
                  Median {activeCity.medianAge.toFixed(1)} yrs
                </span>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: '0–14 yrs', value: activeCity.ageBreakdown.age0to14, color: 'bg-sky-400' },
                  { label: '15–24 yrs', value: activeCity.ageBreakdown.age15to24, color: 'bg-indigo-400' },
                  { label: '25–44 yrs', value: activeCity.ageBreakdown.age25to44, color: 'bg-emerald-400' },
                  { label: '45–64 yrs', value: activeCity.ageBreakdown.age45to64, color: 'bg-amber-400' },
                  { label: '65+ yrs', value: activeCity.ageBreakdown.age65plus, color: 'bg-rose-400' },
                ].map((band) => (
                  <div key={band.label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">{band.label}</span>
                      <span className="font-mono tabular-nums text-slate-200">
                        {band.value.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${band.color} rounded-full`}
                        style={{ width: `${Math.min(100, band.value * 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3 bg-[#0C1220] text-[11px] text-slate-400 space-y-1">
              <p>
                <span className="font-medium text-slate-300">Source:</span>{' '}
                {getCitySourceCitation(activeCity.countryCode)}
              </p>
              <button
                type="button"
                onClick={onOpenSources}
                className="text-sky-400 hover:text-sky-300 hover:underline font-medium cursor-pointer"
              >
                Inspect Sources &amp; Methodology
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
