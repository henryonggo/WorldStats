import { useEffect, useMemo, useState } from 'react';
import { Activity, EyeOff } from 'lucide-react';
import type { CityRecord, CountryRecord, DataYear } from '../types/worldStats';
import { computeGlobalIndicatorAverages, computeLiveWorldCounters } from '../utils/analytics';
import { SourceFootnote } from './SourceFootnote';

interface LiveGlobalStripProps {
  countries: CountryRecord[];
  cities: CityRecord[];
  dataYear: DataYear;
  onOpenSources: () => void;
}

export function LiveGlobalStrip({
  countries,
  cities,
  dataYear,
  onOpenSources,
}: LiveGlobalStripProps) {
  // Opt-in ONLY (OFF by default) so users see verified dataset benchmarks first
  const [simulateDailyFlow, setSimulateDailyFlow] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!simulateDailyFlow) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [simulateDailyFlow]);

  const summary = useMemo(() => {
    const totalPopM = countries.reduce((s, c) => s + c.populationMillions, 0);
    const totalGdpT = countries.reduce((s, c) => s + c.gdpTrillions, 0);
    const weightedGdpCap = totalPopM > 0 ? Math.round((totalGdpT * 1_000_000) / totalPopM) : 0;
    const avgIndicators = computeGlobalIndicatorAverages(countries);
    const worldTotalPopB = dataYear === 2024 ? 8.16 : dataYear === 2025 ? 8.23 : 8.30;
    const popSharePct = Math.min(99, Math.round((totalPopM / 1000 / worldTotalPopB) * 100));
    return {
      totalPopB: (totalPopM / 1000).toFixed(2),
      totalGdpT: totalGdpT.toFixed(1),
      weightedGdpCap,
      popSharePct,
      avgHdi: avgIndicators.hdiScore.toFixed(3),
      avgRenewablePct: avgIndicators.renewableEnergyPct.toFixed(1),
      avgCo2: avgIndicators.co2PerCapitaTons.toFixed(1),
    };
  }, [countries, dataYear]);

  const counters = useMemo(() => computeLiveWorldCounters(nowMs), [nowMs]);

  return (
    <section
      aria-label="Global macroeconomic and demographic benchmark summary"
      className="ws-panel overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-5 py-3 border-b ws-border">
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-xs ws-text-muted">
          <span className="font-medium ws-text">Global Macro &amp; Development Snapshot</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>
            {countries.length} Tracked Economies (~{summary.popSharePct}% of world pop · {dataYear} Annual Series)
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <button
            type="button"
            data-testid="toggle-daily-flow-sim"
            onClick={() => setSimulateDailyFlow((prev) => !prev)}
            aria-pressed={simulateDailyFlow}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              simulateDailyFlow ? 'ws-nav-active' : 'ws-btn-subtle'
            }`}
          >
            {simulateDailyFlow ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            <span>{simulateDailyFlow ? 'Hide Rate Model' : 'Simulate Modeled Daily Flow'}</span>
          </button>
        </div>
      </div>

      {/* Authoritative Dataset Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ws-divider-border">
        <div className="px-5 py-4 ws-divider-border">
          <p className="text-xs ws-text-muted">Tracked Population ({dataYear})</p>
          <p
            data-testid="macro-tracked-population"
            className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ws-text"
          >
            {summary.totalPopB}B
          </p>
          <p className="mt-1 text-xs ws-text-muted font-mono tabular-nums">
            {countries.length} economies · ~{summary.popSharePct}% of ~8.3B world
          </p>
        </div>

        <div className="px-5 py-4 ws-divider-border">
          <p className="text-xs ws-text-muted">Combined Nominal GDP ({dataYear})</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ws-positive">
            ${summary.totalGdpT}T
          </p>
          <p className="mt-1 text-xs ws-text-muted font-mono tabular-nums">
            Pop-weighted avg ${summary.weightedGdpCap.toLocaleString('en-US')} / cap
          </p>
        </div>

        <div className="px-5 py-4 ws-divider-border">
          <p className="text-xs ws-text-muted">Development &amp; Clean Grid Avg</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ws-accent">
            {summary.avgHdi} <span className="text-sm font-normal ws-text-muted">HDI</span>
          </p>
          <p className="mt-1 text-xs ws-text-muted font-mono tabular-nums">
            {summary.avgRenewablePct}% renewable power · {summary.avgCo2}t CO₂/cap
          </p>
        </div>

        <div className="px-5 py-4 ws-divider-border">
          <p className="text-xs ws-text-muted">Metropolitan Coverage</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ws-warm">
            {cities.length} <span className="text-sm font-normal ws-text-muted">Hubs</span>
          </p>
          <p className="mt-1 text-xs ws-text-muted font-mono tabular-nums">
            48 NSOs · incl. 15 Indonesia &amp; 15 Canada
          </p>
        </div>
      </div>

      {/* Opt-in Modeled Daily Flow Band (Explicitly labeled as rate interpolation, not live sensor telemetry) */}
      {simulateDailyFlow && (
        <div
          data-testid="modeled-daily-flow-panel"
          className="border-t ws-border ws-subpanel px-5 py-3 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] ws-text-muted">
            <span className="font-medium ws-warm">
              Modeled Daily Flow Estimate (UN/IMF annual rate interpolation — not a live telemetry feed)
            </span>
            <span className="font-mono tabular-nums ws-text-2">
              {counters.timestampIso.slice(11, 19)} UTC
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="ws-inset px-3 py-2">
              <p className="text-[11px] ws-text-muted">Interpolated World Pop</p>
              <p className="font-mono tabular-nums font-semibold ws-text mt-0.5">
                {counters.worldPopulation.toLocaleString('en-US')}
              </p>
            </div>
            <div className="ws-inset px-3 py-2">
              <p className="text-[11px] ws-text-muted">Modeled Births Today (UTC)</p>
              <p className="font-mono tabular-nums font-semibold ws-positive mt-0.5">
                {counters.birthsToday.toLocaleString('en-US')}
              </p>
            </div>
            <div className="ws-inset px-3 py-2">
              <p className="text-[11px] ws-text-muted">Modeled Net Change Today</p>
              <p className="font-mono tabular-nums font-semibold ws-accent mt-0.5">
                +{counters.netGrowthToday.toLocaleString('en-US')}
              </p>
            </div>
            <div className="ws-inset px-3 py-2">
              <p className="text-[11px] ws-text-muted">Prorated Global GDP Today</p>
              <p className="font-mono tabular-nums font-semibold ws-warm mt-0.5">
                ${counters.globalGdpTodayBillions.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}B
              </p>
            </div>
          </div>
        </div>
      )}

      <SourceFootnote
        sourceText={`UN DESA WPP (${dataYear}) · IMF WEO (Oct ${dataYear}) · UNDP HDI · IEA & Global Carbon Project · 48 National Statistical Offices`}
        vintage={`${dataYear} Annual Benchmarks`}
        onOpenSources={onOpenSources}
      />
    </section>
  );
}
