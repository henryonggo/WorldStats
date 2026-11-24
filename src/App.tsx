import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Bookmark,
  BookmarkPlus,
  BookOpen,
  Building2,
  Calendar,
  Check,
  Globe2,
  Menu,
  Monitor,
  Moon,
  Palette,
  Share2,
  Ship,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { CITIES, COUNTRIES } from './data/worldDataset';
import { COUNTRY_TRADE_PROFILES, TRADE_PROFILE_BY_COUNTRY } from './data/tradeDataset';
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
  AVAILABLE_TRADE_YEARS,
  DEFAULT_DATA_YEAR,
  DEFAULT_TRADE_YEAR,
  type AiSuggestedAction,
  type AppView,
  type CityRecord,
  type CountrySortKey,
  type DataYear,
  type LedgerLens,
  type SavedWorkspace,
  type TradeReferenceSource,
  type TradeYear,
} from './types/worldStats';
import {
  buildAppUrlSearch,
  computeProjectedChange2050Pct,
  computeProjectedGdpGrowth10YrPct,
  computeWorkingAgeShare,
  formatCurrency,
  formatSignedPct,
  parseAppUrlState,
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
  exportCountryTradeDetailAsCsv,
  exportGlobalOverviewPdf,
  exportTradeLedgerAsCsv,
  exportTradeReportPdf,
} from './utils/exportReports';
import {
  buildTradeSourceReconciliation,
  resolveGlobalTradeLedger,
} from './utils/tradeAnalytics';
import { LiveGlobalStrip } from './components/LiveGlobalStrip';
import { WorldChoroplethMap } from './components/WorldChoroplethMap';
import { GdpCorrelationChart } from './components/GdpCorrelationChart';
import { CountryAnalyticsView } from './components/CountryAnalyticsView';
import { CitiesExplorerView } from './components/CitiesExplorerView';
import { CityComparisonView } from './components/CityComparisonView';
import { GlobalTradeView } from './components/GlobalTradeView';
import { ExportMenu } from './components/ExportMenu';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { SourceFootnote } from './components/SourceFootnote';
import { SourceFootprintModal } from './components/SourceFootprintModal';
import { AiAnalystDrawer } from './components/AiAnalystDrawer';

const WORKSPACE_STORAGE_KEY = 'worldstats-workspace-v2';
const SAVED_VIEWS_STORAGE_KEY = 'worldstats-saved-views-v1';

const VALID_COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));
const VALID_CITY_IDS = new Set(CITIES.map((c) => c.id));

const NAV_ITEMS: Array<{ id: AppView; label: string; shortLabel: string; icon: typeof Globe2 }> = [
  { id: 'overview', label: 'World Overview', shortLabel: 'Overview', icon: Globe2 },
  { id: 'country', label: 'Country Analytics', shortLabel: 'Country', icon: BarChart3 },
  { id: 'trade', label: 'Global Trade', shortLabel: 'Trade', icon: Ship },
  { id: 'cities', label: 'City Explorer', shortLabel: 'Cities', icon: Building2 },
  { id: 'compare', label: 'Compare Cities', shortLabel: 'Compare', icon: ArrowRightLeft },
];

