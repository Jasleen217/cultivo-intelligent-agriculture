import { recommendCrops } from './recommendationEngine.js';
import { analyzeMarketIntelligence } from './predictionEngine.js';
import { compareMandisWithArbitrage } from './arbitrageEngine.js';
import { getCrops } from './dataStore.js';

export function buildAdvisoryResponse({
  message = '',
  farmerContext = {},
  language = 'en',
}) {
  const query = String(message).toLowerCase();
  const crops = getCrops();

  const soilType = farmerContext.soilType || 'Alluvial';
  const season = farmerContext.season || 'Rabi';
  const state = farmerContext.state || 'Punjab';
  const landAreaAcres = Number(farmerContext.landAreaAcres) || 5;
  const locationId = farmerContext.locationId || 'loc-ludhiana';

  // Detect if user mentioned a specific crop in their message
  const mentionedCrop = crops.find(
    (c) =>
      query.includes(c.id) ||
      query.includes(c.name.toLowerCase()) ||
      query.includes(c.hindiName) ||
      query.includes(c.punjabiName)
  );
  const cropId = mentionedCrop
    ? mentionedCrop.id
    : farmerContext.primaryCrop || 'wheat';

  const market = analyzeMarketIntelligence({ cropId });
  const rec = recommendCrops({ soilType, season, state, landAreaAcres });
  const topCrops = rec.recommendations.slice(0, 3);
  const arbitrage = compareMandisWithArbitrage({
    cropId,
    locationId,
    quantityQuintals: Math.round(landAreaAcres * 20),
  });
  const bestMandi = arbitrage.mandis[0];

  const wantsGrow =
    query.includes('grow') ||
    query.includes('soil') ||
    query.includes('seed') ||
    query.includes('sow') ||
    query.includes('recommend') ||
    query.includes('फसल') ||
    query.includes('मिट्टी') ||
    query.includes('ਫਸਲ');

  const wantsSellWhere =
    query.includes('where') ||
    query.includes('mandi') ||
    query.includes('transport') ||
    query.includes('sell') ||
    query.includes('मंडी') ||
    query.includes('ਮੰਡੀ');

  const wantsWhen =
    query.includes('when') ||
    query.includes('hold') ||
    query.includes('forecast') ||
    query.includes('trend') ||
    query.includes('price') ||
    query.includes('भाव') ||
    query.includes('ਰੇਟ');

  const sections = [];

  if (wantsGrow || (!wantsSellWhere && !wantsWhen)) {
    const topList = topCrops
      .map(
        (c, i) =>
          `${i + 1}. ${c.cropName} (Score ${c.suitabilityScore}/100) — Est. yield ${c.estimatedTotalYieldQuintals.avg} qtl, Avg mandi ₹${c.avgMandiPriceInr}/qtl. ${c.agronomyNote}`
      )
      .join('\n');
    sections.push(
      `Crop Suitability (${soilType} soil, ${season} season, ${state}, ${landAreaAcres} acres):\n${topList}`
    );
  }

  if ((wantsWhen || !wantsGrow) && market.available) {
    sections.push(
      `Market Timing & Sell-vs-Hold (${market.crop.name} at ${market.selectedMandi.name}):\nCurrent Price: ₹${market.metrics.currentPrice}/qtl (30d change: ${market.metrics.change30dPct >= 0 ? '+' : ''}${market.metrics.change30dPct}%).\n30-Day Model Estimate: ₹${market.metrics.projected30dPrice}/qtl (${market.metrics.projectedDeltaPct >= 0 ? '+' : ''}${market.metrics.projectedDeltaPct}%).\nGuidance: ${market.decision.recommendation} — ${market.decision.rationale[0]}`
    );
  }

  if ((wantsSellWhere || !wantsGrow) && bestMandi) {
    sections.push(
      `Best Net Realization Mandi (from ${arbitrage.origin.name}):\n${bestMandi.name} (${bestMandi.district}, ${bestMandi.state}) offers ₹${bestMandi.grossPricePerQuintal}/qtl gross. After ~${bestMandi.estimatedRoadKm} km estimated transport (₹${bestMandi.transportCostPerQuintal}/qtl), estimated net payout is ₹${bestMandi.netPricePerQuintal}/qtl.`
    );
  }

  const langPrefix =
    language === 'hi'
      ? 'नोट: लाइव AI API कुंजी उपलब्ध न होने के कारण यह उत्तर Cultivo के नियम-आधारित सलाह इंजन से तैयार किया गया है।\n\n'
      : language === 'pa'
      ? 'ਨੋਟ: ਲਾਈਵ AI API ਕੁੰਜੀ ਉਪਲਬਧ ਨਾ ਹੋਣ ਕਾਰਨ ਇਹ ਜਵਾਬ Cultivo ਦੇ ਡਾਟਾ-ਅਧਾਰਿਤ ਸਲਾਹ ਇੰਜਣ ਤੋਂ ਤਿਆਰ ਕੀਤਾ ਗਿਆ ਹੈ।\n\n'
      : 'Advisory Engine Response (Fallback Mode — Gemini API key not active):\n\n';

  return {
    source: 'advisory-fallback',
    modelUsed: 'cultivo-advisory-engine',
    reply: langPrefix + sections.join('\n\n'),
    contextUsed: {
      cropId,
      soilType,
      season,
      state,
      landAreaAcres,
      bestMandiName: bestMandi ? bestMandi.name : null,
      recommendation: market.available ? market.decision.recommendation : null,
    },
  };
}
