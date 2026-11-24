import { useEffect } from 'react';
import { ExternalLink, ShieldCheck, X } from 'lucide-react';
import type { DataYear } from '../types/worldStats';
import {
  DATA_PROVENANCE_NOTICE,
  INSTITUTIONAL_SOURCES,
  NATIONAL_OFFICE_BY_COUNTRY,
} from '../data/dataSources';

interface SourceFootprintModalProps {
  open: boolean;
  dataYear: DataYear;
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
  'CHE',
  'NLD',
  'SWE',
  'NOR',
  'ARE',
  'COL',
];

export function SourceFootprintModal({ open, dataYear, onClose }: SourceFootprintModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[88vh] ws-modal flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b ws-border shrink-0">
          <div>
            <p className="text-xs font-medium ws-accent flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Data Provenance &amp; Verification Footprint · Active Year {dataYear}</span>
            </p>
            <h2
              id="sources-modal-title"
              className="text-lg font-semibold ws-text mt-1"
            >
              Statistical Sources, 2024–2026 Vintage Coverage &amp; Methodology
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sources and methodology dialog"
            className="p-1.5 ws-text-muted hover:ws-text ws-row-hover ws-radius-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 text-xs">
          {/* Accuracy & Modeling Disclosure */}
          <div className="ws-inset p-4">
            <h3 className="text-xs font-semibold ws-text">
              Why 2024, 2025 &amp; 2026 Series Differ Across Agencies
            </h3>
            <p className="mt-1.5 ws-text-2 leading-relaxed">
              {DATA_PROVENANCE_NOTICE}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t ws-border text-[11px]">
              <div>
                <p className="font-medium ws-positive">Latest 2026 Series (Default)</p>
                <p className="ws-text-muted mt-0.5">
                  Reflects IMF Oct 2026 WEO, UN DESA annual 2026 series, and 2026 Q3/Est. national office releases.
                </p>
              </div>
              <div>
                <p className="font-medium ws-accent">Audited 2024 &amp; 2025 Benchmarks</p>
                <p className="ws-text-muted mt-0.5">
                  Switch the global year selector anytime to compare 2024 &amp; 2025 final national accounts; World Bank WDI publishes with a standard 1-year audited lag.
                </p>
              </div>
              <div>
                <p className="font-medium ws-warm">Long-Term Projections (2030–2100)</p>
                <p className="ws-text-muted mt-0.5">
                  Low/Medium/High demographic variants and 10-year GDP curves ({dataYear}–{dataYear + 10}) dynamically rebase to your chosen reporting year.
                </p>
              </div>
            </div>
          </div>

          {/* Primary International Sources */}
          <div>
            <h3 className="text-sm font-semibold ws-text mb-2.5">
              01. Primary International Statistical Sources
            </h3>
            <div className="border ws-border ws-radius-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="ws-subpanel border-b ws-border ws-text-2">
                    <th className="py-2.5 px-3 font-medium">Agency &amp; Dataset</th>
                    <th className="py-2.5 px-3 font-medium">Metrics Covered</th>
                    <th className="py-2.5 px-3 font-medium whitespace-nowrap">Vintage</th>
                    <th className="py-2.5 px-3 font-medium text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="ws-divide">
                  {INSTITUTIONAL_SOURCES.map((src) => (
                    <tr key={src.id} className="ws-row-hover">
                      <td className="py-2.5 px-3 align-top">
                        <p className="font-medium ws-text">{src.agency}</p>
                        <p className="text-[11px] ws-text-muted mt-0.5">{src.dataset}</p>
                      </td>
                      <td className="py-2.5 px-3 ws-text-2 align-top">
                        {src.coverage}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums ws-text-2 whitespace-nowrap align-top">
                        {src.vintage}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap align-top">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ws-accent-link hover:underline"
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
            <h3 className="text-sm font-semibold ws-text mb-1">
              02. National Statistical Offices (48 Economies &amp; 138 Metropolitan Hubs)
            </h3>
            <p className="ws-text-muted mb-3">
              Municipal population, metro area boundaries, and regional GDP shares are cross-referenced with 48 national statistical agencies, including complete 15-city rosters for Indonesia (BPS) and Canada (Statistics Canada). Representative agencies shown below:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {HIGHLIGHTED_NATIONAL_CODES.map((code) => {
                const office = NATIONAL_OFFICE_BY_COUNTRY[code];
                if (!office) return null;
                return (
                  <div
                    key={code}
                    className="ws-inset px-3 py-2.5 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] ws-accent">{code}</p>
                      <p className="ws-text font-medium mt-0.5 leading-snug">
                        {office.agency}
                      </p>
                    </div>
                    <a
                      href={office.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${office.shortName} official portal`}
                      className="ws-text-muted hover:ws-accent shrink-0 mt-0.5"
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
            <h3 className="text-sm font-semibold ws-text mb-2">
              03. Analytical Formulas &amp; Computation Notes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] ws-text-2">
              <div className="ws-inset p-3">
                <p className="font-medium ws-text">10-Year Projected GDP Growth ({dataYear}–{dataYear + 10})</p>
                <p className="font-mono ws-accent mt-1">
                  ((GDP_{dataYear + 10} − GDP_{dataYear}) / GDP_{dataYear}) × 100
                </p>
                <p className="ws-text-muted mt-1">
                  Cumulative 10-year nominal expansion computed from each nation&apos;s projected macro series starting at the selected year.
                </p>
              </div>
              <div className="ws-inset p-3">
                <p className="font-medium ws-text">Age Dependency Ratio &amp; Working Share</p>
                <p className="font-mono ws-accent mt-1">
                  ((Age_0–14 + Age_65+) / Age_15–64) × 100
                </p>
                <p className="ws-text-muted mt-1">
                  Measures economic dependents per 100 working-age residents directly from the 7-bracket pyramid.
                </p>
              </div>
              <div className="ws-inset p-3">
                <p className="font-medium ws-text">GDP vs. Demographics Correlation</p>
                <p className="font-mono ws-accent mt-1">
                  Pearson r, R², OLS slope &amp; intercept
                </p>
                <p className="ws-text-muted mt-1">
                  Calculated live client-side across the currently filtered set of nations whenever axes, region, or reporting year change.
                </p>
              </div>
              <div className="ws-inset p-3">
                <p className="font-medium ws-text">Export Audit Footprint</p>
                <p className="font-mono ws-accent mt-1">
                  Embedded in CSV columns &amp; PDF footers
                </p>
                <p className="ws-text-muted mt-1">
                  Every exported CSV file and PDF briefing automatically stamps the active reporting year ({dataYear}) and corresponding institutional and national sources.
                </p>
              </div>
              <div className="ws-inset p-3 sm:col-span-2">
                <p className="font-medium ws-text">Global Trade Dual-Reference &amp; Prior-Year Auto-Fallback</p>
                <p className="font-mono ws-accent mt-1">
                  Global (WTO / UN Comtrade / IMF DOTS) vs. National Customs (FOB/CIF)
                </p>
                <p className="ws-text-muted mt-1">
                  In the Global Trade tab, users switch freely between harmonized international trade agencies and 48 official national customs/NSO authorities across 2023–2026. Whenever a selected year (e.g., 2026) is not yet released for a country or source, WorldStats automatically falls back to the latest available prior year and flags the effective vintage transparently.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 ws-footnote shrink-0">
          <span className="text-[11px] ws-text-muted">
            All figures should be cross-checked with primary agency releases for official policy or financial filings.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold ws-btn-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
