import { useEffect, useState } from 'react';
import { CheckCircle2, Droplets, Clock, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function CropAdvisorView({
  meta,
  farmContext,
  onUpdateFarmContext,
  onNavigate,
}) {
  const { t, getLocalizedCropName } = useLanguage();

  const [soilType, setSoilType] = useState(farmContext.soilType || 'Alluvial');
  const [season, setSeason] = useState(farmContext.season || 'Rabi');
  const [state, setState] = useState(farmContext.state || 'Punjab');
  const [landAreaAcres, setLandAreaAcres] = useState(
    farmContext.landAreaAcres || 5
  );

  const [recommendations, setRecommendations] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runAdvisor = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soilType, season, state, landAreaAcres }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load recommendations');
      setRecommendations(json.recommendations || []);
      setCompareIds(
        (json.recommendations || []).slice(0, 3).map((r) => r.cropId)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAdvisor();
  }, [soilType, season, state, landAreaAcres]);

  const toggleCompare = (cropId) => {
    setCompareIds((prev) => {
      if (prev.includes(cropId)) return prev.filter((id) => id !== cropId);
      if (prev.length >= 3) return [...prev.slice(1), cropId];
      return [...prev, cropId];
    });
  };

  const comparedCrops = recommendations.filter((r) =>
    compareIds.includes(r.cropId)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#143D2B] tracking-tight">
          {t('crops.heading')}
        </h1>
        <p className="text-sm text-[#525E57]">{t('crops.subheading')}</p>
      </div>

      {/* Parameter Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onUpdateFarmContext({ soilType, season, state, landAreaAcres });
          runAdvisor();
        }}
        className="bg-white border border-[#E2E5DE] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
      >
        <div>
          <label className="block text-xs font-semibold text-[#525E57] mb-1.5">
            {t('hero.soilLabel')}
          </label>
          <select
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
          >
            {(meta?.soilTypes || []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#525E57] mb-1.5">
            {t('hero.seasonLabel')}
          </label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
          >
            {(meta?.seasons || []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#525E57] mb-1.5">
            State
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
          >
            {(meta?.states || []).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#525E57] mb-1.5">
            {t('hero.areaLabel')}
          </label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={landAreaAcres}
            onChange={(e) =>
              setLandAreaAcres(Math.max(0.5, Number(e.target.value) || 1))
            }
            className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
          />
        </div>

        <button
          type="submit"
          className="py-2.5 px-4 bg-[#143D2B] hover:bg-[#1B523A] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {t('crops.analyzeBtn')}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Ranked Crop Cards */}
      {loading ? (
        <div className="bg-white border border-[#E2E5DE] rounded-2xl p-8 text-sm text-[#647068]">
          {t('common.loading')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommendations.slice(0, 6).map((rec, idx) => {
              const isSelected = compareIds.includes(rec.cropId);
              return (
                <div
                  key={rec.cropId}
                  className={`bg-white border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-colors ${
                    idx === 0 ? 'border-[#228B4E]' : 'border-[#E2E5DE]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#228B4E]">
                          #{idx + 1} · {rec.suitabilityTier}
                        </p>
                        <h2 className="font-display text-lg font-bold text-[#143D2B]">
                          {getLocalizedCropName({
                            name: rec.cropName,
                            hindiName: rec.hindiName,
                            punjabiName: rec.punjabiName,
                          })}
                        </h2>
                      </div>
                      <div className="text-right">
                        <span className="font-mono tabular-nums text-lg font-bold text-[#143D2B]">
                          {rec.suitabilityScore}%
                        </span>
                        <p className="text-[10px] text-[#647068]">Fit</p>
                      </div>
                    </div>

                    <p className="text-xs text-[#525E57] leading-relaxed">
                      {rec.agronomyNote}
                    </p>

                    <ul className="space-y-1 text-xs text-[#3B4740]">
                      {rec.reasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#228B4E] shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EEF0EC] text-xs">
                      <div>
                        <p className="text-[#647068]">{t('crops.estYield')}</p>
                        <p className="font-mono tabular-nums font-semibold text-[#1C231F]">
                          {rec.estimatedTotalYieldQuintals.min}–
                          {rec.estimatedTotalYieldQuintals.max} qtl
                        </p>
                      </div>
                      <div>
                        <p className="text-[#647068]">{t('crops.avgMandiPrice')}</p>
                        <p className="font-mono tabular-nums font-semibold text-[#1C231F]">
                          ₹{rec.avgMandiPriceInr.toLocaleString('en-IN')}/qtl
                        </p>
                      </div>
                      <div>
                        <p className="text-[#647068]">{t('crops.estRevenue')}</p>
                        <p className="font-mono tabular-nums font-semibold text-[#143D2B]">
                          ₹{rec.estimatedGrossRevenueInr.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#647068]">{t('crops.estMargin')}</p>
                        <p className="font-mono tabular-nums font-bold text-[#228B4E]">
                          ₹{rec.estimatedNetMarginInr.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EEF0EC] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCompare(rec.cropId)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-[#143D2B] text-white'
                          : 'bg-[#F1F2ED] text-[#3B4740] hover:bg-[#E4EAE2]'
                      }`}
                    >
                      {isSelected ? 'Comparing' : 'Compare'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateFarmContext({
                          cropId: rec.cropId,
                          soilType,
                          season,
                          state,
                          landAreaAcres,
                        });
                        onNavigate('finance');
                      }}
                      className="text-xs font-semibold text-[#143D2B] hover:underline whitespace-nowrap"
                    >
                      Model in AgriFinance →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side-by-Side Comparison Matrix */}
          {comparedCrops.length > 0 && (
            <div className="bg-white border border-[#E2E5DE] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E5DE] flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#1C231F]">
                  Side-by-Side Crop Comparison ({comparedCrops.length}/3)
                </h3>
                <span className="text-xs text-[#647068]">
                  Calculated for {landAreaAcres} {t('common.acres')}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E5DE] bg-[#F8F8F5] text-xs font-semibold text-[#525E57]">
                      <th className="py-3 px-6">Metric</th>
                      {comparedCrops.map((c) => (
                        <th key={c.cropId} className="py-3 px-6">
                          {c.cropName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF0EC]">
                    <tr>
                      <td className="py-3 px-6 text-[#525E57]">
                        {t('crops.suitabilityScore')}
                      </td>
                      {comparedCrops.map((c) => (
                        <td
                          key={c.cropId}
                          className="py-3 px-6 font-mono tabular-nums font-semibold text-[#143D2B]"
                        >
                          {c.suitabilityScore}/100 ({c.suitabilityTier})
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-6 text-[#525E57]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t('crops.duration')}</span>
                        </span>
                      </td>
                      {comparedCrops.map((c) => (
                        <td
                          key={c.cropId}
                          className="py-3 px-6 font-mono tabular-nums"
                        >
                          {c.durationDays} {t('common.days')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-6 text-[#525E57]">
                        <span className="inline-flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5" />
                          <span>{t('crops.waterNeed')}</span>
                        </span>
                      </td>
                      {comparedCrops.map((c) => (
                        <td key={c.cropId} className="py-3 px-6 text-xs">
                          {c.waterNeed}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-6 text-[#525E57]">
                        <span className="inline-flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{t('crops.storage')}</span>
                        </span>
                      </td>
                      {comparedCrops.map((c) => (
                        <td key={c.cropId} className="py-3 px-6 text-xs">
                          {c.storagePotential}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-6 text-[#525E57]">
                        {t('crops.estYield')}
                      </td>
                      {comparedCrops.map((c) => (
                        <td
                          key={c.cropId}
                          className="py-3 px-6 font-mono tabular-nums"
                        >
                          {c.estimatedTotalYieldQuintals.avg} qtl avg
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-6 text-[#525E57]">
                        {t('crops.estMargin')}
                      </td>
                      {comparedCrops.map((c) => (
                        <td
                          key={c.cropId}
                          className="py-3 px-6 font-mono tabular-nums font-bold text-[#228B4E]"
                        >
                          ₹{c.estimatedNetMarginInr.toLocaleString('en-IN')}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
