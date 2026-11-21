import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { computeLiveWorldCounters } from '../utils/analytics';
import { SourceFootnote } from './SourceFootnote';

interface LiveGlobalStripProps {
  onOpenSources: () => void;
}

export function LiveGlobalStrip({ onOpenSources }: LiveGlobalStripProps) {
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
      className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-5 py-3 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-200">Real-Time Global Estimates</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>UN &amp; IMF Continuous Rate Model</span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs font-mono tabular-nums text-slate-300">
            {counters.timestampIso.slice(11, 19)} UTC
          </span>
          <button
            type="button"
            onClick={() => setIsRunning((prev) => !prev)}
            aria-label={isRunning ? 'Pause live counters' : 'Resume live counters'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Feed' : 'Resume Feed'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
        <div className="px-5 py-4">
          <p className="text-xs text-slate-400">World Population (Live)</p>
          <p
            data-testid="live-world-population"
            className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight text-slate-50"
          >
            {counters.worldPopulation.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            +2.22 net / sec · 8.2B+ global
          </p>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-slate-400">Births Today (UTC)</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight text-emerald-400">
            {counters.birthsToday.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            ~4.19 births / sec
          </p>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-slate-400">Net Population Growth Today</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight text-sky-400">
            +{counters.netGrowthToday.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            {counters.deathsToday.toLocaleString('en-US')} deaths recorded today
          </p>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-slate-400">Global GDP Output Today</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight text-amber-400">
            ${counters.globalGdpTodayBillions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B
          </p>
          <p className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            ~$115.4T annualized output
          </p>
        </div>
      </div>

      <SourceFootnote
        sourceText="UN DESA World Population Prospects 2024 (annual birth/death rates) · IMF World Economic Outlook (annualized global GDP)"
        vintage="Deterministic UTC Rate Interpolation"
        onOpenSources={onOpenSources}
      />
    </section>
  );
}
