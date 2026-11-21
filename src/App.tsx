import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  Check,
  Globe2,
  Menu,
  Monitor,
  Moon,
  Palette,
  Sun,
  X,
} from 'lucide-react';
import { CITIES, COUNTRIES } from './data/worldDataset';
import { DATA_PROVENANCE_NOTICE } from './data/dataSources';
import {
  APPEARANCE_STORAGE_KEY,
  DESIGN_THEME_STORAGE_KEY,
  DESIGN_THEMES,
  resolveAppearanceMode,
  resolveDesignTheme,
  resolveEffectiveAppearance,
  type AppearanceMode,
  type DesignThemeId,
} from './data/themes';
import {
  AVAILABLE_DATA_YEARS,
  DEFAULT_DATA_YEAR,
  type AppView,
  type CityRecord,
  type CountrySortKey,
  type DataYear,
} from './types/worldStats';
import {
  computeProjectedChange2050Pct,
  computeProjectedGdpGrowth10YrPct,
  computeWorkingAgeShare,
  formatCurrency,
  formatSignedPct,
  projectCitiesForYear,
  projectCountriesForYear,
  sortCountries,
} from './utils/analytics';
import {
  exportCitiesAsCsv,
  exportCitiesPdf,
  exportComparisonAsCsv,
  exportComparisonPdf,
  exportCountriesAsCsv,
  exportCountryDetailPdf,
  exportGlobalOverviewPdf,
} from './utils/exportReports';
import { LiveGlobalStrip } from './components/LiveGlobalStrip';
import { WorldChoroplethMap } from './components/WorldChoroplethMap';
import { GdpCorrelationChart } from './components/GdpCorrelationChart';
import { CountryAnalyticsView } from './components/CountryAnalyticsView';
import { CitiesExplorerView } from './components/CitiesExplorerView';
import { CityComparisonView } from './components/CityComparisonView';
import { ExportMenu } from './components/ExportMenu';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { SourceFootnote } from './components/SourceFootnote';
import { SourceFootprintModal } from './components/SourceFootprintModal';

const NAV_ITEMS: Array<{ id: AppView; label: string; icon: typeof Globe2 }> = [
  { id: 'overview', label: 'World Overview', icon: Globe2 },
  { id: 'country', label: 'Country Analytics', icon: BarChart3 },
  { id: 'cities', label: 'City Explorer', icon: Building2 },
  { id: 'compare', label: 'Compare Cities', icon: ArrowRightLeft },
];

