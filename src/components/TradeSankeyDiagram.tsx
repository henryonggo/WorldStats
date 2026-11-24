import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  sankey as d3Sankey,
  sankeyJustify,
  sankeyLinkHorizontal,
  type SankeyGraph,
  type SankeyLink,
  type SankeyNode,
} from 'd3-sankey';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, GitFork } from 'lucide-react';
import type { TradeSankeyMode } from '../types/worldStats';
import {
  buildTradeSankeyGraph,
  formatSignedTradeBillions,
  formatTradeBillions,
  type ResolvedCountryTradeRow,
  type TradeSankeyLinkDatum,
  type TradeSankeyNodeDatum,
} from '../utils/tradeAnalytics';
import { SourceFootnote } from './SourceFootnote';

interface TradeSankeyDiagramProps {
  row: ResolvedCountryTradeRow;
  validCountryCodes: Set<string>;
  onSelectCountry: (countryCode: string) => void;
  onOpenSources: () => void;
}

type LayoutNode = SankeyNode<TradeSankeyNodeDatum, TradeSankeyLinkDatum>;
type LayoutLink = SankeyLink<TradeSankeyNodeDatum, TradeSankeyLinkDatum>;

interface HoverTooltipState {
  x: number;
  y: number;
  partnerCode: string;
  partnerName: string;
  flow: 'import' | 'export' | 'hub';
  valueBillions: number;
  sharePct: number;
  bilateralBalanceBillions: number;
  counterFlowBillions: number;
}

