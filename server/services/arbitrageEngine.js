import { getCrops, getLocations, getMandis } from './dataStore.js';

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * @param {{
 *   cropId?: string,
 *   originLat?: number | null,
 *   originLng?: number | null,
 *   locationId?: string,
 *   quantityQuintals?: number,
 *   transportRatePerKmPerQuintal?: number,
 *   handlingCostPerQuintal?: number,
 *   stateFilter?: string,
 *   searchQuery?: string
 * }} params
 */
export function compareMandisWithArbitrage({
  cropId = 'wheat',
  originLat = null,
  originLng = null,
  locationId = 'loc-ludhiana',
  quantityQuintals = 50,
  transportRatePerKmPerQuintal = 1.45,
  handlingCostPerQuintal = 35,
  stateFilter = '',
  searchQuery = '',
}) {
  const crops = getCrops();
  const mandis = getMandis();
  const locations = getLocations();

  const crop = crops.find((c) => c.id === cropId) || crops[0];
  const fallbackLoc = locations.find((l) => l.id === locationId) || locations[0];

  const lat =
    originLat !== null &&
    originLat !== undefined &&
    originLat !== '' &&
    Number.isFinite(Number(originLat))
      ? Number(originLat)
      : fallbackLoc.lat;
  const lng =
    originLng !== null &&
    originLng !== undefined &&
    originLng !== '' &&
    Number.isFinite(Number(originLng))
      ? Number(originLng)
      : fallbackLoc.lng;

  const qty = Math.max(1, Number(quantityQuintals) || 50);
  const ratePerKmQtl = Math.max(0.2, Number(transportRatePerKmPerQuintal) || 1.45);
  const handling = Math.max(0, Number(handlingCostPerQuintal) || 35);

  const filteredMandis = mandis.filter((m) => {
    if (!m.commodities || !m.commodities[crop.id]) return false;
    if (
      stateFilter &&
      m.state.toLowerCase() !== String(stateFilter).toLowerCase()
    ) {
      return false;
    }
    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      const hay = `${m.name} ${m.district} ${m.state}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const results = filteredMandis.map((m) => {
    const straightKm = haversineDistanceKm(lat, lng, m.lat, m.lng);
    // 1.18x road curvature estimate over straight-line Haversine distance
    const estimatedRoadKm = Math.max(2, Math.round(straightKm * 1.18));
    const commodity = m.commodities[crop.id];
    const grossPricePerQuintal = commodity.currentPrice;

    const transportCostPerQuintal = Math.round(
      estimatedRoadKm * ratePerKmQtl + handling
    );
    const totalTransportCostInr = Math.round(transportCostPerQuintal * qty);
    const netPricePerQuintal = grossPricePerQuintal - transportCostPerQuintal;
    const totalGrossRevenueInr = Math.round(grossPricePerQuintal * qty);
    const totalNetRealizationInr = Math.round(netPricePerQuintal * qty);

    const history = commodity.history30d;
    const prevPrice = history[history.length - 2] || grossPricePerQuintal;
    const recentDelta = grossPricePerQuintal - prevPrice;

    return {
      id: m.id,
      name: m.name,
      district: m.district,
      state: m.state,
      marketType: m.marketType,
      lat: m.lat,
      lng: m.lng,
      cropId: crop.id,
      cropName: crop.name,
      grossPricePerQuintal,
      recentDelta,
      arrivalsTonnes: commodity.arrivalsTonnes,
      estimatedRoadKm,
      transportCostPerQuintal,
      totalTransportCostInr,
      netPricePerQuintal,
      totalGrossRevenueInr,
      totalNetRealizationInr,
      osmDirectionsUrl: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${lat}%2C${lng}%3B${m.lat}%2C${m.lng}`,
      isEstimatedTransport: true,
    };
  });

  results.sort((a, b) => b.netPricePerQuintal - a.netPricePerQuintal);

  const bestMandiId = results.length > 0 ? results[0].id : null;
  const maxGross =
    results.length > 0
      ? Math.max(...results.map((r) => r.grossPricePerQuintal))
      : 0;
  const minGross =
    results.length > 0
      ? Math.min(...results.map((r) => r.grossPricePerQuintal))
      : 0;

  const enriched = results.map((r, idx) => {
    let priceTier = 'Standard';
    if (r.id === bestMandiId) priceTier = 'Best Net Return';
    else if (
      maxGross > minGross &&
      r.grossPricePerQuintal >= minGross + (maxGross - minGross) * 0.65
    ) {
      priceTier = 'Attractive Rate';
    }
    return {
      ...r,
      rank: idx + 1,
      isBestNet: r.id === bestMandiId,
      priceTier,
    };
  });

  return {
    crop: { id: crop.id, name: crop.name, benchmarkMspInr: crop.benchmarkMspInr },
    origin: {
      lat,
      lng,
      name: fallbackLoc ? fallbackLoc.name : `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    },
    parameters: {
      quantityQuintals: qty,
      transportRatePerKmPerQuintal: ratePerKmQtl,
      handlingCostPerQuintal: handling,
    },
    methodologyNote:
      'Road distance is estimated at 1.18x Haversine distance using genuine mandi coordinates. Transport and handling costs are adjustable estimates.',
    mandis: enriched,
  };
}
