import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CityRecord, CountryRecord } from '../types/worldStats';
import {
  buildCitiesCsv,
  buildComparisonCsv,
  buildCountriesCsv,
  computeCityComparisonMatrix,
  computeDependencyRatio,
  computeProjectedGdpGrowth10YrPct,
  computeWorkingAgeShare,
  formatCompactNumber,
  formatCurrency,
  formatSignedPct,
} from './analytics';
import {
  getComparisonSourceFootprint,
  getCountrySourceCitation,
  NATIONAL_OFFICE_BY_COUNTRY,
} from '../data/dataSources';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCountriesAsCsv(countries: CountryRecord[]): string {
  const csv = buildCountriesCsv(countries);
  const filename = 'worldstats-global-demographics-gdp.csv';
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
  return filename;
}

export function exportCitiesAsCsv(cities: CityRecord[], label = 'cities'): string {
  const csv = buildCitiesCsv(cities);
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `worldstats-${slug}.csv`;
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
  return filename;
}

export function exportComparisonAsCsv(
  selectedCities: CityRecord[],
  countryByCode: Map<string, CountryRecord>
): string {
  const csv = buildComparisonCsv(selectedCities, countryByCode);
  const slug = selectedCities.map((c) => c.name.toLowerCase().replace(/[^a-z0-9]+/g, '')).join('-vs-');
  const filename = `worldstats-compare-${slug || 'cities'}.csv`;
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
  return filename;
}

function addPdfHeader(doc: jsPDF, title: string, subtitle: string): void {
  doc.setFillColor(11, 17, 29);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(9);
  doc.text('WORLDSTATS GLOBAL INTELLIGENCE REPORT', 14, 11);
  doc.setTextColor(241, 245, 249);
  doc.setFontSize(16);
  doc.text(title, 14, 19);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.text(subtitle, 14, 25);
}

