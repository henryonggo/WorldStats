import { useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldAtlasData from 'world-atlas/countries-110m.json';
import { Minus, Plus, RotateCcw, MapPin } from 'lucide-react';
import type { CityRecord, CountryRecord, MapMetricKey } from '../types/worldStats';
import {
  computeProjectedChange2050Pct,
  formatCompactNumber,
  formatCurrency,
  formatSignedPct,
} from '../utils/analytics';
import { SourceFootnote } from './SourceFootnote';

interface WorldChoroplethMapProps {
  countries: CountryRecord[];
  cities: CityRecord[];
  selectedCountryCode: string;
  onSelectCountry: (countryCode: string) => void;
  onSelectCity: (city: CityRecord) => void;
  onOpenSources: () => void;
}

const METRIC_OPTIONS: Array<{
  key: MapMetricKey;
  label: string;
  legendLow: string;
  legendHigh: string;
}> = [
  { key: 'populationMillions', label: 'Population', legendLow: '5M', legendHigh: '1.45B' },
  { key: 'gdpPerCapita', label: 'GDP / Capita', legendLow: '$1.6K', legendHigh: '$90K' },
  { key: 'medianAge', label: 'Median Age', legendLow: '18 yrs', legendHigh: '50 yrs' },
  { key: 'projectedChange2050', label: '2050 Growth', legendLow: '-16%', legendHigh: '+54%' },
];

function interpolateColor(metric: MapMetricKey, country: CountryRecord): string {
  if (metric === 'populationMillions') {
    const t = Math.min(1, Math.log10(Math.max(5, country.populationMillions)) / Math.log10(1500));
    const palette = ['#16324F', '#1B4B72', '#1D6A96', '#2191C4', '#38BDF8'];
    return palette[Math.min(palette.length - 1, Math.floor(t * palette.length))];
  }
  if (metric === 'gdpPerCapita') {
    const t = Math.min(1, country.gdpPerCapita / 85000);
    const palette = ['#172B3A', '#1A4B5C', '#117A7F', '#10B981', '#34D399'];
    return palette[Math.min(palette.length - 1, Math.floor(t * palette.length))];
  }
  if (metric === 'medianAge') {
    const t = Math.max(0, Math.min(1, (country.medianAge - 18) / 32));
    const palette = ['#3B2618', '#6B3D1A', '#A15B1B', '#D97706', '#F59E0B'];
    return palette[Math.min(palette.length - 1, Math.floor(t * palette.length))];
  }
  // projectedChange2050
  const change = computeProjectedChange2050Pct(country);
  if (change <= -10) return '#BE123C';
  if (change < 0) return '#E11D48';
  if (change < 10) return '#1D4ED8';
  if (change < 25) return '#0284C7';
  return '#10B981';
}

const WIDTH = 920;
const HEIGHT = 430;

export function WorldChoroplethMap({
  countries,
  cities,
  selectedCountryCode,
  onSelectCountry,
  onSelectCity,
  onOpenSources,
}: WorldChoroplethMapProps) {
  const [metric, setMetric] = useState<MapMetricKey>('gdpPerCapita');
  const [showCities, setShowCities] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [hoveredCountry, setHoveredCountry] = useState<CountryRecord | null>(null);
  const [hoveredCity, setHoveredCity] = useState<CityRecord | null>(null);

  const countryByIso = useMemo(() => {
    const map = new Map<string, CountryRecord>();
    for (const c of countries) {
      map.set(c.isoNumeric, c);
      map.set(String(Number(c.isoNumeric)), c);
    }
    return map;
  }, [countries]);

  const { features, projection, pathGenerator } = useMemo(() => {
    const topology = worldAtlasData as unknown as Topology<{
      countries: GeometryCollection;
    }>;
    const geo = feature(topology, topology.objects.countries);
    const filteredFeatures = geo.features.filter((f) => String(f.id) !== '010'); // exclude Antarctica
    const proj = geoNaturalEarth1().fitExtent(
      [
        [18, 16],
        [WIDTH - 18, HEIGHT - 16],
      ],
      { type: 'FeatureCollection', features: filteredFeatures }
    );
    const pathGen = geoPath(proj);
    return { features: filteredFeatures, projection: proj, pathGenerator: pathGen };
  }, []);

  const activeMetricSpec = METRIC_OPTIONS.find((m) => m.key === metric)!;

  const formatCountryMetricValue = (c: CountryRecord): string => {
    if (metric === 'populationMillions') return `${c.populationMillions.toFixed(1)}M`;
    if (metric === 'gdpPerCapita') return formatCurrency(c.gdpPerCapita);
    if (metric === 'medianAge') return `${c.medianAge.toFixed(1)} yrs`;
    return formatSignedPct(computeProjectedChange2050Pct(c));
  };

  return (
    <section
      aria-label="Interactive global choropleth map"
      className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden"
    >
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Interactive Global Choropleth &amp; City Distribution
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any highlighted country to inspect full age pyramid &amp; GDP trends, or select a city node.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Map metric selector"
            className="grid grid-cols-2 sm:inline-flex items-center gap-0.5 p-0.5 bg-[#0B111D] border border-slate-800 rounded-md w-full sm:w-auto"
          >
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMetric(opt.key)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 text-center cursor-pointer ${
                  metric === opt.key
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCities((prev) => !prev)}
            aria-pressed={showCities}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showCities
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-[#0B111D] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Cities ({cities.length})</span>
          </button>
        </div>
      </div>

      {/* Map Viewport */}
      <div className="relative bg-[#0B111D] overflow-hidden" data-testid="world-map-container">
        {/* Zoom toolbar */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-[#111827]/95 border border-slate-800 rounded-md p-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.35).toFixed(2))))}
            aria-label="Zoom in map"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.35).toFixed(2))))}
            aria-label="Zoom out map"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Reset map zoom"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating info panel on hover */}
        {(hoveredCity || hoveredCountry) && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none max-w-xs bg-[#111827]/95 border border-slate-700/90 rounded-md px-3.5 py-2.5 shadow-lg">
            {hoveredCity ? (
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {hoveredCity.name}{' '}
                  <span className="text-xs font-normal text-slate-400">· {hoveredCity.countryName}</span>
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-400">Population</span>
                  <span className="font-mono tabular-nums text-right text-slate-200">
                    {formatCompactNumber(hoveredCity.population)}
                  </span>
                  <span className="text-slate-400">City GDP</span>
                  <span className="font-mono tabular-nums text-right text-emerald-400">
                    ${hoveredCity.gdpBillions}B
                  </span>
                  <span className="text-slate-400">Median Age</span>
                  <span className="font-mono tabular-nums text-right text-amber-300">
                    {hoveredCity.medianAge.toFixed(1)} yrs
                  </span>
                  <span className="text-slate-400">2050 Proj</span>
                  <span className="font-mono tabular-nums text-right text-sky-300">
                    {formatCompactNumber(hoveredCity.projected2050)}
                  </span>
                </div>
              </div>
            ) : hoveredCountry ? (
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {hoveredCountry.name}{' '}
                  <span className="text-xs font-normal text-slate-400">· {hoveredCountry.region}</span>
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-400">{activeMetricSpec.label}</span>
                  <span className="font-mono tabular-nums text-right text-sky-300 font-medium">
                    {formatCountryMetricValue(hoveredCountry)}
                  </span>
                  <span className="text-slate-400">GDP Total</span>
                  <span className="font-mono tabular-nums text-right text-slate-200">
                    ${hoveredCountry.gdpTrillions.toFixed(2)}T
                  </span>
                  <span className="text-slate-400">Median Age</span>
                  <span className="font-mono tabular-nums text-right text-slate-200">
                    {hoveredCountry.medianAge.toFixed(1)} yrs
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="World choropleth map showing demographic and GDP metrics"
          className="w-full h-auto max-h-[430px] block select-none"
        >
          <g
            transform={`translate(${(WIDTH * (1 - zoom)) / 2}, ${(HEIGHT * (1 - zoom)) / 2}) scale(${zoom})`}
            style={{ transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Subtle graticule horizon */}
            <line x1={20} y1={HEIGHT / 2} x2={WIDTH - 20} y2={HEIGHT / 2} stroke="#1E293B" strokeDasharray="3 4" strokeWidth={0.7} />

            {/* Country polygons */}
            {features.map((feat, i) => {
              const idStr = String(feat.id ?? i);
              const matched = countryByIso.get(idStr);
              const d = pathGenerator(feat);
              if (!d) return null;

              const isSelected = Boolean(matched && matched.code === selectedCountryCode);
              const isHovered = Boolean(matched && hoveredCountry && matched.code === hoveredCountry.code);
              const fill = matched ? interpolateColor(metric, matched) : '#162032';

              return (
                <path
                  key={`${idStr}-${i}`}
                  d={d}
                  fill={fill}
                  fillOpacity={matched ? (isHovered || isSelected ? 1 : 0.9) : 0.7}
                  stroke={isSelected ? '#F8FAFC' : isHovered ? '#38BDF8' : matched ? '#0B111D' : '#1E293B'}
                  strokeWidth={isSelected ? 1.5 / zoom : isHovered ? 1.25 / zoom : 0.6 / zoom}
                  className={matched ? 'cursor-pointer transition-opacity duration-150' : ''}
                  onMouseEnter={() => {
                    if (matched) setHoveredCountry(matched);
                  }}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={() => {
                    if (matched) onSelectCountry(matched.code);
                  }}
                />
              );
            })}

            {/* City markers */}
            {showCities &&
              cities.map((city) => {
                const coords = projection([city.lng, city.lat]);
                if (!coords) return null;
                const radius = Math.max(2.6, Math.min(6.4, Math.sqrt(city.metroPopulation / 1_000_000) * 1.15)) / Math.sqrt(zoom);
                const isCityHovered = hoveredCity?.id === city.id;
                return (
                  <circle
                    key={city.id}
                    cx={coords[0]}
                    cy={coords[1]}
                    r={isCityHovered ? radius * 1.45 : radius}
                    fill="#F59E0B"
                    fillOpacity={isCityHovered ? 1 : 0.85}
                    stroke="#090E17"
                    strokeWidth={0.9 / Math.sqrt(zoom)}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredCity(city)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCity(city);
                    }}
                  />
                );
              })}
          </g>
        </svg>
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>Scale ({activeMetricSpec.label}):</span>
          <span className="font-mono tabular-nums text-slate-300">{activeMetricSpec.legendLow}</span>
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {metric === 'populationMillions' && (
              <>
                <span className="w-5 h-2 rounded-xs bg-[#16324F]" />
                <span className="w-5 h-2 rounded-xs bg-[#1B4B72]" />
                <span className="w-5 h-2 rounded-xs bg-[#1D6A96]" />
                <span className="w-5 h-2 rounded-xs bg-[#2191C4]" />
                <span className="w-5 h-2 rounded-xs bg-[#38BDF8]" />
              </>
            )}
            {metric === 'gdpPerCapita' && (
              <>
                <span className="w-5 h-2 rounded-xs bg-[#172B3A]" />
                <span className="w-5 h-2 rounded-xs bg-[#1A4B5C]" />
                <span className="w-5 h-2 rounded-xs bg-[#117A7F]" />
                <span className="w-5 h-2 rounded-xs bg-[#10B981]" />
                <span className="w-5 h-2 rounded-xs bg-[#34D399]" />
              </>
            )}
            {metric === 'medianAge' && (
              <>
                <span className="w-5 h-2 rounded-xs bg-[#3B2618]" />
                <span className="w-5 h-2 rounded-xs bg-[#6B3D1A]" />
                <span className="w-5 h-2 rounded-xs bg-[#A15B1B]" />
                <span className="w-5 h-2 rounded-xs bg-[#D97706]" />
                <span className="w-5 h-2 rounded-xs bg-[#F59E0B]" />
              </>
            )}
            {metric === 'projectedChange2050' && (
              <>
                <span className="w-5 h-2 rounded-xs bg-[#BE123C]" />
                <span className="w-5 h-2 rounded-xs bg-[#E11D48]" />
                <span className="w-5 h-2 rounded-xs bg-[#1D4ED8]" />
                <span className="w-5 h-2 rounded-xs bg-[#0284C7]" />
                <span className="w-5 h-2 rounded-xs bg-[#10B981]" />
              </>
            )}
          </div>
          <span className="font-mono tabular-nums text-slate-300">{activeMetricSpec.legendHigh}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>24 Tracked Nations</span>
          <span aria-hidden="true">·</span>
          <span>Amber markers sized by Metro Population</span>
        </div>
      </div>

      <SourceFootnote
        sourceText="Natural Earth / World Atlas TopoJSON · UN DESA WPP 2024 · IMF WEO · National Statistical Offices"
        vintage="2024–2025 Curated Baseline"
        onOpenSources={onOpenSources}
      />
    </section>
  );
}
