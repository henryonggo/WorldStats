import { useEffect } from 'react';
import { ExternalLink, ShieldCheck, X } from 'lucide-react';
import {
  DATA_PROVENANCE_NOTICE,
  INSTITUTIONAL_SOURCES,
  NATIONAL_OFFICE_BY_COUNTRY,
} from '../data/dataSources';

interface SourceFootprintModalProps {
  open: boolean;
  onClose: () => void;
}

const HIGHLIGHTED_NATIONAL_CODES = [
  'IDN',
  'CAN',
  'USA',
  'JPN',
  'DEU',
  'GBR',
  'IND',
  'CHN',
  'AUS',
  'BRA',
  'NGA',
  'SGP',
];

export function SourceFootprintModal({ open, onClose }: SourceFootprintModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[88vh] bg-[#111827] border border-slate-700/90 rounded-lg shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <p className="text-xs font-medium text-sky-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Data Provenance &amp; Verification Footprint</span>
            </p>
            <h2
              id="sources-modal-title"
              className="text-lg font-semibold text-slate-50 mt-1"
            >
              Statistical Sources, Baseline Vintage &amp; Methodology
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sources and methodology dialog"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 text-xs">
          {/* Accuracy & Modeling Disclosure */}
          <div className="bg-[#0B111D] border border-slate-800 rounded-md p-4">
            <h3 className="text-xs font-semibold text-slate-100">
              How to Read &amp; Verify These Figures
            </h3>
            <p className="mt-1.5 text-slate-300 leading-relaxed">
              {DATA_PROVENANCE_NOTICE}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-[11px]">
              <div>
                <p className="font-medium text-emerald-400">Benchmark Baselines (2024–2025)</p>
                <p className="text-slate-400 mt-0.5">
                  National population, GDP, age cohorts, and metropolitan indicators anchored to published agency releases.
                </p>
              </div>
              <div>
                <p className="font-medium text-sky-400">Modeled Projections (2030–2100)</p>
                <p className="text-slate-400 mt-0.5">
                  Low/Medium/High demographic variants and 10-year GDP growth curves extrapolated from UN &amp; IMF trend rates.
                </p>
              </div>
              <div>
                <p className="font-medium text-amber-400">Real-Time Global Counter</p>
                <p className="text-slate-400 mt-0.5">
                  Deterministic continuous-rate counter (+2.22 net people/sec, ~$115.4T/yr GDP) synced to UTC clock.
                </p>
              </div>
            </div>
          </div>

          {/* Primary International Sources */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2.5">
              01. Primary International Statistical Sources
            </h3>
            <div className="border border-slate-800 rounded-md overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0D1422] border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3 font-medium">Agency &amp; Dataset</th>
                    <th className="py-2.5 px-3 font-medium">Metrics Covered</th>
                    <th className="py-2.5 px-3 font-medium whitespace-nowrap">Vintage</th>
                    <th className="py-2.5 px-3 font-medium text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {INSTITUTIONAL_SOURCES.map((src) => (
                    <tr key={src.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 align-top">
                        <p className="font-medium text-slate-100">{src.agency}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{src.dataset}</p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 align-top">
                        {src.coverage}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300 whitespace-nowrap align-top">
                        {src.vintage}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap align-top">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline"
                        >
                          <span>Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* National Statistical Offices for City-Level Detail */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              02. National Statistical Offices (City-Level Detail)
            </h3>
            <p className="text-slate-400 mb-3">
              Municipal population, metro area boundaries, and regional GDP shares are cross-referenced with national statistical agencies, including complete 15-city rosters for Indonesia (BPS) and Canada (Statistics Canada).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {HIGHLIGHTED_NATIONAL_CODES.map((code) => {
                const office = NATIONAL_OFFICE_BY_COUNTRY[code];
                if (!office) return null;
                return (
                  <div
                    key={code}
                    className="bg-[#0B111D] border border-slate-800/90 rounded-md px-3 py-2.5 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-sky-400">{code}</p>
                      <p className="text-slate-200 font-medium mt-0.5 leading-snug">
                        {office.agency}
                      </p>
                    </div>
                    <a
                      href={office.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${office.shortName} official portal`}
                      className="text-slate-400 hover:text-sky-300 shrink-0 mt-0.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Analytical Methodology & Formulas */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              03. Analytical Formulas &amp; Computation Notes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-300">
              <div className="bg-[#0B111D] border border-slate-800/90 rounded-md p-3">
                <p className="font-medium text-slate-100">10-Year Projected GDP Growth</p>
                <p className="font-mono text-sky-300 mt-1">
                  ((GDP_2035 − GDP_2025) / GDP_2025) × 100
                </p>
                <p className="text-slate-400 mt-1">
                  Cumulative 10-year nominal expansion computed from each nation&apos;s projected macro series.
                </p>
              </div>
              <div className="bg-[#0B111D] border border-slate-800/90 rounded-md p-3">
                <p className="font-medium text-slate-100">Age Dependency Ratio &amp; Working Share</p>
                <p className="font-mono text-sky-300 mt-1">
                  ((Age_0–14 + Age_65+) / Age_15–64) × 100
                </p>
                <p className="text-slate-400 mt-1">
                  Measures economic dependents per 100 working-age residents directly from the 7-bracket pyramid.
                </p>
              </div>
              <div className="bg-[#0B111D] border border-slate-800/90 rounded-md p-3">
                <p className="font-medium text-slate-100">GDP vs. Demographics Correlation</p>
                <p className="font-mono text-sky-300 mt-1">
                  Pearson r, R², OLS slope &amp; intercept
                </p>
                <p className="text-slate-400 mt-1">
                  Calculated live client-side across the currently filtered set of nations whenever axes or region filters change.
                </p>
              </div>
              <div className="bg-[#0B111D] border border-slate-800/90 rounded-md p-3">
                <p className="font-medium text-slate-100">Export Audit Footprint</p>
                <p className="font-mono text-sky-300 mt-1">
                  Embedded in CSV columns &amp; PDF footers
                </p>
                <p className="text-slate-400 mt-1">
                  Every exported CSV file and PDF briefing automatically stamps its corresponding institutional and national sources.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-t border-slate-800 bg-[#0C1220] shrink-0">
          <span className="text-[11px] text-slate-400">
            All figures should be cross-checked with primary agency releases for official policy or financial filings.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