const APPEARANCE_OPTIONS: Array<{ id: AppearanceMode; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

interface LedgerColumnSpec {
  key: CountrySortKey;
  label: string;
  align: 'left' | 'right';
  defaultDir: 'asc' | 'desc';
}

const LEDGER_LENSES: Array<{
  id: LedgerLens;
  label: string;
  columns: LedgerColumnSpec[];
}> = [
  {
    id: 'macro',
    label: 'Macro & Demographics',
    columns: [
      { key: 'name', label: 'Country', align: 'left', defaultDir: 'asc' },
      { key: 'region', label: 'Region', align: 'left', defaultDir: 'asc' },
      { key: 'populationMillions', label: 'Population', align: 'right', defaultDir: 'desc' },
      { key: 'medianAge', label: 'Median Age', align: 'right', defaultDir: 'desc' },
      { key: 'workingAgeShare', label: 'Working 15–64', align: 'right', defaultDir: 'desc' },
      { key: 'gdpTrillions', label: 'GDP (USD)', align: 'right', defaultDir: 'desc' },
      { key: 'gdpPerCapita', label: 'GDP / Cap', align: 'right', defaultDir: 'desc' },
      { key: 'projectedGdp10Yr', label: '10-Yr Proj. GDP', align: 'right', defaultDir: 'desc' },
      { key: 'projectedChange2050', label: '2050 Pop', align: 'right', defaultDir: 'desc' },
    ],
  },
  {
    id: 'healthEducation',
    label: 'Health & Education',
    columns: [
      { key: 'name', label: 'Country', align: 'left', defaultDir: 'asc' },
      { key: 'region', label: 'Region', align: 'left', defaultDir: 'asc' },
      { key: 'hdiScore', label: 'HDI Score', align: 'right', defaultDir: 'desc' },
      { key: 'lifeExpectancy', label: 'Life Exp.', align: 'right', defaultDir: 'desc' },
      { key: 'healthExpenditurePctGdp', label: 'Health % GDP', align: 'right', defaultDir: 'desc' },
      { key: 'physiciansPer1000', label: 'Physicians / 1k', align: 'right', defaultDir: 'desc' },
      { key: 'tertiaryEnrollmentPct', label: 'Tertiary Ed %', align: 'right', defaultDir: 'desc' },
      { key: 'rdExpenditurePctGdp', label: 'R&D % GDP', align: 'right', defaultDir: 'desc' },
    ],
  },
  {
    id: 'energyInequality',
    label: 'Energy & Inequality',
    columns: [
      { key: 'name', label: 'Country', align: 'left', defaultDir: 'asc' },
      { key: 'region', label: 'Region', align: 'left', defaultDir: 'asc' },
      { key: 'co2PerCapitaTons', label: 'CO₂ / Cap (t)', align: 'right', defaultDir: 'desc' },
      { key: 'renewableEnergyPct', label: 'Renewables %', align: 'right', defaultDir: 'desc' },
      { key: 'pm25AirQuality', label: 'PM2.5 (µg/m³)', align: 'right', defaultDir: 'asc' },
      { key: 'giniIndex', label: 'Gini Index', align: 'right', defaultDir: 'desc' },
      { key: 'internetPenetrationPct', label: 'Internet %', align: 'right', defaultDir: 'desc' },
      { key: 'gdpPerCapita', label: 'GDP / Cap', align: 'right', defaultDir: 'desc' },
    ],
  },
];

interface PersistedWorkspace {
  dataYear: DataYear;
  selectedCountryCode: string;
  selectedCityId: string | null;
  compareCityIds: string[];
  tradeReference?: TradeReferenceSource;
  tradeYear?: TradeYear;
}

function loadInitialState(): {
  view: AppView;
  dataYear: DataYear;
  selectedCountryCode: string;
  selectedCityId: string | null;
  compareCityIds: string[];
  tradeReference: TradeReferenceSource;
  tradeYear: TradeYear;
} {
  let saved: Partial<PersistedWorkspace> = {};
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (raw) saved = JSON.parse(raw) as Partial<PersistedWorkspace>;
  } catch {
    // Ignore storage access failures
  }

  const fromUrl =
    typeof window !== 'undefined'
      ? parseAppUrlState(window.location.search, VALID_COUNTRY_CODES, VALID_CITY_IDS)
      : {};

  const savedCompare = Array.isArray(saved.compareCityIds)
    ? saved.compareCityIds.filter((id) => VALID_CITY_IDS.has(id)).slice(0, 4)
    : [];

  return {
    view: fromUrl.view ?? 'overview',
    dataYear:
      fromUrl.year ??
      (AVAILABLE_DATA_YEARS.includes(saved.dataYear as DataYear)
        ? (saved.dataYear as DataYear)
        : DEFAULT_DATA_YEAR),
    selectedCountryCode:
      fromUrl.countryCode ??
      (saved.selectedCountryCode && VALID_COUNTRY_CODES.has(saved.selectedCountryCode)
        ? saved.selectedCountryCode
        : 'JPN'),
    selectedCityId:
      fromUrl.cityId ??
      (saved.selectedCityId && VALID_CITY_IDS.has(saved.selectedCityId)
        ? saved.selectedCityId
        : 'jpn-tyo'),
    compareCityIds:
      fromUrl.compareCityIds ??
      (savedCompare.length >= 2
        ? savedCompare
        : ['jpn-tyo', 'usa-nyc', 'gbr-lon', 'nga-los']),
    tradeReference:
      fromUrl.tradeRef ??
      (saved.tradeReference === 'national' || saved.tradeReference === 'global'
        ? saved.tradeReference
        : 'global'),
    tradeYear:
      fromUrl.tradeYear ??
      (AVAILABLE_TRADE_YEARS.includes(saved.tradeYear as TradeYear)
        ? (saved.tradeYear as TradeYear)
        : DEFAULT_TRADE_YEAR),
  };
}

