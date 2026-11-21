import test from 'node:test';
import assert from 'node:assert/strict';
import { CITIES, COUNTRIES } from '../data/worldDataset';
import {
  buildCountryMultiSourceComparison,
  getCitySourceCitation,
  getComparisonSourceFootprint,
  getCountrySourceCitation,
} from '../data/dataSources';
import {
  buildCitiesCsv,
  buildComparisonCsv,
  buildCountriesCsv,
  computeCityComparisonMatrix,
  computeDependencyRatio,
  computeLiveWorldCounters,
  computePearsonCorrelation,
  computeProjectedChange2050Pct,
  computeProjectedGdpGrowth10YrPct,
  computeProjectedGdpTrajectory10Yr,
  computeWorkingAgeShare,
  escapeCsvCell,
  filterAndSortCities,
  searchGlobalEntities,
} from './analytics';

test('computeLiveWorldCounters increases deterministically over time', () => {
  const t1 = Date.UTC(2026, 5, 15, 12, 0, 0);
  const t2 = Date.UTC(2026, 5, 15, 12, 0, 10);
  const c1 = computeLiveWorldCounters(t1);
  const c2 = computeLiveWorldCounters(t2);

  assert.ok(c1.worldPopulation > 8_231_613_070);
  assert.ok(c2.worldPopulation > c1.worldPopulation);
  assert.ok(c2.birthsToday > c1.birthsToday);
  assert.ok(c2.deathsToday > c1.deathsToday);
  assert.equal(c2.netGrowthToday, c2.birthsToday - c2.deathsToday);
  assert.ok(c2.globalGdpTodayBillions > c1.globalGdpTodayBillions);
});

test('computeWorkingAgeShare and computeDependencyRatio match demographic math', () => {
  const japan = COUNTRIES.find((c) => c.code === 'JPN')!;
  const nigeria = COUNTRIES.find((c) => c.code === 'NGA')!;

  const jpnWorking = computeWorkingAgeShare(japan.ageBrackets);
  const ngaWorking = computeWorkingAgeShare(nigeria.ageBrackets);

  assert.ok(jpnWorking > 55 && jpnWorking < 63, `Expected Japan working age ~59%, got ${jpnWorking}`);
  assert.ok(ngaWorking > 52 && ngaWorking < 58, `Expected Nigeria working age ~55%, got ${ngaWorking}`);

  const jpnDep = computeDependencyRatio(japan.ageBrackets);
  assert.ok(jpnDep > 60, `Expected high dependency ratio for Japan, got ${jpnDep}`);
});

test('computePearsonCorrelation accurately detects positive and negative linear relationships', () => {
  const perfectPos = computePearsonCorrelation([
    { x: 10, y: 20 },
    { x: 20, y: 40 },
    { x: 30, y: 60 },
  ]);
  assert.equal(perfectPos.r, 1);
  assert.equal(perfectPos.rSquared, 1);
  assert.equal(perfectPos.slope, 2);

  const perfectNeg = computePearsonCorrelation([
    { x: 1, y: 100 },
    { x: 2, y: 50 },
    { x: 3, y: 0 },
  ]);
  assert.equal(perfectNeg.r, -1);

  const realAgeVsGdp = computePearsonCorrelation(
    COUNTRIES.map((c) => ({ x: c.medianAge, y: c.gdpPerCapita }))
  );
  assert.ok(realAgeVsGdp.r > 0.4, `Expected positive correlation between median age and GDP/capita, got ${realAgeVsGdp.r}`);
});

test('computeProjectedChange2050Pct shows growth for Nigeria and contraction for Japan', () => {
  const jpn = COUNTRIES.find((c) => c.code === 'JPN')!;
  const nga = COUNTRIES.find((c) => c.code === 'NGA')!;

  assert.ok(computeProjectedChange2050Pct(jpn) < -10);
  assert.ok(computeProjectedChange2050Pct(nga) > 40);
});

