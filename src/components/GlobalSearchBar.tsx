import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Building2, Globe2, Search, X } from 'lucide-react';
import type { CityRecord, CountryRecord } from '../types/worldStats';
import {
  formatCompactNumber,
  searchGlobalEntities,
} from '../utils/analytics';

interface GlobalSearchBarProps {
  countries: CountryRecord[];
  cities: CityRecord[];
  onSelectCountry: (countryCode: string) => void;
  onSelectCity: (city: CityRecord) => void;
  onAddCityToComparison: (cityId: string) => void;
}

type FlatResultItem =
  | { kind: 'country'; country: CountryRecord }
  | { kind: 'city'; city: CityRecord };

const FEATURED_COUNTRY_CODES = ['IDN', 'CAN', 'USA', 'JPN'];
const FEATURED_CITY_IDS = ['idn-jkt', 'can-tor', 'jpn-tyo', 'usa-nyc'];

export function GlobalSearchBar({
  countries,
  cities,
  onSelectCountry,
  onSelectCity,
  onAddCityToComparison,
}: GlobalSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const trimmedQuery = query.trim();

  const searchResults = useMemo(
    () => searchGlobalEntities(query, countries, cities, { maxCountries: 5, maxCities: 8 }),
    [query, countries, cities]
  );

  const featuredCountries = useMemo(
    () =>
      FEATURED_COUNTRY_CODES.map((code) => countries.find((c) => c.code === code)).filter(
        (c): c is CountryRecord => Boolean(c)
      ),
    [countries]
  );

  const featuredCities = useMemo(
    () =>
      FEATURED_CITY_IDS.map((id) => cities.find((c) => c.id === id)).filter(
        (c): c is CityRecord => Boolean(c)
      ),
    [cities]
  );

  const displayedCountries = trimmedQuery ? searchResults.countries : featuredCountries;
  const displayedCities = trimmedQuery ? searchResults.cities : featuredCities;

  const flatItems: FlatResultItem[] = useMemo(() => {
    return [
      ...displayedCountries.map((country) => ({ kind: 'country' as const, country })),
      ...displayedCities.map((city) => ({ kind: 'city' as const, city })),
    ];
  }, [displayedCountries, displayedCities]);

  // Clamp active index when result count changes
  const clampedActiveIndex =
    flatItems.length === 0 ? -1 : Math.min(activeIndex, flatItems.length - 1);

  // Close dropdown on outside click
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Global keyboard shortcuts: Cmd/Ctrl+K or "/"
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const isSlash = event.key === '/' && !isEditable && !event.metaKey && !event.ctrlKey && !event.altKey;

      if (isCmdK || isSlash) {
        event.preventDefault();
        if (window.innerWidth < 768) {
          setMobileOpen(true);
          setIsOpen(true);
          window.setTimeout(() => mobileInputRef.current?.focus(), 20);
        } else {
          desktopInputRef.current?.focus();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const commitSelection = (item: FlatResultItem) => {
    if (item.kind === 'country') {
      onSelectCountry(item.country.code);
    } else {
      onSelectCity(item.city);
    }
    setQuery('');
    setIsOpen(false);
    setMobileOpen(false);
    setActiveIndex(0);
    desktopInputRef.current?.blur();
    mobileInputRef.current?.blur();
  };

  const handleCompareCity = (cityId: string) => {
    onAddCityToComparison(cityId);
    setQuery('');
    setIsOpen(false);
    setMobileOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setMobileOpen(false);
      (event.target as HTMLInputElement).blur();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatItems.length);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      }
      return;
    }

    if (event.key === 'Enter' && isOpen && flatItems.length > 0) {
      event.preventDefault();
      const chosen = flatItems[clampedActiveIndex >= 0 ? clampedActiveIndex : 0];
      if (chosen) {
        commitSelection(chosen);
      }
    }
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    const hasResults = displayedCountries.length > 0 || displayedCities.length > 0;

    return (
      <div
        id={listboxId}
        role="listbox"
        aria-label="Global country and city search results"
        className="absolute left-0 right-0 top-full mt-2 bg-[#0D1422] border border-slate-700/90 rounded-lg shadow-2xl overflow-hidden z-50 max-h-[420px] flex flex-col"
      >
        <div className="overflow-y-auto divide-y divide-slate-800/80">
          {!hasResults ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs font-medium text-slate-200">
                No countries or cities matching &ldquo;{trimmedQuery}&rdquo;
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try searching by country name, ISO code (e.g. IDN, CAN), city, or sector.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveIndex(0);
                  desktopInputRef.current?.focus();
                  mobileInputRef.current?.focus();
                }}
                className="mt-3 px-2.5 py-1 text-[11px] font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded transition-colors cursor-pointer"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              {displayedCountries.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 flex items-center justify-between text-[11px] font-medium text-slate-400">
                    <span>{trimmedQuery ? 'Countries' : 'Quick Country Jump'}</span>
                    {trimmedQuery && (
                      <span className="font-mono tabular-nums text-slate-500">
                        {displayedCountries.length} shown
                      </span>
                    )}
                  </div>
                  {displayedCountries.map((country, idx) => {
                    const flatIdx = idx;
                    const isHighlighted = flatIdx === clampedActiveIndex;
                    return (
                      <div
                        key={country.code}
                        id={`${listboxId}-opt-${flatIdx}`}
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                          isHighlighted ? 'bg-sky-500/15' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => commitSelection({ kind: 'country', country })}
                          className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Globe2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-100 truncate">
                                {country.name}{' '}
                                <span className="font-mono text-[11px] text-slate-400">
                                  {country.code}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {country.region} · Median age {country.medianAge.toFixed(1)}y
                              </p>
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <p className="text-xs text-slate-200">
                              {country.populationMillions.toFixed(1)}M
                            </p>
                            <p className="text-[11px] text-emerald-400">
                              ${country.gdpTrillions.toFixed(2)}T
                            </p>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {displayedCities.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 flex items-center justify-between text-[11px] font-medium text-slate-400">
                    <span>{trimmedQuery ? 'Metropolitan Cities' : 'Featured Cities'}</span>
                    {trimmedQuery && (
                      <span className="font-mono tabular-nums text-slate-500">
                        {displayedCities.length} shown
                      </span>
                    )}
                  </div>
                  {displayedCities.map((city, idx) => {
                    const flatIdx = displayedCountries.length + idx;
                    const isHighlighted = flatIdx === clampedActiveIndex;
                    return (
                      <div
                        key={city.id}
                        id={`${listboxId}-opt-${flatIdx}`}
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                          isHighlighted ? 'bg-sky-500/15' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => commitSelection({ kind: 'city', city })}
                          className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-100 truncate">
                                {city.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {city.countryName} · {city.primarySector}
                              </p>
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <p className="text-xs text-slate-200">
                              {formatCompactNumber(city.population)}
                            </p>
                            <p className="text-[11px] text-emerald-400">
                              ${city.gdpBillions}B
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompareCity(city.id);
                          }}
                          aria-label={`Add ${city.name} to city comparison`}
                          title={`Compare ${city.name}`}
                          className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors shrink-0 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Quiet keyboard hint bar */}
        <div className="px-3 py-2 bg-[#090E17] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {trimmedQuery
              ? `${searchResults.totalMatches} match${searchResults.totalMatches === 1 ? '' : 'es'} across 24 nations & ${cities.length} cities`
              : `Search across 24 nations & ${cities.length} metropolitan hubs`}
          </span>
          <span className="hidden sm:inline font-mono text-[10px]">↑↓ · Enter · Esc</span>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Desktop / Tablet Inline Search Bar */}
      <div className="hidden md:block relative w-72 lg:w-96">
        <Search
          className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={desktopInputRef}
          type="text"
          role="combobox"
          aria-label="Search countries or cities globally"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && clampedActiveIndex >= 0
              ? `${listboxId}-opt-${clampedActiveIndex}`
              : undefined
          }
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search countries or cities..."
          className="w-full bg-[#0D1422] border border-slate-700/90 hover:border-slate-600 focus:border-sky-500 rounded-md pl-8 pr-14 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveIndex(0);
              desktopInputRef.current?.focus();
            }}
            aria-label="Clear search query"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 border border-slate-800 rounded bg-[#090E17]">
            /
          </kbd>
        )}

        {!mobileOpen && renderDropdown()}
      </div>

      {/* Mobile Compact Search Trigger */}
      <button
        type="button"
        onClick={() => {
          setMobileOpen((prev) => {
            const next = !prev;
            setIsOpen(next);
            if (next) {
              window.setTimeout(() => mobileInputRef.current?.focus(), 20);
            }
            return next;
          });
        }}
        aria-label="Toggle global search"
        aria-expanded={mobileOpen}
        className="md:hidden inline-flex items-center justify-center p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/90 rounded-md transition-colors cursor-pointer"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Mobile Full-Width Search Sheet below Header */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 z-50 bg-[#0B111D] border-b border-slate-800 p-3 shadow-2xl">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={mobileInputRef}
              type="text"
              role="combobox"
              aria-label="Search countries or cities globally"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-autocomplete="list"
              value={query}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search countries or cities..."
              className="w-full bg-[#0D1422] border border-slate-700 focus:border-sky-500 rounded-md pl-8 pr-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (query) {
                  setQuery('');
                  mobileInputRef.current?.focus();
                } else {
                  setMobileOpen(false);
                  setIsOpen(false);
                }
              }}
              aria-label={query ? 'Clear search query' : 'Close search'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {renderDropdown()}
          </div>
        </div>
      )}
    </div>
  );
}
