import { getCrops, getMandis } from './dataStore.js';

export function recommendCrops({
  soilType = 'Alluvial',
  season = 'Rabi',
  state = 'Punjab',
  landAreaAcres = 5,
}) {
  const crops = getCrops();
  const mandis = getMandis();
  const area = Math.max(0.5, Number(landAreaAcres) || 5);

  const scored = crops.map((crop) => {
    const soilMatch = crop.soils.some(
      (s) => s.toLowerCase() === String(soilType).toLowerCase()
    );
    const seasonMatch = crop.seasons.some(
      (s) => s.toLowerCase() === String(season).toLowerCase()
    );
    const stateMatch = crop.suitableStates.some(
      (s) => s.toLowerCase() === String(state).toLowerCase()
    );

    let matchScore = 0;
    const reasons = [];

    if (seasonMatch) {
      matchScore += 45;
      reasons.push(`Suited for ${season} sowing window`);
    } else {
      reasons.push(`Primary season is ${crop.seasons.join(' / ')}`);
    }

    if (soilMatch) {
      matchScore += 35;
      reasons.push(`Compatible with ${soilType} soil`);
    } else {
      reasons.push(`Prefers ${crop.soils.join(', ')} soils`);
    }

    if (stateMatch) {
      matchScore += 20;
      reasons.push(`Established market demand in ${state}`);
    }

    // Gather actual observed mandi prices for this crop
    const cropPrices = [];
    for (const m of mandis) {
      if (m.commodities && m.commodities[crop.id]) {
        cropPrices.push({
          mandiName: m.name,
          state: m.state,
          price: m.commodities[crop.id].currentPrice,
        });
      }
    }

    const avgMandiPrice =
      cropPrices.length > 0
        ? Math.round(
            cropPrices.reduce((acc, p) => acc + p.price, 0) / cropPrices.length
          )
        : crop.benchmarkMspInr;

    const bestMandi =
      cropPrices.length > 0
        ? cropPrices.reduce((best, cur) => (cur.price > best.price ? cur : best))
        : null;

    const avgYieldTotal = Number((crop.yieldQuintalsPerAcre.avg * area).toFixed(1));
    const minYieldTotal = Number((crop.yieldQuintalsPerAcre.min * area).toFixed(1));
    const maxYieldTotal = Number((crop.yieldQuintalsPerAcre.max * area).toFixed(1));

    const benchmarkCostPerAcre = Object.values(crop.benchmarkCostPerAcre).reduce(
      (a, b) => a + b,
      0
    );
    const estimatedInputCost = Math.round(benchmarkCostPerAcre * area);
    const estimatedGrossRevenue = Math.round(avgYieldTotal * avgMandiPrice);
    const estimatedNetMargin = estimatedGrossRevenue - estimatedInputCost;

    let suitabilityTier = 'Low Match';
    if (matchScore >= 85) suitabilityTier = 'High Suitability';
    else if (matchScore >= 55) suitabilityTier = 'Moderate Suitability';

    return {
      cropId: crop.id,
      cropName: crop.name,
      hindiName: crop.hindiName,
      punjabiName: crop.punjabiName,
      suitabilityScore: matchScore,
      suitabilityTier,
      seasonMatch,
      soilMatch,
      stateMatch,
      reasons,
      durationDays: crop.durationDays,
      waterNeed: crop.waterNeed,
      storagePotential: crop.storagePotential,
      agronomyNote: crop.agronomyNote,
      expectedYieldPerAcre: crop.yieldQuintalsPerAcre,
      estimatedTotalYieldQuintals: {
        min: minYieldTotal,
        avg: avgYieldTotal,
        max: maxYieldTotal,
      },
      avgMandiPriceInr: avgMandiPrice,
      benchmarkMspInr: crop.benchmarkMspInr,
      bestObservedMandi: bestMandi,
      estimatedInputCostInr: estimatedInputCost,
      estimatedGrossRevenueInr: estimatedGrossRevenue,
      estimatedNetMarginInr: estimatedNetMargin,
      dataNote: 'Yield and cost figures are regional reference estimates; mandi price reflects tracked APMC datasets.',
    };
  });

  scored.sort((a, b) => {
    if (b.suitabilityScore !== a.suitabilityScore) {
      return b.suitabilityScore - a.suitabilityScore;
    }
    return b.estimatedNetMarginInr - a.estimatedNetMarginInr;
  });

  return {
    query: { soilType, season, state, landAreaAcres: area },
    recommendations: scored,
  };
}