const APPEARANCE_OPTIONS: Array<{ id: AppearanceMode; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

const LEDGER_COLUMNS: Array<{
  key: CountrySortKey;
  label: string;
  align: 'left' | 'right';
  defaultDir: 'asc' | 'desc';
}> = [
  { key: 'name', label: 'Country', align: 'left', defaultDir: 'asc' },
  { key: 'region', label: 'Region', align: 'left', defaultDir: 'asc' },
  { key: 'populationMillions', label: 'Population', align: 'right', defaultDir: 'desc' },
  { key: 'medianAge', label: 'Median Age', align: 'right', defaultDir: 'desc' },
  { key: 'workingAgeShare', label: 'Working 15–64', align: 'right', defaultDir: 'desc' },
  { key: 'gdpTrillions', label: 'GDP (USD)', align: 'right', defaultDir: 'desc' },
  { key: 'gdpPerCapita', label: 'GDP / Cap', align: 'right', defaultDir: 'desc' },
  { key: 'projectedGdp10Yr', label: '10-Yr Proj. GDP', align: 'right', defaultDir: 'desc' },
  { key: 'projectedChange2050', label: '2050 Pop', align: 'right', defaultDir: 'desc' },
];

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('overview');
  const [dataYear, setDataYear] = useState<DataYear>(DEFAULT_DATA_YEAR);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('JPN');
  const [selectedCityId, setSelectedCityId] = useState<string | null>('jpn-tyo');
  const [compareCityIds, setCompareCityIds] = useState<string[]>([
    'jpn-tyo',
    'usa-nyc',
    'gbr-lon',
    'nga-los',
  ]);
  const [countrySortBy, setCountrySortBy] = useState<CountrySortKey>('gdpTrillions');
  const [countrySortDir, setCountrySortDir] = useState<'asc' | 'desc'>('desc');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);

  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(() => {
    try {
      return resolveAppearanceMode(window.localStorage.getItem(APPEARANCE_STORAGE_KEY));
    } catch {
      return resolveAppearanceMode(null);
    }
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [designTheme, setDesignTheme] = useState<DesignThemeId>(() => {
    try {
      return resolveDesignTheme(window.localStorage.getItem(DESIGN_THEME_STORAGE_KEY)).id;
    } catch {
      return resolveDesignTheme(null).id;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const effectiveAppearance = resolveEffectiveAppearance(appearanceMode, systemPrefersDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', effectiveAppearance === 'dark');
    root.setAttribute('data-appearance', effectiveAppearance);
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, appearanceMode);
    } catch {
      // Ignore storage restrictions inside sandboxed iframes
    }
  }, [appearanceMode, effectiveAppearance]);

  useEffect(() => {
    document.documentElement.setAttribute('data-design-theme', designTheme);
    try {
      window.localStorage.setItem(DESIGN_THEME_STORAGE_KEY, designTheme);
    } catch {
      // Ignore storage restrictions inside sandboxed iframes
    }
  }, [designTheme]);

  const activeThemeDef = useMemo(() => resolveDesignTheme(designTheme), [designTheme]);

  // Year-projected countries & cities (2024, 2025, 2026)
  const activeCountries = useMemo(
    () => projectCountriesForYear(COUNTRIES, dataYear),
    [dataYear]
  );

  const activeCities = useMemo(
    () => projectCitiesForYear(CITIES, dataYear),
    [dataYear]
  );

  const sortedLedgerCountries = useMemo(
    () => sortCountries(activeCountries, countrySortBy, countrySortDir, dataYear),
    [activeCountries, countrySortBy, countrySortDir, dataYear]
  );

  const countryByCode = useMemo(
    () => new Map(activeCountries.map((c) => [c.code, c])),
    [activeCountries]
  );

  const selectedCountry = useMemo(
    () => countryByCode.get(selectedCountryCode) ?? activeCountries[0],
    [countryByCode, selectedCountryCode, activeCountries]
  );

  const selectedCountryCities = useMemo(
    () => activeCities.filter((c) => c.countryCode === selectedCountry.code),
    [activeCities, selectedCountry]
  );

  const selectedCompareCities = useMemo(() => {
    const map = new Map(activeCities.map((c) => [c.id, c]));
    return compareCityIds
      .map((id) => map.get(id))
      .filter((c): c is CityRecord => Boolean(c));
  }, [activeCities, compareCityIds]);

  const showNotice = (message: string) => {
    setExportNotice(message);
    window.setTimeout(() => {
      setExportNotice((prev) => (prev === message ? null : prev));
    }, 4000);
  };

  const handleSortLedger = (key: CountrySortKey, defaultDir: 'asc' | 'desc') => {
    if (countrySortBy === key) {
      setCountrySortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setCountrySortBy(key);
      setCountrySortDir(defaultDir);
    }
  };

  const handleSelectCountryFromMapOrChart = (code: string) => {
    setSelectedCountryCode(code);
    setActiveView('country');
    setMobileMenuOpen(false);
  };

  const handleSelectCityFromMap = (city: CityRecord) => {
    setSelectedCityId(city.id);
    setSelectedCountryCode(city.countryCode);
    setActiveView('cities');
    setMobileMenuOpen(false);
  };

  const handleAddCityToComparison = (cityId: string) => {
    setCompareCityIds((prev) => {
      if (prev.includes(cityId)) return prev;
      if (prev.length >= 4) return [...prev.slice(0, 3), cityId];
      return [...prev, cityId];
    });
    setActiveView('compare');
  };

  const handleCompareCityGroup = (cityIds: string[]) => {
    setCompareCityIds(cityIds.slice(0, 4));
    setActiveView('compare');
  };

  const exportScopeLabel = useMemo(() => {
    if (activeView === 'overview') return `Global Dataset · ${dataYear} (24 Countries)`;
    if (activeView === 'country') return `${selectedCountry.name} · ${dataYear} Profile`;
    if (activeView === 'cities') return `All Tracked Cities · ${dataYear} (${activeCities.length})`;
    return `Comparison · ${dataYear} (${selectedCompareCities.map((c) => c.name).join(' vs ')})`;
  }, [activeView, dataYear, selectedCountry, activeCities.length, selectedCompareCities]);

  const handleExportCsv = () => {
    if (activeView === 'overview') {
      const file = exportCountriesAsCsv(sortedLedgerCountries, dataYear);
      showNotice(`Exported ${file}`);
    } else if (activeView === 'country') {
      const file = exportCitiesAsCsv(selectedCountryCities, `${selectedCountry.code}-cities`, dataYear);
      showNotice(`Exported ${file}`);
    } else if (activeView === 'cities') {
      const file = exportCitiesAsCsv(activeCities, 'global-cities', dataYear);
      showNotice(`Exported ${file}`);
    } else {
      const file = exportComparisonAsCsv(selectedCompareCities, countryByCode, dataYear);
      showNotice(`Exported ${file}`);
    }
  };

  const handleExportPdf = () => {
    if (activeView === 'overview') {
      const file = exportGlobalOverviewPdf(sortedLedgerCountries, dataYear);
      showNotice(`Generated ${file}`);
    } else if (activeView === 'country') {
      const file = exportCountryDetailPdf(selectedCountry, selectedCountryCities, dataYear);
      showNotice(`Generated ${file}`);
    } else if (activeView === 'cities') {
      const file = exportCitiesPdf(activeCities, 'All Tracked Global Regions', dataYear);
      showNotice(`Generated ${file}`);
    } else {
      const file = exportComparisonPdf(selectedCompareCities, countryByCode, dataYear);
      showNotice(`Generated ${file}`);
    }
  };

  const breadcrumbTrail = useMemo(() => {
    if (activeView === 'overview') return 'Global Atlas / World Overview';
    if (activeView === 'country') return `Global Atlas / Country Analytics / ${selectedCountry.name}`;
    if (activeView === 'cities') return 'Global Atlas / City Explorer';
    return 'Global Atlas / Side-by-Side Comparison';
  }, [activeView, selectedCountry]);

  return (
    <div className="relative min-h-screen ws-text flex">
      {/* Theme-Aware Canvas Backdrop (Orbs for Glass, Blueprint Grid for Quant, Matte/Warm Paper for Editorial/Nordic) */}
      <div className="ws-canvas-bg" aria-hidden="true" />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Navigation (256px desktop, drawer on mobile) */}
      <aside
        aria-label="Primary navigation sidebar"
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 ws-sidebar flex flex-col transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-14 px-5 flex items-center justify-between border-b ws-border shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveView('overview');
              setMobileMenuOpen(false);
            }}
            className="text-base font-bold font-display tracking-tight ws-text whitespace-nowrap shrink-0 cursor-pointer"
          >
            WorldStats
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 ws-text-muted hover:ws-text rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav aria-label="Main sections" className="p-3 space-y-1 shrink-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'ws-nav-active'
                    : 'ws-text-2 ws-row-hover ws-radius-sm border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Country Directory in Sidebar */}
        <div className="mt-1 pt-2.5 border-t ws-border flex-1 overflow-y-auto px-3 pb-3">
          <p className="px-3 mb-1.5 text-[11px] font-medium ws-text-muted">
            Quick Country Jump ({activeCountries.length})
          </p>
          <div className="space-y-0.5">
            {activeCountries.map((country) => {
              const isSelected =
                activeView === 'country' && country.code === selectedCountryCode;
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelectCountryFromMapOrChart(country.code)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs ws-radius-sm transition-colors cursor-pointer ${
                    isSelected
                      ? 'ws-row-selected ws-text font-medium'
                      : 'ws-text-2 ws-row-hover'
                  }`}
                >
                  <span className="truncate">{country.name}</span>
                  <span className="font-mono tabular-nums text-[11px] ws-text-muted shrink-0">
                    {country.medianAge.toFixed(0)}y
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Appearance (Light / Dark / System) & Design Theme Switcher */}
        <div className="px-3 py-2.5 border-t ws-border space-y-2.5 shrink-0">
          {/* Appearance 3-way control */}
          <div className="space-y-1">
            <div className="px-1 flex items-center justify-between text-[11px]">
              <span className="font-medium ws-text-2">Appearance</span>
              <span className="ws-text-muted capitalize">
                {appearanceMode === 'system' ? `System (${effectiveAppearance})` : appearanceMode}
              </span>
            </div>
            <div
              role="group"
              aria-label="Select appearance mode"
              className="grid grid-cols-3 gap-1 p-0.5 ws-inset"
            >
              {APPEARANCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = appearanceMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-appearance-option={opt.id}
                    aria-pressed={isActive}
                    onClick={() => setAppearanceMode(opt.id)}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'ws-nav-active'
                        : 'ws-text-muted hover:ws-text border border-transparent ws-radius-sm'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Distinct Visual Design Themes */}
          <div className="space-y-1">
            <div className="px-1 flex items-center justify-between text-[11px]">
              <span className="font-medium ws-text-2 inline-flex items-center gap-1.5">
                <Palette className="w-3 h-3 ws-accent" />
                <span>Theme</span>
              </span>
              <span className="ws-text-muted truncate max-w-[115px]">
                {activeThemeDef.styleTag}
              </span>
            </div>
            <div
              role="group"
              aria-label="Select visual theme"
              className="grid grid-cols-2 gap-1.5"
            >
              {DESIGN_THEMES.map((theme) => {
                const isActive = theme.id === designTheme;
                const swatch =
                  effectiveAppearance === 'dark' ? theme.swatchDark : theme.swatchLight;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    data-theme-id={theme.id}
                    aria-pressed={isActive}
                    onClick={() => setDesignTheme(theme.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 text-left text-[11px] font-medium transition-colors cursor-pointer ${
                      isActive ? 'ws-nav-active' : 'ws-btn-subtle'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-3 h-3 shrink-0 rounded-full border ws-border-strong"
                      style={{ background: swatch }}
                    />
                    <span className="truncate">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 border-t ws-border space-y-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSourcesModalOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium ws-accent-link ws-row-hover ws-radius-sm transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Sources &amp; Methodology</span>
          </button>
          <p className="px-2 text-[11px] ws-text-muted">
            24 Nations · {activeCities.length} Hubs · {dataYear} Series
          </p>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-14 ws-header px-4 lg:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 ws-text-2 ws-row-hover ws-radius-sm cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-medium ws-text-2 truncate">
              {breadcrumbTrail}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {exportNotice && (
              <span
                role="status"
                aria-live="polite"
                className="hidden 2xl:inline-flex items-center gap-1.5 text-xs ws-positive whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{exportNotice}</span>
              </span>
            )}

            {/* Global Reporting Year Selector (Defaults to 2026 Latest) */}
            <label className="inline-flex items-center gap-1.5 ws-input px-2.5 py-1.5 text-xs shrink-0">
              <Calendar className="w-3.5 h-3.5 ws-accent shrink-0" aria-hidden="true" />
              <span className="sr-only">Select data year</span>
              <select
                aria-label="Select reporting year"
                data-testid="global-year-select"
                value={dataYear}
                onChange={(e) => setDataYear(Number(e.target.value) as DataYear)}
                className="bg-transparent font-mono tabular-nums text-xs font-medium ws-text focus:outline-none cursor-pointer pr-0.5"
              >
                {AVAILABLE_DATA_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr === DEFAULT_DATA_YEAR ? `${yr} (Latest)` : String(yr)}
                  </option>
                ))}
              </select>
            </label>

            <GlobalSearchBar
              countries={activeCountries}
              cities={activeCities}
              onSelectCountry={handleSelectCountryFromMapOrChart}
              onSelectCity={handleSelectCityFromMap}
              onAddCityToComparison={handleAddCityToComparison}
            />
            <ExportMenu
              scopeLabel={exportScopeLabel}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
            />
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {activeView === 'overview' && (
            <>
              <LiveGlobalStrip
                dataYear={dataYear}
                onOpenSources={() => setSourcesModalOpen(true)}
              />

              <WorldChoroplethMap
                countries={activeCountries}
                cities={activeCities}
                dataYear={dataYear}
                selectedCountryCode={selectedCountryCode}
                onSelectCountry={handleSelectCountryFromMapOrChart}
                onSelectCity={handleSelectCityFromMap}
                onOpenSources={() => setSourcesModalOpen(true)}
              />

              <GdpCorrelationChart
                countries={activeCountries}
                dataYear={dataYear}
                selectedCountryCode={selectedCountryCode}
                onSelectCountry={handleSelectCountryFromMapOrChart}
                onOpenSources={() => setSourcesModalOpen(true)}
              />

              {/* Sortable Global Country Statistical Ledger */}
              <section
                aria-label="Global country demographics and GDP table"
                className="ws-panel overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b ws-border">
                  <div>
                    <h2 className="text-base font-semibold ws-text">
                      Global Country Demographics &amp; GDP Ledger ({dataYear})
                    </h2>
                    <p className="text-xs ws-text-muted mt-0.5">
                      Click any column header to sort · Click a country row to inspect age pyramid, {dataYear}–{dataYear + 10} GDP trajectory, and city breakdown
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('compare')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium ws-accent-link whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Open Side-by-Side City Comparison</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs" data-testid="global-country-ledger">
                    <thead>
                      <tr className="border-b ws-border ws-subpanel ws-text-2">
                        {LEDGER_COLUMNS.map((col, idx) => {
                          const isSorted = countrySortBy === col.key;
                          const SortIcon = !isSorted
                            ? ArrowUpDown
                            : countrySortDir === 'asc'
                              ? ArrowUp
                              : ArrowDown;
                          const ariaSort = isSorted
                            ? countrySortDir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none';
                          return (
                            <th
                              key={col.key}
                              aria-sort={ariaSort}
                              className={`py-2.5 ${idx === 0 ? 'px-4' : 'px-3'} font-medium whitespace-nowrap ${
                                col.align === 'right' ? 'text-right' : 'text-left'
                              }`}
                            >
                              <button
                                type="button"
                                data-sort-col={col.key}
                                onClick={() => handleSortLedger(col.key, col.defaultDir)}
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
                      {sortedLedgerCountries.map((country) => {
                        const working = computeWorkingAgeShare(country.ageBrackets);
                        const change2050 = computeProjectedChange2050Pct(country);
                        const gdp10Yr = computeProjectedGdpGrowth10YrPct(country, dataYear);
                        return (
                          <tr
                            key={country.code}
                            data-country-code={country.code}
                            onClick={() => handleSelectCountryFromMapOrChart(country.code)}
                            className="ws-row-hover cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-4 font-medium ws-text whitespace-nowrap">
                              {country.name}
                            </td>
                            <td className="py-2.5 px-3 ws-text-muted whitespace-nowrap">
                              {country.region}
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-text-2">
                              {country.populationMillions.toFixed(1)}M
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-warm">
                              {country.medianAge.toFixed(1)} yrs
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-text-2">
                              {working.toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-positive">
                              ${country.gdpTrillions.toFixed(2)}T
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-accent">
                              {formatCurrency(country.gdpPerCapita)}
                            </td>
                            <td
                              className={`py-2.5 px-3 font-mono tabular-nums text-right ${
                                gdp10Yr >= 35
                                  ? 'ws-positive font-semibold'
                                  : gdp10Yr >= 0
                                    ? 'ws-positive'
                                    : 'ws-negative'
                              }`}
                            >
                              {formatSignedPct(gdp10Yr)}
                            </td>
                            <td
                              className={`py-2.5 px-3 font-mono tabular-nums text-right ${
                                change2050 >= 0 ? 'ws-positive' : 'ws-negative'
                              }`}
                            >
                              {formatSignedPct(change2050)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <SourceFootnote
                  sourceText={`UN DESA WPP (${dataYear}) · IMF World Economic Outlook (${dataYear}) · World Bank WDI · National Statistical Offices`}
                  vintage={`${dataYear} Reporting Series`}
                  onOpenSources={() => setSourcesModalOpen(true)}
                />
              </section>
            </>
          )}

          {activeView === 'country' && (
            <CountryAnalyticsView
              countries={activeCountries}
              selectedCountry={selectedCountry}
              countryCities={selectedCountryCities}
              dataYear={dataYear}
              onChangeYear={setDataYear}
              onSelectCountry={setSelectedCountryCode}
              onCompareCities={handleCompareCityGroup}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              onOpenSources={() => setSourcesModalOpen(true)}
            />
          )}

          {activeView === 'cities' && (
            <CitiesExplorerView
              cities={activeCities}
              countries={activeCountries}
              dataYear={dataYear}
              selectedCityId={selectedCityId}
              onSelectCity={setSelectedCityId}
              onAddToComparison={handleAddCityToComparison}
              onInspectCountry={handleSelectCountryFromMapOrChart}
              onOpenSources={() => setSourcesModalOpen(true)}
            />
          )}

          {activeView === 'compare' && (
            <CityComparisonView
              cities={activeCities}
              countries={activeCountries}
              dataYear={dataYear}
              selectedCityIds={compareCityIds}
              onChangeCityIds={setCompareCityIds}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              onOpenSources={() => setSourcesModalOpen(true)}
            />
          )}

          {/* Global Data Provenance Footer */}
          <footer className="pt-4 border-t ws-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] ws-text-muted">
            <p className="leading-relaxed max-w-4xl">
              <span className="font-medium ws-text-2">Data Provenance &amp; Accuracy Note ({dataYear} Active):</span>{' '}
              {DATA_PROVENANCE_NOTICE}
            </p>
            <button
              type="button"
              onClick={() => setSourcesModalOpen(true)}
              className="inline-flex items-center gap-1.5 ws-accent-link hover:underline font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>View Full Source Footprint</span>
            </button>
          </footer>
        </main>
      </div>

      <SourceFootprintModal
        open={sourcesModalOpen}
        dataYear={dataYear}
        onClose={() => setSourcesModalOpen(false)}
      />
    </div>
  );
}
