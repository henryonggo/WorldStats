import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, CITIES } from '../data/worldDataset';
import { COUNTRY_TRADE_PROFILES, TRADE_PROFILE_BY_COUNTRY } from '../data/tradeDataset';
import {
  buildCountryTradeDetailCsv,
  buildTradeLedgerCsv,
  buildTradeMultiYearSeries,
  buildTradeSankeyGraph,
  buildTradeSourceReconciliation,
  resolveCountryTradeRow,
  resolveGlobalTradeLedger,
  resolveTradeObservation,
  sortTradeLedgerRows,
} from './tradeAnalytics';
import { buildAppUrlSearch, parseAppUrlState } from './analytics';

const countryByCode = new Map(COUNTRIES.map((c) => [c.code, c]));
const validCountryCodes = new Set(COUNTRIES.map((c) => c.code));
const validCityIds = new Set(CITIES.map((c) => c.id));

describe('Global Trade dataset coverage & structural integrity', () => {
  it('covers all 48 WorldStats economies with both Global and National source metadata', () => {
    assert.equal(COUNTRY_TRADE_PROFILES.length, COUNTRIES.length);
    assert.equal(COUNTRY_TRADE_PROFILES.length, 48);

    for (const country of COUNTRIES) {
      const profile = TRADE_PROFILE_BY_COUNTRY[country.code];
      assert.ok(profile, `Missing trade profile for ${country.code}`);
      assert.ok(profile.globalSource.agency.length > 0);
      assert.ok(profile.nationalSource.agency.length > 0);
      assert.ok(profile.nationalSource.url.startsWith('http'));
      assert.ok(profile.globalSeries[2023], `Missing 2023 global data for ${country.code}`);
      assert.ok(profile.nationalSeries[2023], `Missing 2023 national data for ${country.code}`);
      assert.equal(profile.topExportCommodities.length, 5);
      assert.equal(profile.topImportCommodities.length, 5);
      assert.equal(profile.topPartners.length, 10, `Expected 10 bilateral partners for ${country.code}`);
      assert.ok(profile.detailedExportItems.length >= 10, `Expected >= 10 HS export items for ${country.code}`);
      assert.ok(profile.detailedImportItems.length >= 10, `Expected >= 10 HS import items for ${country.code}`);

      const partnerCodes = new Set(profile.topPartners.map((p) => p.partnerCode));
      assert.equal(partnerCodes.size, 10, `Duplicate partner codes found for ${country.code}`);
      assert.equal(partnerCodes.has(country.code), false, `Self-partner found for ${country.code}`);

      const expPartnerShare = profile.topPartners.reduce((s, p) => s + p.exportSharePct, 0);
      const impPartnerShare = profile.topPartners.reduce((s, p) => s + p.importSharePct, 0);
      assert.ok(expPartnerShare > 20 && expPartnerShare <= 96, `${country.code} top10 expShare=${expPartnerShare}`);
      assert.ok(impPartnerShare > 20 && impPartnerShare <= 96, `${country.code} top10 impShare=${impPartnerShare}`);

      for (const item of [...profile.detailedExportItems, ...profile.detailedImportItems]) {
        assert.match(item.hsCode, /^HS \d{4}(\.\d{2})?$/, `Invalid HS code ${item.hsCode} in ${country.code}`);
        assert.ok(item.sharePct > 0);
      }

      const expSum = profile.topExportCommodities.reduce((s, c) => s + c.sharePct, 0);
      const impSum = profile.topImportCommodities.reduce((s, c) => s + c.sharePct, 0);
      assert.ok(Math.abs(expSum - 100) < 0.2, `${country.code} export share sum=${expSum}`);
      assert.ok(Math.abs(impSum - 100) < 0.2, `${country.code} import share sum=${impSum}`);
    }
  });
});

