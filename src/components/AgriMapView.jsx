import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Bookmark, ExternalLink, MapPin, Navigation, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AgriMapView({
  meta,
  farmContext,
  onUpdateFarmContext,
  onOpenAuth,
}) {
  const { t, getLocalizedCropName } = useLanguage();
  const { isAuthenticated, apiFetch } = useAuth();

  const [locationId, setLocationId] = useState(
    farmContext.locationId || 'loc-ludhiana'
  );
  const [customCoords, setCustomCoords] = useState(null);
  const [cropId, setCropId] = useState(farmContext.cropId || 'wheat');
  const [quantityQuintals, setQuantityQuintals] = useState(
    Math.round((farmContext.landAreaAcres || 5) * 20)
  );
  const [transportRate, setTransportRate] = useState(1.45);
  const [handlingCost, setHandlingCost] = useState(35);
  const [stateFilter, setStateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [data, setData] = useState(null);
  const [selectedMandiId, setSelectedMandiId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveFeedback, setSaveFeedback] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  const fetchMandis = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        cropId,
        locationId,
        quantityQuintals: String(quantityQuintals),
        transportRate: String(transportRate),
        handlingCost: String(handlingCost),
      });
      if (customCoords) {
        params.set('originLat', String(customCoords.lat));
        params.set('originLng', String(customCoords.lng));
      }
      if (stateFilter) params.set('state', stateFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/mandis?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load AgriMap data');
      setData(json);
      if (json.mandis.length > 0) {
        setSelectedMandiId((prev) =>
          json.mandis.some((m) => m.id === prev) ? prev : json.mandis[0].id
        );
      } else {
        setSelectedMandiId(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMandis();
  }, [
    cropId,
    locationId,
    customCoords,
    quantityQuintals,
    transportRate,
    handlingCost,
    stateFilter,
    searchQuery,
  ]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.7, 76.2],
      zoom: 6,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update markers & route polyline when data or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group || !data) return;

    group.clearLayers();

    const originIcon = L.divIcon({
      className: 'cultivo-origin-marker',
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:#1C231F;border:3px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([data.origin.lat, data.origin.lng], { icon: originIcon })
      .bindPopup(
        `<div style="font-size:12px;"><strong>Origin: ${data.origin.name}</strong><br/>${data.origin.lat.toFixed(3)}, ${data.origin.lng.toFixed(3)}</div>`
      )
      .addTo(group);

    const bounds = [[data.origin.lat, data.origin.lng]];

    data.mandis.forEach((m) => {
      const isSelected = m.id === selectedMandiId;
      const bg = m.isBestNet
        ? '#228B4E'
        : m.priceTier === 'Attractive Rate'
        ? '#143D2B'
        : '#525E57';
      const border = isSelected ? '3px solid #F59E0B' : '2px solid #FFFFFF';

      const icon = L.divIcon({
        className: 'cultivo-mandi-marker',
        html: `<div style="padding:3px 7px;border-radius:6px;background:${bg};color:#FFFFFF;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;border:${border};box-shadow:0 2px 6px rgba(0,0,0,0.28);white-space:nowrap;">₹${m.netPricePerQuintal}</div>`,
        iconSize: [62, 24],
        iconAnchor: [31, 12],
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(group);
      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.5;min-width:180px;">
          <strong style="color:#143D2B;">${m.name}</strong><br/>
          <span>${m.district}, ${m.state}</span><br/>
          <span>Gross: ₹${m.grossPricePerQuintal}/qtl</span><br/>
          <span>Est. Net: <strong>₹${m.netPricePerQuintal}/qtl</strong> (~${m.estimatedRoadKm} km)</span>
        </div>`
      );
      marker.on('click', () => setSelectedMandiId(m.id));
      bounds.push([m.lat, m.lng]);
    });

    const selected = data.mandis.find((m) => m.id === selectedMandiId);
    if (selected) {
      L.polyline(
        [
          [data.origin.lat, data.origin.lng],
          [selected.lat, selected.lng],
        ],
        {
          color: '#143D2B',
          weight: 2.5,
          dashArray: '6 6',
          opacity: 0.75,
        }
      ).addTo(group);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 9 });
    }
  }, [data, selectedMandiId]);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser. Please select a district.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomCoords({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
        });
      },
      () => {
        setError('Unable to access GPS location. Please choose your district manually.');
      }
    );
  };

  const handleSaveComparison = async (mandi) => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    try {
      await apiFetch('/api/farmer/comparisons', {
        method: 'POST',
        body: JSON.stringify({
          cropId,
          cropName: data?.crop?.name || cropId,
          originName: data?.origin?.name || locationId,
          bestMandiName: mandi.name,
          netPricePerQuintal: mandi.netPricePerQuintal,
          grossPricePerQuintal: mandi.grossPricePerQuintal,
          estimatedRoadKm: mandi.estimatedRoadKm,
          quantityQuintals,
        }),
      });
      setSaveFeedback(`${mandi.name} — ${t('map.savedSuccess')}`);
      setTimeout(() => setSaveFeedback(''), 3500);
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedMandi =
    data?.mandis?.find((m) => m.id === selectedMandiId) || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#143D2B] tracking-tight">
            {t('map.heading')}
          </h1>
          <p className="text-sm text-[#525E57]">{t('map.subheading')}</p>
        </div>

        {saveFeedback && (
          <div className="px-3.5 py-2 rounded-lg bg-[#EDF5F0] border border-[#BBF7D0] text-xs font-semibold text-[#143D2B]">
            {saveFeedback}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-[#E2E5DE] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-[#525E57] mb-1">
            {t('market.selectCrop')}
          </label>
          <select
            value={cropId}
            onChange={(e) => {
              setCropId(e.target.value);
              onUpdateFarmContext({ cropId: e.target.value });
            }}
            className="w-full px-3 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
          >
            {(meta?.crops || []).map((c) => (
              <option key={c.id} value={c.id}>
                {getLocalizedCropName(c)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-[#525E57]">
              {t('map.originLabel')}
            </label>
            <button
              type="button"
              onClick={handleUseGps}
              className="text-[11px] font-semibold text-[#228B4E] hover:underline"
            >
              Use GPS
            </button>
          </div>
          <select
            value={locationId}
            onChange={(e) => {
              setCustomCoords(null);
              setLocationId(e.target.value);
              const loc = meta?.locations?.find((l) => l.id === e.target.value);
              onUpdateFarmContext({
                locationId: e.target.value,
                state: loc ? loc.state : farmContext.state,
              });
            }}
            className="w-full px-3 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
          >
            {(meta?.locations || []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#525E57] mb-1">
            {t('map.quantityLabel')}
          </label>
          <input
            type="number"
            min="1"
            value={quantityQuintals}
            onChange={(e) =>
              setQuantityQuintals(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#525E57] mb-1">
            {t('map.rateLabel')}
          </label>
          <input
            type="number"
            min="0.2"
            step="0.05"
            value={transportRate}
            onChange={(e) =>
              setTransportRate(Math.max(0.2, Number(e.target.value) || 1))
            }
            className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#525E57] mb-1">
            {t('map.stateFilter')}
          </label>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
          >
            <option value="">{t('map.allStates')}</option>
            {(meta?.states || []).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#525E57] mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#647068] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('map.searchPlaceholder')}
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Map + Selected Mandi Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-white border border-[#E2E5DE] rounded-2xl overflow-hidden flex flex-col">
          <div
            ref={mapContainerRef}
            className="w-full h-[380px] lg:h-[460px] bg-[#EEF1EC]"
          />
          <div className="px-4 py-2.5 bg-[#F8F8F5] border-t border-[#E2E5DE] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#525E57]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1C231F] inline-block" />
                <span>Origin: {data?.origin?.name || 'Selected'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#228B4E] inline-block" />
                <span>{t('map.bestNetTag')}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#143D2B] inline-block" />
                <span>Attractive Rate</span>
              </span>
            </div>
            <span>{t('map.estimateDisclaimer')}</span>
          </div>
        </div>

        {/* Selected Mandi Summary Card */}
        <div className="lg:col-span-4 bg-white border border-[#E2E5DE] rounded-2xl p-5 flex flex-col justify-between space-y-5">
          {loading ? (
            <p className="text-sm text-[#647068]">{t('common.loading')}</p>
          ) : selectedMandi ? (
            <>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[#228B4E]">
                      {selectedMandi.priceTier}
                    </p>
                    <h2 className="font-display text-lg font-bold text-[#143D2B]">
                      {selectedMandi.name}
                    </h2>
                    <p className="text-xs text-[#647068]">
                      {selectedMandi.district}, {selectedMandi.state} ·{' '}
                      {selectedMandi.marketType}
                    </p>
                  </div>
                  <MapPin className="w-5 h-5 text-[#143D2B] shrink-0" />
                </div>

                <div className="divide-y divide-[#EEF0EC] text-sm border-t border-b border-[#EEF0EC]">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#525E57]">{t('map.grossPrice')}</span>
                    <span className="font-mono tabular-nums font-semibold text-[#1C231F]">
                      ₹{selectedMandi.grossPricePerQuintal.toLocaleString('en-IN')}/qtl
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#525E57]">{t('map.estDistance')}</span>
                    <span className="font-mono tabular-nums text-[#1C231F]">
                      ~{selectedMandi.estimatedRoadKm} km
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#525E57]">{t('map.estTransport')}</span>
                    <span className="font-mono tabular-nums text-[#B45309]">
                      -₹{selectedMandi.transportCostPerQuintal.toLocaleString('en-IN')}/qtl
                    </span>
                  </div>
                  <div className="py-3 flex justify-between items-baseline">
                    <span className="font-semibold text-[#143D2B]">
                      {t('map.netPrice')}
                    </span>
                    <span className="font-mono tabular-nums text-xl font-bold text-[#143D2B]">
                      ₹{selectedMandi.netPricePerQuintal.toLocaleString('en-IN')}/qtl
                    </span>
                  </div>
                </div>

                <div className="bg-[#F8F8F5] border border-[#E2E5DE] rounded-xl p-3.5 space-y-1">
                  <p className="text-xs text-[#525E57]">
                    {t('map.totalNet')} ({quantityQuintals} {t('common.quintal')})
                  </p>
                  <p className="font-mono tabular-nums text-2xl font-bold text-[#143D2B]">
                    ₹{selectedMandi.totalNetRealizationInr.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#647068] font-mono tabular-nums">
                    Freight total: ₹
                    {selectedMandi.totalTransportCostInr.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <a
                  href={selectedMandi.osmDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 bg-[#143D2B] hover:bg-[#1B523A] text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{t('map.directions')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => handleSaveComparison(selectedMandi)}
                  className="py-2.5 px-3 bg-[#F1F2ED] hover:bg-[#E4EAE2] text-[#143D2B] text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{t('map.saveComparison')}</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#647068]">{t('common.noData')}</p>
          )}
        </div>
      </div>

      {/* Full Arbitrage Comparison Table */}
      <div className="bg-white border border-[#E2E5DE] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E5DE] flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-[#1C231F]">
            Nearby & Regional Mandi Net Comparison ({data?.mandis?.length || 0})
          </h3>
          <span className="text-xs text-[#647068]">
            Sorted by estimated net payout after freight & handling
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E5DE] bg-[#F8F8F5] text-xs font-semibold text-[#525E57]">
                <th className="py-3 px-5">Rank & Mandi</th>
                <th className="py-3 px-5 text-right">{t('map.estDistance')}</th>
                <th className="py-3 px-5 text-right">{t('map.grossPrice')}</th>
                <th className="py-3 px-5 text-right">{t('map.estTransport')}</th>
                <th className="py-3 px-5 text-right">{t('map.netPrice')}</th>
                <th className="py-3 px-5 text-right">{t('map.totalNet')}</th>
                <th className="py-3 px-5 text-right">Route</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0EC] text-sm">
              {(data?.mandis || []).map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedMandiId(m.id)}
                  className={`cursor-pointer transition-colors hover:bg-[#F8F8F5] ${
                    m.id === selectedMandiId ? 'bg-[#EDF5F0]' : ''
                  }`}
                >
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#647068]">
                        #{m.rank}
                      </span>
                      <div>
                        <p className="font-semibold text-[#1C231F]">{m.name}</p>
                        <p className="text-xs text-[#647068]">
                          {m.district}, {m.state} · {m.priceTier}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-[#525E57]">
                    ~{m.estimatedRoadKm} km
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-[#1C231F]">
                    ₹{m.grossPricePerQuintal.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-[#B45309]">
                    -₹{m.transportCostPerQuintal.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums font-bold text-[#143D2B]">
                    ₹{m.netPricePerQuintal.toLocaleString('en-IN')}/qtl
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-[#1C231F]">
                    ₹{m.totalNetRealizationInr.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <a
                      href={m.osmDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-semibold text-[#228B4E] hover:underline whitespace-nowrap"
                    >
                      {t('map.directions')}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
