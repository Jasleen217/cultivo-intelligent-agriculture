import crypto from 'crypto';
import { getLocations, getMandis, readUserStore, writeUserStore } from './dataStore.js';

export function normalizePhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

export function isValidIndianPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

export function requestOtp(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!isValidIndianPhone(phone)) {
    const err = new Error('Please enter a valid 10-digit mobile number starting with 6-9.');
    err.status = 400;
    throw err;
  }

  const store = readUserStore();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000;

  store.otps[phone] = {
    code,
    expiresAt,
    createdAt: Date.now(),
  };
  writeUserStore(store);

  const isExistingUser = Boolean(store.users[phone]);

  return {
    phone,
    isExistingUser,
    smsProviderConfigured: false,
    mode: 'development-otp',
    devOtp: code,
    expiresInMinutes: 10,
    notice:
      'No external SMS gateway is configured. Use the Development OTP shown below to verify your session.',
  };
}

function buildDefaultProfile(phone, name) {
  const locations = getLocations();
  const defaultLoc = locations[0];
  return {
    phone,
    name: name && String(name).trim() ? String(name).trim() : `Farmer ${phone.slice(-4)}`,
    locationId: defaultLoc.id,
    locationName: defaultLoc.name,
    state: defaultLoc.state,
    soilType: 'Alluvial',
    season: 'Rabi',
    primaryCrop: 'wheat',
    landAreaAcres: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generateInitialNotifications(profile) {
  const mandis = getMandis();
  const cropId = profile.primaryCrop || 'wheat';
  const relevant = mandis.filter((m) => m.commodities && m.commodities[cropId]);
  const topMandi =
    relevant.length > 0
      ? relevant.reduce((a, b) =>
          b.commodities[cropId].currentPrice > a.commodities[cropId].currentPrice ? b : a
        )
      : null;

  const list = [
    {
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      type: 'market',
      title: 'Welcome to Cultivo Farm Intelligence',
      message: `Your farm profile is active for ${profile.locationName} (${profile.landAreaAcres} acres, ${profile.soilType} soil).`,
      createdAt: new Date().toISOString(),
      read: false,
    },
  ];

  if (topMandi) {
    list.unshift({
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      type: 'opportunity',
      title: `Top Tracked Rate: ${topMandi.name}`,
      message: `${cropId.toUpperCase()} is currently trading at ₹${topMandi.commodities[cropId].currentPrice}/qtl in ${topMandi.name} (${topMandi.state}).`,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  return list;
}

export function verifyOtp({ rawPhone, otp, name }) {
  const phone = normalizePhone(rawPhone);
  if (!isValidIndianPhone(phone)) {
    const err = new Error('Invalid phone number.');
    err.status = 400;
    throw err;
  }

  const store = readUserStore();
  const record = store.otps[phone];
  if (!record || record.expiresAt < Date.now()) {
    const err = new Error('OTP expired or not requested. Request a new code.');
    err.status = 400;
    throw err;
  }

  if ((record.attempts || 0) >= 5) {
  delete store.otps[phone];
  writeUserStore(store);

  const err = new Error('Too many incorrect attempts. Please request a new OTP.');
  err.status = 429;
  throw err;
}

if (String(otp || '').trim() !== record.code) {
  record.attempts = (record.attempts || 0) + 1;

  if (record.attempts >= 5) {
    delete store.otps[phone];
  }

  writeUserStore(store);

  const err = new Error('Incorrect OTP. Remaining attempts: ' + (5 - record.attempts));
  err.status = 401;
  throw err;
}

  delete store.otps[phone];

  let user = store.users[phone];
  if (!user) {
    const profile = buildDefaultProfile(phone, name);
    user = {
      profile,
      savedComparisons: [],
      priceAlerts: [
        {
          id: `alert-${crypto.randomUUID().slice(0, 8)}`,
          cropId: profile.primaryCrop,
          targetPrice: 2500,
          condition: 'above',
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
      notifications: generateInitialNotifications(profile),
      notificationPreferences: {
        priceAlerts: true,
        sellingSignals: true,
        cropUpdates: true,
        digestChannel: 'in-app',
      },
    };
  } else if (name && String(name).trim()) {
    user.profile.name = String(name).trim();
    user.profile.updatedAt = new Date().toISOString();
  }

  // Evaluate alerts immediately on login
  evaluateAlertsForUser(user);

  const token = crypto.randomBytes(32).toString('hex');
  store.sessions[token] = {
    phone,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  store.users[phone] = user;
  writeUserStore(store);

  return { token, user };
}

export function evaluateAlertsForUser(user) {
  if (!user || !Array.isArray(user.priceAlerts)) return;
  if (!user.notificationPreferences?.priceAlerts) return;

  const mandis = getMandis();
  const existingAlertKeys = new Set(
    (user.notifications || []).map((n) => n.alertTriggerKey).filter(Boolean)
  );

  for (const alert of user.priceAlerts) {
    if (!alert.active) continue;
    const matching = mandis.filter((m) => m.commodities && m.commodities[alert.cropId]);
    for (const m of matching) {
      const price = m.commodities[alert.cropId].currentPrice;
      const triggered =
        alert.condition === 'below' ? price <= alert.targetPrice : price >= alert.targetPrice;
      if (triggered) {
        const key = `${alert.id}:${m.id}:${price}`;
        if (!existingAlertKeys.has(key)) {
          user.notifications.unshift({
            id: `notif-${crypto.randomUUID().slice(0, 8)}`,
            type: 'price-alert',
            alertTriggerKey: key,
            title: `Price Alert Triggered: ${alert.cropId.toUpperCase()}`,
            message: `${m.name} reached ₹${price}/qtl (your target: ${alert.condition} ₹${alert.targetPrice}/qtl).`,
            createdAt: new Date().toISOString(),
            read: false,
          });
          existingAlertKeys.add(key);
        }
        break;
      }
    }
  }
  user.notifications = user.notifications.slice(0, 30);
}

export function getSessionUser(token) {
  if (!token) return null;
  const store = readUserStore();
  const session = store.sessions[token];
  if (!session || session.expiresAt < Date.now()) {
    if (session) {
      delete store.sessions[token];
      writeUserStore(store);
    }
    return null;
  }
  const user = store.users[session.phone];
  return user ? { phone: session.phone, user } : null;
}

export function logoutSession(token) {
  if (!token) return;
  const store = readUserStore();
  if (store.sessions[token]) {
    delete store.sessions[token];
    writeUserStore(store);
  }
}

export function updateFarmerProfile(phone, updates) {
  const store = readUserStore();
  const user = store.users[phone];
  if (!user) return null;

  const locations = getLocations();
  const matchedLoc = locations.find((l) => l.id === updates.locationId);

  user.profile = {
    ...user.profile,
    name: updates.name ? String(updates.name).trim() : user.profile.name,
    locationId: matchedLoc ? matchedLoc.id : user.profile.locationId,
    locationName: matchedLoc ? matchedLoc.name : user.profile.locationName,
    state: matchedLoc ? matchedLoc.state : updates.state || user.profile.state,
    soilType: updates.soilType || user.profile.soilType,
    season: updates.season || user.profile.season,
    primaryCrop: updates.primaryCrop || user.profile.primaryCrop,
    landAreaAcres:
      Number(updates.landAreaAcres) > 0
        ? Number(updates.landAreaAcres)
        : user.profile.landAreaAcres,
    updatedAt: new Date().toISOString(),
  };

  store.users[phone] = user;
  writeUserStore(store);
  return user;
}

export function addSavedComparison(phone, comparison) {
  const store = readUserStore();
  const user = store.users[phone];
  if (!user) return null;

  const item = {
    id: `cmp-${crypto.randomUUID().slice(0, 8)}`,
    cropId: comparison.cropId,
    cropName: comparison.cropName,
    originName: comparison.originName,
    bestMandiName: comparison.bestMandiName,
    netPricePerQuintal: Number(comparison.netPricePerQuintal) || 0,
    grossPricePerQuintal: Number(comparison.grossPricePerQuintal) || 0,
    estimatedRoadKm: Number(comparison.estimatedRoadKm) || 0,
    quantityQuintals: Number(comparison.quantityQuintals) || 50,
    savedAt: new Date().toISOString(),
  };

  user.savedComparisons = [item, ...(user.savedComparisons || [])].slice(0, 12);
  store.users[phone] = user;
  writeUserStore(store);
  return user.savedComparisons;
}

export function removeSavedComparison(phone, comparisonId) {
  const store = readUserStore();
  const user = store.users[phone];
  if (!user) return null;

  user.savedComparisons = (user.savedComparisons || []).filter(
    (c) => c.id !== comparisonId
  );
  store.users[phone] = user;
  writeUserStore(store);
  return user.savedComparisons;
}

export function addPriceAlert(phone, { cropId, targetPrice, condition = 'above' }) {
  const store = readUserStore();
  const user = store.users[phone];
  if (!user) return null;

  const priceNum = Number(targetPrice);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    const err = new Error('Target price must be a positive number.');
    err.status = 400;
    throw err;
  }

  const alert = {
    id: `alert-${crypto.randomUUID().slice(0, 8)}`,
    cropId: cropId || user.profile.primaryCrop || 'wheat',
    targetPrice: Math.round(priceNum),
    condition: condition === 'below' ? 'below' : 'above',
    active: true,
    createdAt: new Date().toISOString(),
  };

  user.priceAlerts = [alert, ...(user.priceAlerts || [])];
  evaluateAlertsForUser(user);
  store.users[phone] = user;
  writeUserStore(store);
  return { priceAlerts: user.priceAlerts, notifications: user.notifications };
}

export function removePriceAlert(phone, alertId) {
  const store = readUserStore();
  const user = store.users[phone];
  if (!user) return null;

  user.priceAlerts = (user.priceAlerts || []).filter((a) => a.id !== alertId);
  store.users[phone] = user;
  writeUserStore(store);
  return user.priceAlerts;
}

export function markNotificationRead(phone, notifId) {
  const store = readUserStore();
  const user = store.users[phone];
  if (!user) return null;

  user.notifications = (user.notifications || []).map((n) =>
    notifId === 'all' || n.id === notifId ? { ...n, read: true } : n
  );
  store.users[phone] = user;
  writeUserStore(store);
  return user.notifications;
}

export function updateNotificationPreferences(phone, prefs) {
  const store = readUserStore();
  const user = store.users[phone];
  if (!user) return null;

  user.notificationPreferences = {
    ...user.notificationPreferences,
    priceAlerts:
      typeof prefs.priceAlerts === 'boolean'
        ? prefs.priceAlerts
        : user.notificationPreferences.priceAlerts,
    sellingSignals:
      typeof prefs.sellingSignals === 'boolean'
        ? prefs.sellingSignals
        : user.notificationPreferences.sellingSignals,
    cropUpdates:
      typeof prefs.cropUpdates === 'boolean'
        ? prefs.cropUpdates
        : user.notificationPreferences.cropUpdates,
  };
  store.users[phone] = user;
  writeUserStore(store);
  return user.notificationPreferences;
}