test('computeProjectedGdpGrowth10YrPct calculates realistic 10-year GDP growth rates', () => {
  const ind = COUNTRIES.find((c) => c.code === 'IND')!;
  const jpn = COUNTRIES.find((c) => c.code === 'JPN')!;
  const idn = COUNTRIES.find((c) => c.code === 'IDN')!;
  const can = COUNTRIES.find((c) => c.code === 'CAN')!;

  const indGrowth = computeProjectedGdpGrowth10YrPct(ind);
  const jpnGrowth = computeProjectedGdpGrowth10YrPct(jpn);
  const idnGrowth = computeProjectedGdpGrowth10YrPct(idn);
  const canGrowth = computeProjectedGdpGrowth10YrPct(can);

  assert.ok(indGrowth > 70, `Expected India 10-yr GDP growth > 70%, got ${indGrowth}`);
  assert.ok(jpnGrowth > 5 && jpnGrowth < 15, `Expected Japan 10-yr GDP growth ~9%, got ${jpnGrowth}`);
  assert.ok(idnGrowth > 55, `Expected Indonesia 10-yr GDP growth > 55%, got ${idnGrowth}`);
  assert.ok(canGrowth > 18 && canGrowth < 30, `Expected Canada 10-yr GDP growth ~23%, got ${canGrowth}`);
});

test('Indonesia and Canada have complete multi-region city datasets with valid age totals', () => {
  const idnCities = CITIES.filter((c) => c.countryCode === 'IDN');
  const canCities = CITIES.filter((c) => c.countryCode === 'CAN');

  assert.equal(idnCities.length, 15);
  assert.equal(canCities.length, 15);

  for (const city of [...idnCities, ...canCities]) {
    const ageSum =
      city.ageBreakdown.age0to14 +
      city.ageBreakdown.age15to24 +
      city.ageBreakdown.age25to44 +
      city.ageBreakdown.age45to64 +
      city.ageBreakdown.age65plus;
    assert.ok(Math.abs(ageSum - 100) < 0.2, `Expected age breakdown for ${city.name} to sum to 100, got ${ageSum}`);
    assert.ok(city.population > 0 && city.gdpBillions > 0 && city.projected2050 > 0);
  }
});

test('filterAndSortCities filters by search, region, country and sorts correctly', () => {
  const usCities = filterAndSortCities(CITIES, {
    search: '',
    region: 'All',
    countryCode: 'USA',
    sortBy: 'gdpPerCapita',
    sortDir: 'desc',
  });
  assert.equal(usCities.length, 4);
  assert.equal(usCities[0].id, 'usa-sfo');

  const munichSearch = filterAndSortCities(CITIES, {
    search: 'munich',
    region: 'Europe',
    countryCode: 'All',
    sortBy: 'population',
    sortDir: 'desc',
  });
  assert.equal(munichSearch.length, 1);
  assert.equal(munichSearch[0].countryCode, 'DEU');
});

test('computeCityComparisonMatrix computes deltas for same-country and cross-country cities', () => {
  const countryMap = new Map(COUNTRIES.map((c) => [c.code, c]));
  const nyc = CITIES.find((c) => c.id === 'usa-nyc')!;
  const sfo = CITIES.find((c) => c.id === 'usa-sfo')!;
  const lagos = CITIES.find((c) => c.id === 'nga-los')!;

  const matrix = computeCityComparisonMatrix([nyc, sfo, lagos], countryMap);
  const gdpCapRow = matrix.find((r) => r.key === 'gdpPerCapita')!;
  assert.equal(gdpCapRow.values[0].deltaFromFirstPct, null);
  assert.ok((gdpCapRow.values[1].deltaFromFirstPct ?? 0) > 0);
  assert.equal(gdpCapRow.values[1].isHighest, true);
  assert.equal(gdpCapRow.values[2].isLowest, true);
});

test('CSV escaping and builders generate valid CSV output with source footprints', () => {
  assert.equal(escapeCsvCell('Finance, Media'), '"Finance, Media"');
  assert.equal(escapeCsvCell('Quote "test"'), '"Quote ""test"""');

  const countryCsv = buildCountriesCsv(COUNTRIES.slice(0, 3));
  assert.equal(countryCsv.split('\n').length, 4);
  assert.ok(countryCsv.includes('10-Yr Projected GDP Growth (%)'));
  assert.ok(countryCsv.includes('Data Source'));
  assert.ok(countryCsv.includes('UN DESA WPP (2024)'));

  const cityCsv = buildCitiesCsv(CITIES.slice(0, 5));
  assert.equal(cityCsv.split('\n').length, 6);
  assert.ok(cityCsv.includes('Data Source'));
  assert.ok(cityCsv.includes('OECD Metro Statistics'));

  const countryMap = new Map(COUNTRIES.map((c) => [c.code, c]));
  const compCsv = buildComparisonCsv(CITIES.slice(0, 2), countryMap);
  assert.ok(compCsv.includes('GDP per Capita'));
  assert.ok(compCsv.includes('Data Source Footprint'));
});

