import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { getCrops, getLocations, getMandis } from './server/services/dataStore.js';
import { recommendCrops } from './server/services/recommendationEngine.js';
import { analyzeMarketIntelligence } from './server/services/predictionEngine.js';
import { compareMandisWithArbitrage } from './server/services/arbitrageEngine.js';
import {
  addPriceAlert,
  addSavedComparison,
  evaluateAlertsForUser,
  getSessionUser,
  logoutSession,
  markNotificationRead,
  removePriceAlert,
  removeSavedComparison,
  requestOtp,
  updateFarmerProfile,
  updateNotificationPreferences,
  verifyOtp,
} from './server/services/authService.js';
import { askAgriBot } from './server/services/geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getErrStatus(err: unknown): number {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return 400;
}

function getErrMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  return fallback;
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const session = getSessionUser(token);
  if (!session) {
    return res
      .status(401)
      .json({ error: 'Authentication required. Please sign in with your mobile number.' });
  }
  res.locals.authToken = token;
  res.locals.phone = session.phone;
  res.locals.farmerUser = session.user;
  return next();
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    const hasGeminiKey =
      Boolean(process.env.GEMINI_API_KEY) &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
    res.json({
      status: 'ok',
      platform: 'CULTIVO',
      geminiConfigured: hasGeminiKey,
      smsProviderConfigured: false,
    });
  });

  app.get('/api/meta', (_req: Request, res: Response) => {
    const crops = getCrops();
    const locations = getLocations();
    const mandis = getMandis();
    const states = Array.from(
      new Set(mandis.map((m: { state: string }) => m.state))
    ).sort();
    const soilTypes = [
      'Alluvial',
      'Black Cotton',
      'Loamy',
      'Sandy Loam',
      'Clay Loam',
      'Clay',
      'Red Soil',
    ];
    const seasons = ['Rabi', 'Kharif', 'Zaid'];

    res.json({
      crops,
      locations,
      states,
      soilTypes,
      seasons,
      mandiCount: mandis.length,
    });
  });

  app.get('/api/mandis', (req: Request, res: Response) => {
    try {
      const {
        cropId = 'wheat',
        locationId = 'loc-ludhiana',
        originLat,
        originLng,
        quantityQuintals = '50',
        transportRate = '1.45',
        handlingCost = '35',
        state = '',
        search = '',
      } = req.query;

      const data = compareMandisWithArbitrage({
        cropId: String(cropId),
        locationId: String(locationId),
        originLat: originLat !== undefined ? Number(originLat) : null,
        originLng: originLng !== undefined ? Number(originLng) : null,
        quantityQuintals: Number(quantityQuintals) || 50,
        transportRatePerKmPerQuintal: Number(transportRate) || 1.45,
        handlingCostPerQuintal: Number(handlingCost) || 35,
        stateFilter: String(state),
        searchQuery: String(search),
      });

      res.json(data);
    } catch (err) {
      res
        .status(500)
        .json({ error: getErrMessage(err, 'Failed to load mandi comparison.') });
    }
  });

  app.get('/api/market-intelligence', (req: Request, res: Response) => {
    try {
      const { cropId = 'wheat', mandiId = '' } = req.query;
      const result = analyzeMarketIntelligence({
        cropId: String(cropId),
        mandiId: mandiId ? (String(mandiId) as unknown as null) : null,
      });
      res.json(result);
    } catch (err) {
      res
        .status(500)
        .json({ error: getErrMessage(err, 'Failed to analyze market trends.') });
    }
  });

  app.post('/api/recommendations', (req: Request, res: Response) => {
    try {
      const { soilType, season, state, landAreaAcres } = req.body || {};
      const result = recommendCrops({
        soilType: soilType || 'Alluvial',
        season: season || 'Rabi',
        state: state || 'Punjab',
        landAreaAcres: Number(landAreaAcres) || 5,
      });
      res.json(result);
    } catch (err) {
      res
        .status(500)
        .json({ error: getErrMessage(err, 'Failed to compute crop recommendations.') });
    }
  });

  app.post('/api/profitability', (req: Request, res: Response) => {
    try {
      const {
        landAreaAcres = 1,
        seedCost = 0,
        fertilizerCost = 0,
        labourCost = 0,
        irrigationCost = 0,
        transportCost = 0,
        otherCost = 0,
        expectedYieldTotalQuintals = 0,
        expectedSellingPricePerQuintal = 0,
      } = req.body || {};

      const area = Math.max(0.1, Number(landAreaAcres) || 1);
      const costs = {
        seed: Math.max(0, Number(seedCost) || 0),
        fertilizer: Math.max(0, Number(fertilizerCost) || 0),
        labour: Math.max(0, Number(labourCost) || 0),
        irrigation: Math.max(0, Number(irrigationCost) || 0),
        transport: Math.max(0, Number(transportCost) || 0),
        other: Math.max(0, Number(otherCost) || 0),
      };

      const totalInvestment = Object.values(costs).reduce((a, b) => a + b, 0);
      const yieldQty = Math.max(0, Number(expectedYieldTotalQuintals) || 0);
      const sellPrice = Math.max(0, Number(expectedSellingPricePerQuintal) || 0);
      const expectedRevenue = Math.round(yieldQty * sellPrice);
      const estimatedProfit = expectedRevenue - totalInvestment;
      const profitMarginPct =
        expectedRevenue > 0
          ? Number(((estimatedProfit / expectedRevenue) * 100).toFixed(2))
          : 0;
      const roiPct =
        totalInvestment > 0
          ? Number(((estimatedProfit / totalInvestment) * 100).toFixed(2))
          : 0;
      const breakevenPricePerQuintal =
        yieldQty > 0 ? Math.round(totalInvestment / yieldQty) : 0;

      res.json({
        landAreaAcres: area,
        costs,
        totalInvestment: Math.round(totalInvestment),
        expectedRevenue,
        estimatedProfit: Math.round(estimatedProfit),
        profitMarginPct,
        roiPct,
        breakevenPricePerQuintal,
        costPerAcre: Math.round(totalInvestment / area),
        profitPerAcre: Math.round(estimatedProfit / area),
      });
    } catch (err) {
      res
        .status(400)
        .json({ error: getErrMessage(err, 'Invalid profitability inputs.') });
    }
  });

  // Authentication Routes
  app.post('/api/auth/request-otp', (req: Request, res: Response) => {
    try {
      const result = requestOtp(req.body?.phone);
      res.json(result);
    } catch (err) {
      res
        .status(getErrStatus(err))
        .json({ error: getErrMessage(err, 'Failed to request OTP.') });
    }
  });

  app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
    try {
      const { phone, otp, name } = req.body || {};
      const result = verifyOtp({ rawPhone: phone, otp, name });
      res.json(result);
    } catch (err) {
      res
        .status(getErrStatus(err))
        .json({ error: getErrMessage(err, 'OTP verification failed.') });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    logoutSession(extractToken(req));
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (_req: Request, res: Response) => {
    res.json({ user: res.locals.farmerUser });
  });

  // Protected Farmer Dashboard & Profile Routes
  app.put('/api/farmer/profile', requireAuth, (req: Request, res: Response) => {
    const updated = updateFarmerProfile(res.locals.phone, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Farmer profile not found.' });
    }
    return res.json({ user: updated });
  });

  app.get('/api/farmer/dashboard', requireAuth, (_req: Request, res: Response) => {
    const user = res.locals.farmerUser;
    const profile = user.profile;
    evaluateAlertsForUser(user);

    const cropRecommendations = recommendCrops({
      soilType: profile.soilType,
      season: profile.season,
      state: profile.state,
      landAreaAcres: profile.landAreaAcres,
    });

    const marketIntelligence = analyzeMarketIntelligence({
      cropId: profile.primaryCrop,
    });

    const matchedCrop = cropRecommendations.recommendations.find(
      (c: { cropId: string }) => c.cropId === profile.primaryCrop
    );
    const expectedHarvestQty =
      matchedCrop?.estimatedTotalYieldQuintals?.avg ||
      profile.landAreaAcres * 20;

    const nearbyMandis = compareMandisWithArbitrage({
      cropId: profile.primaryCrop,
      locationId: profile.locationId,
      quantityQuintals: Math.round(expectedHarvestQty),
    });

    res.json({
      user,
      cropRecommendations: cropRecommendations.recommendations.slice(0, 4),
      marketIntelligence,
      nearbyMandis,
    });
  });

  app.post('/api/farmer/comparisons', requireAuth, (req: Request, res: Response) => {
    const saved = addSavedComparison(res.locals.phone, req.body || {});
    res.json({ savedComparisons: saved });
  });

  app.delete('/api/farmer/comparisons/:id', requireAuth, (req: Request, res: Response) => {
    const saved = removeSavedComparison(res.locals.phone, req.params.id);
    res.json({ savedComparisons: saved });
  });

  app.post('/api/farmer/alerts', requireAuth, (req: Request, res: Response) => {
    try {
      const result = addPriceAlert(res.locals.phone, req.body || {});
      res.json(result);
    } catch (err) {
      res
        .status(getErrStatus(err))
        .json({ error: getErrMessage(err, 'Failed to add price alert.') });
    }
  });

  app.delete('/api/farmer/alerts/:id', requireAuth, (req: Request, res: Response) => {
    const alerts = removePriceAlert(res.locals.phone, req.params.id);
    res.json({ priceAlerts: alerts });
  });

  app.post('/api/farmer/notifications/:id/read', requireAuth, (req: Request, res: Response) => {
    const notifications = markNotificationRead(res.locals.phone, req.params.id);
    res.json({ notifications });
  });

  app.put('/api/farmer/notifications/preferences', requireAuth, (req: Request, res: Response) => {
    const preferences = updateNotificationPreferences(res.locals.phone, req.body || {});
    res.json({ notificationPreferences: preferences });
  });

  // AgriBot AI Route
  app.post('/api/agribot', async (req: Request, res: Response) => {
    try {
      const { message, history = [], guestContext = {}, language = 'en' } =
        req.body || {};
      if (!message || !String(message).trim()) {
        return res.status(400).json({ error: 'Please enter a farming question.' });
      }

      const token = extractToken(req);
      const session = getSessionUser(token);
      const farmerContext = session
        ? { ...session.user.profile, ...guestContext }
        : guestContext;

      const reply = await askAgriBot({
        message: String(message).trim(),
        history,
        farmerContext,
        language,
      });

      return res.json(reply);
    } catch (err) {
      return res
        .status(500)
        .json({ error: getErrMessage(err, 'AgriBot request failed.') });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`CULTIVO server listening on http://localhost:${port}`);
  });
}

startServer();