function truncateLabel(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export function TradeSankeyDiagram({
  row,
  validCountryCodes,
  onSelectCountry,
  onOpenSources,
}: TradeSankeyDiagramProps) {
  const uid = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(960);
  const [mode, setMode] = useState<TradeSankeyMode>('both');
  const [hoveredPartnerCode, setHoveredPartnerCode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<HoverTooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      if (nextWidth > 0) {
        setContainerWidth(nextWidth);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset hovered highlight when switching economy or mode
  useEffect(() => {
    setHoveredPartnerCode(null);
    setTooltip(null);
  }, [row.countryCode, row.effectiveYear, row.reference, mode]);

  const rawGraph = useMemo(() => buildTradeSankeyGraph(row, mode), [row, mode]);

  const svgWidth = Math.max(mode === 'both' ? 740 : 620, containerWidth);
  const svgHeight = mode === 'both' ? 452 : 396;
  const isCompactWidth = svgWidth < 860;

  const layout = useMemo(() => {
    const leftMargin =
      mode === 'both'
        ? isCompactWidth
          ? 168
          : 196
        : mode === 'imports'
          ? 210
          : 156;
    const rightMargin =
      mode === 'both'
        ? isCompactWidth
          ? 168
          : 196
        : mode === 'exports'
          ? 210
          : 156;
    const topMargin = 40;
    const bottomMargin = 18;

    const generator = d3Sankey<TradeSankeyNodeDatum, TradeSankeyLinkDatum>()
      .nodeId((d) => d.id)
      .nodeAlign(sankeyJustify)
      .nodeWidth(14)
      .nodePadding(mode === 'both' ? 14 : 12)
      .nodeSort(null)
      .extent([
        [leftMargin, topMargin],
        [svgWidth - rightMargin, svgHeight - bottomMargin],
      ]);

    const clonedInput: SankeyGraph<TradeSankeyNodeDatum, TradeSankeyLinkDatum> = {
      nodes: rawGraph.nodes.map((n) => ({ ...n })),
      links: rawGraph.links.map((l) => ({ ...l })),
    };

    const computed = generator(clonedInput);
    const linkPath = sankeyLinkHorizontal<TradeSankeyNodeDatum, TradeSankeyLinkDatum>();

    return {
      nodes: computed.nodes as LayoutNode[],
      links: computed.links as LayoutLink[],
      linkPath,
      leftMargin,
      rightMargin,
      topMargin,
    };
  }, [rawGraph, mode, svgWidth, svgHeight, isCompactWidth]);

  const partnerByCode = useMemo(
    () => new Map(row.partnerFlows.map((p) => [p.partnerCode, p])),
    [row.partnerFlows]
  );

  const activePartner = useMemo(() => {
    if (hoveredPartnerCode) {
      return partnerByCode.get(hoveredPartnerCode) ?? null;
    }
    return row.partnerFlows[0] ?? null;
  }, [hoveredPartnerCode, partnerByCode, row.partnerFlows]);

  const hubNode = useMemo(
    () => layout.nodes.find((n) => n.side === 'hub') ?? null,
    [layout.nodes]
  );

  const handleLinkMouseMove = (
    e: React.MouseEvent<SVGPathElement>,
    link: LayoutLink
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredPartnerCode(link.partnerCode);
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      partnerCode: link.partnerCode,
      partnerName: link.partnerName,
      flow: link.flow,
      valueBillions: link.value,
      sharePct: link.sharePct,
      bilateralBalanceBillions: link.bilateralBalanceBillions,
      counterFlowBillions: link.counterFlowBillions,
    });
  };

  const handleNodeMouseEnter = (
    e: React.MouseEvent<SVGGElement>,
    node: LayoutNode
  ) => {
    if (node.side === 'hub') return;
    const rect = containerRef.current?.getBoundingClientRect();
    setHoveredPartnerCode(node.partnerCode);
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      partnerCode: node.partnerCode,
      partnerName: node.label,
      flow: node.side === 'import' ? 'import' : 'export',
      valueBillions: node.valueBillions,
      sharePct: node.sharePct,
      bilateralBalanceBillions: node.bilateralBalanceBillions,
      counterFlowBillions: node.counterFlowBillions,
    });
  };

  const handleClearHover = () => {
    setHoveredPartnerCode(null);
    setTooltip(null);
  };

  const canJumpActivePartner =
    activePartner !== null && validCountryCodes.has(activePartner.partnerCode);

  const tooltipLeft = tooltip
    ? Math.min(Math.max(12, tooltip.x + 16), Math.max(12, containerWidth - 284))
    : 0;
  const tooltipTop = tooltip
    ? tooltip.y < 145
      ? Math.min(svgHeight - 108, tooltip.y + 18)
      : Math.max(36, tooltip.y - 104)
    : 0;

  return (
    <section
      aria-label="Interactive D3 Sankey diagram of top 10 bilateral trade partner flows"
      data-testid="trade-sankey-section"
      className="ws-panel overflow-hidden"
    >
      {/* Header & Flow Direction Mode Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b ws-border">
        <div className="min-w-0">
          <h2 className="text-base font-semibold ws-text flex items-center gap-2">
            <GitFork className="w-4 h-4 ws-accent shrink-0" />
            <span>
              Bilateral Import &amp; Export Flow Sankey — Top 10 Partners ({row.countryName} ·{' '}
              {row.effectiveYear})
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs ws-text-muted mt-1">
            <span>
              Top 10 Imports:{' '}
              <strong className="font-mono tabular-nums ws-warm">
                {formatTradeBillions(rawGraph.top10ImportsBillions)}
              </strong>{' '}
              ({rawGraph.top10ImportSharePct.toFixed(1)}% of total)
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Top 10 Exports:{' '}
              <strong className="font-mono tabular-nums ws-accent">
                {formatTradeBillions(rawGraph.top10ExportsBillions)}
              </strong>{' '}
              ({rawGraph.top10ExportSharePct.toFixed(1)}% of total)
            </span>
            <span aria-hidden="true">·</span>
            <span>Hover any ribbon to trace two-way flows or click a partner to pivot</span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Select Sankey flow direction"
          className="inline-flex items-center p-0.5 ws-inset shrink-0 self-start lg:self-auto"
        >
          {(
            [
              { id: 'both', label: 'Two-Way (Top 10)' },
              { id: 'exports', label: 'Exports Only' },
              { id: 'imports', label: 'Imports Only' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              data-sankey-mode={option.id}
              aria-pressed={mode === option.id}
              onClick={() => setMode(option.id)}
              className={`px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                mode === option.id
                  ? 'ws-nav-active'
                  : 'ws-text-muted hover:ws-text border border-transparent ws-radius-sm'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile horizontal scroll affordance */}
      <div className="sm:hidden px-4 pt-2.5 text-[11px] ws-text-muted flex items-center justify-between">
        <span>Swipe horizontally to inspect both import &amp; export sides</span>
        <span aria-hidden="true">→</span>
      </div>

      {/* D3 Sankey SVG Viewport */}
      <div
        ref={containerRef}
        className="relative px-3 sm:px-5 pt-4 pb-3 overflow-x-auto"
        onMouseLeave={handleClearHover}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="img"
          aria-label={`D3 Sankey diagram showing ${row.countryName} merchandise trade flows with top 10 partners in ${row.effectiveYear}`}
          data-testid="trade-sankey-svg"
          className="block mx-auto select-none"
        >
          <defs>
            <linearGradient id={`imp-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id={`exp-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.48" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id={`hub-grad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Column Context Headers (edge-aligned to prevent clipping at narrow widths) */}
          {(mode === 'both' || mode === 'imports') && (
            <text
              x={8}
              y={18}
              textAnchor="start"
              fill="var(--ws-text-muted)"
              fontSize="11"
              fontWeight="600"
            >
              IMPORTS FROM TOP 10 ({formatTradeBillions(rawGraph.top10ImportsBillions)})
            </text>
          )}

          {hubNode && (
            <text
              x={((hubNode.x0 ?? 0) + (hubNode.x1 ?? 0)) / 2}
              y={18}
              textAnchor="middle"
              fill="var(--ws-text)"
              fontSize="12"
              fontWeight="600"
            >
              {row.countryName} ({row.effectiveYear})
            </text>
          )}

          {(mode === 'both' || mode === 'exports') && (
            <text
              x={svgWidth - 8}
              y={18}
              textAnchor="end"
              fill="var(--ws-text-muted)"
              fontSize="11"
              fontWeight="600"
            >
              EXPORTS TO TOP 10 ({formatTradeBillions(rawGraph.top10ExportsBillions)})
            </text>
          )}

          {/* D3 Sankey Flow Ribbons */}
          <g fill="none">
            {layout.links.map((link) => {
              const pathD = layout.linkPath(link) ?? '';
              const isHighlighted = hoveredPartnerCode === link.partnerCode;
              const isDimmed = hoveredPartnerCode !== null && !isHighlighted;
              const strokeUrl =
                link.flow === 'import' ? `url(#imp-grad-${uid})` : `url(#exp-grad-${uid})`;

              return (
                <path
                  key={link.id}
                  data-testid="sankey-link"
                  data-flow={link.flow}
                  data-partner={link.partnerCode}
                  d={pathD}
                  stroke={strokeUrl}
                  strokeWidth={Math.max(2, link.width ?? 2)}
                  strokeOpacity={isHighlighted ? 0.94 : isDimmed ? 0.14 : 0.56}
                  className="transition-opacity duration-150 cursor-pointer"
                  onMouseMove={(e) => handleLinkMouseMove(e, link)}
                  onClick={() => {
                    if (validCountryCodes.has(link.partnerCode)) {
                      onSelectCountry(link.partnerCode);
                    }
                  }}
                />
              );
            })}
          </g>

          {/* D3 Sankey Nodes & Labels */}
          <g>
            {layout.nodes.map((node) => {
              const x0 = node.x0 ?? 0;
              const x1 = node.x1 ?? 0;
              const y0 = node.y0 ?? 0;
              const y1 = node.y1 ?? 0;
              const nodeH = Math.max(4, y1 - y0);
              const midY = y0 + nodeH / 2;
              const isHub = node.side === 'hub';
              const isHighlighted = !isHub && hoveredPartnerCode === node.partnerCode;
              const isDimmed = !isHub && hoveredPartnerCode !== null && !isHighlighted;
              const canJump = !isHub && validCountryCodes.has(node.partnerCode);

              const fill = isHub
                ? `url(#hub-grad-${uid})`
                : node.side === 'import'
                  ? '#F59E0B'
                  : '#0EA5E9';

              const maxLabelChars = isCompactWidth ? 13 : 16;
              const shortName = truncateLabel(node.label, maxLabelChars);
              const valText = formatTradeBillions(node.valueBillions);

              return (
                <g
                  key={node.id}
                  data-testid={isHub ? 'sankey-hub-node' : 'sankey-partner-node'}
                  data-partner={node.partnerCode}
                  data-side={node.side}
                  role={canJump ? 'button' : undefined}
                  tabIndex={canJump ? 0 : undefined}
                  aria-label={
                    isHub
                      ? `${row.countryName} trade hub (${row.effectiveYear})`
                      : `${node.side === 'import' ? 'Import from' : 'Export to'} ${node.label}: ${valText} (${node.sharePct}%)${canJump ? '. Activate to inspect partner trade.' : ''}`
                  }
                  className={`transition-opacity duration-150 ${canJump ? 'cursor-pointer focus:outline-none' : ''}`}
                  style={{ opacity: isDimmed ? 0.35 : 1 }}
                  onMouseEnter={(e) => handleNodeMouseEnter(e, node)}
                  onFocus={() => {
                    if (!isHub) setHoveredPartnerCode(node.partnerCode);
                  }}
                  onBlur={() => {
                    if (!isHub) setHoveredPartnerCode(null);
                  }}
                  onClick={() => {
                    if (canJump) onSelectCountry(node.partnerCode);
                  }}
                  onKeyDown={(e) => {
                    if (canJump && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelectCountry(node.partnerCode);
                    }
                  }}
                >
                  <rect
                    x={x0}
                    y={y0}
                    width={Math.max(10, x1 - x0)}
                    height={nodeH}
                    rx={3}
                    fill={fill}
                    stroke={isHighlighted ? 'var(--ws-text)' : 'none'}
                    strokeWidth={isHighlighted ? 1.5 : 0}
                  />

                  {node.side === 'import' && (
                    <text
                      x={x0 - 8}
                      y={midY}
                      dy="0.35em"
                      textAnchor="end"
                      fontSize="11.5"
                      fill="var(--ws-text)"
                    >
                      <tspan fontWeight={isHighlighted ? '700' : '500'}>{shortName}</tspan>
                      <tspan
                        fill="var(--ws-text-muted)"
                        fontFamily="var(--font-mono, ui-monospace, monospace)"
                        fontSize="10.5"
                      >
                        {' '}
                        {valText}
                      </tspan>
                    </text>
                  )}

                  {node.side === 'export' && (
                    <text
                      x={x1 + 8}
                      y={midY}
                      dy="0.35em"
                      textAnchor="start"
                      fontSize="11.5"
                      fill="var(--ws-text)"
                    >
                      <tspan fontWeight={isHighlighted ? '700' : '500'}>{shortName}</tspan>
                      <tspan
                        fill="var(--ws-text-muted)"
                        fontFamily="var(--font-mono, ui-monospace, monospace)"
                        fontSize="10.5"
                      >
                        {' '}
                        {valText}
                      </tspan>
                    </text>
                  )}

                  {isHub && mode === 'exports' && (
                    <text
                      x={x0 - 10}
                      y={midY}
                      dy="0.35em"
                      textAnchor="end"
                      fontSize="12"
                      fontWeight="600"
                      fill="var(--ws-text)"
                    >
                      {row.countryName}
                    </text>
                  )}

                  {isHub && mode === 'imports' && (
                    <text
                      x={x1 + 10}
                      y={midY}
                      dy="0.35em"
                      textAnchor="start"
                      fontSize="12"
                      fontWeight="600"
                      fill="var(--ws-text)"
                    >
                      {row.countryName}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Cursor-Adjacent Tooltip */}
        {tooltip && (
          <div
            role="tooltip"
            className="pointer-events-none hidden sm:block absolute z-20 w-[268px] px-3 py-2.5 text-xs border"
            style={{
              left: `${tooltipLeft}px`,
              top: `${tooltipTop}px`,
              backgroundColor: 'var(--ws-popover-bg)',
              borderColor: 'var(--ws-border-strong)',
              color: 'var(--ws-text)',
              borderRadius: 'var(--ws-radius-sm)',
              boxShadow: 'var(--ws-shadow-popover)',
            }}
          >
            <div className="flex items-center justify-between gap-2 font-semibold ws-text">
              <span className="truncate">{tooltip.partnerName}</span>
              <span className="font-mono text-[10px] ws-text-muted">{tooltip.partnerCode}</span>
            </div>
            <div className="mt-1.5 space-y-1 font-mono tabular-nums text-[11px]">
              <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                <span className="ws-text-muted">
                  {tooltip.flow === 'import' ? 'Imports from' : 'Exports to'}
                </span>
                <span className={tooltip.flow === 'import' ? 'ws-warm font-semibold' : 'ws-accent font-semibold'}>
                  {formatTradeBillions(tooltip.valueBillions)} ({tooltip.sharePct.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                <span className="ws-text-muted">
                  {tooltip.flow === 'import' ? 'Exports to' : 'Imports from'}
                </span>
                <span className="ws-text-2">{formatTradeBillions(tooltip.counterFlowBillions)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 pt-1 border-t ws-border whitespace-nowrap">
                <span className="ws-text-muted">Bilateral Balance</span>
                <span
                  className={
                    tooltip.bilateralBalanceBillions >= 0
                      ? 'ws-positive font-semibold'
                      : 'ws-negative font-semibold'
                  }
                >
                  {formatSignedTradeBillions(tooltip.bilateralBalanceBillions)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Persistent Interactive Partner Corridor Readout Bar */}
      {activePartner && (
        <div
          data-testid="sankey-corridor-inspector"
          className="px-5 py-3 border-t ws-border ws-subpanel flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="font-semibold ws-text">
              {hoveredPartnerCode ? 'Focused Corridor:' : 'Largest Corridor:'}{' '}
              <span className="ws-accent">
                {row.countryName} ↔ {activePartner.partnerName} ({activePartner.partnerCode})
              </span>
            </span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums ws-warm">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Imports: {formatTradeBillions(activePartner.importsBillions)} ({activePartner.importSharePct.toFixed(1)}%)
            </span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums ws-accent">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Exports: {formatTradeBillions(activePartner.exportsBillions)} ({activePartner.exportSharePct.toFixed(1)}%)
            </span>
            <span
              className={`font-mono tabular-nums font-medium ${
                activePartner.bilateralBalanceBillions >= 0 ? 'ws-positive' : 'ws-negative'
              }`}
            >
              Net: {formatSignedTradeBillions(activePartner.bilateralBalanceBillions)}
            </span>
          </div>

          {canJumpActivePartner && (
            <button
              type="button"
              onClick={() => onSelectCountry(activePartner.partnerCode)}
              className="inline-flex items-center gap-1.5 text-xs font-medium ws-accent-link hover:underline whitespace-nowrap shrink-0 cursor-pointer self-start md:self-auto"
            >
              <span>Inspect {activePartner.partnerName} Trade</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <SourceFootnote
        sourceText={`IMF Direction of Trade Statistics (DOTS) · UN Comtrade · ${row.sourceMeta.agency}`}
        vintage={`${row.effectiveYear} Top 10 Bilateral Flows (${row.sourceMeta.shortName})`}
        onOpenSources={onOpenSources}
      />
    </section>
  );
}
