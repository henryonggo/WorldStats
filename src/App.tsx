import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  Globe2,
  Menu,
  X,
} from 'lucide-react';
import { CITIES, COUNTRIES } from './data/worldDataset';
import { DATA_PROVENANCE_NOTICE } from './data/dataSources';
import type { AppView, CityRecord } from './types/worldStats';
import {
  computeProjectedChange2050Pct,
  computeProjectedGdpGrowth10YrPct,
  computeWorkingAgeShare,
  formatCurrency,
  formatSignedPct,
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

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('overview');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('JPN');
  const [selectedCityId, setSelectedCityId] = useState<string | null>('jpn-tyo');
  const [compareCityIds, setCompareCityIds] = useState<string[]>([
    'jpn-tyo',
    'usa-nyc',
    'gbr-lon',
    'nga-los',
  ]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);

  const countryByCode = useMemo(
    () => new Map(COUNTRIES.map((c) => [c.code, c])),
    []
  );

  const selectedCountry = useMemo(
    () => countryByCode.get(selectedCountryCode) ?? COUNTRIES[0],
    [countryByCode, selectedCountryCode]
  );

  const selectedCountryCities = useMemo(
    () => CITIES.filter((c) => c.countryCode === selectedCountry.code),
    [selectedCountry]
  );

  const selectedCompareCities = useMemo(() => {
    const map = new Map(CITIES.map((c) => [c.id, c]));
    return compareCityIds
      .map((id) => map.get(id))
      .filter((c): c is CityRecord => Boolean(c));
  }, [compareCityIds]);

  const showNotice = (message: string) => {
    setExportNotice(message);
    window.setTimeout(() => {
      setExportNotice((prev) => (prev === message ? null : prev));
    }, 4000);
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

  // Context-aware Export Handlers
  const exportScopeLabel = useMemo(() => {
    if (activeView === 'overview') return 'Global Dataset (24 Countries)';
    if (activeView === 'country') return `${selectedCountry.name} Demographics & Cities`;
    if (activeView === 'cities') return `All Tracked Cities (${CITIES.length})`;
    return `Comparison (${selectedCompareCities.map((c) => c.name).join(' vs ')})`;
  }, [activeView, selectedCountry, selectedCompareCities]);

  const handleExportCsv = () => {
    if (activeView === 'overview') {
      const file = exportCountriesAsCsv(COUNTRIES);
      showNotice(`Exported ${file}`);
    } else if (activeView === 'country') {
      const file = exportCitiesAsCsv(selectedCountryCities, `${selectedCountry.code}-cities`);
      showNotice(`Exported ${file}`);
    } else if (activeView === 'cities') {
      const file = exportCitiesAsCsv(CITIES, 'global-cities');
      showNotice(`Exported ${file}`);
    } else {
      const file = exportComparisonAsCsv(selectedCompareCities, countryByCode);
      showNotice(`Exported ${file}`);
    }
  };

  const handleExportPdf = () => {
    if (activeView === 'overview') {
      const file = exportGlobalOverviewPdf(COUNTRIES);
      showNotice(`Generated ${file}`);
    } else if (activeView === 'country') {
      const file = exportCountryDetailPdf(selectedCountry, selectedCountryCities);
      showNotice(`Generated ${file}`);
    } else if (activeView === 'cities') {
      const file = exportCitiesPdf(CITIES, 'All Tracked Global Regions');
      showNotice(`Generated ${file}`);
    } else {
      const file = exportComparisonPdf(selectedCompareCities, countryByCode);
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
    <div className="min-h-screen bg-[#090E17] text-slate-100 flex">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Navigation (256px desktop, drawer on mobile) */}
      <aside
        aria-label="Primary navigation sidebar"
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0B111D] border-r border-slate-800/90 flex flex-col transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveView('overview');
              setMobileMenuOpen(false);
            }}
            className="text-base font-bold font-display tracking-tight text-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            WorldStats
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav aria-label="Main sections" className="p-3 space-y-1">
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
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Country Directory in Sidebar */}
        <div className="mt-2 pt-3 border-t border-slate-800/80 flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 mb-2 text-[11px] font-medium text-slate-400">
            Quick Country Jump ({COUNTRIES.length})
          </p>
          <div className="space-y-0.5">
            {COUNTRIES.map((country) => {
              const isSelected =
                activeView === 'country' && country.code === selectedCountryCode;
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelectCountryFromMapOrChart(country.code)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-slate-50 font-medium'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate">{country.name}</span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
                    {country.medianAge.toFixed(0)}y
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-800/80 space-y-2">
          <button
            type="button"
            onClick={() => {
              setSourcesModalOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-sky-300 hover:text-sky-200 hover:bg-slate-800/60 rounded transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Sources &amp; Methodology</span>
          </button>
          <p className="px-2 text-[11px] text-slate-500">
            24 Nations · {CITIES.length} Metropolitan Hubs
          </p>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-14 bg-[#090E17]/95 backdrop-blur border-b border-slate-800/90 px-4 lg:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-medium text-slate-300 truncate">
              {breadcrumbTrail}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {exportNotice && (
              <span
                role="status"
                aria-live="polite"
                className="hidden xl:inline-flex items-center gap-1.5 text-xs text-emerald-400 whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{exportNotice}</span>
              </span>
            )}
            <GlobalSearchBar
              countries={COUNTRIES}
              cities={CITIES}
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
              <LiveGlobalStrip onOpenSources={() => setSourcesModalOpen(true)} />

              <WorldChoroplethMap
                countries={COUNTRIES}
                cities={CITIES}
                selectedCountryCode={selectedCountryCode}
                onSelectCountry={handleSelectCountryFromMapOrChart}
                onSelectCity={handleSelectCityFromMap}
                onOpenSources={() => setSourcesModalOpen(true)}
              />

              <GdpCorrelationChart
                countries={COUNTRIES}
                selectedCountryCode={selectedCountryCode}
                onSelectCountry={handleSelectCountryFromMapOrChart}
                onOpenSources={() => setSourcesModalOpen(true)}
              />

              {/* Global Country Statistical Ledger */}
              <section
                aria-label="Global country demographics and GDP table"
                className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-slate-800/80">
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      Global Country Demographics &amp; GDP Ledger
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click any country row to view full age structure pyramid, 2100 projections, and city breakdown
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('compare')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Open Side-by-Side City Comparison</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-[#0D1422] text-slate-400">
                        <th className="py-2.5 px-4 font-medium">Country</th>
                        <th className="py-2.5 px-3 font-medium">Region</th>
                        <th className="py-2.5 px-3 font-medium text-right">Population</th>
                        <th className="py-2.5 px-3 font-medium text-right">Median Age</th>
                        <th className="py-2.5 px-3 font-medium text-right">Working 15–64</th>
                        <th className="py-2.5 px-3 font-medium text-right">GDP (USD)</th>
                        <th className="py-2.5 px-3 font-medium text-right">GDP / Cap</th>
                        <th className="py-2.5 px-3 font-medium text-right">10-Yr Proj. GDP</th>
                        <th className="py-2.5 px-3 font-medium text-right">2050 Pop</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {COUNTRIES.map((country) => {
                        const working = computeWorkingAgeShare(country.ageBrackets);
                        const change2050 = computeProjectedChange2050Pct(country);
                        const gdp10Yr = computeProjectedGdpGrowth10YrPct(country);
                        return (
                          <tr
                            key={country.code}
                            onClick={() => handleSelectCountryFromMapOrChart(country.code)}
                            className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-4 font-medium text-slate-100 whitespace-nowrap">
                              {country.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                              {country.region}
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-200">
                              {country.populationMillions.toFixed(1)}M
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right text-amber-300">
                              {country.medianAge.toFixed(1)} yrs
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-300">
                              {working.toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right text-emerald-400">
                              ${country.gdpTrillions.toFixed(2)}T
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-right text-sky-300">
                              {formatCurrency(country.gdpPerCapita)}
                            </td>
                            <td
                              className={`py-2.5 px-3 font-mono tabular-nums text-right ${
                                gdp10Yr >= 35
                                  ? 'text-emerald-300 font-medium'
                                  : gdp10Yr >= 0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                              }`}
                            >
                              {formatSignedPct(gdp10Yr)}
                            </td>
                            <td
                              className={`py-2.5 px-3 font-mono tabular-nums text-right ${
                                change2050 >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
                  sourceText="UN DESA WPP 2024 · IMF World Economic Outlook · World Bank WDI · National Statistical Offices"
                  onOpenSources={() => setSourcesModalOpen(true)}
                />
              </section>
            </>
          )}

          {activeView === 'country' && (
            <CountryAnalyticsView
              countries={COUNTRIES}
              selectedCountry={selectedCountry}
              countryCities={selectedCountryCities}
              onSelectCountry={setSelectedCountryCode}
              onCompareCities={handleCompareCityGroup}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              onOpenSources={() => setSourcesModalOpen(true)}
            />
          )}

          {activeView === 'cities' && (
            <CitiesExplorerView
              cities={CITIES}
              countries={COUNTRIES}
              selectedCityId={selectedCityId}
              onSelectCity={setSelectedCityId}
              onAddToComparison={handleAddCityToComparison}
              onInspectCountry={handleSelectCountryFromMapOrChart}
              onOpenSources={() => setSourcesModalOpen(true)}
            />
          )}

          {activeView === 'compare' && (
            <CityComparisonView
              cities={CITIES}
              countries={COUNTRIES}
              selectedCityIds={compareCityIds}
              onChangeCityIds={setCompareCityIds}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              onOpenSources={() => setSourcesModalOpen(true)}
            />
          )}

          {/* Global Data Provenance Footer */}
          <footer className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-400">
            <p className="leading-relaxed max-w-4xl">
              <span className="font-medium text-slate-300">Data Provenance &amp; Accuracy Note:</span>{' '}
              {DATA_PROVENANCE_NOTICE}
            </p>
            <button
              type="button"
              onClick={() => setSourcesModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 hover:underline font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>View Full Source Footprint</span>
            </button>
          </footer>
        </main>
      </div>

      <SourceFootprintModal
        open={sourcesModalOpen}
        onClose={() => setSourcesModalOpen(false)}
      />
    </div>
  );
}
