import { useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldAtlasData from 'world-atlas/countries-110m.json';
import { Minus, Plus, RotateCcw, MapPin } from 'lucide-react';
import type { CityRecord, CountryRecord, DataYear, MapMetricKey } from '../types/worldStats';
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
  dataYear: DataYear;
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
  palette: [string, string, string, string, string];
}> = [
  {
    key: 'gdpPerCapita',
    label: 'GDP / Capita',
    legendLow: '$1.3K',
    legendHigh: '$107K',
    palette: ['#1E3A52', '#1C5B6E', '#117A7F', '#0D9488', '#10B981'],
  },
  {
    key: 'populationMillions',
    label: 'Population',
    legendLow: '5M',
    legendHigh: '1.47B',
    palette: ['#16324F', '#1B4B72', '#1D6A96', '#2191C4', '#38BDF8'],
  },
  {
    key: 'medianAge',
    label: 'Median Age',
    legendLow: '18 yrs',
    legendHigh: '50 yrs',
    palette: ['#4A2E1B', '#7A451B', '#B45D18', '#D97706', '#F59E0B'],
  },
  {
    key: 'projectedChange2050',
    label: '2050 Growth',
    legendLow: '-16%',
    legendHigh: '+60%',
    palette: ['#BE123C', '#E11D48', '#1D4ED8', '#0284C7', '#10B981'],
  },
  {
    key: 'hdiScore',
    label: 'HDI Score',
    legendLow: '0.49',
    legendHigh: '0.97',
    palette: ['#312E81', '#4338CA', '#4F46E5', '#6366F1', '#38BDF8'],
  },
  {
    key: 'renewableEnergyPct',
    label: 'Renewables %',
    legendLow: '3%',
    legendHigh: '98%',
    palette: ['#1F2937', '#115E59', '#0F766E', '#059669', '#34D399'],
  },
  {
    key: 'co2PerCapitaTons',
    label: 'CO₂ / Capita',
    legendLow: '0.2t',
    legendHigh: '20t',
    palette: ['#065F46', '#047857', '#D97706', '#EA580C', '#DC2626'],
  },
  {
    key: 'giniIndex',
    label: 'Gini Inequality',
    legendLow: '26',
    legendHigh: '63',
    palette: ['#0D9488', '#0284C7', '#D97706', '#EA580C', '#BE123C'],
  },
];

function interpolateColor(metric: MapMetricKey, country: CountryRecord): string {
  const spec = METRIC_OPTIONS.find((m) => m.key === metric)!;
  const p = spec.palette;
  const pick = (t: number) => p[Math.max(0, Math.min(p.length - 1, Math.floor(t * p.length)))];

  if (metric === 'populationMillions') {
    const t = Math.min(1, Math.log10(Math.max(5, country.populationMillions)) / Math.log10(1500));
    return pick(t);
  }
  if (metric === 'gdpPerCapita') {
    return pick(Math.min(1, country.gdpPerCapita / 95000));
  }
  if (metric === 'medianAge') {
    return pick(Math.max(0, Math.min(1, (country.medianAge - 18) / 32)));
  }
  if (metric === 'projectedChange2050') {
    const change = computeProjectedChange2050Pct(country);
    if (change <= -10) return p[0];
    if (change < 0) return p[1];
    if (change < 10) return p[2];
    if (change < 25) return p[3];
    return p[4];
  }
  if (metric === 'hdiScore') {
    return pick(Math.max(0, Math.min(1, (country.indicators.hdiScore - 0.48) / 0.50)));
  }
  if (metric === 'renewableEnergyPct') {
    return pick(Math.max(0, Math.min(1, country.indicators.renewableEnergyPct / 98)));
  }
  if (metric === 'co2PerCapitaTons') {
    return pick(Math.max(0, Math.min(1, country.indicators.co2PerCapitaTons / 18)));
  }
  // giniIndex
  return pick(Math.max(0, Math.min(1, (country.indicators.giniIndex - 25) / 38)));
}