function loadSavedWorkspaces(): SavedWorkspace[] {
  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedWorkspace[]).slice(0, 12) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [activeView, setActiveView] = useState<AppView>(initial.view);
  const [dataYear, setDataYear] = useState<DataYear>(initial.dataYear);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(initial.selectedCountryCode);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(initial.selectedCityId);
  const [compareCityIds, setCompareCityIds] = useState<string[]>(initial.compareCityIds);
  const [tradeReference, setTradeReference] = useState<TradeReferenceSource>(initial.tradeReference);
  const [tradeYear, setTradeYear] = useState<TradeYear>(initial.tradeYear);

  const [ledgerLens, setLedgerLens] = useState<LedgerLens>('macro');
  const [countrySortBy, setCountrySortBy] = useState<CountrySortKey>('gdpTrillions');
  const [countrySortDir, setCountrySortDir] = useState<'asc' | 'desc'>('desc');
  const [sidebarCountryQuery, setSidebarCountryQuery] = useState('');

  const [savedWorkspaces, setSavedWorkspaces] = useState<SavedWorkspace[]>(() =>
    loadSavedWorkspaces()
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [pendingAiPrompt, setPendingAiPrompt] = useState<string | null>(null);

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

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  const effectiveAppearance = resolveEffectiveAppearance(appearanceMode, systemPrefersDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', effectiveAppearance === 'dark');
    root.setAttribute('data-appearance', effectiveAppearance);
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, appearanceMode);
    } catch {
      // Ignore storage restrictions
    }
  }, [appearanceMode, effectiveAppearance]);

  useEffect(() => {
    document.documentElement.setAttribute('data-design-theme', designTheme);
    try {
      window.localStorage.setItem(DESIGN_THEME_STORAGE_KEY, designTheme);
    } catch {
      // Ignore storage restrictions
    }
  }, [designTheme]);

  // Persist workspace selections automatically
  useEffect(() => {
    try {
      const payload: PersistedWorkspace = {
        dataYear,
        selectedCountryCode,
        selectedCityId,
        compareCityIds,
        tradeReference,
        tradeYear,
      };
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage restrictions
    }
  }, [dataYear, selectedCountryCode, selectedCityId, compareCityIds, tradeReference, tradeYear]);

  // Persist Saved Views list
  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(savedWorkspaces));
    } catch {
      // Ignore storage restrictions
    }
  }, [savedWorkspaces]);

  // Keep URL query params cleanly synchronized for deep links & sharing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextSearch = buildAppUrlSearch({
      view: activeView,
      year: dataYear,
      countryCode: selectedCountryCode,
      cityId: selectedCityId,
      compareCityIds,
      tradeRef: tradeReference,
      tradeYear,
    });
    if (window.location.search !== nextSearch) {
      window.history.replaceState(null, '', `${window.location.pathname}${nextSearch}`);
    }
  }, [activeView, dataYear, selectedCountryCode, selectedCityId, compareCityIds, tradeReference, tradeYear]);

  // Support browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseAppUrlState(window.location.search, VALID_COUNTRY_CODES, VALID_CITY_IDS);
      if (parsed.view) setActiveView(parsed.view);
      if (parsed.year) setDataYear(parsed.year);
      if (parsed.countryCode) setSelectedCountryCode(parsed.countryCode);
      if (parsed.cityId) setSelectedCityId(parsed.cityId);
      if (parsed.compareCityIds) setCompareCityIds(parsed.compareCityIds);
      if (parsed.tradeRef) setTradeReference(parsed.tradeRef);
      if (parsed.tradeYear) setTradeYear(parsed.tradeYear);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const scrollViewportTop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const navigateView = useCallback(
    (
      nextView: AppView,
      nextState?: {
        countryCode?: string;
        cityId?: string | null;
        compareCityIds?: string[];
        year?: DataYear;
        tradeRef?: TradeReferenceSource;
        tradeYear?: TradeYear;
      }
    ) => {
      const targetYear = nextState?.year ?? dataYear;
      const targetCountry = nextState?.countryCode ?? selectedCountryCode;
      const targetCity = nextState?.cityId !== undefined ? nextState.cityId : selectedCityId;
      const targetCompare = nextState?.compareCityIds ?? compareCityIds;
      const targetTradeRef = nextState?.tradeRef ?? tradeReference;
      const targetTradeYear = nextState?.tradeYear ?? tradeYear;

      if (nextState?.year) setDataYear(nextState.year);
      if (nextState?.countryCode) setSelectedCountryCode(nextState.countryCode);
      if (nextState?.cityId !== undefined) setSelectedCityId(nextState.cityId);
      if (nextState?.compareCityIds) setCompareCityIds(nextState.compareCityIds);
      if (nextState?.tradeRef) setTradeReference(nextState.tradeRef);
      if (nextState?.tradeYear) setTradeYear(nextState.tradeYear);

      setActiveView(nextView);
      setMobileMenuOpen(false);
      scrollViewportTop();

      if (typeof window !== 'undefined') {
        const nextSearch = buildAppUrlSearch({
          view: nextView,
          year: targetYear,
          countryCode: targetCountry,
          cityId: targetCity,
          compareCityIds: targetCompare,
          tradeRef: targetTradeRef,
          tradeYear: targetTradeYear,
        });
        if (window.location.search !== nextSearch) {
          window.history.pushState(null, '', `${window.location.pathname}${nextSearch}`);
        }
      }
    },
    [compareCityIds, dataYear, scrollViewportTop, selectedCityId, selectedCountryCode, tradeReference, tradeYear]
  );

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

  const filteredSidebarCountries = useMemo(() => {
    const q = sidebarCountryQuery.trim().toLowerCase();
    if (!q) return activeCountries;
    return activeCountries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [activeCountries, sidebarCountryQuery]);

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

  const activeLensSpec = useMemo(
    () => LEDGER_LENSES.find((l) => l.id === ledgerLens) ?? LEDGER_LENSES[0],
    [ledgerLens]
  );

  const showNotice = useCallback((message: string) => {
    setStatusNotice(message);
    window.setTimeout(() => {
      setStatusNotice((prev) => (prev === message ? null : prev));
    }, 3800);
  }, []);

  const handleSwitchLedgerLens = (nextLens: LedgerLens) => {
    setLedgerLens(nextLens);
    if (nextLens === 'macro') {
      setCountrySortBy('gdpTrillions');
      setCountrySortDir('desc');
    } else if (nextLens === 'healthEducation') {
      setCountrySortBy('hdiScore');
      setCountrySortDir('desc');
    } else {
      setCountrySortBy('renewableEnergyPct');
      setCountrySortDir('desc');
    }
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
    navigateView('country', { countryCode: code });
  };

  const handleSelectCityFromMap = (city: CityRecord) => {
    navigateView('cities', { cityId: city.id, countryCode: city.countryCode });
  };

  const handleAddCityToComparison = (cityId: string) => {
    const nextIds = compareCityIds.includes(cityId)
      ? compareCityIds
      : compareCityIds.length >= 4
        ? [...compareCityIds.slice(0, 3), cityId]
        : [...compareCityIds, cityId];
    navigateView('compare', { compareCityIds: nextIds });
  };

  const handleCompareCityGroup = (cityIds: string[]) => {
    navigateView('compare', { compareCityIds: cityIds.slice(0, 4) });
  };

  const handleApplyAiAction = (action: AiSuggestedAction) => {
    if (action.view === 'country' && action.countryCode) {
      navigateView('country', { countryCode: action.countryCode });
      return;
    }
    if (action.view === 'trade' && action.countryCode) {
      navigateView('trade', { countryCode: action.countryCode });
      return;
    }
    if (action.view === 'compare' && action.cityIds && action.cityIds.length > 0) {
      navigateView('compare', { compareCityIds: action.cityIds.slice(0, 4) });
      return;
    }
    if (action.view === 'cities' && action.cityIds && action.cityIds.length > 0) {
      navigateView('cities', { cityId: action.cityIds[0] });
      return;
    }
    navigateView(action.view);
  };

  const handleSaveCurrentView = () => {
    const label =
      activeView === 'country'
        ? `${selectedCountry.name} (${dataYear})`
        : activeView === 'trade'
          ? `${selectedCountry.name} Trade · ${tradeReference === 'global' ? 'WTO' : 'National'} (${tradeYear})`
          : activeView === 'compare'
            ? `${selectedCompareCities.slice(0, 2).map((c) => c.name).join(' vs ')} (${dataYear})`
            : activeView === 'cities'
              ? `City Explorer (${dataYear})`
              : `World Overview (${dataYear})`;

    const workspace: SavedWorkspace = {
      id: `${Date.now()}`,
      name: label,
      view: activeView,
      dataYear,
      countryCode: selectedCountryCode,
      cityId: selectedCityId,
      compareCityIds: [...compareCityIds],
      tradeReference,
      tradeYear,
      createdAt: new Date().toISOString(),
    };
    setSavedWorkspaces((prev) => [workspace, ...prev.filter((w) => w.name !== label)].slice(0, 8));
    showNotice(`Saved view: ${label}`);
  };

  const handleRestoreWorkspace = (ws: SavedWorkspace) => {
    navigateView(ws.view, {
      year: ws.dataYear,
      countryCode: ws.countryCode,
      cityId: ws.cityId,
      compareCityIds: ws.compareCityIds,
      tradeRef: ws.tradeReference,
      tradeYear: ws.tradeYear,
    });
    showNotice(`Loaded saved view: ${ws.name}`);
  };

  const handleCopyShareLink = async () => {
    const shareSearch = buildAppUrlSearch({
      view: activeView,
      year: dataYear,
      countryCode: selectedCountryCode,
      cityId: selectedCityId,
      compareCityIds,
      tradeRef: tradeReference,
      tradeYear,
    });
    const url = `${window.location.origin}${window.location.pathname}${shareSearch}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      showNotice('Deep link copied to clipboard');
    } catch {
      showNotice('Shareable URL synced in address bar');
    }
  };

  const exportMeta = useMemo(() => {
    if (activeView === 'overview') {
      return {
        scope: `Global Atlas · ${dataYear}`,
        rows: `${activeCountries.length} economies · 28 columns (Macro, Health, Energy, Gini)`,
      };
    }
    if (activeView === 'country') {
      return {
        scope: `${selectedCountry.name} Profile · ${dataYear}`,
        rows: `${selectedCountryCities.length} tracked cities + age pyramid & policy scorecard`,
      };
    }
    if (activeView === 'trade') {
      return {
        scope: `Global Trade · ${tradeReference === 'global' ? 'WTO/UN' : 'National Customs'} · ${tradeYear}`,
        rows: `${selectedCountry.name} detail + 48-economy export/import ledger`,
      };
    }
    if (activeView === 'cities') {
      return {
        scope: `City Directory · ${dataYear}`,
        rows: `${activeCities.length} global hubs · 20 demographic & GDP columns`,
      };
    }
    return {
      scope: `City Comparison · ${dataYear}`,
      rows: `${selectedCompareCities.map((c) => c.name).join(' vs ')}`,
    };
  }, [activeView, dataYear, activeCountries.length, selectedCountry, selectedCountryCities.length, activeCities.length, selectedCompareCities, tradeReference, tradeYear]);

  const handleExportCsv = () => {
    if (activeView === 'overview') {
      const file = exportCountriesAsCsv(sortedLedgerCountries, dataYear);
      showNotice(`Exported ${file}`);
    } else if (activeView === 'country') {
      const file = exportCitiesAsCsv(selectedCountryCities, `${selectedCountry.code}-cities`, dataYear);
      showNotice(`Exported ${file}`);
    } else if (activeView === 'trade') {
      const { rows } = resolveGlobalTradeLedger(
        COUNTRY_TRADE_PROFILES,
        countryByCode,
        tradeYear,
        tradeReference
      );
      const file = exportTradeLedgerAsCsv(rows, tradeYear, tradeReference);
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
    } else if (activeView === 'trade') {
      const { rows } = resolveGlobalTradeLedger(
        COUNTRY_TRADE_PROFILES,
        countryByCode,
        tradeYear,
        tradeReference
      );
      const focusedRow = rows.find((r) => r.countryCode === selectedCountry.code) ?? rows[0];
      const profile =
        TRADE_PROFILE_BY_COUNTRY[focusedRow.countryCode] ?? COUNTRY_TRADE_PROFILES[0];
      const recon = buildTradeSourceReconciliation(profile, focusedRow.countryName, tradeYear);
      const file = exportTradeReportPdf(focusedRow, recon, rows);
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
    if (activeView === 'overview') return 'World Overview';
    if (activeView === 'country') return `Country · ${selectedCountry.name}`;
    if (activeView === 'trade') return `Global Trade · ${selectedCountry.name}`;
    if (activeView === 'cities') return 'City Explorer';
    return 'Compare Cities';
  }, [activeView, selectedCountry]);

  return (
    <div className="relative min-h-screen ws-text flex">
      {/* Keyboard Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:text-xs focus:font-semibold ws-btn-primary"
      >
        Skip to main content
      </a>

      {/* Theme-Aware Canvas Backdrop */}
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
            onClick={() => navigateView('overview')}
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
                data-nav-view={item.id}
                onClick={() => navigateView(item.id)}
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

        {/* Saved Workspaces / Bookmarks */}
        {savedWorkspaces.length > 0 && (
          <div className="px-3 py-2 border-t ws-border shrink-0 max-h-36 overflow-y-auto">
            <p className="px-2 mb-1 text-[11px] font-medium ws-text-muted flex items-center gap-1.5">
              <Bookmark className="w-3 h-3 ws-accent" />
              <span>Saved Views ({savedWorkspaces.length})</span>
            </p>
            <div className="space-y-0.5">
              {savedWorkspaces.map((ws) => (
                <div
                  key={ws.id}
                  data-testid="saved-workspace-item"
                  className="flex items-center justify-between gap-1 px-2 py-1 text-xs ws-row-hover ws-radius-sm"
                >
                  <button
                    type="button"
                    onClick={() => handleRestoreWorkspace(ws)}
                    className="flex-1 text-left truncate ws-text-2 hover:ws-text cursor-pointer"
                  >
                    {ws.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove saved view ${ws.name}`}
                    onClick={() =>
                      setSavedWorkspaces((prev) => prev.filter((item) => item.id !== ws.id))
                    }
                    className="p-0.5 ws-text-muted hover:ws-negative cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Country Directory in Sidebar (48 Nations + Filter) */}
        <div className="mt-1 pt-2.5 border-t ws-border flex-1 overflow-y-auto px-3 pb-3 flex flex-col min-h-0">
          <div className="px-1 mb-1.5 space-y-1.5 shrink-0">
            <p className="px-1 text-[11px] font-medium ws-text-muted">
              Quick Country Jump ({activeCountries.length})
            </p>
            <input
              type="search"
              value={sidebarCountryQuery}
              onChange={(e) => setSidebarCountryQuery(e.target.value)}
              placeholder="Filter 48 nations..."
              aria-label="Filter country jump list"
              className="w-full ws-input px-2.5 py-1 text-[11px] focus:outline-none"
            />
          </div>
          <div className="space-y-0.5 overflow-y-auto flex-1">
            {filteredSidebarCountries.map((country) => {
              const isSelected =
                (activeView === 'country' || activeView === 'trade') &&
                country.code === selectedCountryCode;
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() =>
                    activeView === 'trade'
                      ? navigateView('trade', { countryCode: country.code })
                      : handleSelectCountryFromMapOrChart(country.code)
                  }
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
            {activeCountries.length} Nations · {activeCities.length} Hubs · {dataYear} Series
          </p>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-14 ws-header px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 ws-text-2 ws-row-hover ws-radius-sm cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="hidden sm:inline text-xs sm:text-sm font-medium ws-text-2 truncate">
              {breadcrumbTrail}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {statusNotice && (
              <span
                role="status"
                aria-live="polite"
                className="hidden 2xl:inline-flex items-center gap-1.5 text-xs ws-positive whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{statusNotice}</span>
              </span>
            )}

            {/* Global Reporting Year Selector */}
            <label className="inline-flex items-center gap-1 ws-input px-2 py-1.5 text-xs shrink-0">
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

            {/* Save Current View Bookmark */}
            <button
              type="button"
              data-testid="save-view-btn"
              onClick={handleSaveCurrentView}
              title="Save current view & filters"
              aria-label="Save current view"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ws-btn-subtle whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Save View</span>
            </button>

            {/* Copy Deep Link */}
            <button
              type="button"
              data-testid="share-link-btn"
              onClick={() => void handleCopyShareLink()}
              title="Copy shareable deep link"
              aria-label="Copy shareable link"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ws-btn-subtle whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Share</span>
            </button>

            {/* WorldStats AI Analyst Trigger */}
            <button
              type="button"
              data-testid="open-ai-analyst-btn"
              onClick={() => setAiDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold ws-nav-active whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>

            <ExportMenu
              scopeLabel={exportMeta.scope}
              rowSummary={exportMeta.rows}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
            />
          </div>
        </header>

        {/* Responsive Mobile/Tablet View Switcher Strip (Always visible < lg) */}
        <nav
          aria-label="Mobile section switcher"
          data-testid="mobile-view-tabs"
          className="lg:hidden sticky top-14 z-20 ws-header border-t-0 px-2 py-1.5 grid grid-cols-5 gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-mobile-nav-view={item.id}
                onClick={() => navigateView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 py-1.5 text-[10px] sm:text-xs font-medium whitespace-nowrap cursor-pointer min-w-0 ${
                  isActive ? 'ws-nav-active' : 'ws-btn-subtle'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile/Tablet Status Toast Banner */}
        {statusNotice && (
          <div
            role="status"
            aria-live="polite"
            className="2xl:hidden px-4 py-2 ws-subpanel border-b ws-border text-xs ws-positive flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Main Viewport */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto space-y-6 focus:outline-none"
        >
          {activeView === 'overview' && (
            <>
              <LiveGlobalStrip
                countries={activeCountries}
                cities={activeCities}
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

              {/* Multi-Lens Sortable Global Country Statistical Ledger (48 Economies) */}
              <section
                aria-label="Global country demographics, development and GDP table"
                className="ws-panel overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b ws-border">
                  <div>
                    <h2 className="text-base font-semibold ws-text">
                      Global Country Demographics, Policy &amp; GDP Ledger ({activeCountries.length} Economies · {dataYear})
                    </h2>
                    <p className="text-xs ws-text-muted mt-0.5">
                      Switch analytical lenses, click any column to sort, or click any country row for full pyramids, policy scorecard &amp; cities
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      role="group"
                      aria-label="Select ledger indicator lens"
                      className="inline-flex items-center p-0.5 ws-inset"
                    >
                      {LEDGER_LENSES.map((lens) => (
                        <button
                          key={lens.id}
                          type="button"
                          data-ledger-lens={lens.id}
                          aria-pressed={ledgerLens === lens.id}
                          onClick={() => handleSwitchLedgerLens(lens.id)}
                          className={`px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            ledgerLens === lens.id
                              ? 'ws-nav-active'
                              : 'ws-text-muted hover:ws-text border border-transparent ws-radius-sm'
                          }`}
                        >
                          {lens.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs" data-testid="global-country-ledger">
                    <thead>
                      <tr className="border-b ws-border ws-subpanel ws-text-2">
                        {activeLensSpec.columns.map((col, idx) => {
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
                              className={`py-2.5 ${idx === 0 ? 'px-4 sticky left-0 z-10 ws-subpanel' : 'px-3'} font-medium whitespace-nowrap ${
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
                        const ind = country.indicators;
                        return (
                          <tr
                            key={country.code}
                            data-country-code={country.code}
                            onClick={() => handleSelectCountryFromMapOrChart(country.code)}
                            className="ws-row-hover cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-4 font-medium ws-text whitespace-nowrap sticky left-0 ws-subpanel">
                              {country.name}
                            </td>
                            <td className="py-2.5 px-3 ws-text-muted whitespace-nowrap">
                              {country.region}
                            </td>

                            {ledgerLens === 'macro' && (
                              <>
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
                              </>
                            )}

                            {ledgerLens === 'healthEducation' && (
                              <>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-accent font-medium">
                                  {ind.hdiScore.toFixed(3)}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-text-2">
                                  {country.lifeExpectancy.toFixed(1)}y
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-text-2">
                                  {ind.healthExpenditurePctGdp.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-text-2">
                                  {ind.physiciansPer1000.toFixed(1)}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-positive">
                                  {ind.tertiaryEnrollmentPct.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-warm">
                                  {ind.rdExpenditurePctGdp.toFixed(2)}%
                                </td>
                              </>
                            )}

                            {ledgerLens === 'energyInequality' && (
                              <>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-warm">
                                  {ind.co2PerCapitaTons.toFixed(1)}t
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-positive font-medium">
                                  {ind.renewableEnergyPct.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-text-2">
                                  {ind.pm25AirQuality.toFixed(1)}
                                </td>
                                <td
                                  className={`py-2.5 px-3 font-mono tabular-nums text-right ${
                                    ind.giniIndex >= 45 ? 'ws-negative' : 'ws-text-2'
                                  }`}
                                >
                                  {ind.giniIndex.toFixed(1)}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-accent">
                                  {ind.internetPenetrationPct.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right ws-text-2">
                                  {formatCurrency(country.gdpPerCapita)}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <SourceFootnote
                  sourceText={`UN DESA WPP (${dataYear}) · IMF WEO (${dataYear}) · WHO · UNDP HDI · UNESCO · IEA · Global Carbon Project · 48 National Statistical Offices`}
                  vintage={`${dataYear} Multi-Lens Ledger`}
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
              onSelectCountry={(code) => navigateView('country', { countryCode: code })}
              onInspectTrade={(code) => navigateView('trade', { countryCode: code })}
              onCompareCities={handleCompareCityGroup}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              onOpenSources={() => setSourcesModalOpen(true)}
              onAskAi={(prompt) => {
                setPendingAiPrompt(prompt);
                setAiDrawerOpen(true);
              }}
            />
          )}

          {activeView === 'trade' && (
            <GlobalTradeView
              countries={activeCountries}
              tradeProfiles={COUNTRY_TRADE_PROFILES}
              selectedCountryCode={selectedCountry.code}
              tradeYear={tradeYear}
              tradeReference={tradeReference}
              onSelectCountry={(code) => navigateView('trade', { countryCode: code })}
              onChangeTradeYear={setTradeYear}
              onChangeTradeReference={setTradeReference}
              onExportCountryCsv={(row, recon) => {
                const file = exportCountryTradeDetailAsCsv(row, recon);
                showNotice(`Exported ${file}`);
              }}
              onExportLedgerCsv={(rows) => {
                const file = exportTradeLedgerAsCsv(rows, tradeYear, tradeReference);
                showNotice(`Exported ${file}`);
              }}
              onExportPdf={(row, recon, allRows) => {
                const file = exportTradeReportPdf(row, recon, allRows);
                showNotice(`Generated ${file}`);
              }}
              onOpenSources={() => setSourcesModalOpen(true)}
              onAskAi={(prompt) => {
                setPendingAiPrompt(prompt);
                setAiDrawerOpen(true);
              }}
              onInspectCountryDemographics={(code) =>
                navigateView('country', { countryCode: code })
              }
            />
          )}

          {activeView === 'cities' && (
            <CitiesExplorerView
              cities={activeCities}
              countries={activeCountries}
              dataYear={dataYear}
              selectedCityId={selectedCityId}
              onSelectCity={(cityId) => setSelectedCityId(cityId)}
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

      <AiAnalystDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        countries={activeCountries}
        cities={activeCities}
        activeView={activeView}
        dataYear={dataYear}
        tradeYear={tradeYear}
        tradeReference={tradeReference}
        selectedCountry={selectedCountry}
        selectedCityId={selectedCityId}
        compareCityIds={compareCityIds}
        pendingPrompt={pendingAiPrompt}
        onConsumePendingPrompt={() => setPendingAiPrompt(null)}
        onApplyAction={handleApplyAiAction}
      />
    </div>
  );
}