describe('Automatic year resolution & prior-year fallback rules', () => {
  it('uses exact requested latest year (2026) when available without fallback', () => {
    const idn = TRADE_PROFILE_BY_COUNTRY.IDN;
    const global2026 = resolveTradeObservation(idn, 2026, 'global');
    assert.equal(global2026.effectiveYear, 2026);
    assert.equal(global2026.usedFallback, false);
    assert.equal(global2026.fallbackReason, null);

    const nat2026 = resolveTradeObservation(idn, 2026, 'national');
    assert.equal(nat2026.effectiveYear, 2026);
    assert.equal(nat2026.usedFallback, false);
  });

  it('automatically falls back to previous available year when 2026 is pending in Global but available in National', () => {
    const zaf = TRADE_PROFILE_BY_COUNTRY.ZAF;
    const global2026 = resolveTradeObservation(zaf, 2026, 'global');
    assert.equal(global2026.effectiveYear, 2025);
    assert.equal(global2026.usedFallback, true);
    assert.ok(global2026.fallbackReason?.includes('2025'));

    const nat2026 = resolveTradeObservation(zaf, 2026, 'national');
    assert.equal(nat2026.effectiveYear, 2026);
    assert.equal(nat2026.usedFallback, false);
  });

  it('falls back across multiple years when only 2024 audited data exists (Nigeria global & Ethiopia)', () => {
    const nga = TRADE_PROFILE_BY_COUNTRY.NGA;
    const ngaGlobal = resolveTradeObservation(nga, 2026, 'global');
    assert.equal(ngaGlobal.effectiveYear, 2024);
    assert.equal(ngaGlobal.usedFallback, true);

    const ngaNational = resolveTradeObservation(nga, 2026, 'national');
    assert.equal(ngaNational.effectiveYear, 2025);
    assert.equal(ngaNational.usedFallback, true);

    const eth = TRADE_PROFILE_BY_COUNTRY.ETH;
    const ethNational = resolveTradeObservation(eth, 2025, 'national');
    assert.equal(ethNational.effectiveYear, 2024);
    assert.equal(ethNational.usedFallback, true);
  });

  it('returns exact historical year (2024 or 2023) without fallback when explicitly selected', () => {
    const nga = TRADE_PROFILE_BY_COUNTRY.NGA;
    const nga2024 = resolveTradeObservation(nga, 2024, 'global');
    assert.equal(nga2024.effectiveYear, 2024);
    assert.equal(nga2024.usedFallback, false);
  });
});