function addPdfSourceFooter(doc: jsPDF, sourceLine: string): void {
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Source Footprint: ${sourceLine}`, 14, pageHeight - 7.5);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 28, pageHeight - 7.5);
  }
}

export function exportGlobalOverviewPdf(countries: CountryRecord[]): string {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toISOString().slice(0, 10);
  addPdfHeader(
    doc,
    'Global Demographics & GDP Statistical Atlas',
    `Generated ${dateStr} · ${countries.length} Major Economies · Age Structure, Projections & Economic Output`
  );

  autoTable(doc, {
    startY: 36,
    head: [[
      'Country',
      'Region',
      'Pop (M)',
      'GDP ($T)',
      'GDP / Cap',
      '10-Yr GDP Gr.',
      'Median Age',
      'Working Age',
      '2050 Proj (M)',
    ]],
    body: countries.map((c) => {
      const p2050 = c.projections.find((p) => p.year === 2050)?.medium ?? c.populationMillions;
      return [
        c.name,
        c.region,
        c.populationMillions.toFixed(1),
        `$${c.gdpTrillions.toFixed(2)}T`,
        formatCurrency(c.gdpPerCapita),
        formatSignedPct(computeProjectedGdpGrowth10YrPct(c)),
        `${c.medianAge.toFixed(1)} yrs`,
        `${computeWorkingAgeShare(c.ageBrackets)}%`,
        p2050.toFixed(1),
      ];
    }),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [241, 245, 249] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addPdfSourceFooter(
    doc,
    'UN DESA WPP 2024 · IMF WEO · World Bank WDI · National Statistical Offices (2024–2025 Curated Baseline & Modeled Projections)'
  );
  const filename = 'worldstats-global-overview-report.pdf';
  doc.save(filename);
  return filename;
}

export function exportCountryDetailPdf(country: CountryRecord, countryCities: CityRecord[]): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toISOString().slice(0, 10);
  addPdfHeader(
    doc,
    `${country.name} — Demographic & Economic Profile`,
    `Region: ${country.region} · Pop: ${country.populationMillions}M · GDP: $${country.gdpTrillions}T · Generated ${dateStr}`
  );

  autoTable(doc, {
    startY: 36,
    head: [['Indicator', 'Value', 'Indicator', 'Value']],
    body: [
      ['Total Population', `${country.populationMillions.toFixed(1)}M`, 'GDP (Nominal)', `$${country.gdpTrillions.toFixed(2)}T`],
      ['Annual Pop Growth', `${country.annualPopGrowthPct >= 0 ? '+' : ''}${country.annualPopGrowthPct}%`, 'GDP per Capita', formatCurrency(country.gdpPerCapita)],
      ['Median Age', `${country.medianAge.toFixed(1)} years`, 'Working Age (15-64)', `${computeWorkingAgeShare(country.ageBrackets)}%`],
      ['Dependency Ratio', `${computeDependencyRatio(country.ageBrackets)}`, 'Life Expectancy', `${country.lifeExpectancy.toFixed(1)} years`],
      ['Fertility Rate', `${country.fertilityRate.toFixed(2)} births/woman`, 'Urbanization', `${country.urbanizationPct.toFixed(1)}%`],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [241, 245, 249] },
  });

  const afterKpiY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 90;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text('Age Distribution Breakdown', 14, afterKpiY + 9);

  autoTable(doc, {
    startY: afterKpiY + 12,
    head: [['Age Group', 'Male Share (%)', 'Female Share (%)', 'Total Share (%)']],
    body: country.ageBrackets.map((b) => [
      b.group,
      `${b.malePct.toFixed(2)}%`,
      `${b.femalePct.toFixed(2)}%`,
      `${(b.malePct + b.femalePct).toFixed(2)}%`,
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [241, 245, 249] },
  });

  const afterAgeY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 160;

  doc.setFontSize(11);
  doc.text(`City-Level Breakdown (${countryCities.length} Cities)`, 14, afterAgeY + 9);

  autoTable(doc, {
    startY: afterAgeY + 12,
    head: [['City', 'Population', 'City GDP', 'GDP/Capita', 'Median Age', '2050 Proj', 'Sector']],
    body: countryCities.map((c) => [
      c.name,
      formatCompactNumber(c.population),
      `$${c.gdpBillions}B`,
      formatCurrency(c.gdpPerCapita),
      `${c.medianAge.toFixed(1)} yrs`,
      formatCompactNumber(c.projected2050),
      c.primarySector,
    ]),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [241, 245, 249] },
  });

  addPdfSourceFooter(
    doc,
    `${getCountrySourceCitation(country.code)} · OECD Metro Statistics (2024–2025 Curated Baseline)`
  );
  const filename = `worldstats-${country.code.toLowerCase()}-report.pdf`;
  doc.save(filename);
  return filename;
}

export function exportCitiesPdf(cities: CityRecord[], filterSummary: string): string {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toISOString().slice(0, 10);
  addPdfHeader(
    doc,
    'Global City-Level Demographic & Economic Directory',
    `${filterSummary} · ${cities.length} Cities · Generated ${dateStr}`
  );

  autoTable(doc, {
    startY: 36,
    head: [['City', 'Country', 'Population', 'Density (/km²)', 'City GDP', 'GDP/Cap', 'Median Age', '65+ Share', '2050 Proj']],
    body: cities.map((c) => [
      c.name,
      c.countryName,
      formatCompactNumber(c.population),
      c.densityPerKm2.toLocaleString('en-US'),
      `$${c.gdpBillions}B`,
      formatCurrency(c.gdpPerCapita),
      `${c.medianAge.toFixed(1)}`,
      `${c.ageBreakdown.age65plus}%`,
      formatCompactNumber(c.projected2050),
    ]),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [241, 245, 249] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addPdfSourceFooter(
    doc,
    'National Statistical Offices (incl. BPS Indonesia, Statistics Canada, U.S. Census, e-Stat) · OECD Metro Statistics · UN-Habitat'
  );
  const filename = 'worldstats-cities-directory.pdf';
  doc.save(filename);
  return filename;
}

export function exportComparisonPdf(
  selectedCities: CityRecord[],
  countryByCode: Map<string, CountryRecord>
): string {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toISOString().slice(0, 10);
  const titleCities = selectedCities.map((c) => `${c.name} (${c.countryCode})`).join(' vs. ');
  addPdfHeader(
    doc,
    'Side-by-Side City Demographic & Economic Comparison',
    `${titleCities} · Generated ${dateStr}`
  );

  const matrix = computeCityComparisonMatrix(selectedCities, countryByCode);

  autoTable(doc, {
    startY: 36,
    head: [['Indicator', ...selectedCities.map((c) => `${c.name} (${c.countryName})`)]],
    body: [
      ...matrix.map((row) => [
        row.label,
        ...row.values.map((v) =>
          v.deltaFromFirstPct !== null
            ? `${v.formatted} (${v.deltaFromFirstPct >= 0 ? '+' : ''}${v.deltaFromFirstPct}%)`
            : v.formatted
        ),
      ]),
      [
        'Official National Agency',
        ...selectedCities.map(
          (c) => NATIONAL_OFFICE_BY_COUNTRY[c.countryCode]?.shortName ?? `${c.countryName} NSO`
        ),
      ],
      [
        'Year of Official Data Source',
        ...selectedCities.map(
          (c) => NATIONAL_OFFICE_BY_COUNTRY[c.countryCode]?.cityDataYear ?? '2024'
        ),
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.6 },
    headStyles: { fillColor: [15, 23, 42], textColor: [241, 245, 249] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addPdfSourceFooter(
    doc,
    getComparisonSourceFootprint(selectedCities.map((c) => c.countryCode))
  );
  const slug = selectedCities.map((c) => c.name.toLowerCase().replace(/[^a-z0-9]+/g, '')).join('-vs-');
  const filename = `worldstats-comparison-${slug || 'cities'}.pdf`;
  doc.save(filename);
  return filename;
}
