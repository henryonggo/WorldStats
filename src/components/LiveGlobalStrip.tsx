import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { DataYear } from '../types/worldStats';
import { computeLiveWorldCounters } from '../utils/analytics';
import { SourceFootnote } from './SourceFootnote';

interface LiveGlobalStripProps {
  dataYear: DataYear;
  onOpenSources: () => void;
}

export function LiveGlobalStrip({ dataYear, onOpenSources }: LiveGlobalStripProps) {
  const [isRunning, setIsRunning] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const counters = computeLiveWorldCounters(nowMs);

  return (
    <section
      aria-label="Live global demographic and economic counters"
      className="ws-panel overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-5 py-3 border-b ws-border">
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-xs ws-text-muted">
          <span className="font-medium ws-text">Real-Time Global Estimates</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>UN &amp; IMF Continuous Rate Model ({dataYear} Active Series)</span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs font-mono tabular-nums ws-text-2">
            {counters.timestampIso.slice(11, 19)} UTC
          </span>
          <button
            type="button"
            onClick={() => setIsRunning((prev) => !prev)}
            aria-label={isRunning ? 'Pause live counters' : 'Resume live counters'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ws-btn-subtle transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Feed' : 'Resume Feed'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ws-divider-border">
        <div className="px-5 py-4 ws-divider-border">
          <p className="text-xs ws-text-muted">World Population (Live)</p>
          <p
            data-testid="live-world-population"
            className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ws-text"
          >
            {counters.worldPopulation.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-xs ws-text-muted font-mono tabular-nums">
            +2.22 net / sec · 8.2B+ global
          </p>
        </div>

        <div className="px-5 py-4 ws-divider-border">
          <p className="text-xs ws-text-muted">Births Today (UTC)</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ws-positive">
            {counters.birthsToday.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-xs ws-text-muted font-mono tabular-nums">
            ~4.19 births / sec
          </p>
        </div>

        <div className="px-5 py-4 ws-divider-border">
          <p className="text-xs ws-text-muted">Net Population Growth Today</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ws-accent">
            +{counters.netGrowthToday.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-xs ws-text-muted font-mono tabular-nums">
            {counters.deathsToday.toLocaleString('en-US')} deaths recorded today
          </p>
        </div>

        <div className="px-5 py-4 ws-divider-border">
          <p className="text-xs ws-text-muted">Global GDP Output Today</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ws-warm">
            ${counters.globalGdpTodayBillions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B
          </p>
          <p className="mt-1 text-xs ws-text-muted font-mono tabular-nums">
            ~$115.4T annualized output
          </p>
        </div>
      </div>

      <SourceFootnote
        sourceText={`UN DESA World Population Prospects (${dataYear} annual rates) · IMF World Economic Outlook (Oct ${dataYear})`}
        vintage="Deterministic UTC Rate Interpolation"
        onOpenSources={onOpenSources}
      />
    </section>
  );
}
