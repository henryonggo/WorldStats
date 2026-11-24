import type {
  AgeBracket,
  BaseCountryRecord,
  CityRecord,
  CountryDevelopmentIndicators,
  GdpDemographicSeriesPoint,
  PopulationProjection,
} from '../types/worldStats';

function makeAgeBrackets(shares: [number, number, number, number, number, number, number]): AgeBracket[] {
  const groups: AgeBracket['group'][] = ['0-14', '15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const maleRatios = [0.512, 0.511, 0.506, 0.501, 0.496, 0.488, 0.448];
  return groups.map((group, idx) => {
    const total = shares[idx];
    const malePct = Number((total * maleRatios[idx]).toFixed(2));
    const femalePct = Number((total - malePct).toFixed(2));
    return { group, malePct, femalePct };
  });
}

function makeProjections(
  vals: [number, number, number, number, number, number]
): PopulationProjection[] {
  const years = [2020, 2025, 2035, 2050, 2075, 2100];
  return years.map((year, idx) => {
    const med = vals[idx];
    const spread = idx <= 1 ? 0 : idx === 2 ? 0.045 : idx === 3 ? 0.11 : idx === 4 ? 0.19 : 0.27;
    return {
      year,
      low: Number((med * (1 - spread)).toFixed(1)),
      medium: Number(med.toFixed(1)),
      high: Number((med * (1 + spread)).toFixed(1)),
    };
  });
}

function makeGdpSeries(
  gdp2025: number,
  pop2025: number,
  working2025: number,
  median2025: number,
  gdpCagrHist: number,
  gdpCagrProj: number,
  popTrend: number,
  agingStep: number
): GdpDemographicSeriesPoint[] {
  const years = [2005, 2010, 2015, 2020, 2025, 2030, 2035, 2040];
  return years.map((year) => {
    const diff = year - 2025;
    const rate = diff <= 0 ? gdpCagrHist : gdpCagrProj;
    const gdpTrillions = Number((gdp2025 * Math.pow(1 + rate, diff)).toFixed(2));
    const populationMillions = Number((pop2025 * Math.pow(1 + popTrend, diff)).toFixed(1));
    const gdpPerCapita = Math.round((gdpTrillions * 1_000_000) / Math.max(0.1, populationMillions));
    const workingAgePct = Number(
      Math.max(50, Math.min(75, working2025 - (diff / 5) * (agingStep * 0.55))).toFixed(1)
    );
    const medianAge = Number(
      Math.max(16, Math.min(56, median2025 + (diff / 5) * agingStep)).toFixed(1)
    );
    return {
      year,
      gdpTrillions,
      gdpPerCapita,
      workingAgePct,
      medianAge,
      populationMillions,
    };
  });
}

/**
 * Multi-dimensional development, health, education, energy, climate & inequality indicators
 * (2025 baseline) synthesized from WHO, UNESCO, IEA, Global Carbon Project, UNDP HDI & World Bank WDI.
 */
export const COUNTRY_INDICATORS_BY_CODE: Record<string, CountryDevelopmentIndicators> = {
  // Base 24 Economies
  USA: {
    healthExpenditurePctGdp: 16.6, physiciansPer1000: 3.6, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 84.9, rdExpenditurePctGdp: 3.59, co2PerCapitaTons: 14.3,
    renewableEnergyPct: 23.4, pm25AirQuality: 7.8, giniIndex: 41.3,
    internetPenetrationPct: 93.1, hdiScore: 0.927,
  },
  CHN: {
    healthExpenditurePctGdp: 5.4, physiciansPer1000: 2.5, literacyRatePct: 97.2,
    tertiaryEnrollmentPct: 72.0, rdExpenditurePctGdp: 2.65, co2PerCapitaTons: 8.4,
    renewableEnergyPct: 33.8, pm25AirQuality: 30.8, giniIndex: 37.1,
    internetPenetrationPct: 77.5, hdiScore: 0.788,
  },
  IND: {
    healthExpenditurePctGdp: 3.3, physiciansPer1000: 0.9, literacyRatePct: 77.7,
    tertiaryEnrollmentPct: 33.1, rdExpenditurePctGdp: 0.66, co2PerCapitaTons: 2.1,
    renewableEnergyPct: 22.8, pm25AirQuality: 49.6, giniIndex: 32.8,
    internetPenetrationPct: 55.9, hdiScore: 0.644,
  },
  JPN: {
    healthExpenditurePctGdp: 11.5, physiciansPer1000: 2.6, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 65.4, rdExpenditurePctGdp: 3.41, co2PerCapitaTons: 8.2,
    renewableEnergyPct: 23.1, pm25AirQuality: 9.6, giniIndex: 32.9,
    internetPenetrationPct: 86.2, hdiScore: 0.920,
  },
  DEU: {
    healthExpenditurePctGdp: 12.6, physiciansPer1000: 4.5, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 76.8, rdExpenditurePctGdp: 3.13, co2PerCapitaTons: 7.1,
    renewableEnergyPct: 56.2, pm25AirQuality: 9.1, giniIndex: 31.7,
    internetPenetrationPct: 92.5, hdiScore: 0.950,
  },
  GBR: {
    healthExpenditurePctGdp: 11.3, physiciansPer1000: 3.2, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 78.9, rdExpenditurePctGdp: 2.91, co2PerCapitaTons: 4.5,
    renewableEnergyPct: 48.9, pm25AirQuality: 8.4, giniIndex: 32.4,
    internetPenetrationPct: 96.3, hdiScore: 0.940,
  },
  FRA: {
    healthExpenditurePctGdp: 12.1, physiciansPer1000: 3.4, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 71.2, rdExpenditurePctGdp: 2.22, co2PerCapitaTons: 4.3,
    renewableEnergyPct: 27.6, pm25AirQuality: 9.3, giniIndex: 31.5,
    internetPenetrationPct: 87.4, hdiScore: 0.910,
  },
  BRA: {
    healthExpenditurePctGdp: 9.7, physiciansPer1000: 2.4, literacyRatePct: 94.7,
    tertiaryEnrollmentPct: 58.6, rdExpenditurePctGdp: 1.15, co2PerCapitaTons: 2.3,
    renewableEnergyPct: 89.2, pm25AirQuality: 12.4, giniIndex: 52.0,
    internetPenetrationPct: 84.2, hdiScore: 0.760,
  },
  NGA: {
    healthExpenditurePctGdp: 4.1, physiciansPer1000: 0.4, literacyRatePct: 62.0,
    tertiaryEnrollmentPct: 12.4, rdExpenditurePctGdp: 0.14, co2PerCapitaTons: 0.6,
    renewableEnergyPct: 22.1, pm25AirQuality: 36.2, giniIndex: 35.1,
    internetPenetrationPct: 45.4, hdiScore: 0.548,
  },
  IDN: {
    healthExpenditurePctGdp: 3.7, physiciansPer1000: 0.7, literacyRatePct: 96.0,
    tertiaryEnrollmentPct: 42.6, rdExpenditurePctGdp: 0.28, co2PerCapitaTons: 2.6,
    renewableEnergyPct: 14.8, pm25AirQuality: 28.4, giniIndex: 37.9,
    internetPenetrationPct: 79.5, hdiScore: 0.713,
  },
  CAN: {
    healthExpenditurePctGdp: 11.7, physiciansPer1000: 2.8, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 81.2, rdExpenditurePctGdp: 1.81, co2PerCapitaTons: 14.1,
    renewableEnergyPct: 67.8, pm25AirQuality: 6.9, giniIndex: 31.7,
    internetPenetrationPct: 94.0, hdiScore: 0.935,
  },
  AUS: {
    healthExpenditurePctGdp: 10.6, physiciansPer1000: 4.1, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 96.4, rdExpenditurePctGdp: 1.68, co2PerCapitaTons: 14.5,
    renewableEnergyPct: 39.4, pm25AirQuality: 5.4, giniIndex: 34.3,
    internetPenetrationPct: 95.1, hdiScore: 0.946,
  },
  KOR: {
    healthExpenditurePctGdp: 9.7, physiciansPer1000: 2.6, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 98.1, rdExpenditurePctGdp: 5.21, co2PerCapitaTons: 11.4,
    renewableEnergyPct: 10.6, pm25AirQuality: 17.8, giniIndex: 31.4,
    internetPenetrationPct: 97.4, hdiScore: 0.929,
  },
  MEX: {
    healthExpenditurePctGdp: 6.1, physiciansPer1000: 2.5, literacyRatePct: 95.3,
    tertiaryEnrollmentPct: 45.8, rdExpenditurePctGdp: 0.31, co2PerCapitaTons: 3.7,
    renewableEnergyPct: 22.4, pm25AirQuality: 18.6, giniIndex: 43.5,
    internetPenetrationPct: 81.2, hdiScore: 0.781,
  },
  EGY: {
    healthExpenditurePctGdp: 4.6, physiciansPer1000: 0.8, literacyRatePct: 74.5,
    tertiaryEnrollmentPct: 39.2, rdExpenditurePctGdp: 0.96, co2PerCapitaTons: 2.4,
    renewableEnergyPct: 12.1, pm25AirQuality: 42.1, giniIndex: 31.9,
    internetPenetrationPct: 72.7, hdiScore: 0.728,
  },
  ZAF: {
    healthExpenditurePctGdp: 8.3, physiciansPer1000: 0.9, literacyRatePct: 95.0,
    tertiaryEnrollmentPct: 25.4, rdExpenditurePctGdp: 0.62, co2PerCapitaTons: 6.7,
    renewableEnergyPct: 11.2, pm25AirQuality: 21.8, giniIndex: 63.0,
    internetPenetrationPct: 75.7, hdiScore: 0.717,
  },
  ARG: {
    healthExpenditurePctGdp: 9.7, physiciansPer1000: 4.0, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 94.2, rdExpenditurePctGdp: 0.54, co2PerCapitaTons: 4.2,
    renewableEnergyPct: 34.5, pm25AirQuality: 11.2, giniIndex: 42.0,
    internetPenetrationPct: 89.2, hdiScore: 0.849,
  },
  VNM: {
    healthExpenditurePctGdp: 4.6, physiciansPer1000: 1.0, literacyRatePct: 96.1,
    tertiaryEnrollmentPct: 41.8, rdExpenditurePctGdp: 0.43, co2PerCapitaTons: 3.4,
    renewableEnergyPct: 45.2, pm25AirQuality: 24.7, giniIndex: 36.1,
    internetPenetrationPct: 79.1, hdiScore: 0.726,
  },
  TUR: {
    healthExpenditurePctGdp: 4.6, physiciansPer1000: 2.2, literacyRatePct: 97.6,
    tertiaryEnrollmentPct: 96.8, rdExpenditurePctGdp: 1.42, co2PerCapitaTons: 5.1,
    renewableEnergyPct: 43.6, pm25AirQuality: 19.4, giniIndex: 44.4,
    internetPenetrationPct: 86.0, hdiScore: 0.855,
  },
  POL: {
    healthExpenditurePctGdp: 6.7, physiciansPer1000: 3.4, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 72.4, rdExpenditurePctGdp: 1.56, co2PerCapitaTons: 7.5,
    renewableEnergyPct: 27.8, pm25AirQuality: 15.6, giniIndex: 28.5,
    internetPenetrationPct: 89.4, hdiScore: 0.881,
  },
  ESP: {
    healthExpenditurePctGdp: 10.4, physiciansPer1000: 4.5, literacyRatePct: 98.6,
    tertiaryEnrollmentPct: 94.8, rdExpenditurePctGdp: 1.49, co2PerCapitaTons: 4.7,
    renewableEnergyPct: 54.8, pm25AirQuality: 9.2, giniIndex: 33.9,
    internetPenetrationPct: 95.4, hdiScore: 0.911,
  },
  KEN: {
    healthExpenditurePctGdp: 4.5, physiciansPer1000: 0.2, literacyRatePct: 82.9,
    tertiaryEnrollmentPct: 11.8, rdExpenditurePctGdp: 0.79, co2PerCapitaTons: 0.4,
    renewableEnergyPct: 88.4, pm25AirQuality: 17.5, giniIndex: 38.7,
    internetPenetrationPct: 40.8, hdiScore: 0.601,
  },
  SAU: {
    healthExpenditurePctGdp: 6.0, physiciansPer1000: 2.8, literacyRatePct: 97.6,
    tertiaryEnrollmentPct: 73.6, rdExpenditurePctGdp: 0.52, co2PerCapitaTons: 18.2,
    renewableEnergyPct: 2.4, pm25AirQuality: 44.8, giniIndex: 45.9,
    internetPenetrationPct: 99.0, hdiScore: 0.875,
  },
  SGP: {
    healthExpenditurePctGdp: 5.6, physiciansPer1000: 2.8, literacyRatePct: 97.6,
    tertiaryEnrollmentPct: 93.4, rdExpenditurePctGdp: 2.16, co2PerCapitaTons: 8.9,
    renewableEnergyPct: 4.6, pm25AirQuality: 13.2, giniIndex: 37.8,
    internetPenetrationPct: 96.0, hdiScore: 0.949,
  },
  // Expanded 24 Economies (Total = 48)
  ITA: {
    healthExpenditurePctGdp: 9.0, physiciansPer1000: 4.1, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 70.4, rdExpenditurePctGdp: 1.37, co2PerCapitaTons: 5.3,
    renewableEnergyPct: 44.2, pm25AirQuality: 14.1, giniIndex: 34.8,
    internetPenetrationPct: 87.0, hdiScore: 0.906,
  },
  NLD: {
    healthExpenditurePctGdp: 10.2, physiciansPer1000: 3.9, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 88.1, rdExpenditurePctGdp: 2.31, co2PerCapitaTons: 6.9,
    renewableEnergyPct: 50.8, pm25AirQuality: 9.8, giniIndex: 25.7,
    internetPenetrationPct: 93.2, hdiScore: 0.946,
  },
  CHE: {
    healthExpenditurePctGdp: 11.8, physiciansPer1000: 4.5, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 67.5, rdExpenditurePctGdp: 3.36, co2PerCapitaTons: 3.9,
    renewableEnergyPct: 62.4, pm25AirQuality: 8.1, giniIndex: 33.7,
    internetPenetrationPct: 96.7, hdiScore: 0.967,
  },
  SWE: {
    healthExpenditurePctGdp: 10.7, physiciansPer1000: 4.4, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 83.2, rdExpenditurePctGdp: 3.42, co2PerCapitaTons: 3.5,
    renewableEnergyPct: 69.1, pm25AirQuality: 5.1, giniIndex: 29.8,
    internetPenetrationPct: 95.7, hdiScore: 0.952,
  },
  NOR: {
    healthExpenditurePctGdp: 9.9, physiciansPer1000: 5.2, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 87.9, rdExpenditurePctGdp: 1.94, co2PerCapitaTons: 7.4,
    renewableEnergyPct: 98.4, pm25AirQuality: 4.8, giniIndex: 27.7,
    internetPenetrationPct: 99.0, hdiScore: 0.966,
  },
  BEL: {
    healthExpenditurePctGdp: 10.9, physiciansPer1000: 3.4, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 82.4, rdExpenditurePctGdp: 3.41, co2PerCapitaTons: 7.3,
    renewableEnergyPct: 30.2, pm25AirQuality: 10.2, giniIndex: 26.6,
    internetPenetrationPct: 94.6, hdiScore: 0.942,
  },
  AUT: {
    healthExpenditurePctGdp: 11.4, physiciansPer1000: 5.5, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 86.7, rdExpenditurePctGdp: 3.26, co2PerCapitaTons: 6.4,
    renewableEnergyPct: 82.6, pm25AirQuality: 9.6, giniIndex: 30.7,
    internetPenetrationPct: 95.3, hdiScore: 0.926,
  },
  IRL: {
    healthExpenditurePctGdp: 6.1, physiciansPer1000: 4.0, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 79.8, rdExpenditurePctGdp: 1.08, co2PerCapitaTons: 6.7,
    renewableEnergyPct: 41.8, pm25AirQuality: 6.4, giniIndex: 30.1,
    internetPenetrationPct: 96.1, hdiScore: 0.950,
  },
  PRT: {
    healthExpenditurePctGdp: 10.5, physiciansPer1000: 5.6, literacyRatePct: 96.8,
    tertiaryEnrollmentPct: 71.2, rdExpenditurePctGdp: 1.72, co2PerCapitaTons: 3.8,
    renewableEnergyPct: 74.5, pm25AirQuality: 7.6, giniIndex: 34.6,
    internetPenetrationPct: 85.8, hdiScore: 0.874,
  },
  GRC: {
    healthExpenditurePctGdp: 8.6, physiciansPer1000: 6.3, literacyRatePct: 97.9,
    tertiaryEnrollmentPct: 91.2, rdExpenditurePctGdp: 1.49, co2PerCapitaTons: 5.2,
    renewableEnergyPct: 52.4, pm25AirQuality: 13.8, giniIndex: 32.9,
    internetPenetrationPct: 85.0, hdiScore: 0.893,
  },
  THA: {
    healthExpenditurePctGdp: 5.2, physiciansPer1000: 0.9, literacyRatePct: 94.1,
    tertiaryEnrollmentPct: 44.2, rdExpenditurePctGdp: 1.21, co2PerCapitaTons: 3.8,
    renewableEnergyPct: 16.4, pm25AirQuality: 22.8, giniIndex: 34.9,
    internetPenetrationPct: 89.5, hdiScore: 0.803,
  },
  MYS: {
    healthExpenditurePctGdp: 4.4, physiciansPer1000: 2.3, literacyRatePct: 95.7,
    tertiaryEnrollmentPct: 43.1, rdExpenditurePctGdp: 1.02, co2PerCapitaTons: 8.1,
    renewableEnergyPct: 20.5, pm25AirQuality: 15.4, giniIndex: 40.7,
    internetPenetrationPct: 97.4, hdiScore: 0.807,
  },
  PHL: {
    healthExpenditurePctGdp: 5.6, physiciansPer1000: 0.8, literacyRatePct: 96.3,
    tertiaryEnrollmentPct: 36.2, rdExpenditurePctGdp: 0.32, co2PerCapitaTons: 1.4,
    renewableEnergyPct: 22.8, pm25AirQuality: 17.6, giniIndex: 40.7,
    internetPenetrationPct: 75.2, hdiScore: 0.710,
  },
  PAK: {
    healthExpenditurePctGdp: 2.9, physiciansPer1000: 1.1, literacyRatePct: 58.9,
    tertiaryEnrollmentPct: 13.1, rdExpenditurePctGdp: 0.16, co2PerCapitaTons: 0.9,
    renewableEnergyPct: 36.4, pm25AirQuality: 61.5, giniIndex: 29.6,
    internetPenetrationPct: 37.8, hdiScore: 0.540,
  },
  BGD: {
    healthExpenditurePctGdp: 2.4, physiciansPer1000: 0.7, literacyRatePct: 76.4,
    tertiaryEnrollmentPct: 24.0, rdExpenditurePctGdp: 0.30, co2PerCapitaTons: 0.7,
    renewableEnergyPct: 3.1, pm25AirQuality: 68.2, giniIndex: 33.4,
    internetPenetrationPct: 44.5, hdiScore: 0.670,
  },
  NZL: {
    healthExpenditurePctGdp: 11.2, physiciansPer1000: 3.6, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 81.4, rdExpenditurePctGdp: 1.47, co2PerCapitaTons: 6.2,
    renewableEnergyPct: 87.9, pm25AirQuality: 4.5, giniIndex: 32.0,
    internetPenetrationPct: 95.9, hdiScore: 0.939,
  },
  TWN: {
    healthExpenditurePctGdp: 6.6, physiciansPer1000: 2.4, literacyRatePct: 99.0,
    tertiaryEnrollmentPct: 88.6, rdExpenditurePctGdp: 3.96, co2PerCapitaTons: 11.2,
    renewableEnergyPct: 11.8, pm25AirQuality: 14.9, giniIndex: 34.1,
    internetPenetrationPct: 91.6, hdiScore: 0.926,
  },
  ARE: {
    healthExpenditurePctGdp: 5.3, physiciansPer1000: 2.9, literacyRatePct: 98.3,
    tertiaryEnrollmentPct: 68.4, rdExpenditurePctGdp: 1.50, co2PerCapitaTons: 20.4,
    renewableEnergyPct: 11.2, pm25AirQuality: 38.4, giniIndex: 26.0,
    internetPenetrationPct: 99.0, hdiScore: 0.937,
  },
  ISR: {
    healthExpenditurePctGdp: 7.4, physiciansPer1000: 3.4, literacyRatePct: 97.8,
    tertiaryEnrollmentPct: 63.2, rdExpenditurePctGdp: 6.02, co2PerCapitaTons: 6.3,
    renewableEnergyPct: 13.8, pm25AirQuality: 17.2, giniIndex: 37.9,
    internetPenetrationPct: 91.9, hdiScore: 0.915,
  },
  MAR: {
    healthExpenditurePctGdp: 5.9, physiciansPer1000: 0.7, literacyRatePct: 77.4,
    tertiaryEnrollmentPct: 45.1, rdExpenditurePctGdp: 0.75, co2PerCapitaTons: 2.0,
    renewableEnergyPct: 24.6, pm25AirQuality: 23.4, giniIndex: 39.5,
    internetPenetrationPct: 90.7, hdiScore: 0.698,
  },
  ETH: {
    healthExpenditurePctGdp: 3.2, physiciansPer1000: 0.1, literacyRatePct: 52.8,
    tertiaryEnrollmentPct: 10.6, rdExpenditurePctGdp: 0.27, co2PerCapitaTons: 0.18,
    renewableEnergyPct: 97.6, pm25AirQuality: 24.9, giniIndex: 35.0,
    internetPenetrationPct: 20.4, hdiScore: 0.492,
  },
  COL: {
    healthExpenditurePctGdp: 8.1, physiciansPer1000: 2.4, literacyRatePct: 95.8,
    tertiaryEnrollmentPct: 58.2, rdExpenditurePctGdp: 0.29, co2PerCapitaTons: 1.9,
    renewableEnergyPct: 69.4, pm25AirQuality: 14.3, giniIndex: 54.8,
    internetPenetrationPct: 73.0, hdiScore: 0.758,
  },
  CHL: {
    healthExpenditurePctGdp: 9.0, physiciansPer1000: 2.9, literacyRatePct: 97.2,
    tertiaryEnrollmentPct: 92.6, rdExpenditurePctGdp: 0.36, co2PerCapitaTons: 4.3,
    renewableEnergyPct: 63.2, pm25AirQuality: 18.9, giniIndex: 43.0,
    internetPenetrationPct: 94.1, hdiScore: 0.860,
  },
  PER: {
    healthExpenditurePctGdp: 6.2, physiciansPer1000: 1.6, literacyRatePct: 94.5,
    tertiaryEnrollmentPct: 71.0, rdExpenditurePctGdp: 0.17, co2PerCapitaTons: 1.8,
    renewableEnergyPct: 56.8, pm25AirQuality: 21.6, giniIndex: 40.3,
    internetPenetrationPct: 79.1, hdiScore: 0.762,
  },
};

export const EXPANDED_COUNTRIES: BaseCountryRecord[] = [
  // Europe (+10)
  {
    isoNumeric: '380', code: 'ITA', name: 'Italy', region: 'Europe',
    populationMillions: 58.9, annualPopGrowthPct: -0.26, gdpTrillions: 2.38, gdpPerCapita: 40407,
    gdpGrowthPct: 0.9, medianAge: 48.2, fertilityRate: 1.21, lifeExpectancy: 83.7, urbanizationPct: 72.1,
    ageBrackets: makeAgeBrackets([12.2, 9.7, 10.6, 12.1, 15.6, 15.4, 24.4]),
    projections: makeProjections([59.5, 58.9, 56.4, 52.3, 44.8, 37.9]),
    gdpHistory: makeGdpSeries(2.38, 58.9, 63.4, 48.2, 0.014, 0.015, -0.0026, 0.7),
  },
  {
    isoNumeric: '528', code: 'NLD', name: 'Netherlands', region: 'Europe',
    populationMillions: 18.0, annualPopGrowthPct: 0.48, gdpTrillions: 1.22, gdpPerCapita: 67778,
    gdpGrowthPct: 1.5, medianAge: 42.8, fertilityRate: 1.49, lifeExpectancy: 82.2, urbanizationPct: 93.4,
    ageBrackets: makeAgeBrackets([15.2, 11.8, 12.6, 12.3, 13.7, 13.8, 20.6]),
    projections: makeProjections([17.4, 18.0, 18.6, 18.9, 18.5, 18.1]),
    gdpHistory: makeGdpSeries(1.22, 18.0, 64.2, 42.8, 0.029, 0.022, 0.0048, 0.5),
  },
  {
    isoNumeric: '756', code: 'CHE', name: 'Switzerland', region: 'Europe',
    populationMillions: 9.0, annualPopGrowthPct: 0.74, gdpTrillions: 0.94, gdpPerCapita: 104444,
    gdpGrowthPct: 1.4, medianAge: 43.2, fertilityRate: 1.39, lifeExpectancy: 84.1, urbanizationPct: 74.3,
    ageBrackets: makeAgeBrackets([14.8, 10.5, 13.1, 13.8, 14.3, 13.9, 19.6]),
    projections: makeProjections([8.6, 9.0, 9.5, 10.0, 10.1, 10.0]),
    gdpHistory: makeGdpSeries(0.94, 9.0, 65.6, 43.2, 0.036, 0.023, 0.0074, 0.5),
  },
  {
    isoNumeric: '752', code: 'SWE', name: 'Sweden', region: 'Europe',
    populationMillions: 10.6, annualPopGrowthPct: 0.44, gdpTrillions: 0.63, gdpPerCapita: 59434,
    gdpGrowthPct: 1.7, medianAge: 41.2, fertilityRate: 1.52, lifeExpectancy: 83.4, urbanizationPct: 88.9,
    ageBrackets: makeAgeBrackets([17.2, 11.1, 13.4, 12.9, 12.6, 12.1, 20.7]),
    projections: makeProjections([10.3, 10.6, 11.0, 11.5, 11.8, 12.0]),
    gdpHistory: makeGdpSeries(0.63, 10.6, 62.1, 41.2, 0.024, 0.023, 0.0044, 0.4),
  },
  {
    isoNumeric: '578', code: 'NOR', name: 'Norway', region: 'Europe',
    populationMillions: 5.6, annualPopGrowthPct: 0.72, gdpTrillions: 0.51, gdpPerCapita: 91071,
    gdpGrowthPct: 1.6, medianAge: 40.3, fertilityRate: 1.44, lifeExpectancy: 83.3, urbanizationPct: 84.2,
    ageBrackets: makeAgeBrackets([16.8, 12.1, 13.5, 13.2, 13.4, 12.2, 18.8]),
    projections: makeProjections([5.4, 5.6, 5.9, 6.2, 6.4, 6.5]),
    gdpHistory: makeGdpSeries(0.51, 5.6, 64.4, 40.3, 0.028, 0.022, 0.0072, 0.5),
  },
  {
    isoNumeric: '056', code: 'BEL', name: 'Belgium', region: 'Europe',
    populationMillions: 11.8, annualPopGrowthPct: 0.36, gdpTrillions: 0.66, gdpPerCapita: 55932,
    gdpGrowthPct: 1.3, medianAge: 41.9, fertilityRate: 1.53, lifeExpectancy: 82.3, urbanizationPct: 98.2,
    ageBrackets: makeAgeBrackets([16.3, 11.5, 12.7, 13.1, 13.3, 13.0, 20.1]),
    projections: makeProjections([11.5, 11.8, 12.1, 12.3, 12.1, 11.8]),
    gdpHistory: makeGdpSeries(0.66, 11.8, 63.6, 41.9, 0.025, 0.019, 0.0036, 0.5),
  },
  {
    isoNumeric: '040', code: 'AUT', name: 'Austria', region: 'Europe',
    populationMillions: 9.2, annualPopGrowthPct: 0.42, gdpTrillions: 0.54, gdpPerCapita: 58696,
    gdpGrowthPct: 1.2, medianAge: 43.8, fertilityRate: 1.41, lifeExpectancy: 81.9, urbanizationPct: 59.8,
    ageBrackets: makeAgeBrackets([14.4, 10.6, 12.9, 13.4, 14.1, 14.7, 19.9]),
    projections: makeProjections([8.9, 9.2, 9.4, 9.5, 9.2, 8.7]),
    gdpHistory: makeGdpSeries(0.54, 9.2, 65.7, 43.8, 0.026, 0.019, 0.0042, 0.6),
  },
  {
    isoNumeric: '372', code: 'IRL', name: 'Ireland', region: 'Europe',
    populationMillions: 5.4, annualPopGrowthPct: 1.28, gdpTrillions: 0.58, gdpPerCapita: 107407,
    gdpGrowthPct: 2.8, medianAge: 39.2, fertilityRate: 1.56, lifeExpectancy: 82.8, urbanizationPct: 64.9,
    ageBrackets: makeAgeBrackets([19.2, 12.6, 12.8, 15.1, 13.8, 11.1, 15.4]),
    projections: makeProjections([5.0, 5.4, 5.9, 6.4, 6.6, 6.5]),
    gdpHistory: makeGdpSeries(0.58, 5.4, 65.4, 39.2, 0.052, 0.032, 0.0128, 0.6),
  },
  {
    isoNumeric: '620', code: 'PRT', name: 'Portugal', region: 'Europe',
    populationMillions: 10.6, annualPopGrowthPct: 0.18, gdpTrillions: 0.31, gdpPerCapita: 29245,
    gdpGrowthPct: 2.0, medianAge: 46.8, fertilityRate: 1.43, lifeExpectancy: 82.4, urbanizationPct: 68.5,
    ageBrackets: makeAgeBrackets([12.8, 10.2, 10.9, 12.8, 14.9, 14.3, 24.1]),
    projections: makeProjections([10.3, 10.6, 10.4, 9.8, 8.7, 7.6]),
    gdpHistory: makeGdpSeries(0.31, 10.6, 63.1, 46.8, 0.024, 0.024, 0.0018, 0.6),
  },
  {
    isoNumeric: '300', code: 'GRC', name: 'Greece', region: 'Europe',
    populationMillions: 10.3, annualPopGrowthPct: -0.42, gdpTrillions: 0.25, gdpPerCapita: 24272,
    gdpGrowthPct: 2.1, medianAge: 46.5, fertilityRate: 1.32, lifeExpectancy: 81.9, urbanizationPct: 80.9,
    ageBrackets: makeAgeBrackets([13.2, 10.4, 10.6, 13.1, 15.1, 14.4, 23.2]),
    projections: makeProjections([10.7, 10.3, 9.7, 8.8, 7.4, 6.1]),
    gdpHistory: makeGdpSeries(0.25, 10.3, 63.6, 46.5, 0.004, 0.025, -0.0042, 0.7),
  },

  // Asia-Pacific (+7)
  {
    isoNumeric: '764', code: 'THA', name: 'Thailand', region: 'South & Southeast Asia',
    populationMillions: 71.7, annualPopGrowthPct: -0.05, gdpTrillions: 0.55, gdpPerCapita: 7671,
    gdpGrowthPct: 3.0, medianAge: 40.6, fertilityRate: 1.24, lifeExpectancy: 76.9, urbanizationPct: 54.4,
    ageBrackets: makeAgeBrackets([14.9, 12.1, 13.8, 14.7, 15.1, 13.6, 15.8]),
    projections: makeProjections([71.5, 71.7, 70.1, 65.4, 54.8, 44.6]),
    gdpHistory: makeGdpSeries(0.55, 71.7, 69.3, 40.6, 0.045, 0.036, -0.0005, 0.9),
  },
  {
    isoNumeric: '458', code: 'MYS', name: 'Malaysia', region: 'South & Southeast Asia',
    populationMillions: 35.6, annualPopGrowthPct: 1.04, gdpTrillions: 0.45, gdpPerCapita: 12640,
    gdpGrowthPct: 4.5, medianAge: 31.4, fertilityRate: 1.59, lifeExpectancy: 76.7, urbanizationPct: 79.3,
    ageBrackets: makeAgeBrackets([22.4, 15.8, 17.6, 15.2, 11.8, 9.1, 8.1]),
    projections: makeProjections([33.2, 35.6, 38.8, 41.9, 43.2, 41.8]),
    gdpHistory: makeGdpSeries(0.45, 35.6, 69.5, 31.4, 0.052, 0.048, 0.0104, 0.8),
  },
  {
    isoNumeric: '608', code: 'PHL', name: 'Philippines', region: 'South & Southeast Asia',
    populationMillions: 116.8, annualPopGrowthPct: 1.18, gdpTrillions: 0.49, gdpPerCapita: 4195,
    gdpGrowthPct: 6.0, medianAge: 26.2, fertilityRate: 1.92, lifeExpectancy: 72.1, urbanizationPct: 48.9,
    ageBrackets: makeAgeBrackets([28.4, 18.6, 16.9, 13.4, 10.1, 6.8, 5.8]),
    projections: makeProjections([112.2, 116.8, 129.5, 145.6, 158.0, 159.4]),
    gdpHistory: makeGdpSeries(0.49, 116.8, 65.8, 26.2, 0.068, 0.063, 0.0118, 0.7),
  },
  {
    isoNumeric: '586', code: 'PAK', name: 'Pakistan', region: 'South & Southeast Asia',
    populationMillions: 251.3, annualPopGrowthPct: 1.88, gdpTrillions: 0.39, gdpPerCapita: 1552,
    gdpGrowthPct: 3.4, medianAge: 20.9, fertilityRate: 3.48, lifeExpectancy: 67.6, urbanizationPct: 38.6,
    ageBrackets: makeAgeBrackets([35.8, 19.6, 15.7, 11.4, 7.9, 5.3, 4.3]),
    projections: makeProjections([227.2, 251.3, 298.4, 367.8, 449.2, 487.0]),
    gdpHistory: makeGdpSeries(0.39, 251.3, 59.9, 20.9, 0.052, 0.044, 0.0188, 0.6),
  },
  {
    isoNumeric: '050', code: 'BGD', name: 'Bangladesh', region: 'South & Southeast Asia',
    populationMillions: 175.7, annualPopGrowthPct: 1.08, gdpTrillions: 0.48, gdpPerCapita: 2732,
    gdpGrowthPct: 5.8, medianAge: 26.6, fertilityRate: 2.11, lifeExpectancy: 74.3, urbanizationPct: 41.8,
    ageBrackets: makeAgeBrackets([25.6, 18.9, 17.5, 14.1, 10.4, 7.2, 6.3]),
    projections: makeProjections([167.4, 175.7, 192.4, 208.9, 214.2, 199.4]),
    gdpHistory: makeGdpSeries(0.48, 175.7, 68.1, 26.6, 0.088, 0.061, 0.0108, 0.8),
  },
  {
    isoNumeric: '554', code: 'NZL', name: 'New Zealand', region: 'East Asia & Pacific',
    populationMillions: 5.3, annualPopGrowthPct: 1.12, gdpTrillions: 0.26, gdpPerCapita: 49057,
    gdpGrowthPct: 1.9, medianAge: 38.1, fertilityRate: 1.62, lifeExpectancy: 82.8, urbanizationPct: 87.2,
    ageBrackets: makeAgeBrackets([18.4, 12.8, 14.3, 13.1, 12.6, 11.9, 16.9]),
    projections: makeProjections([5.1, 5.3, 5.7, 6.1, 6.4, 6.5]),
    gdpHistory: makeGdpSeries(0.26, 5.3, 64.7, 38.1, 0.041, 0.026, 0.0112, 0.5),
  },
  {
    isoNumeric: '158', code: 'TWN', name: 'Taiwan', region: 'East Asia & Pacific',
    populationMillions: 23.4, annualPopGrowthPct: -0.18, gdpTrillions: 0.81, gdpPerCapita: 34615,
    gdpGrowthPct: 3.2, medianAge: 44.6, fertilityRate: 0.89, lifeExpectancy: 81.2, urbanizationPct: 80.5,
    ageBrackets: makeAgeBrackets([11.8, 10.1, 13.4, 15.2, 15.4, 14.6, 19.5]),
    projections: makeProjections([23.6, 23.4, 22.4, 20.1, 16.2, 12.8]),
    gdpHistory: makeGdpSeries(0.81, 23.4, 68.7, 44.6, 0.040, 0.036, -0.0018, 1.1),
  },

  // Middle East & Africa (+4)
  {
    isoNumeric: '784', code: 'ARE', name: 'United Arab Emirates', region: 'Middle East & Africa',
    populationMillions: 10.9, annualPopGrowthPct: 1.95, gdpTrillions: 0.55, gdpPerCapita: 50459,
    gdpGrowthPct: 4.3, medianAge: 32.1, fertilityRate: 1.46, lifeExpectancy: 80.4, urbanizationPct: 88.1,
    ageBrackets: makeAgeBrackets([15.2, 11.8, 28.4, 26.2, 12.1, 4.4, 1.9]),
    projections: makeProjections([9.3, 10.9, 12.4, 13.8, 14.5, 14.6]),
    gdpHistory: makeGdpSeries(0.55, 10.9, 82.9, 32.1, 0.056, 0.046, 0.0195, 0.6),
  },
  {
    isoNumeric: '376', code: 'ISR', name: 'Israel', region: 'Middle East & Africa',
    populationMillions: 9.9, annualPopGrowthPct: 1.62, gdpTrillions: 0.54, gdpPerCapita: 54545,
    gdpGrowthPct: 3.1, medianAge: 30.2, fertilityRate: 2.85, lifeExpectancy: 83.2, urbanizationPct: 92.9,
    ageBrackets: makeAgeBrackets([27.8, 15.1, 13.6, 12.4, 10.8, 8.1, 12.2]),
    projections: makeProjections([9.2, 9.9, 11.5, 13.8, 16.9, 19.2]),
    gdpHistory: makeGdpSeries(0.54, 9.9, 60.0, 30.2, 0.064, 0.038, 0.0162, 0.3),
  },
  {
    isoNumeric: '504', code: 'MAR', name: 'Morocco', region: 'Middle East & Africa',
    populationMillions: 38.4, annualPopGrowthPct: 0.96, gdpTrillions: 0.16, gdpPerCapita: 4167,
    gdpGrowthPct: 3.6, medianAge: 30.1, fertilityRate: 2.21, lifeExpectancy: 75.3, urbanizationPct: 65.8,
    ageBrackets: makeAgeBrackets([25.4, 16.2, 15.9, 14.3, 11.2, 8.5, 8.5]),
    projections: makeProjections([36.7, 38.4, 41.8, 45.2, 46.8, 45.1]),
    gdpHistory: makeGdpSeries(0.16, 38.4, 66.1, 30.1, 0.048, 0.041, 0.0096, 0.7),
  },
  {
    isoNumeric: '231', code: 'ETH', name: 'Ethiopia', region: 'Middle East & Africa',
    populationMillions: 132.1, annualPopGrowthPct: 2.48, gdpTrillions: 0.17, gdpPerCapita: 1287,
    gdpGrowthPct: 6.4, medianAge: 19.4, fertilityRate: 3.92, lifeExpectancy: 67.3, urbanizationPct: 23.7,
    ageBrackets: makeAgeBrackets([38.6, 20.8, 15.1, 10.4, 7.1, 4.5, 3.5]),
    projections: makeProjections([117.2, 132.1, 166.5, 225.0, 294.2, 323.7]),
    gdpHistory: makeGdpSeries(0.17, 132.1, 57.9, 19.4, 0.112, 0.068, 0.0248, 0.6),
  },

  // Latin America (+3)
  {
    isoNumeric: '170', code: 'COL', name: 'Colombia', region: 'Latin America',
    populationMillions: 52.9, annualPopGrowthPct: 0.88, gdpTrillions: 0.42, gdpPerCapita: 7940,
    gdpGrowthPct: 2.7, medianAge: 32.6, fertilityRate: 1.68, lifeExpectancy: 77.6, urbanizationPct: 82.7,
    ageBrackets: makeAgeBrackets([20.6, 16.2, 16.9, 14.6, 12.1, 9.8, 9.8]),
    projections: makeProjections([50.9, 52.9, 56.1, 57.8, 54.6, 48.2]),
    gdpHistory: makeGdpSeries(0.42, 52.9, 69.6, 32.6, 0.049, 0.033, 0.0088, 0.8),
  },
  {
    isoNumeric: '152', code: 'CHL', name: 'Chile', region: 'Latin America',
    populationMillions: 19.8, annualPopGrowthPct: 0.48, gdpTrillions: 0.35, gdpPerCapita: 17677,
    gdpGrowthPct: 2.4, medianAge: 36.7, fertilityRate: 1.31, lifeExpectancy: 81.2, urbanizationPct: 88.3,
    ageBrackets: makeAgeBrackets([17.8, 13.2, 16.1, 14.8, 13.1, 11.2, 13.8]),
    projections: makeProjections([19.3, 19.8, 20.5, 20.4, 18.6, 16.1]),
    gdpHistory: makeGdpSeries(0.35, 19.8, 68.4, 36.7, 0.053, 0.029, 0.0048, 0.8),
  },
  {
    isoNumeric: '604', code: 'PER', name: 'Peru', region: 'Latin America',
    populationMillions: 34.4, annualPopGrowthPct: 1.02, gdpTrillions: 0.29, gdpPerCapita: 8430,
    gdpGrowthPct: 3.1, medianAge: 30.8, fertilityRate: 1.98, lifeExpectancy: 77.4, urbanizationPct: 79.1,
    ageBrackets: makeAgeBrackets([24.2, 16.4, 16.5, 14.1, 11.4, 8.6, 8.8]),
    projections: makeProjections([33.3, 34.4, 37.6, 40.9, 41.8, 39.6]),
    gdpHistory: makeGdpSeries(0.29, 34.4, 67.0, 30.8, 0.064, 0.036, 0.0102, 0.7),
  },
];

export const EXPANDED_CITIES: CityRecord[] = [
  // Italy (3)
  {
    id: 'ita-mil', name: 'Milan', countryCode: 'ITA', countryName: 'Italy', region: 'Europe',
    lat: 45.4642, lng: 9.19, population: 1_395_000, metroPopulation: 4_340_000, densityPerKm2: 7670,
    medianAge: 46.2, gdpBillions: 258, gdpPerCapita: 59447, annualPopGrowthPct: 0.34,
    projected2035: 1_440_000, projected2050: 1_410_000, unemploymentPct: 5.4, primarySector: 'Finance, Design & Fashion',
    ageBreakdown: { age0to14: 12.1, age15to24: 9.4, age25to44: 26.2, age45to64: 29.8, age65plus: 22.5 },
  },
  {
    id: 'ita-rom', name: 'Rome', countryCode: 'ITA', countryName: 'Italy', region: 'Europe',
    lat: 41.9028, lng: 12.4964, population: 2_760_000, metroPopulation: 4_220_000, densityPerKm2: 2145,
    medianAge: 47.4, gdpBillions: 194, gdpPerCapita: 45971, annualPopGrowthPct: -0.08,
    projected2035: 2_720_000, projected2050: 2_580_000, unemploymentPct: 7.2, primarySector: 'Public Sector, Media & Tourism',
    ageBreakdown: { age0to14: 11.8, age15to24: 9.1, age25to44: 24.4, age45to64: 30.9, age65plus: 23.8 },
  },
  {
    id: 'ita-nap', name: 'Naples', countryCode: 'ITA', countryName: 'Italy', region: 'Europe',
    lat: 40.8518, lng: 14.2681, population: 912_000, metroPopulation: 2_980_000, densityPerKm2: 7780,
    medianAge: 44.8, gdpBillions: 86, gdpPerCapita: 28859, annualPopGrowthPct: -0.35,
    projected2035: 878_000, projected2050: 810_000, unemploymentPct: 14.2, primarySector: 'Maritime Trade & Aerospace',
    ageBreakdown: { age0to14: 13.6, age15to24: 10.9, age25to44: 25.1, age45to64: 29.6, age65plus: 20.8 },
  },
  // Netherlands (2)
  {
    id: 'nld-ams', name: 'Amsterdam', countryCode: 'NLD', countryName: 'Netherlands', region: 'Europe',
    lat: 52.3676, lng: 4.9041, population: 935_000, metroPopulation: 2_560_000, densityPerKm2: 5640,
    medianAge: 38.4, gdpBillions: 214, gdpPerCapita: 83593, annualPopGrowthPct: 0.92,
    projected2035: 1_025_000, projected2050: 1_090_000, unemploymentPct: 3.9, primarySector: 'FinTech, Logistics & Digital Media',
    ageBreakdown: { age0to14: 14.6, age15to24: 13.2, age25to44: 34.4, age45to64: 24.1, age65plus: 13.7 },
  },
  {
    id: 'nld-rtm', name: 'Rotterdam', countryCode: 'NLD', countryName: 'Netherlands', region: 'Europe',
    lat: 51.9244, lng: 4.4777, population: 672_000, metroPopulation: 1_460_000, densityPerKm2: 3110,
    medianAge: 39.1, gdpBillions: 112, gdpPerCapita: 76712, annualPopGrowthPct: 0.68,
    projected2035: 718_000, projected2050: 745_000, unemploymentPct: 4.7, primarySector: 'Europe Port Logistics & Clean Energy',
    ageBreakdown: { age0to14: 15.8, age15to24: 13.4, age25to44: 31.2, age45to64: 24.5, age65plus: 15.1 },
  },
  // Switzerland (2)
  {
    id: 'che-zrh', name: 'Zurich', countryCode: 'CHE', countryName: 'Switzerland', region: 'Europe',
    lat: 47.3769, lng: 8.5417, population: 448_000, metroPopulation: 1_640_000, densityPerKm2: 5090,
    medianAge: 40.8, gdpBillions: 192, gdpPerCapita: 117073, annualPopGrowthPct: 0.95,
    projected2035: 492_000, projected2050: 530_000, unemploymentPct: 2.3, primarySector: 'Private Banking, AI & Life Sciences',
    ageBreakdown: { age0to14: 13.9, age15to24: 10.2, age25to44: 35.1, age45to64: 25.4, age65plus: 15.4 },
  },
  {
    id: 'che-gva', name: 'Geneva', countryCode: 'CHE', countryName: 'Switzerland', region: 'Europe',
    lat: 46.2044, lng: 6.1432, population: 208_000, metroPopulation: 945_000, densityPerKm2: 13080,
    medianAge: 41.2, gdpBillions: 106, gdpPerCapita: 112169, annualPopGrowthPct: 0.81,
    projected2035: 225_000, projected2050: 240_000, unemploymentPct: 3.7, primarySector: 'Diplomacy, Commodities & Watchmaking',
    ageBreakdown: { age0to14: 14.5, age15to24: 11.4, age25to44: 32.8, age45to64: 25.9, age65plus: 15.4 },
  },
  // Sweden (2)
  {
    id: 'swe-sto', name: 'Stockholm', countryCode: 'SWE', countryName: 'Sweden', region: 'Europe',
    lat: 59.3293, lng: 18.0686, population: 992_000, metroPopulation: 2_460_000, densityPerKm2: 5280,
    medianAge: 39.2, gdpBillions: 198, gdpPerCapita: 80488, annualPopGrowthPct: 0.82,
    projected2035: 1_075_000, projected2050: 1_160_000, unemploymentPct: 6.4, primarySector: 'Software Unicorns & Green Finance',
    ageBreakdown: { age0to14: 16.9, age15to24: 11.4, age25to44: 32.8, age45to64: 23.6, age65plus: 15.3 },
  },
  {
    id: 'swe-got', name: 'Gothenburg', countryCode: 'SWE', countryName: 'Sweden', region: 'Europe',
    lat: 57.7089, lng: 11.9746, population: 608_000, metroPopulation: 1_080_000, densityPerKm2: 1360,
    medianAge: 39.6, gdpBillions: 74, gdpPerCapita: 68518, annualPopGrowthPct: 0.74,
    projected2035: 655_000, projected2050: 702_000, unemploymentPct: 6.9, primarySector: 'EV Automotive & Nordic Maritime',
    ageBreakdown: { age0to14: 16.6, age15to24: 12.2, age25to44: 31.8, age45to64: 23.4, age65plus: 16.0 },
  },
  // Norway (2)
  {
    id: 'nor-osl', name: 'Oslo', countryCode: 'NOR', countryName: 'Norway', region: 'Europe',
    lat: 59.9139, lng: 10.7522, population: 724_000, metroPopulation: 1_560_000, densityPerKm2: 1600,
    medianAge: 37.8, gdpBillions: 148, gdpPerCapita: 94872, annualPopGrowthPct: 1.04,
    projected2035: 802_000, projected2050: 880_000, unemploymentPct: 3.6, primarySector: 'Sovereign Finance, Shipping & Clean Tech',
    ageBreakdown: { age0to14: 16.2, age15to24: 12.5, age25to44: 35.6, age45to64: 22.9, age65plus: 12.8 },
  },
  {
    id: 'nor-bgo', name: 'Bergen', countryCode: 'NOR', countryName: 'Norway', region: 'Europe',
    lat: 60.3913, lng: 5.3221, population: 294_000, metroPopulation: 432_000, densityPerKm2: 660,
    medianAge: 38.9, gdpBillions: 38, gdpPerCapita: 87963, annualPopGrowthPct: 0.64,
    projected2035: 313_000, projected2050: 332_000, unemploymentPct: 3.1, primarySector: 'Marine Biology, Energy & Aquaculture',
    ageBreakdown: { age0to14: 16.4, age15to24: 13.8, age25to44: 30.2, age45to64: 24.0, age65plus: 15.6 },
  },
  // Belgium (2)
  {
    id: 'bel-bru', name: 'Brussels', countryCode: 'BEL', countryName: 'Belgium', region: 'Europe',
    lat: 50.8503, lng: 4.3517, population: 1_252_000, metroPopulation: 2_540_000, densityPerKm2: 7740,
    medianAge: 37.9, gdpBillions: 156, gdpPerCapita: 61417, annualPopGrowthPct: 0.62,
    projected2035: 1_330_000, projected2050: 1_395_000, unemploymentPct: 9.8, primarySector: 'EU Institutions, Biotech & Services',
    ageBreakdown: { age0to14: 18.2, age15to24: 12.6, age25to44: 32.6, age45to64: 23.4, age65plus: 13.2 },
  },
  {
    id: 'bel-ant', name: 'Antwerp', countryCode: 'BEL', countryName: 'Belgium', region: 'Europe',
    lat: 51.2194, lng: 4.4025, population: 546_000, metroPopulation: 1_220_000, densityPerKm2: 2670,
    medianAge: 39.8, gdpBillions: 76, gdpPerCapita: 62295, annualPopGrowthPct: 0.54,
    projected2035: 576_000, projected2050: 602_000, unemploymentPct: 6.8, primarySector: 'Port Petrochemicals & Trade',
    ageBreakdown: { age0to14: 17.5, age15to24: 12.1, age25to44: 29.8, age45to64: 24.4, age65plus: 16.2 },
  },
  // Austria (2)
  {
    id: 'aut-vie', name: 'Vienna', countryCode: 'AUT', countryName: 'Austria', region: 'Europe',
    lat: 48.2082, lng: 16.3738, population: 2_028_000, metroPopulation: 2_940_000, densityPerKm2: 4890,
    medianAge: 41.1, gdpBillions: 172, gdpPerCapita: 58503, annualPopGrowthPct: 0.85,
    projected2035: 2_200_000, projected2050: 2_320_000, unemploymentPct: 7.4, primarySector: 'Central Europe HQ, Life Sciences & Culture',
    ageBreakdown: { age0to14: 14.5, age15to24: 11.4, age25to44: 31.6, age45to64: 26.0, age65plus: 16.5 },
  },
  {
    id: 'aut-grz', name: 'Graz', countryCode: 'AUT', countryName: 'Austria', region: 'Europe',
    lat: 47.0707, lng: 15.4395, population: 304_000, metroPopulation: 655_000, densityPerKm2: 2380,
    medianAge: 40.9, gdpBillions: 38, gdpPerCapita: 58015, annualPopGrowthPct: 0.78,
    projected2035: 328_000, projected2050: 348_000, unemploymentPct: 5.2, primarySector: 'Mobility Engineering & Semiconductors',
    ageBreakdown: { age0to14: 13.8, age15to24: 13.4, age25to44: 31.2, age45to64: 24.8, age65plus: 16.8 },
  },
  // Ireland (2)
  {
    id: 'irl-dub', name: 'Dublin', countryCode: 'IRL', countryName: 'Ireland', region: 'Europe',
    lat: 53.3498, lng: -6.2603, population: 1_510_000, metroPopulation: 2_120_000, densityPerKm2: 4720,
    medianAge: 37.6, gdpBillions: 268, gdpPerCapita: 126415, annualPopGrowthPct: 1.48,
    projected2035: 1_745_000, projected2050: 1_960_000, unemploymentPct: 4.3, primarySector: 'EMEA Cloud HQ & Biopharma',
    ageBreakdown: { age0to14: 18.1, age15to24: 13.2, age25to44: 34.8, age45to64: 21.8, age65plus: 12.1 },
  },
  {
    id: 'irl-ork', name: 'Cork', countryCode: 'IRL', countryName: 'Ireland', region: 'Europe',
    lat: 51.8985, lng: -8.4756, population: 234_000, metroPopulation: 438_000, densityPerKm2: 1250,
    medianAge: 38.4, gdpBillions: 52, gdpPerCapita: 118721, annualPopGrowthPct: 1.24,
    projected2035: 265_000, projected2050: 295_000, unemploymentPct: 4.1, primarySector: 'Pharmaceuticals & Hardware Ops',
    ageBreakdown: { age0to14: 18.4, age15to24: 13.6, age25to44: 31.4, age45to64: 22.8, age65plus: 13.8 },
  },
  // Portugal (2)
  {
    id: 'prt-lis', name: 'Lisbon', countryCode: 'PRT', countryName: 'Portugal', region: 'Europe',
    lat: 38.7223, lng: -9.1393, population: 564_000, metroPopulation: 2_920_000, densityPerKm2: 5640,
    medianAge: 44.6, gdpBillions: 118, gdpPerCapita: 40411, annualPopGrowthPct: 0.65,
    projected2035: 598_000, projected2050: 612_000, unemploymentPct: 6.2, primarySector: 'Atlantic Tech, Tourism & Shared Services',
    ageBreakdown: { age0to14: 13.4, age15to24: 10.6, age25to44: 26.8, age45to64: 27.6, age65plus: 21.6 },
  },
  {
    id: 'prt-opo', name: 'Porto', countryCode: 'PRT', countryName: 'Portugal', region: 'Europe',
    lat: 41.1579, lng: -8.6291, population: 248_000, metroPopulation: 1_760_000, densityPerKm2: 5980,
    medianAge: 45.4, gdpBillions: 52, gdpPerCapita: 29545, annualPopGrowthPct: 0.42,
    projected2035: 258_000, projected2050: 254_000, unemploymentPct: 6.5, primarySector: 'Software Engineering & Textiles',
    ageBreakdown: { age0to14: 12.6, age15to24: 10.4, age25to44: 25.8, age45to64: 28.4, age65plus: 22.8 },
  },
  // Greece (2)
  {
    id: 'grc-ath', name: 'Athens', countryCode: 'GRC', countryName: 'Greece', region: 'Europe',
    lat: 37.9838, lng: 23.7275, population: 3_140_000, metroPopulation: 3_760_000, densityPerKm2: 7420,
    medianAge: 45.6, gdpBillions: 122, gdpPerCapita: 32447, annualPopGrowthPct: -0.22,
    projected2035: 3_060_000, projected2050: 2_840_000, unemploymentPct: 9.6, primarySector: 'Global Shipping, Tourism & Cloud',
    ageBreakdown: { age0to14: 13.0, age15to24: 10.2, age25to44: 25.6, age45to64: 29.4, age65plus: 21.8 },
  },
  {
    id: 'grc-skg', name: 'Thessaloniki', countryCode: 'GRC', countryName: 'Greece', region: 'Europe',
    lat: 40.6401, lng: 22.9444, population: 815_000, metroPopulation: 1_090_000, densityPerKm2: 4320,
    medianAge: 44.8, gdpBillions: 28, gdpPerCapita: 25688, annualPopGrowthPct: -0.18,
    projected2035: 798_000, projected2050: 745_000, unemploymentPct: 10.8, primarySector: 'Balkan Logistics & R&D Hubs',
    ageBreakdown: { age0to14: 13.4, age15to24: 11.4, age25to44: 25.2, age45to64: 28.8, age65plus: 21.2 },
  },
  // Thailand (2)
  {
    id: 'tha-bkk', name: 'Bangkok', countryCode: 'THA', countryName: 'Thailand', region: 'South & Southeast Asia',
    lat: 13.7563, lng: 100.5018, population: 11_390_000, metroPopulation: 17_450_000, densityPerKm2: 7260,
    medianAge: 39.8, gdpBillions: 254, gdpPerCapita: 14556, annualPopGrowthPct: 0.72,
    projected2035: 12_210_000, projected2050: 12_480_000, unemploymentPct: 1.2, primarySector: 'ASEAN Finance, Tourism & EV Supply Chain',
    ageBreakdown: { age0to14: 13.4, age15to24: 12.2, age25to44: 32.1, age45to64: 27.6, age65plus: 14.7 },
  },
  {
    id: 'tha-cnx', name: 'Chiang Mai', countryCode: 'THA', countryName: 'Thailand', region: 'South & Southeast Asia',
    lat: 18.7883, lng: 98.9853, population: 1_240_000, metroPopulation: 1_820_000, densityPerKm2: 2980,
    medianAge: 41.2, gdpBillions: 24, gdpPerCapita: 13187, annualPopGrowthPct: 0.54,
    projected2035: 1_310_000, projected2050: 1_295_000, unemploymentPct: 1.1, primarySector: 'Agri-Tech, Digital Services & Hospitality',
    ageBreakdown: { age0to14: 13.2, age15to24: 12.8, age25to44: 29.4, age45to64: 28.2, age65plus: 16.4 },
  },
  // Malaysia (2)
  {
    id: 'mys-kul', name: 'Kuala Lumpur', countryCode: 'MYS', countryName: 'Malaysia', region: 'South & Southeast Asia',
    lat: 3.139, lng: 101.6869, population: 2_080_000, metroPopulation: 8_820_000, densityPerKm2: 8560,
    medianAge: 32.6, gdpBillions: 168, gdpPerCapita: 19048, annualPopGrowthPct: 1.68,
    projected2035: 2_450_000, projected2050: 2_820_000, unemploymentPct: 3.2, primarySector: 'Islamic Finance, Data Centers & Services',
    ageBreakdown: { age0to14: 19.8, age15to24: 16.2, age25to44: 36.4, age45to64: 19.8, age65plus: 7.8 },
  },
  {
    id: 'mys-pen', name: 'Penang (George Town)', countryCode: 'MYS', countryName: 'Malaysia', region: 'South & Southeast Asia',
    lat: 5.4141, lng: 100.3288, population: 794_000, metroPopulation: 2_680_000, densityPerKm2: 2610,
    medianAge: 35.4, gdpBillions: 48, gdpPerCapita: 17910, annualPopGrowthPct: 1.14,
    projected2035: 890_000, projected2050: 970_000, unemploymentPct: 2.4, primarySector: 'Semiconductor Packaging & MedTech',
    ageBreakdown: { age0to14: 17.6, age15to24: 14.8, age25to44: 33.4, age45to64: 23.2, age65plus: 11.0 },
  },
  // Philippines (2)
  {
    id: 'phl-mnl', name: 'Manila', countryCode: 'PHL', countryName: 'Philippines', region: 'South & Southeast Asia',
    lat: 14.5995, lng: 120.9842, population: 14_940_000, metroPopulation: 26_800_000, densityPerKm2: 23450,
    medianAge: 27.6, gdpBillions: 215, gdpPerCapita: 8022, annualPopGrowthPct: 1.62,
    projected2035: 17_520_000, projected2050: 20_640_000, unemploymentPct: 4.5, primarySector: 'BPO, FinTech & Maritime Commerce',
    ageBreakdown: { age0to14: 24.8, age15to24: 18.6, age25to44: 34.2, age45to64: 16.8, age65plus: 5.6 },
  },
  {
    id: 'phl-ceb', name: 'Cebu City', countryCode: 'PHL', countryName: 'Philippines', region: 'South & Southeast Asia',
    lat: 10.3157, lng: 123.8854, population: 1_015_000, metroPopulation: 3_320_000, densityPerKm2: 3220,
    medianAge: 26.8, gdpBillions: 34, gdpPerCapita: 10241, annualPopGrowthPct: 1.78,
    projected2035: 1_210_000, projected2050: 1_460_000, unemploymentPct: 4.1, primarySector: 'IT Services, Shipbuilding & Tourism',
    ageBreakdown: { age0to14: 26.2, age15to24: 19.1, age25to44: 33.4, age45to64: 16.1, age65plus: 5.2 },
  },
  // Pakistan (3)
  {
    id: 'pak-khi', name: 'Karachi', countryCode: 'PAK', countryName: 'Pakistan', region: 'South & Southeast Asia',
    lat: 24.8607, lng: 67.0011, population: 18_120_000, metroPopulation: 21_400_000, densityPerKm2: 5120,
    medianAge: 23.4, gdpBillions: 96, gdpPerCapita: 4486, annualPopGrowthPct: 2.38,
    projected2035: 22_900_000, projected2050: 29_400_000, unemploymentPct: 6.8, primarySector: 'Port Trade, Banking & Textiles',
    ageBreakdown: { age0to14: 31.4, age15to24: 20.6, age25to44: 30.2, age45to64: 13.6, age65plus: 4.2 },
  },
  {
    id: 'pak-lhe', name: 'Lahore', countryCode: 'PAK', countryName: 'Pakistan', region: 'South & Southeast Asia',
    lat: 31.5204, lng: 74.3587, population: 14_400_000, metroPopulation: 16_200_000, densityPerKm2: 8120,
    medianAge: 22.8, gdpBillions: 68, gdpPerCapita: 4198, annualPopGrowthPct: 2.52,
    projected2035: 18_450_000, projected2050: 24_100_000, unemploymentPct: 6.4, primarySector: 'Software Exports & Light Industry',
    ageBreakdown: { age0to14: 32.6, age15to24: 20.4, age25to44: 29.8, age45to64: 13.1, age65plus: 4.1 },
  },
  {
    id: 'pak-isb', name: 'Islamabad', countryCode: 'PAK', countryName: 'Pakistan', region: 'South & Southeast Asia',
    lat: 33.6844, lng: 73.0479, population: 1_295_000, metroPopulation: 4_180_000, densityPerKm2: 2480,
    medianAge: 24.8, gdpBillions: 26, gdpPerCapita: 6220, annualPopGrowthPct: 2.68,
    projected2035: 1_690_000, projected2050: 2_240_000, unemploymentPct: 5.8, primarySector: 'Government, Telecom & ICT',
    ageBreakdown: { age0to14: 29.8, age15to24: 20.2, age25to44: 31.6, age45to64: 14.0, age65plus: 4.4 },
  },
  // Bangladesh (2)
  {
    id: 'bgd-dac', name: 'Dhaka', countryCode: 'BGD', countryName: 'Bangladesh', region: 'South & Southeast Asia',
    lat: 23.8103, lng: 90.4125, population: 23_930_000, metroPopulation: 24_650_000, densityPerKm2: 30600,
    medianAge: 26.8, gdpBillions: 174, gdpPerCapita: 7059, annualPopGrowthPct: 2.86,
    projected2035: 31_200_000, projected2050: 38_400_000, unemploymentPct: 4.9, primarySector: 'Apparel Exports, FinTech & Services',
    ageBreakdown: { age0to14: 23.8, age15to24: 20.4, age25to44: 34.6, age45to64: 16.0, age65plus: 5.2 },
  },
  {
    id: 'bgd-cgp', name: 'Chattogram', countryCode: 'BGD', countryName: 'Bangladesh', region: 'South & Southeast Asia',
    lat: 22.3569, lng: 91.7832, population: 5_520_000, metroPopulation: 6_180_000, densityPerKm2: 19800,
    medianAge: 26.2, gdpBillions: 54, gdpPerCapita: 8738, annualPopGrowthPct: 2.18,
    projected2035: 6_840_000, projected2050: 8_250_000, unemploymentPct: 4.6, primarySector: 'Deep-Sea Port & Heavy Manufacturing',
    ageBreakdown: { age0to14: 25.1, age15to24: 19.8, age25to44: 33.8, age45to64: 15.9, age65plus: 5.4 },
  },
  // New Zealand (2)
  {
    id: 'nzl-akl', name: 'Auckland', countryCode: 'NZL', countryName: 'New Zealand', region: 'East Asia & Pacific',
    lat: -36.8485, lng: 174.7633, population: 1_745_000, metroPopulation: 1_795_000, densityPerKm2: 1590,
    medianAge: 35.8, gdpBillions: 102, gdpPerCapita: 56825, annualPopGrowthPct: 1.54,
    projected2035: 2_030_000, projected2050: 2_310_000, unemploymentPct: 4.4, primarySector: 'Pacific Trade, SaaS & Creative Tech',
    ageBreakdown: { age0to14: 18.6, age15to24: 13.8, age25to44: 31.8, age45to64: 22.8, age65plus: 13.0 },
  },
  {
    id: 'nzl-wlg', name: 'Wellington', countryCode: 'NZL', countryName: 'New Zealand', region: 'East Asia & Pacific',
    lat: -41.2865, lng: 174.7762, population: 446_000, metroPopulation: 548_000, densityPerKm2: 1480,
    medianAge: 37.2, gdpBillions: 34, gdpPerCapita: 62044, annualPopGrowthPct: 0.92,
    projected2035: 488_000, projected2050: 530_000, unemploymentPct: 3.9, primarySector: 'Government, Digital Media & Film VFX',
    ageBreakdown: { age0to14: 16.8, age15to24: 14.6, age25to44: 30.8, age45to64: 23.4, age65plus: 14.4 },
  },
  // Taiwan (2)
  {
    id: 'twn-tpe', name: 'Taipei', countryCode: 'TWN', countryName: 'Taiwan', region: 'East Asia & Pacific',
    lat: 25.033, lng: 121.5654, population: 2_510_000, metroPopulation: 7_020_000, densityPerKm2: 9240,
    medianAge: 45.2, gdpBillions: 342, gdpPerCapita: 48718, annualPopGrowthPct: -0.15,
    projected2035: 2_440_000, projected2050: 2_190_000, unemploymentPct: 3.4, primarySector: 'AI Chips, Electronics & Finance',
    ageBreakdown: { age0to14: 11.4, age15to24: 9.8, age25to44: 27.6, age45to64: 29.8, age65plus: 21.4 },
  },
  {
    id: 'twn-khh', name: 'Kaohsiung', countryCode: 'TWN', countryName: 'Taiwan', region: 'East Asia & Pacific',
    lat: 22.6273, lng: 120.3014, population: 2_730_000, metroPopulation: 2_980_000, densityPerKm2: 930,
    medianAge: 45.8, gdpBillions: 108, gdpPerCapita: 36242, annualPopGrowthPct: -0.24,
    projected2035: 2_630_000, projected2050: 2_340_000, unemploymentPct: 3.6, primarySector: 'Container Port, Steel & Fab Expansion',
    ageBreakdown: { age0to14: 11.2, age15to24: 9.6, age25to44: 27.2, age45to64: 30.4, age65plus: 21.6 },
  },
  // UAE (2)
  {
    id: 'are-dxb', name: 'Dubai', countryCode: 'ARE', countryName: 'United Arab Emirates', region: 'Middle East & Africa',
    lat: 25.2048, lng: 55.2708, population: 3_760_000, metroPopulation: 5_240_000, densityPerKm2: 2480,
    medianAge: 32.8, gdpBillions: 224, gdpPerCapita: 42748, annualPopGrowthPct: 3.12,
    projected2035: 4_850_000, projected2050: 5_900_000, unemploymentPct: 2.1, primarySector: 'Global Aviation, Trade, Finance & AI',
    ageBreakdown: { age0to14: 14.6, age15to24: 11.2, age25to44: 52.8, age45to64: 19.2, age65plus: 2.2 },
  },
  {
    id: 'are-auh', name: 'Abu Dhabi', countryCode: 'ARE', countryName: 'United Arab Emirates', region: 'Middle East & Africa',
    lat: 24.4539, lng: 54.3773, population: 1_620_000, metroPopulation: 2_180_000, densityPerKm2: 1680,
    medianAge: 31.9, gdpBillions: 292, gdpPerCapita: 133945, annualPopGrowthPct: 2.45,
    projected2035: 2_040_000, projected2050: 2_460_000, unemploymentPct: 2.4, primarySector: 'Sovereign Wealth, Energy & Renewables',
    ageBreakdown: { age0to14: 16.4, age15to24: 12.1, age25to44: 50.6, age45to64: 18.7, age65plus: 2.2 },
  },
  // Israel (2)
  {
    id: 'isr-tlv', name: 'Tel Aviv', countryCode: 'ISR', countryName: 'Israel', region: 'Middle East & Africa',
    lat: 32.0853, lng: 34.7818, population: 478_000, metroPopulation: 4_160_000, densityPerKm2: 9180,
    medianAge: 34.6, gdpBillions: 274, gdpPerCapita: 65865, annualPopGrowthPct: 1.48,
    projected2035: 552_000, projected2050: 645_000, unemploymentPct: 3.2, primarySector: 'Cybersecurity, Venture Tech & Finance',
    ageBreakdown: { age0to14: 22.4, age15to24: 13.8, age25to44: 31.4, age45to64: 19.2, age65plus: 13.2 },
  },
  {
    id: 'isr-jrs', name: 'Jerusalem', countryCode: 'ISR', countryName: 'Israel', region: 'Middle East & Africa',
    lat: 31.7683, lng: 35.2137, population: 1_012_000, metroPopulation: 1_440_000, densityPerKm2: 8090,
    medianAge: 25.4, gdpBillions: 54, gdpPerCapita: 37500, annualPopGrowthPct: 1.88,
    projected2035: 1_220_000, projected2050: 1_510_000, unemploymentPct: 4.1, primarySector: 'Public Institutions, Biotech & Tourism',
    ageBreakdown: { age0to14: 33.8, age15to24: 17.6, age25to44: 24.4, age45to64: 14.8, age65plus: 9.4 },
  },
  // Morocco (2)
  {
    id: 'mar-cas', name: 'Casablanca', countryCode: 'MAR', countryName: 'Morocco', region: 'Middle East & Africa',
    lat: 33.5731, lng: -7.5898, population: 3_960_000, metroPopulation: 4_520_000, densityPerKm2: 10250,
    medianAge: 31.4, gdpBillions: 48, gdpPerCapita: 10619, annualPopGrowthPct: 1.24,
    projected2035: 4_480_000, projected2050: 5_120_000, unemploymentPct: 11.4, primarySector: 'North Africa Finance, Aerospace & Port',
    ageBreakdown: { age0to14: 22.8, age15to24: 15.8, age25to44: 32.4, age45to64: 20.6, age65plus: 8.4 },
  },
  {
    id: 'mar-rba', name: 'Rabat', countryCode: 'MAR', countryName: 'Morocco', region: 'Middle East & Africa',
    lat: 34.0209, lng: -6.8416, population: 598_000, metroPopulation: 2_010_000, densityPerKm2: 5110,
    medianAge: 32.2, gdpBillions: 22, gdpPerCapita: 10945, annualPopGrowthPct: 1.18,
    projected2035: 672_000, projected2050: 765_000, unemploymentPct: 10.6, primarySector: 'Government, IT Services & Auto Supply',
    ageBreakdown: { age0to14: 21.8, age15to24: 15.4, age25to44: 31.8, age45to64: 21.6, age65plus: 9.4 },
  },
  // Ethiopia (2)
  {
    id: 'eth-add', name: 'Addis Ababa', countryCode: 'ETH', countryName: 'Ethiopia', region: 'Middle East & Africa',
    lat: 9.032, lng: 38.7469, population: 5_710_000, metroPopulation: 6_480_000, densityPerKm2: 10840,
    medianAge: 23.6, gdpBillions: 38, gdpPerCapita: 5864, annualPopGrowthPct: 4.18,
    projected2035: 8_420_000, projected2050: 12_900_000, unemploymentPct: 13.8, primarySector: 'African Union Diplomacy, Aviation & Services',
    ageBreakdown: { age0to14: 28.4, age15to24: 22.8, age25to44: 33.6, age45to64: 11.4, age65plus: 3.8 },
  },
  {
    id: 'eth-dir', name: 'Dire Dawa', countryCode: 'ETH', countryName: 'Ethiopia', region: 'Middle East & Africa',
    lat: 9.5931, lng: 41.8661, population: 495_000, metroPopulation: 620_000, densityPerKm2: 3920,
    medianAge: 21.8, gdpBillions: 4, gdpPerCapita: 6452, annualPopGrowthPct: 3.84,
    projected2035: 710_000, projected2050: 1_060_000, unemploymentPct: 15.2, primarySector: 'Rail Corridor Trade & Manufacturing',
    ageBreakdown: { age0to14: 33.4, age15to24: 21.6, age25to44: 30.2, age45to64: 11.2, age65plus: 3.6 },
  },
  // Colombia (2)
  {
    id: 'col-bog', name: 'Bogotá', countryCode: 'COL', countryName: 'Colombia', region: 'Latin America',
    lat: 4.711, lng: -74.0721, population: 8_020_000, metroPopulation: 11_720_000, densityPerKm2: 19450,
    medianAge: 33.4, gdpBillions: 128, gdpPerCapita: 10922, annualPopGrowthPct: 1.06,
    projected2035: 8_890_000, projected2050: 9_620_000, unemploymentPct: 9.8, primarySector: 'Andean Finance, BPO & Logistics',
    ageBreakdown: { age0to14: 18.8, age15to24: 15.6, age25to44: 33.8, age45to64: 22.4, age65plus: 9.4 },
  },
  {
    id: 'col-mde', name: 'Medellín', countryCode: 'COL', countryName: 'Colombia', region: 'Latin America',
    lat: 6.2442, lng: -75.5812, population: 2_640_000, metroPopulation: 4_180_000, densityPerKm2: 6950,
    medianAge: 34.2, gdpBillions: 46, gdpPerCapita: 11005, annualPopGrowthPct: 0.94,
    projected2035: 2_900_000, projected2050: 3_110_000, unemploymentPct: 9.2, primarySector: 'Software, Energy & Fashion Exports',
    ageBreakdown: { age0to14: 17.6, age15to24: 15.2, age25to44: 33.2, age45to64: 23.4, age65plus: 10.6 },
  },
  // Chile (2)
  {
    id: 'chl-scl', name: 'Santiago', countryCode: 'CHL', countryName: 'Chile', region: 'Latin America',
    lat: -33.4489, lng: -70.6693, population: 6_980_000, metroPopulation: 7_420_000, densityPerKm2: 8460,
    medianAge: 36.4, gdpBillions: 176, gdpPerCapita: 23720, annualPopGrowthPct: 0.68,
    projected2035: 7_460_000, projected2050: 7_620_000, unemploymentPct: 8.2, primarySector: 'Mining Finance, Retail & Cloud Data Centers',
    ageBreakdown: { age0to14: 17.4, age15to24: 13.4, age25to44: 32.8, age45to64: 23.4, age65plus: 13.0 },
  },
  {
    id: 'chl-vap', name: 'Valparaíso', countryCode: 'CHL', countryName: 'Chile', region: 'Latin America',
    lat: -33.0472, lng: -71.6127, population: 1_015_000, metroPopulation: 1_060_000, densityPerKm2: 2640,
    medianAge: 37.8, gdpBillions: 24, gdpPerCapita: 22642, annualPopGrowthPct: 0.42,
    projected2035: 1_055_000, projected2050: 1_045_000, unemploymentPct: 8.6, primarySector: 'Pacific Shipping, Higher Ed & Tourism',
    ageBreakdown: { age0to14: 16.4, age15to24: 13.6, age25to44: 29.8, age45to64: 24.8, age65plus: 15.4 },
  },
  // Peru (2)
  {
    id: 'per-lim', name: 'Lima', countryCode: 'PER', countryName: 'Peru', region: 'Latin America',
    lat: -12.0464, lng: -77.0428, population: 10_340_000, metroPopulation: 11_480_000, densityPerKm2: 3860,
    medianAge: 31.6, gdpBillions: 142, gdpPerCapita: 12369, annualPopGrowthPct: 1.24,
    projected2035: 11_680_000, projected2050: 12_950_000, unemploymentPct: 6.8, primarySector: 'Mining Services, Pacific Port & Finance',
    ageBreakdown: { age0to14: 21.8, age15to24: 16.2, age25to44: 32.4, age45to64: 20.4, age65plus: 9.2 },
  },
  {
    id: 'per-aqp', name: 'Arequipa', countryCode: 'PER', countryName: 'Peru', region: 'Latin America',
    lat: -16.409, lng: -71.5375, population: 1_195_000, metroPopulation: 1_310_000, densityPerKm2: 2790,
    medianAge: 32.0, gdpBillions: 18, gdpPerCapita: 13740, annualPopGrowthPct: 1.32,
    projected2035: 1_360_000, projected2050: 1_520_000, unemploymentPct: 6.1, primarySector: 'Copper Mining Hub, Textiles & Agri-Export',
    ageBreakdown: { age0to14: 21.4, age15to24: 16.6, age25to44: 32.2, age45to64: 20.6, age65plus: 9.2 },
  },
  // Extra Major Hubs in Existing Large Economies (+2 -> Total 52 new cities = 138 total)
  {
    id: 'usa-chi', name: 'Chicago', countryCode: 'USA', countryName: 'United States', region: 'North America',
    lat: 41.8781, lng: -87.6298, population: 2_670_000, metroPopulation: 9_440_000, densityPerKm2: 4540,
    medianAge: 36.2, gdpBillions: 860, gdpPerCapita: 91102, annualPopGrowthPct: 0.14,
    projected2035: 2_710_000, projected2050: 2_760_000, unemploymentPct: 4.5, primarySector: 'Commodities, Logistics & Health Tech',
    ageBreakdown: { age0to14: 17.2, age15to24: 12.6, age25to44: 32.8, age45to64: 23.6, age65plus: 13.8 },
  },
  {
    id: 'chn-can', name: 'Guangzhou', countryCode: 'CHN', countryName: 'China', region: 'East Asia & Pacific',
    lat: 23.1291, lng: 113.2644, population: 18_820_000, metroPopulation: 25_600_000, densityPerKm2: 2530,
    medianAge: 35.8, gdpBillions: 446, gdpPerCapita: 23698, annualPopGrowthPct: 0.92,
    projected2035: 20_400_000, projected2050: 20_950_000, unemploymentPct: 4.0, primarySector: 'EV Manufacturing, Trade & Biotech',
    ageBreakdown: { age0to14: 14.2, age15to24: 15.1, age25to44: 38.6, age45to64: 22.9, age65plus: 9.2 },
  },
];
