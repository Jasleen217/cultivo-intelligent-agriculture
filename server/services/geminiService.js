import { GoogleGenAI } from '@google/genai';
import { buildAdvisoryResponse } from './advisoryEngine.js';
import { recommendCrops } from './recommendationEngine.js';
import { analyzeMarketIntelligence } from './predictionEngine.js';
import { compareMandisWithArbitrage } from './arbitrageEngine.js';

export async function askAgriBot({
  message,
  history = [],
  farmerContext = {},
  language = 'en',
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasValidKey =
    Boolean(apiKey) &&
    apiKey.trim() !== '' &&
    apiKey.trim() !== 'MY_GEMINI_API_KEY';

  if (!hasValidKey) {
    return buildAdvisoryResponse({ message, farmerContext, language });
  }

  try {
    const soilType = farmerContext.soilType || 'Alluvial';
    const season = farmerContext.season || 'Rabi';
    const state = farmerContext.state || 'Punjab';
    const landAreaAcres = Number(farmerContext.landAreaAcres) || 5;
    const primaryCrop = farmerContext.primaryCrop || 'wheat';
    const locationId = farmerContext.locationId || 'loc-ludhiana';

    const rec = recommendCrops({ soilType, season, state, landAreaAcres });
    const market = analyzeMarketIntelligence({ cropId: primaryCrop });
    const arbitrage = compareMandisWithArbitrage({
      cropId: primaryCrop,
      locationId,
      quantityQuintals: Math.round(landAreaAcres * 20),
    });

    const languageInstruction =
      language === 'hi'
        ? 'Reply in clear, farmer-friendly Hindi (Devanagari script).'
        : language === 'pa'
        ? 'Reply in clear, farmer-friendly Punjabi (Gurmukhi script).'
        : 'Reply in clear, practical English.';

    const groundedContext = {
      farmerProfile: {
        name: farmerContext.name || 'Guest Farmer',
        location: farmerContext.locationName || state,
        state,
        soilType,
        season,
        primaryCrop,
        landAreaAcres,
      },
      topRecommendedCrops: rec.recommendations.slice(0, 3).map((c) => ({
        crop: c.cropName,
        suitabilityScore: c.suitabilityScore,
        avgYieldPerAcre: c.expectedYieldPerAcre.avg,
        avgMandiPriceInr: c.avgMandiPriceInr,
      })),
      marketSnapshot: market.available
        ? {
            crop: market.crop.name,
            mandi: market.selectedMandi.name,
            currentPriceInr: market.metrics.currentPrice,
            change30dPct: market.metrics.change30dPct,
            projected30dPriceInr: market.metrics.projected30dPrice,
            sellVsHold: market.decision.recommendation,
          }
        : null,
      bestNetMandi: arbitrage.mandis[0]
        ? {
            name: arbitrage.mandis[0].name,
            grossPriceInr: arbitrage.mandis[0].grossPricePerQuintal,
            estimatedRoadKm: arbitrage.mandis[0].estimatedRoadKm,
            estimatedNetPriceInr: arbitrage.mandis[0].netPricePerQuintal,
          }
        : null,
    };

    const systemInstruction = [
      'You are AgriBot, the intelligent agricultural decision assistant for CULTIVO.',
      'Help farmers decide what to grow, where to sell, and when to sell.',
      'Use the verified Cultivo platform context JSON provided below. Never fabricate mandi prices, forecasts, or coordinates.',
      'Clearly distinguish between observed current prices, historical trends, and model estimates.',
      'Keep answers concise, actionable, and structured with short bullet points where helpful.',
      languageInstruction,
      `Platform Context JSON: ${JSON.stringify(groundedContext)}`,
    ].join('\n');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((item) => `${item.role === 'user' ? 'Farmer' : 'AgriBot'}: ${item.text}`)
          .join('\n')
      : '';

    const prompt = formattedHistory
      ? `Recent conversation:\n${formattedHistory}\n\nFarmer: ${message}`
      : message;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    const text = (response.text || '').trim();
    if (!text) {
      throw new Error('Empty Gemini response');
    }

    return {
      source: 'gemini-ai',
      modelUsed: 'gemini-4-hydrogen',
      reply: text,
      contextUsed: {
        cropId: primaryCrop,
        soilType,
        season,
        state,
      },
    };
  } catch (err) {
    const fallback = buildAdvisoryResponse({ message, farmerContext, language });
    return {
      ...fallback,
      fallbackReason: err?.message || 'Gemini API unavailable',
    };
  }
}
