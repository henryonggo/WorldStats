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
  DEFAULT_APPEARANCE_MODE,
  DEFAULT_DESIGN_THEME,
  DESIGN_THEMES,
  resolveAppearanceMode,
  resolveDesignTheme,
  resolveEffectiveAppearance,
} from '../data/themes';
import {
  buildAiContextSnapshot,
  buildAppUrlSearch,
  buildCitiesCsv,
  buildComparisonCsv,
  buildCountriesCsv,
  computeCityComparisonMatrix,
  computeDependencyRatio,
  computeGlobalIndicatorAverages,
  computeLiveWorldCounters,
  computePearsonCorrelation,
  computeProjectedChange2050Pct,
  computeProjectedGdpGrowth10YrPct,
  computeProjectedGdpTrajectory10Yr,
  computeWorkingAgeShare,
  escapeCsvCell,
  filterAndSortCities,
  parseAppUrlState,
  projectCitiesForYear,
  projectCountriesForYear,
  projectCountryForYear,
  searchGlobalEntities,
  sortCountries,
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

test('computeProjectedGdpGrowth10YrPct calculates realistic 10-year GDP growth rates across 2024–2026', () => {
  const ind = COUNTRIES.find((c) => c.code === 'IND')!;
  const jpn = COUNTRIES.find((c) => c.code === 'JPN')!;
  const idn = COUNTRIES.find((c) => c.code === 'IDN')!;
  const can = COUNTRIES.find((c) => c.code === 'CAN')!;

  const indGrowth = computeProjectedGdpGrowth10YrPct(ind, 2026);
  const jpnGrowth = computeProjectedGdpGrowth10YrPct(jpn, 2026);
  const idnGrowth = computeProjectedGdpGrowth10YrPct(idn, 2026);
  const canGrowth = computeProjectedGdpGrowth10YrPct(can, 2026);

  assert.ok(indGrowth > 70, `Expected India 10-yr GDP growth > 70%, got ${indGrowth}`);
  assert.ok(jpnGrowth > 5 && jpnGrowth < 16, `Expected Japan 10-yr GDP growth ~9%, got ${jpnGrowth}`);
  assert.ok(idnGrowth > 55, `Expected Indonesia 10-yr GDP growth > 55%, got ${idnGrowth}`);
  assert.ok(canGrowth > 18 && canGrowth < 30, `Expected Canada 10-yr GDP growth ~23%, got ${canGrowth}`);
});

test('projectCountriesForYear and projectCitiesForYear reflect 2024, 2025, and 2026 macro trends', () => {
  const idnBase = COUNTRIES.find((c) => c.code === 'IDN')!;
  const jpnBase = COUNTRIES.find((c) => c.code === 'JPN')!;

  const idn2024 = projectCountryForYear(idnBase, 2024);
  const idn2025 = projectCountryForYear(idnBase, 2025);
  const idn2026 = projectCountryForYear(idnBase, 2026);

  assert.ok(idn2024.gdpTrillions < idn2025.gdpTrillions);
  assert.ok(idn2025.gdpTrillions < idn2026.gdpTrillions);
  assert.ok(idn2024.populationMillions < idn2026.populationMillions);

  const jpn2024 = projectCountryForYear(jpnBase, 2024);
  const jpn2026 = projectCountryForYear(jpnBase, 2026);
  assert.ok(jpn2026.populationMillions < jpn2024.populationMillions);

  const cities2024 = projectCitiesForYear(CITIES, 2024);
  const cities2026 = projectCitiesForYear(CITIES, 2026);
  const jkt2024 = cities2024.find((c) => c.id === 'idn-jkt')!;
  const jkt2026 = cities2026.find((c) => c.id === 'idn-jkt')!;
  assert.ok(jkt2026.gdpBillions > jkt2024.gdpBillions);
  assert.ok(jkt2026.population > jkt2024.population);
});

test('sortCountries accurately sorts Global Country Demographics & GDP Ledger on all columns', () => {
  const countries2026 = projectCountriesForYear(COUNTRIES, 2026);

  const byNameAsc = sortCountries(countries2026, 'name', 'asc', 2026);
  assert.equal(byNameAsc[0].name, 'Argentina');
  assert.equal(byNameAsc[byNameAsc.length - 1].name, 'Vietnam');

  const byGdpDesc = sortCountries(countries2026, 'gdpTrillions', 'desc', 2026);
  assert.equal(byGdpDesc[0].code, 'USA');

  const byAgeAsc = sortCountries(countries2026, 'medianAge', 'asc', 2026);
  assert.equal(byAgeAsc[0].code, 'NGA');
  const byAgeDesc = sortCountries(countries2026, 'medianAge', 'desc', 2026);
  assert.equal(byAgeDesc[0].code, 'JPN');

  const by10YrGdpDesc = sortCountries(countries2026, 'projectedGdp10Yr', 'desc', 2026);
  assert.ok(
    computeProjectedGdpGrowth10YrPct(by10YrGdpDesc[0], 2026) >=
      computeProjectedGdpGrowth10YrPct(by10YrGdpDesc[1], 2026)
  );
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
  assert.equal(usCities.length, 5);
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

test('CSV escaping and builders generate valid CSV output with year-stamped source footprints', () => {
  assert.equal(escapeCsvCell('Finance, Media'), '"Finance, Media"');
  assert.equal(escapeCsvCell('Quote "test"'), '"Quote ""test"""');

  const countryCsv = buildCountriesCsv(COUNTRIES.slice(0, 3), 2026);
  assert.equal(countryCsv.split('\n').length, 4);
  assert.ok(countryCsv.includes('Data Year'));
  assert.ok(countryCsv.includes('10-Yr Projected GDP Growth (%)'));
  assert.ok(countryCsv.includes('UN DESA WPP (2026)'));

  const cityCsv = buildCitiesCsv(CITIES.slice(0, 5), 2026);
  assert.equal(cityCsv.split('\n').length, 6);
  assert.ok(cityCsv.includes('Data Source'));
  assert.ok(cityCsv.includes('OECD Metro Statistics'));

  const countryMap = new Map(COUNTRIES.map((c) => [c.code, c]));
  const compCsv = buildComparisonCsv(CITIES.slice(0, 2), countryMap, 2026);
  assert.ok(compCsv.includes('GDP per Capita'));
  assert.ok(compCsv.includes('Data Source Footprint'));
});

test('data source citations resolve institutional and national statistical offices across 2024–2026', () => {
  const idn2026 = getCountrySourceCitation('IDN', 2026);
  assert.ok(idn2026.includes('UN DESA WPP (2026)'));
  assert.ok(idn2026.includes('BPS Indonesia (2026 Q3 Est.)'));

  const idn2024 = getCountrySourceCitation('IDN', 2024);
  assert.ok(idn2024.includes('BPS Indonesia (2024)'));

  const canCitySource = getCitySourceCitation('CAN', 2026);
  assert.ok(canCitySource.includes('Statistics Canada'));
  assert.ok(canCitySource.includes('OECD Metro Statistics'));

  const crossBorderFootprint = getComparisonSourceFootprint(['IDN', 'CAN', 'IDN'], 2026);
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

test('computeProjectedGdpTrajectory10Yr produces 11 annual points matching 10-yr cumulative growth for 2026', () => {
  for (const code of ['IDN', 'CAN', 'JPN', 'IND']) {
    const country = projectCountryForYear(COUNTRIES.find((c) => c.code === code)!, 2026);
    const series = computeProjectedGdpTrajectory10Yr(country, 2026);
    assert.equal(series.length, 11);
    assert.equal(series[0].year, 2026);
    assert.equal(series[0].cumulativeGrowthPct, 0);
    assert.equal(series[10].year, 2036);
    assert.equal(series[10].cumulativeGrowthPct, computeProjectedGdpGrowth10YrPct(country, 2026));
    assert.ok(series[10].gdpTrillions > series[0].gdpTrillions);
  }
});

test('buildCountryMultiSourceComparison reflects selected 2026, 2025, and 2024 reporting years', () => {
  const idn = projectCountryForYear(COUNTRIES.find((c) => c.code === 'IDN')!, 2026);
  const idnComp2026 = buildCountryMultiSourceComparison(idn, 2026);
  assert.equal(idnComp2026.rows.length, 4);
  assert.equal(idnComp2026.rows[0].sourceType, 'official-national');
  assert.ok(idnComp2026.rows[0].sourceName.includes('BPS'));
  assert.equal(idnComp2026.rows[0].dataYear, '2026 (Q3 Est.)');
  assert.equal(idnComp2026.rows[3].dataYear, '2025');

  const idn2024 = projectCountryForYear(COUNTRIES.find((c) => c.code === 'IDN')!, 2024);
  const idnComp2024 = buildCountryMultiSourceComparison(idn2024, 2024);
  assert.equal(idnComp2024.rows[0].dataYear, '2024');
  assert.equal(idnComp2024.rows[3].dataYear, '2023');

  const countryMap = new Map(projectCountriesForYear(COUNTRIES, 2026).map((c) => [c.code, c]));
  const cities2026 = projectCitiesForYear(CITIES, 2026);
  const compCsv = buildComparisonCsv(
    [cities2026.find((c) => c.id === 'idn-jkt')!, cities2026.find((c) => c.id === 'can-tor')!],
    countryMap,
    2026
  );
  assert.ok(compCsv.includes('Official National Agency'));
  assert.ok(compCsv.includes('Official Data Year'));
  assert.ok(compCsv.includes('2026 (PDRB)'));
  assert.ok(compCsv.includes('2026 (CMA)'));
});

test('DESIGN_THEMES and appearance mode resolvers support Light/Dark/System and 4 distinct themes', () => {
  assert.equal(DESIGN_THEMES.length, 4);
  const ids = new Set(DESIGN_THEMES.map((t) => t.id));
  assert.equal(ids.size, 4);

  assert.equal(resolveDesignTheme('swiss-editorial').id, 'swiss-editorial');
  assert.equal(resolveDesignTheme('quant-terminal').id, 'quant-terminal');
  assert.equal(resolveDesignTheme('nordic-studio').id, 'nordic-studio');
  assert.equal(resolveDesignTheme('liquid-obsidian').id, DEFAULT_DESIGN_THEME); // legacy fallback
  assert.equal(resolveDesignTheme(null).id, DEFAULT_DESIGN_THEME);

  assert.equal(resolveAppearanceMode('light'), 'light');
  assert.equal(resolveAppearanceMode('dark'), 'dark');
  assert.equal(resolveAppearanceMode('system'), 'system');
  assert.equal(resolveAppearanceMode('invalid'), DEFAULT_APPEARANCE_MODE);

  assert.equal(resolveEffectiveAppearance('light', true), 'light');
  assert.equal(resolveEffectiveAppearance('dark', false), 'dark');
  assert.equal(resolveEffectiveAppearance('system', true), 'dark');
  assert.equal(resolveEffectiveAppearance('system', false), 'light');
});

test('expanded dataset covers 48 economies and 138 unique cities with valid age totals & indicators', () => {
  assert.equal(COUNTRIES.length, 48);
  assert.equal(CITIES.length, 138);

  const countryCodes = new Set(COUNTRIES.map((c) => c.code));
  assert.equal(countryCodes.size, 48, 'All 48 country codes must be unique');

  const cityIds = new Set(CITIES.map((c) => c.id));
  assert.equal(cityIds.size, 138, 'All 138 city IDs must be unique');

  for (const country of COUNTRIES) {
    const bracketSum = country.ageBrackets.reduce((s, b) => s + b.malePct + b.femalePct, 0);
    assert.ok(Math.abs(bracketSum - 100) < 0.3, `Expected age brackets for ${country.code} to sum to 100, got ${bracketSum}`);
    assert.ok(country.indicators, `Missing indicators for ${country.code}`);
    assert.ok(country.indicators.hdiScore > 0.4 && country.indicators.hdiScore < 1.0);
    assert.ok(country.indicators.giniIndex > 20 && country.indicators.giniIndex < 70);
    assert.ok(country.indicators.renewableEnergyPct >= 0 && country.indicators.renewableEnergyPct <= 100);
  }

  for (const city of CITIES) {
    assert.ok(countryCodes.has(city.countryCode), `City ${city.id} references unknown country ${city.countryCode}`);
    const ageSum =
      city.ageBreakdown.age0to14 +
      city.ageBreakdown.age15to24 +
      city.ageBreakdown.age25to44 +
      city.ageBreakdown.age45to64 +
      city.ageBreakdown.age65plus;
    assert.ok(Math.abs(ageSum - 100) < 0.3, `Expected age breakdown for ${city.name} (${city.id}) to sum to 100, got ${ageSum}`);
  }
});

test('multi-lens sorting, global indicator averages, and CSV export cover Health/Energy/Inequality', () => {
  const countries2026 = projectCountriesForYear(COUNTRIES, 2026);
  const avgs = computeGlobalIndicatorAverages(countries2026);
  assert.ok(avgs.hdiScore > 0.75 && avgs.hdiScore < 0.92);
  assert.ok(avgs.renewableEnergyPct > 25 && avgs.renewableEnergyPct < 65);

  const byHdiDesc = sortCountries(countries2026, 'hdiScore', 'desc', 2026);
  assert.ok(byHdiDesc[0].indicators.hdiScore >= byHdiDesc[1].indicators.hdiScore);
  assert.ok(['CHE', 'NOR'].includes(byHdiDesc[0].code));

  const byRenewDesc = sortCountries(countries2026, 'renewableEnergyPct', 'desc', 2026);
  assert.ok(['NOR', 'ETH', 'BRA'].includes(byRenewDesc[0].code));

  const byGiniDesc = sortCountries(countries2026, 'giniIndex', 'desc', 2026);
  assert.equal(byGiniDesc[0].code, 'ZAF');

  const csv = buildCountriesCsv(countries2026.slice(0, 5), 2026);
  assert.ok(csv.includes('HDI Score'));
  assert.ok(csv.includes('Renewable Electricity (%)'));
  assert.ok(csv.includes('Gini Index'));
});

test('URL deep-link serialization/parsing and AI context snapshot work deterministically', () => {
  const validCodes = new Set(COUNTRIES.map((c) => c.code));
  const validCities = new Set(CITIES.map((c) => c.id));

  const countrySearch = buildAppUrlSearch({
    view: 'country',
    year: 2025,
    countryCode: 'CHE',
    cityId: null,
    compareCityIds: ['idn-jkt', 'can-tor'],
  });
  assert.equal(countrySearch, '?view=country&year=2025&country=CHE');

  const parsedCountry = parseAppUrlState(countrySearch, validCodes, validCities);
  assert.equal(parsedCountry.view, 'country');
  assert.equal(parsedCountry.year, 2025);
  assert.equal(parsedCountry.countryCode, 'CHE');

  const compareSearch = buildAppUrlSearch({
    view: 'compare',
    year: 2026,
    countryCode: 'JPN',
    cityId: null,
    compareCityIds: ['idn-jkt', 'can-tor', 'che-zrh'],
  });
  const parsedCompare = parseAppUrlState(compareSearch, validCodes, validCities);
  assert.equal(parsedCompare.view, 'compare');
  assert.deepEqual(parsedCompare.compareCityIds, ['idn-jkt', 'can-tor', 'che-zrh']);

  // Reject invalid params safely
  const parsedInvalid = parseAppUrlState('?view=hack&year=1999&country=ZZZ&cities=bad-id,idn-jkt', validCodes, validCities);
  assert.equal(parsedInvalid.view, undefined);
  assert.equal(parsedInvalid.year, undefined);
  assert.equal(parsedInvalid.countryCode, undefined);
  assert.deepEqual(parsedInvalid.compareCityIds, ['idn-jkt']);

  const snapshot = buildAiContextSnapshot(COUNTRIES, CITIES, {
    activeView: 'country',
    dataYear: 2026,
    selectedCountryCode: 'IDN',
    selectedCityId: 'idn-jkt',
    compareCityIds: ['idn-jkt', 'can-tor'],
  });
  assert.ok(snapshot.includes('Tracked Economies: 48'));
  assert.ok(snapshot.includes('Tracked Cities: 138'));
  assert.ok(snapshot.includes('CHE|Switzerland'));
  assert.ok(snapshot.includes('idn-jkt|Jakarta'));
});

