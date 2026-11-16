import { getCrops, getMandis } from './dataStore.js';

function computeLinearSlope(series) {
  const n = series.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function computeStdDev(series) {
  if (series.length < 2) return 0;
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance =
    series.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / series.length;
  return Math.sqrt(variance);
}

export function analyzeMarketIntelligence({ cropId = 'wheat', mandiId = null }) {
  const crops = getCrops();
  const mandis = getMandis();
  const crop = crops.find((c) => c.id === cropId) || crops[0];

  const matchingMandis = mandis.filter(
    (m) => m.commodities && m.commodities[crop.id]
  );

  if (matchingMandis.length === 0) {
    return {
      crop,
      available: false,
      message: `No active mandi price records found for ${crop.name}.`,
    };
  }

  const targetMandi =
    (mandiId && matchingMandis.find((m) => m.id === mandiId)) ||
    matchingMandis.reduce((best, cur) =>
      cur.commodities[crop.id].currentPrice >
      best.commodities[crop.id].currentPrice
        ? cur
        : best
    );

  const commodityData = targetMandi.commodities[crop.id];
  const history = commodityData.history30d; // 10 evenly spaced checkpoints over past 30 days
  const currentPrice = commodityData.currentPrice;
  const price30dAgo = history[0];
  const price7dAgo = history[Math.max(0, history.length - 3)];

  const change30dInr = currentPrice - price30dAgo;
  const change30dPct = Number(((change30dInr / price30dAgo) * 100).toFixed(2));
  const change7dInr = currentPrice - price7dAgo;
  const change7dPct = Number(((change7dInr / price7dAgo) * 100).toFixed(2));

  // Linear trend over 10 checkpoints (3 days per step)
  const slopePerStep = computeLinearSlope(history);
  const stdDev = computeStdDev(history);
  const volatilityPct = Number(((stdDev / currentPrice) * 100).toFixed(2));

  // Build transparent 30-day historical series (labeled D-27 to Today)
  const historicalSeries = history.map((price, idx) => {
    const daysAgo = (history.length - 1 - idx) * 3;
    return {
      label: daysAgo === 0 ? 'Today' : `-${daysAgo}d`,
      dayOffset: -daysAgo,
      price,
      type: 'historical',
    };
  });

  // Build 30-day forecast (10 steps of +3 days each, damped linear projection + uncertainty band)
  const forecastSeries = [];
  for (let step = 1; step <= 10; step++) {
    const dayOffset = step * 3;
    // Damping factor reflects diminishing certainty further out
    const damping = Math.pow(0.93, step);
    const projectedMid = Math.round(
      currentPrice + slopePerStep * step * damping
    );
    const bandSpread = Math.round(stdDev * 0.45 * Math.sqrt(step));
    forecastSeries.push({
      label: `+${dayOffset}d`,
      dayOffset,
      price: projectedMid,
      low: Math.max(Math.round(crop.benchmarkMspInr * 0.75), projectedMid - bandSpread),
      high: projectedMid + bandSpread,
      type: 'forecast',
    });
  }

  const projected30dPrice = forecastSeries[forecastSeries.length - 1].price;
  const projectedDeltaPct = Number(
    (((projected30dPrice - currentPrice) / currentPrice) * 100).toFixed(2)
  );

  // Sell-vs-Hold decision logic grounded in momentum, storage perishability, and MSP spread
  let action = 'Staggered Sale';
  let rationale = [];

  const isPerishable =
    crop.id === 'potato' || crop.id === 'onion' || crop.id === 'sugarcane';

  if (projectedDeltaPct >= 2.2 && !isPerishable) {
    action = 'Hold 10-14 Days';
    rationale = [
      `30-day historical trend shows steady upward momentum (+${change30dPct}%).`,
      `Projected +30d model range indicates potential +${projectedDeltaPct}% appreciation if current arrival pace holds.`,
      `${crop.name} has strong dry-storage stability (${crop.storagePotential}).`,
    ];
  } else if (projectedDeltaPct <= -1.2 || (isPerishable && change7dPct < 0)) {
    action = 'Sell Now';
    rationale = [
      `Recent 7-day trend is softening (${change7dPct >= 0 ? '+' : ''}${change7dPct}%).`,
      isPerishable
        ? `${crop.name} carries storage/quality-loss risk (${crop.storagePotential}).`
        : `Current mandi price (₹${currentPrice}/qtl) already sits near local resistance.`,
      `Locking current APMC rates avoids downside arrival pressure.`,
    ];
  } else {
    action = 'Staggered Sale (50% Now / 50% Hold)';
    rationale = [
      `Price momentum is moderate (${change30dPct >= 0 ? '+' : ''}${change30dPct}% over 30 days) with ${volatilityPct}% volatility.`,
      `Selling half now secures immediate cash flow above MSP (₹${crop.benchmarkMspInr}/qtl), while holding half preserves upside.`,
      `Watch ${targetMandi.name} arrival volumes (${commodityData.arrivalsTonnes} tonnes) over the next 7 days.`,
    ];
  }

  // Cross-mandi price comparison for this crop
  const mandiComparison = matchingMandis
    .map((m) => ({
      mandiId: m.id,
      mandiName: m.name,
      district: m.district,
      state: m.state,
      currentPrice: m.commodities[crop.id].currentPrice,
      arrivalsTonnes: m.commodities[crop.id].arrivalsTonnes,
      spreadVsMsp: m.commodities[crop.id].currentPrice - crop.benchmarkMspInr,
    }))
    .sort((a, b) => b.currentPrice - a.currentPrice);

  return {
    available: true,
    crop: {
      id: crop.id,
      name: crop.name,
      hindiName: crop.hindiName,
      punjabiName: crop.punjabiName,
      benchmarkMspInr: crop.benchmarkMspInr,
      storagePotential: crop.storagePotential,
    },
    selectedMandi: {
      id: targetMandi.id,
      name: targetMandi.name,
      district: targetMandi.district,
      state: targetMandi.state,
      marketType: targetMandi.marketType,
      currentPrice,
      arrivalsTonnes: commodityData.arrivalsTonnes,
    },
    metrics: {
      currentPrice,
      change7dInr,
      change7dPct,
      change30dInr,
      change30dPct,
      volatilityPct,
      projected30dPrice,
      projectedDeltaPct,
      spreadVsMsp: currentPrice - crop.benchmarkMspInr,
    },
    decision: {
      recommendation: action,
      rationale,
      methodologyNote:
        'Forecast uses damped linear regression over 30-day observed mandi checkpoints. Projections are estimates and not guaranteed future prices.',
    },
    historicalSeries,
    forecastSeries,
    mandiComparison,
  };
}