const WIDTH = 920;
const HEIGHT = 430;

export function WorldChoroplethMap({
  countries,
  cities,
  dataYear,
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
    const filteredFeatures = geo.features.filter((f) => String(f.id) !== '010');
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
    if (metric === 'projectedChange2050') return formatSignedPct(computeProjectedChange2050Pct(c));
    if (metric === 'hdiScore') return c.indicators.hdiScore.toFixed(3);
    if (metric === 'renewableEnergyPct') return `${c.indicators.renewableEnergyPct.toFixed(1)}%`;
    if (metric === 'co2PerCapitaTons') return `${c.indicators.co2PerCapitaTons.toFixed(1)} t`;
    return `${c.indicators.giniIndex.toFixed(1)}`;
  };

  return (
    <section
      aria-label="Interactive global choropleth map"
      className="ws-panel overflow-hidden"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b ws-border">
        <div>
          <h2 className="text-base font-semibold ws-text">
            Interactive Global Choropleth &amp; City Distribution ({dataYear})
          </h2>
          <p className="text-xs ws-text-muted mt-0.5">
            Click any highlighted country ({countries.length} nations) to open its full breakdown, or click any city node.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs ws-text-muted">
            <span className="whitespace-nowrap">Map Layer</span>
            <select
              aria-label="Select map metric layer"
              data-testid="map-metric-select"
              value={metric}
              onChange={(e) => setMetric(e.target.value as MapMetricKey)}
              className="ws-input px-2.5 py-1.5 text-xs font-medium focus:outline-none cursor-pointer"
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowCities((prev) => !prev)}
            aria-pressed={showCities}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showCities ? 'ws-nav-active' : 'ws-btn-subtle'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Cities ({cities.length})</span>
          </button>
        </div>
      </div>

      {/* Map Viewport */}
      <div className="relative ws-subpanel overflow-hidden" data-testid="world-map-container">
        {/* Zoom toolbar */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 ws-popover p-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.35).toFixed(2))))}
            aria-label="Zoom in map"
            className="p-1.5 ws-text-2 ws-row-hover ws-radius-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.35).toFixed(2))))}
            aria-label="Zoom out map"
            className="p-1.5 ws-text-2 ws-row-hover ws-radius-sm transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Reset map zoom"
            className="p-1.5 ws-text-2 ws-row-hover ws-radius-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating info panel on hover */}
        {(hoveredCity || hoveredCountry) && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none max-w-xs ws-popover px-3.5 py-2.5">
            {hoveredCity ? (
              <div>
                <p className="text-sm font-semibold ws-text">
                  {hoveredCity.name}{' '}
                  <span className="text-xs font-normal ws-text-muted">· {hoveredCity.countryName}</span>
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="ws-text-muted">Population ({dataYear})</span>
                  <span className="font-mono tabular-nums text-right ws-text-2">
                    {formatCompactNumber(hoveredCity.population)}
                  </span>
                  <span className="ws-text-muted">City GDP</span>
                  <span className="font-mono tabular-nums text-right ws-positive">
                    ${hoveredCity.gdpBillions}B
                  </span>
                  <span className="ws-text-muted">Median Age</span>
                  <span className="font-mono tabular-nums text-right ws-warm">
                    {hoveredCity.medianAge.toFixed(1)} yrs
                  </span>
                  <span className="ws-text-muted">2050 Proj</span>
                  <span className="font-mono tabular-nums text-right ws-accent">
                    {formatCompactNumber(hoveredCity.projected2050)}
                  </span>
                </div>
              </div>
            ) : hoveredCountry ? (
              <div>
                <p className="text-sm font-semibold ws-text">
                  {hoveredCountry.name}{' '}
                  <span className="text-xs font-normal ws-text-muted">· {hoveredCountry.region}</span>
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="ws-text-muted">{activeMetricSpec.label}</span>
                  <span className="font-mono tabular-nums text-right ws-accent font-medium">
                    {formatCountryMetricValue(hoveredCountry)}
                  </span>
                  <span className="ws-text-muted">GDP Total ({dataYear})</span>
                  <span className="font-mono tabular-nums text-right ws-text-2">
                    ${hoveredCountry.gdpTrillions.toFixed(2)}T
                  </span>
                  <span className="ws-text-muted">HDI / Renewables</span>
                  <span className="font-mono tabular-nums text-right ws-text-2">
                    {hoveredCountry.indicators.hdiScore.toFixed(3)} · {hoveredCountry.indicators.renewableEnergyPct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="World choropleth map showing demographic, GDP, energy, and development metrics"
          className="w-full h-auto max-h-[430px] block select-none"
        >
          <g
            transform={`translate(${(WIDTH * (1 - zoom)) / 2}, ${(HEIGHT * (1 - zoom)) / 2}) scale(${zoom})`}
            style={{ transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Subtle graticule horizon */}
            <line
              x1={20}
              y1={HEIGHT / 2}
              x2={WIDTH - 20}
              y2={HEIGHT / 2}
              stroke="var(--ws-grid-stroke)"
              strokeDasharray="3 4"
              strokeWidth={0.8}
            />

            {/* Country polygons */}
            {features.map((feat, i) => {
              const idStr = String(feat.id ?? i);
              const matched = countryByIso.get(idStr);
              const d = pathGenerator(feat);
              if (!d) return null;

              const isSelected = Boolean(matched && matched.code === selectedCountryCode);
              const isHovered = Boolean(matched && hoveredCountry && matched.code === hoveredCountry.code);
              const fill = matched ? interpolateColor(metric, matched) : 'var(--ws-map-untracked)';

              return (
                <path
                  key={`${idStr}-${i}`}
                  d={d}
                  data-map-country={matched?.code}
                  fill={fill}
                  fillOpacity={matched ? (isHovered || isSelected ? 1 : 0.92) : 0.85}
                  stroke={
                    isSelected
                      ? 'var(--ws-map-selected-stroke)'
                      : isHovered
                        ? 'var(--ws-accent)'
                        : 'var(--ws-map-stroke)'
                  }
                  strokeWidth={isSelected ? 1.6 / zoom : isHovered ? 1.3 / zoom : 0.65 / zoom}
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
                const radius = Math.max(2.3, Math.min(5.8, Math.sqrt(city.metroPopulation / 1_000_000) * 1.05)) / Math.sqrt(zoom);
                const isCityHovered = hoveredCity?.id === city.id;
                return (
                  <circle
                    key={city.id}
                    cx={coords[0]}
                    cy={coords[1]}
                    r={isCityHovered ? radius * 1.5 : radius}
                    fill="#F59E0B"
                    fillOpacity={isCityHovered ? 1 : 0.88}
                    stroke="var(--ws-map-stroke)"
                    strokeWidth={0.8 / Math.sqrt(zoom)}
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
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-t ws-border text-xs ws-text-muted">
        <div className="flex items-center gap-3">
          <span>Scale ({activeMetricSpec.label}):</span>
          <span className="font-mono tabular-nums ws-text-2">{activeMetricSpec.legendLow}</span>
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {activeMetricSpec.palette.map((hex, idx) => (
              <span
                key={`${activeMetricSpec.key}-${idx}`}
                className="w-5 h-2 rounded-xs"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <span className="font-mono tabular-nums ws-text-2">{activeMetricSpec.legendHigh}</span>
        </div>

        <div className="flex items-center gap-4 text-xs ws-text-muted">
          <span>{countries.length} Tracked Nations</span>
          <span aria-hidden="true">·</span>
          <span>Amber nodes sized by Metro Population</span>
        </div>
      </div>

      <SourceFootnote
        sourceText={`Natural Earth / World Atlas TopoJSON · UN DESA WPP (${dataYear}) · IMF WEO (${dataYear}) · UNDP HDI · IEA & Global Carbon Project`}
        vintage={`${dataYear} Annual Series`}
        onOpenSources={onOpenSources}
      />
    </section>
  );
}
