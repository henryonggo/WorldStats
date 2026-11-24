import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Loader2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AiAnalysisResponse,
  AiSuggestedAction,
  AppView,
  CityRecord,
  CountryRecord,
  DataYear,
  TradeReferenceSource,
  TradeYear,
} from '../types/worldStats';
import { DEFAULT_TRADE_YEAR } from '../types/worldStats';
import { COUNTRY_TRADE_PROFILES } from '../data/tradeDataset';
import { buildAiContextSnapshot } from '../utils/analytics';
import { resolveGlobalTradeLedger } from '../utils/tradeAnalytics';

interface AiAnalystDrawerProps {
  open: boolean;
  onClose: () => void;
  countries: CountryRecord[];
  cities: CityRecord[];
  activeView: AppView;
  dataYear: DataYear;
  tradeYear?: TradeYear;
  tradeReference?: TradeReferenceSource;
  selectedCountry: CountryRecord;
  selectedCityId: string | null;
  compareCityIds: string[];
  pendingPrompt: string | null;
  onConsumePendingPrompt: () => void;
  onApplyAction: (action: AiSuggestedAction) => void;
}

interface AnalystHistoryEntry {
  id: string;
  question: string;
  response: AiAnalysisResponse;
}

export function AiAnalystDrawer({
  open,
  onClose,
  countries,
  cities,
  activeView,
  dataYear,
  tradeYear = DEFAULT_TRADE_YEAR,
  tradeReference = 'global',
  selectedCountry,
  selectedCityId,
  compareCityIds,
  pendingPrompt,
  onConsumePendingPrompt,
  onApplyAction,
}: AiAnalystDrawerProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalystHistoryEntry[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const validCountryCodes = useMemo(
    () => new Set(countries.map((c) => c.code)),
    [countries]
  );
  const validCityIds = useMemo(() => new Set(cities.map((c) => c.id)), [cities]);

  const compareCityNames = useMemo(() => {
    const map = new Map(cities.map((c) => [c.id, c.name]));
    return compareCityIds.map((id) => map.get(id)).filter(Boolean).slice(0, 4);
  }, [cities, compareCityIds]);

  const quickPrompts = useMemo(() => {
    if (activeView === 'trade') {
      return [
        `Summarize ${selectedCountry.name}'s export-import balance, top HS commodities, and partner concentration (${tradeYear}, ${tradeReference} reference).`,
        `Which tracked economies run the largest combined goods + services trade surpluses and highest trade openness (% GDP)?`,
        `Compare export-led manufacturing hubs (China, Germany, Vietnam, South Korea, Mexico) on merchandise vs. services balance.`,
        `Analyze how ${selectedCountry.name}'s demographics and GDP trajectory align with its current export/import specialization.`,
      ];
    }
    return [
      `Synthesize ${selectedCountry.name}'s ${dataYear} demographic, GDP, energy & inequality profile and key 2035 policy risks.`,
      `Which tracked economies combine high renewable electricity (>50%) with strong 10-year projected GDP growth?`,
      compareCityNames.length >= 2
        ? `Compare ${compareCityNames.join(', ')} on productivity, aging pressure, and 2050 growth outlook.`
        : `Compare the top Asian and European metropolitan hubs on GDP per capita vs. demographic aging.`,
      `Build a 2035 scenario comparing fast-aging high-R&D economies against young demographic-dividend economies.`,
    ];
  }, [activeView, selectedCountry.name, dataYear, tradeYear, tradeReference, compareCityNames]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const submitQuestion = async (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const countryByCode = new Map(countries.map((c) => [c.code, c]));
      const { rows: tradeRows } = resolveGlobalTradeLedger(
        COUNTRY_TRADE_PROFILES,
        countryByCode,
        tradeYear,
        tradeReference
      );
      const focusedTrade = tradeRows.find((r) => r.countryCode === selectedCountry.code);
      const topTradeRows = [...tradeRows]
        .sort((a, b) => b.totalTrade - a.totalTrade)
        .slice(0, 14);
      const tradeSet = new Map(topTradeRows.map((r) => [r.countryCode, r]));
      if (focusedTrade) tradeSet.set(focusedTrade.countryCode, focusedTrade);

      const tradeLines = Array.from(tradeSet.values()).map(
        (r) =>
          `${r.countryCode}|${r.effectiveYear}${r.usedFallback ? '*' : ''}|GExp$${r.goodsExports}B|GImp$${r.goodsImports}B|MBal$${r.merchandiseBalance}B|SExp$${r.servicesExports}B|SBal$${r.servicesBalance}B|Open${r.tradeToGdpPct}%|TopExp:${r.topExportsUsd[0]?.category ?? ''}|TopPartner:${r.partnerFlows[0]?.partnerName ?? ''}`
      );
      const tradeSummaryBlock = [
        `GLOBAL TRADE SNAPSHOT (Requested ${tradeYear}, Reference=${tradeReference}, * = prior-year fallback):`,
        ...tradeLines,
      ].join('\n');

      const contextSummary = buildAiContextSnapshot(countries, cities, {
        activeView,
        dataYear,
        selectedCountryCode: selectedCountry.code,
        selectedCityId,
        compareCityIds,
        tradeSummaryBlock,
      });

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          dataYear,
          activeView,
          contextSummary,
        }),
      });

      const payload = (await res.json()) as Partial<AiAnalysisResponse> & { error?: string };
      if (!res.ok) {
        setError(payload.error || `Analysis request failed (HTTP ${res.status}).`);
        return;
      }

      if (!payload.headline || !payload.summary) {
        setError('Received an incomplete analysis payload from the server.');
        return;
      }

      // Sanitize suggested actions so only valid country codes and city IDs are actionable
      const safeActions: AiSuggestedAction[] = (payload.suggestedActions ?? [])
        .filter((a) => Boolean(a && a.label && a.view))
        .map((a) => ({
          label: a.label,
          view: a.view,
          countryCode:
            a.countryCode && validCountryCodes.has(a.countryCode.toUpperCase())
              ? a.countryCode.toUpperCase()
              : undefined,
          cityIds: Array.isArray(a.cityIds)
            ? a.cityIds.filter((id) => validCityIds.has(id)).slice(0, 4)
            : undefined,
        }))
        .slice(0, 3);

      const entry: AnalystHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: trimmed,
        response: {
          model: payload.model ?? 'gemini-4-hydrogen',
          dataYear: payload.dataYear ?? dataYear,
          headline: payload.headline,
          summary: payload.summary,
          bulletPoints: Array.isArray(payload.bulletPoints) ? payload.bulletPoints.slice(0, 6) : [],
          caveat: payload.caveat ?? `Grounded in WorldStats ${dataYear} dataset.`,
          suggestedActions: safeActions,
        },
      };

      setHistory((prev) => [entry, ...prev]);
      setQuestion('');
    } catch {
      setError('Network error while contacting the WorldStats AI Analyst service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && pendingPrompt) {
      const prompt = pendingPrompt;
      onConsumePendingPrompt();
      setQuestion(prompt);
      void submitQuestion(prompt);
    }
  }, [open, pendingPrompt]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs"
      onClick={onClose}
      role="presentation"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-analyst-title"
        data-testid="ai-analyst-drawer"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl h-full ws-modal flex flex-col overflow-hidden border-l ws-border"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b ws-border flex items-start justify-between gap-3 shrink-0">
          <div>
            <p className="text-[11px] font-medium ws-accent flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Natural-Language Query &amp; Scenario Engine · {dataYear} Dataset</span>
            </p>
            <h2 id="ai-analyst-title" className="text-base font-semibold ws-text mt-0.5">
              WorldStats AI Analyst
            </h2>
            <p className="text-xs ws-text-muted mt-0.5">
              Grounded strictly in all {countries.length} tracked economies and {cities.length} cities
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Analyst"
            className="p-1.5 ws-text-muted hover:ws-text ws-row-hover ws-radius-sm cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Quick Prompt Suggestions */}
          <div>
            <p className="text-[11px] font-medium ws-text-muted mb-2">
              Suggested Briefings &amp; Scenarios
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setQuestion(prompt);
                    void submitQuestion(prompt);
                  }}
                  className="text-left px-3 py-2 text-xs ws-btn-subtle transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              data-testid="ai-analyst-error"
              className="ws-inset p-3.5 border border-rose-500/40 flex items-start gap-2.5 text-xs"
            >
              <AlertCircle className="w-4 h-4 ws-negative shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold ws-text">Analysis Unavailable</p>
                <p className="ws-text-2 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="ws-inset p-4 flex items-center gap-3 text-xs ws-text-2">
              <Loader2 className="w-4 h-4 ws-accent animate-spin shrink-0" />
              <span>Analyzing {countries.length} economies &amp; {cities.length} cities for {dataYear}...</span>
            </div>
          )}

          {/* Analysis Results */}
          {history.length === 0 && !loading && !error && (
            <div className="ws-inset p-4 text-xs ws-text-muted leading-relaxed">
              Ask any cross-country question, screen nations by health/energy/inequality metrics, or run a 2035 demographic scenario. Every answer cites figures directly from your active {dataYear} dataset and provides one-click navigation links.
            </div>
          )}

          {history.map((entry) => (
            <article
              key={entry.id}
              data-testid="ai-analysis-card"
              className="ws-inset p-4 space-y-3"
            >
              <p className="text-[11px] ws-text-muted border-b ws-border pb-2">
                Query: <span className="ws-text-2 font-medium">{entry.question}</span>
              </p>

              <div>
                <h3 className="text-sm font-semibold ws-text leading-snug">
                  {entry.response.headline}
                </h3>
                <p className="text-xs ws-text-2 mt-1.5 leading-relaxed">
                  {entry.response.summary}
                </p>
              </div>

              {entry.response.bulletPoints.length > 0 && (
                <ul className="space-y-1.5 text-xs ws-text-2 list-disc pl-4">
                  {entry.response.bulletPoints.map((pt, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {pt}
                    </li>
                  ))}
                </ul>
              )}

              {entry.response.suggestedActions.length > 0 && (
                <div className="pt-2 border-t ws-border space-y-1.5">
                  <p className="text-[11px] font-medium ws-text-muted">Explore in WorldStats</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.response.suggestedActions.map((act, idx) => (
                      <button
                        key={`${act.label}-${idx}`}
                        type="button"
                        onClick={() => {
                          onApplyAction(act);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium ws-nav-active cursor-pointer"
                      >
                        <span>{act.label}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] ws-text-muted pt-1.5 border-t ws-border">
                Methodology note ({entry.response.dataYear}): {entry.response.caveat}
              </p>
            </article>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitQuestion(question);
          }}
          className="px-5 py-3.5 border-t ws-border ws-subpanel shrink-0 space-y-2"
        >
          <label htmlFor="ai-analyst-input" className="sr-only">
            Ask WorldStats AI Analyst
          </label>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              id="ai-analyst-input"
              data-testid="ai-analyst-input"
              rows={2}
              maxLength={600}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submitQuestion(question);
                }
              }}
              placeholder="Ask about aging, GDP projections, clean energy, Gini inequality, or compare cities..."
              className="flex-1 ws-input px-3 py-2 text-xs resize-none focus:outline-none"
            />
            <button
              type="submit"
              data-testid="ai-analyst-submit"
              disabled={loading || question.trim().length < 3}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold ws-btn-primary disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Analyze</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] ws-text-muted">
            <span>Enter to send · Shift+Enter for new line</span>
            <span className="font-mono tabular-nums">{question.length}/600</span>
          </div>
        </form>
      </aside>
    </div>
  );
}