describe('Global vs. National reconciliation, ledger sorting & exports', () => {
  it('computes distinct reconciled values and variances between Global and National sources', () => {
    const nld = TRADE_PROFILE_BY_COUNTRY.NLD;
    const recon = buildTradeSourceReconciliation(nld, 'Netherlands', 2026);
    assert.equal(recon.rows.length, 3);
    const [globalRow, nationalRow, bopRow] = recon.rows;
    assert.equal(globalRow.id, 'global');
    assert.equal(nationalRow.id, 'national');
    assert.equal(bopRow.id, 'bop-benchmark');
    // Rotterdam Effect: CBS National Concept is ~3.8% lower than WTO Community Concept
    assert.ok(nationalRow.goodsExports < globalRow.goodsExports);
    assert.ok(recon.exportVariancePct > 2.5);
    assert.equal(bopRow.effectiveYear, 2025);
  });

  it('aggregates 48-economy ledger with accurate exact vs fallback counts and multi-column sorting', () => {
    const { rows, summary } = resolveGlobalTradeLedger(
      COUNTRY_TRADE_PROFILES,
      countryByCode,
      2026,
      'global'
    );
    assert.equal(rows.length, 48);
    assert.equal(summary.exactYearCount + summary.fallbackCount, 48);
    assert.ok(summary.exactYearCount > 20);
    assert.ok(summary.fallbackCount > 10);
    assert.ok(summary.totalGoodsExportsTrillions > 15);

    const byExports = sortTradeLedgerRows(rows, 'goodsExports', 'desc');
    assert.equal(byExports[0].countryCode, 'CHN');
    assert.equal(byExports[1].countryCode, 'USA');

    const byYearAsc = sortTradeLedgerRows(rows, 'effectiveYear', 'asc');
    assert.equal(byYearAsc[0].effectiveYear, 2024);
  });

  it('generates multi-year chart points and properly formatted CSV reports', () => {
    const can = TRADE_PROFILE_BY_COUNTRY.CAN;
    const series = buildTradeMultiYearSeries(can, 'national');
    assert.deepEqual(
      series.map((p) => p.year),
      [2023, 2024, 2025, 2026]
    );

    const row = resolveCountryTradeRow(can, countryByCode.get('CAN'), 2026, 'national');
    const recon = buildTradeSourceReconciliation(can, 'Canada', 2026);
    const detailCsv = buildCountryTradeDetailCsv(row, recon);
    assert.ok(detailCsv.includes('Statistics Canada'));
    assert.ok(detailCsv.includes('WTO · UN Comtrade · IMF DOTS'));
    assert.ok(detailCsv.includes('United States'));
    assert.ok(detailCsv.includes('Detailed Export Item (HS)'));
    assert.ok(detailCsv.includes('Detailed Import Item (HS)'));
    assert.ok(detailCsv.includes('HS 2709.00'));

    const ledgerCsv = buildTradeLedgerCsv([row], 2026, 'national');
    assert.ok(ledgerCsv.includes('Official National Customs/NSO'));
    assert.ok(ledgerCsv.includes('Canada'));
  });

  it('builds acyclic D3 Sankey graphs for Top 10 partners across flow modes and trade years', () => {
    const idn = TRADE_PROFILE_BY_COUNTRY.IDN;
    const row2026 = resolveCountryTradeRow(idn, countryByCode.get('IDN'), 2026, 'global');
    const row2024 = resolveCountryTradeRow(idn, countryByCode.get('IDN'), 2024, 'global');

    const both = buildTradeSankeyGraph(row2026, 'both');
    assert.equal(both.nodes.length, 21); // 10 imports + 1 hub + 10 exports
    assert.equal(both.links.length, 20);
    assert.ok(both.top10ExportsBillions > 0);
    assert.ok(both.top10ImportsBillions > 0);
    // Strict DAG check: no link has source === target and all values are strictly positive
    for (const link of both.links) {
      assert.notEqual(link.source, link.target);
      assert.ok(link.value > 0);
    }

    const exportsOnly = buildTradeSankeyGraph(row2026, 'exports');
    assert.equal(exportsOnly.nodes.length, 11);
    assert.equal(exportsOnly.links.length, 10);
    assert.ok(exportsOnly.links.every((l) => l.flow === 'export'));

    const importsOnly = buildTradeSankeyGraph(row2026, 'imports');
    assert.equal(importsOnly.nodes.length, 11);
    assert.equal(importsOnly.links.length, 10);
    assert.ok(importsOnly.links.every((l) => l.flow === 'import'));

    const both2024 = buildTradeSankeyGraph(row2024, 'both');
    assert.notEqual(both2024.top10ExportsBillions, both.top10ExportsBillions);
    assert.equal(both2024.effectiveYear, 2024);
  });

  it('round-trips Trade view deep-link URL query parameters cleanly', () => {
    const search = buildAppUrlSearch({
      view: 'trade',
      year: 2026,
      countryCode: 'IDN',
      cityId: null,
      compareCityIds: [],
      tradeRef: 'national',
      tradeYear: 2025,
    });
    const parsed = parseAppUrlState(search, validCountryCodes, validCityIds);
    assert.equal(parsed.view, 'trade');
    assert.equal(parsed.countryCode, 'IDN');
    assert.equal(parsed.tradeRef, 'national');
    assert.equal(parsed.tradeYear, 2025);
  });
});
