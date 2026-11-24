import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import { formatSignedPct } from '../utils/analytics';
import {
  formatTradeBillions,
  type ResolvedCountryTradeRow,
  type ResolvedTradeDetailedItem,
} from '../utils/tradeAnalytics';

interface TradeHsDetailTableProps {
  row: ResolvedCountryTradeRow;
  validCountryCodes: Set<string>;
  onSelectCountry: (countryCode: string) => void;
}

type HsFlowFilter = 'all' | 'export' | 'import';
type HsSortKey = 'hsCode' | 'flow' | 'itemName' | 'valueBillions' | 'sharePct' | 'yoyChangePct';

export function TradeHsDetailTable({
  row,
  validCountryCodes,
  onSelectCountry,
}: TradeHsDetailTableProps) {
  const [flowFilter, setFlowFilter] = useState<HsFlowFilter>('all');
  const [chapterFilter, setChapterFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<HsSortKey>('valueBillions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const allItems = useMemo<ResolvedTradeDetailedItem[]>(
    () => [...row.detailedExportItems, ...row.detailedImportItems],
    [row.detailedExportItems, row.detailedImportItems]
  );

  const chapterOptions = useMemo(() => {
    const chapters = Array.from(new Set(allItems.map((i) => i.hsChapter))).sort();
    return chapters;
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = allItems.filter((item) => {
      if (flowFilter !== 'all' && item.flow !== flowFilter) return false;
      if (chapterFilter !== 'ALL' && item.hsChapter !== chapterFilter) return false;
      if (q) {
        const hay = `${item.hsCode} ${item.hsChapter} ${item.hsSection} ${item.itemName} ${item.primaryPartnerName} ${item.primaryPartnerCode} ${item.flow}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortBy === 'hsCode') return a.hsCode.localeCompare(b.hsCode) * dir;
      if (sortBy === 'flow') return a.flow.localeCompare(b.flow) * dir;
      if (sortBy === 'itemName') return a.itemName.localeCompare(b.itemName) * dir;
      return (a[sortBy] - b[sortBy]) * dir;
    });
  }, [allItems, flowFilter, chapterFilter, searchQuery, sortBy, sortDir]);

  const filteredSummary = useMemo(() => {
    let exportsVal = 0;
    let importsVal = 0;
    for (const item of filteredItems) {
      if (item.flow === 'export') exportsVal += item.valueBillions;
      else importsVal += item.valueBillions;
    }
    return {
      exportsVal,
      importsVal,
      totalVal: exportsVal + importsVal,
    };
  }, [filteredItems]);

  const handleSort = (key: HsSortKey, defaultDir: 'asc' | 'desc') => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(key);
      setSortDir(defaultDir);
    }
  };

  const handleResetFilters = () => {
    setFlowFilter('all');
    setChapterFilter('ALL');
    setSearchQuery('');
  };

  const renderSortIcon = (key: HsSortKey) => {
    if (sortBy !== key) return <ArrowUpDown className="w-3 h-3 opacity-45 shrink-0" />;
    return sortDir === 'desc' ? (
      <ArrowDown className="w-3 h-3 ws-accent shrink-0" />
    ) : (
      <ArrowUp className="w-3 h-3 ws-accent shrink-0" />
    );
  };

  return (
    <div className="border-t ws-border" data-testid="trade-hs-detail-section">
      {/* Toolbar */}
      <div className="px-5 py-3.5 ws-subpanel border-b ws-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold ws-text">
            Detailed Export &amp; Import Line Items by HS2022 Code ({row.countryName} ·{' '}
            {row.effectiveYear})
          </h3>
          <p className="text-xs ws-text-muted mt-0.5">
            4- &amp; 6-digit Harmonized System customs line items scaled to {row.sourceMeta.shortName}{' '}
            ({filteredItems.length} of {allItems.length} items shown)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Flow Filter */}
          <div
            role="group"
            aria-label="Filter detailed HS items by trade flow"
            className="inline-flex items-center p-0.5 ws-inset"
          >
            {(
              [
                { id: 'all', label: `All (${allItems.length})` },
                { id: 'export', label: `Exports (${row.detailedExportItems.length})` },
                { id: 'import', label: `Imports (${row.detailedImportItems.length})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-hs-flow-filter={opt.id}
                aria-pressed={flowFilter === opt.id}
                onClick={() => setFlowFilter(opt.id)}
                className={`px-2.5 py-1 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  flowFilter === opt.id
                    ? 'ws-nav-active'
                    : 'ws-text-muted hover:ws-text border border-transparent ws-radius-sm'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* HS Chapter Filter */}
          <label className="sr-only" htmlFor="hs-chapter-filter">
            Filter by HS chapter
          </label>
          <select
            id="hs-chapter-filter"
            aria-label="Filter by HS chapter"
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            className="ws-input px-2.5 py-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="ALL">All HS Chapters</option>
            {chapterOptions.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial min-w-[205px]">
            <Search className="w-3.5 h-3.5 ws-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search HS code, item name, or partner"
              data-testid="hs-detail-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search HS code (e.g. 8542), item..."
              className="w-full ws-input pl-8 pr-3 py-1.5 text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Detailed HS Table */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left border-collapse text-xs"
          data-testid="trade-hs-detail-table"
        >
          <thead>
            <tr className="border-b ws-border ws-subpanel ws-text-2">
              <th className="py-2.5 px-4 font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('hsCode', 'asc')}
                  className="inline-flex items-center gap-1 hover:ws-text cursor-pointer"
                >
                  <span>HS2022 Code</span>
                  {renderSortIcon('hsCode')}
                </button>
              </th>
              <th className="py-2.5 px-3 font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('flow', 'asc')}
                  className="inline-flex items-center gap-1 hover:ws-text cursor-pointer"
                >
                  <span>Flow</span>
                  {renderSortIcon('flow')}
                </button>
              </th>
              <th className="py-2.5 px-3 font-medium min-w-[260px]">
                <button
                  type="button"
                  onClick={() => handleSort('itemName', 'asc')}
                  className="inline-flex items-center gap-1 hover:ws-text cursor-pointer"
                >
                  <span>Detailed Commodity Item &amp; HS Section</span>
                  {renderSortIcon('itemName')}
                </button>
              </th>
              <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('valueBillions', 'desc')}
                  className="inline-flex items-center justify-end gap-1 hover:ws-text cursor-pointer"
                >
                  <span>Value ($B)</span>
                  {renderSortIcon('valueBillions')}
                </button>
              </th>
              <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('sharePct', 'desc')}
                  className="inline-flex items-center justify-end gap-1 hover:ws-text cursor-pointer"
                >
                  <span>Share</span>
                  {renderSortIcon('sharePct')}
                </button>
              </th>
              <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('yoyChangePct', 'desc')}
                  className="inline-flex items-center justify-end gap-1 hover:ws-text cursor-pointer"
                >
                  <span>YoY</span>
                  {renderSortIcon('yoyChangePct')}
                </button>
              </th>
              <th className="py-2.5 px-4 font-medium text-right whitespace-nowrap">
                Primary Partner
              </th>
            </tr>
          </thead>

          <tbody className="ws-divide">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-5 text-center ws-text-muted">
                  <p className="text-xs ws-text-2 font-medium">
                    No HS2022 line items match your current filter.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-2.5 px-3 py-1.5 text-xs font-medium ws-btn-subtle cursor-pointer"
                  >
                    Reset HS Filters
                  </button>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isExport = item.flow === 'export';
                const canJumpPartner = validCountryCodes.has(item.primaryPartnerCode);
                return (
                  <tr
                    key={`${item.flow}-${item.hsCode}-${item.itemName}`}
                    data-testid="hs-detail-row"
                    data-hs-code={item.hsCode}
                    data-flow={item.flow}
                    className="ws-row-hover transition-colors"
                  >
                    <td className="py-2.5 px-4 align-top font-mono tabular-nums font-semibold ws-text whitespace-nowrap">
                      {item.hsCode}
                      <span className="block text-[10px] font-normal ws-text-muted">
                        {item.hsChapter}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isExport ? 'ws-accent' : 'ws-warm'
                        }`}
                      >
                        {isExport ? (
                          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{isExport ? 'Export' : 'Import'}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      <p className="font-medium ws-text leading-snug">{item.itemName}</p>
                      <p className="text-[11px] ws-text-muted mt-0.5">
                        {item.hsSection} · {item.unitNote}
                      </p>
                    </td>
                    <td
                      className={`py-2.5 px-3 align-top text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                        isExport ? 'ws-accent' : 'ws-warm'
                      }`}
                    >
                      {formatTradeBillions(item.valueBillions)}
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums ws-text-2 whitespace-nowrap">
                      <span>{item.sharePct.toFixed(1)}%</span>
                      <div className="mt-1 ml-auto w-14 h-1.5 ws-inset overflow-hidden">
                        <div
                          className={`h-full ${isExport ? 'bg-sky-500' : 'bg-amber-500'} opacity-80`}
                          style={{ width: `${Math.max(4, Math.min(100, item.sharePct * 3.5))}%` }}
                        />
                      </div>
                    </td>
                    <td
                      className={`py-2.5 px-3 align-top text-right font-mono tabular-nums whitespace-nowrap ${
                        item.yoyChangePct >= 0 ? 'ws-positive' : 'ws-negative'
                      }`}
                    >
                      {formatSignedPct(item.yoyChangePct)}
                    </td>
                    <td className="py-2.5 px-4 align-top text-right whitespace-nowrap">
                      {canJumpPartner ? (
                        <button
                          type="button"
                          onClick={() => onSelectCountry(item.primaryPartnerCode)}
                          className="ws-accent-link hover:underline font-medium cursor-pointer"
                        >
                          {item.primaryPartnerName} ({item.primaryPartnerCode})
                        </button>
                      ) : (
                        <span className="ws-text-2">{item.primaryPartnerName}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Compact Filtered Summary Footer */}
      <div className="px-5 py-2.5 border-t ws-border ws-subpanel flex flex-wrap items-center justify-between gap-2 text-[11px] ws-text-muted">
        <span>
          Showing <strong className="ws-text font-mono tabular-nums">{filteredItems.length}</strong>{' '}
          HS2022 line items ({row.effectiveYear})
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono tabular-nums">
          {(flowFilter === 'all' || flowFilter === 'export') && (
            <span>
              Matched Exports:{' '}
              <strong className="ws-accent">{formatTradeBillions(filteredSummary.exportsVal)}</strong>
            </span>
          )}
          {(flowFilter === 'all' || flowFilter === 'import') && (
            <span>
              Matched Imports:{' '}
              <strong className="ws-warm">{formatTradeBillions(filteredSummary.importsVal)}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