test('data source citations resolve institutional and national statistical offices accurately', () => {
  const idnCountrySource = getCountrySourceCitation('IDN');
  assert.ok(idnCountrySource.includes('UN DESA WPP (2024)'));
  assert.ok(idnCountrySource.includes('BPS Indonesia (2024)'));

  const canCitySource = getCitySourceCitation('CAN');
  assert.ok(canCitySource.includes('Statistics Canada'));
  assert.ok(canCitySource.includes('OECD Metro Statistics'));

  const crossBorderFootprint = getComparisonSourceFootprint(['IDN', 'CAN', 'IDN']);
  assert.ok(crossBorderFootprint.includes('BPS Indonesia'));
  assert.ok(crossBorderFootprint.includes('Statistics Canada'));
  assert.equal(crossBorderFootprint.split('BPS Indonesia').length - 1, 1);
});

test('searchGlobalEntities ranks matching countries and cities accurately', () => {
  const empty = searchGlobalEntities('   ', COUNTRIES, CITIES);
  assert.equal(empty.totalMatches, 0);
  assert.equal(empty.countries.length, 0);
  assert.equal(empty.cities.length, 0);

  const indSearch = searchGlobalEntities('indo', COUNTRIES, CITIES);
  assert.equal(indSearch.countries[0]?.code, 'IDN');
  assert.ok(indSearch.cities.length > 0);
  assert.ok(indSearch.cities.every((c) => c.countryCode === 'IDN'));

  const calgarySearch = searchGlobalEntities('calgary', COUNTRIES, CITIES);
  assert.equal(calgarySearch.cities[0]?.id, 'can-yyc');
  assert.equal(calgarySearch.cities[0]?.countryCode, 'CAN');

  const makassarSearch = searchGlobalEntities('makassar', COUNTRIES, CITIES);
  assert.equal(makassarSearch.cities[0]?.name, 'Makassar');
  assert.equal(makassarSearch.cities[0]?.id, 'idn-upg');

  const codeSearch = searchGlobalEntities('CAN', COUNTRIES, CITIES);
  assert.equal(codeSearch.countries[0]?.code, 'CAN');
});

test('computeProjectedGdpTrajectory10Yr produces 11 annual points matching 10-yr cumulative growth', () => {
  for (const code of ['IDN', 'CAN', 'JPN', 'IND']) {
    const country = COUNTRIES.find((c) => c.code === code)!;
    const series = computeProjectedGdpTrajectory10Yr(country);
    assert.equal(series.length, 11);
    assert.equal(series[0].year, 2025);
    assert.equal(series[0].cumulativeGrowthPct, 0);
    assert.equal(series[10].year, 2035);
    assert.equal(series[10].cumulativeGrowthPct, computeProjectedGdpGrowth10YrPct(country));
    assert.ok(series[10].gdpTrillions > series[0].gdpTrillions);
  }
});

test('buildCountryMultiSourceComparison compares official national office against UN, IMF, and World Bank with data years', () => {
  const idn = COUNTRIES.find((c) => c.code === 'IDN')!;
  const can = COUNTRIES.find((c) => c.code === 'CAN')!;

  const idnComp = buildCountryMultiSourceComparison(idn);
  assert.equal(idnComp.rows.length, 4);
  assert.equal(idnComp.rows[0].sourceType, 'official-national');
  assert.ok(idnComp.rows[0].sourceName.includes('BPS'));
  assert.equal(idnComp.rows[0].dataYear, '2024');
  assert.equal(idnComp.rows[0].popDeltaVsOfficialPct, 0);
  assert.equal(idnComp.rows[3].dataYear, '2023');
  assert.ok(idnComp.popSpreadPct >= 0 && idnComp.gdpSpreadPct >= 0);

  const canComp = buildCountryMultiSourceComparison(can);
  assert.equal(canComp.rows.length, 4);
  assert.ok(canComp.rows[0].sourceName.includes('Statistics Canada'));
  assert.equal(canComp.rows[0].dataYear, '2024');

  const countryMap = new Map(COUNTRIES.map((c) => [c.code, c]));
  const compCsv = buildComparisonCsv(
    [CITIES.find((c) => c.id === 'idn-jkt')!, CITIES.find((c) => c.id === 'can-tor')!],
    countryMap
  );
  assert.ok(compCsv.includes('Official National Agency'));
  assert.ok(compCsv.includes('Official Data Year'));
  assert.ok(compCsv.includes('2024 (PDRB)'));
  assert.ok(compCsv.includes('2024 (CMA)'));
});
