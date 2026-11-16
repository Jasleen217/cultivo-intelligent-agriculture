import { useEffect, useState } from 'react';
import { ArrowRight, Sprout, TrendingUp, TrendingDown, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import PriceTrendChart from './PriceTrendChart.jsx';

const HERO_IMAGE = '/src/assets/images/hero_cultivo_field_1794772574723.jpg';
const HARVEST_IMAGE = '/src/assets/images/feature_mandi_harvest_1794772575513.jpg';
const FARMER_AVATAR = '/src/assets/images/avatar_farmer_profile_1794772575001.jpg';

export default function HomeView({
  meta,
  farmContext,
  onUpdateFarmContext,
  onNavigate,
  onOpenAuth,
}) {
  const { t, getLocalizedCropName } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [selectedCrop, setSelectedCrop] = useState(farmContext.cropId || 'wheat');
  const [selectedMandi, setSelectedMandi] = useState('');
  const [marketData, setMarketData] = useState(null);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [marketError, setMarketError] = useState('');

  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [harvestImgFailed, setHarvestImgFailed] = useState(false);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  const loadMarketData = async (cropId, mandiId) => {
    setLoadingMarket(true);
    setMarketError('');
    try {
      const params = new URLSearchParams({ cropId });
      if (mandiId) params.set('mandiId', mandiId);
      const res = await fetch(`/api/market-intelligence?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load market data');
      setMarketData(json);
    } catch (err) {
      setMarketError(err.message);
    } finally {
      setLoadingMarket(false);
    }
  };

  useEffect(() => {
    loadMarketData(selectedCrop, selectedMandi);
  }, [selectedCrop, selectedMandi]);

  const handleQuickAnalyze = (e) => {
    e.preventDefault();
    setSelectedCrop(farmContext.cropId);
    setSelectedMandi('');
    onNavigate('crops');
  };

  const selectedLocObj = meta?.locations?.find(
    (l) => l.id === farmContext.locationId
  );

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section: Balanced 2-Column Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-wide text-[#228B4E]">
                {t('hero.kicker')}
              </p>
              <h1
                className="font-display font-extrabold tracking-tight text-[#143D2B] leading-[1.08]"
                style={{ fontSize: 'clamp(2.15rem, 3.8vw, 3.35rem)', textWrap: 'balance' }}
              >
                {t('hero.title')}
              </h1>
              <p className="text-base text-[#4C5851] leading-relaxed max-w-xl">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#public-market"
                  className="px-5 py-2.5 bg-[#143D2B] hover:bg-[#1B523A] text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t('hero.ctaPrimary')}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() =>
                    isAuthenticated ? onNavigate('dashboard') : onOpenAuth()
                  }
                  className="px-5 py-2.5 bg-white hover:bg-[#F1F2ED] text-[#143D2B] border border-[#CFD6CE] text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {t('hero.ctaSecondary')}
                </button>
              </div>
            </div>

            {/* Quick Farm Decision Inputs (Public, No Login Required) */}
            <form
              onSubmit={handleQuickAnalyze}
              className="bg-white border border-[#E2E5DE] rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#1C231F]">
                  {t('hero.quickCheckTitle')}
                </h2>
                <span className="text-xs text-[#647068]">
                  {selectedLocObj ? selectedLocObj.state : farmContext.state}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#525E57] mb-1">
                    {t('hero.locationLabel')}
                  </label>
                  <select
                    value={farmContext.locationId}
                    onChange={(e) => {
                      const loc = meta?.locations?.find(
                        (l) => l.id === e.target.value
                      );
                      onUpdateFarmContext({
                        locationId: e.target.value,
                        state: loc ? loc.state : farmContext.state,
                      });
                    }}
                    className="w-full px-2.5 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
                  >
                    {(meta?.locations || []).map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#525E57] mb-1">
                    {t('hero.cropLabel')}
                  </label>
                  <select
                    value={farmContext.cropId}
                    onChange={(e) => {
                      onUpdateFarmContext({ cropId: e.target.value });
                      setSelectedCrop(e.target.value);
                      setSelectedMandi('');
                    }}
                    className="w-full px-2.5 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
                  >
                    {(meta?.crops || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {getLocalizedCropName(c)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#525E57] mb-1">
                    {t('hero.soilLabel')}
                  </label>
                  <select
                    value={farmContext.soilType}
                    onChange={(e) =>
                      onUpdateFarmContext({ soilType: e.target.value })
                    }
                    className="w-full px-2.5 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
                  >
                    {(meta?.soilTypes || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#525E57] mb-1">
                    {t('hero.seasonLabel')}
                  </label>
                  <select
                    value={farmContext.season}
                    onChange={(e) =>
                      onUpdateFarmContext({ season: e.target.value })
                    }
                    className="w-full px-2.5 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
                  >
                    {(meta?.seasons || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#525E57] mb-1">
                    {t('hero.areaLabel')}
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={farmContext.landAreaAcres}
                    onChange={(e) =>
                      onUpdateFarmContext({
                        landAreaAcres: Math.max(0.5, Number(e.target.value) || 1),
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-[#228B4E] hover:bg-[#1B703E] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    {t('hero.runAnalysis')}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Editorial Field Photography */}
          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-96 lg:h-full min-h-[360px] rounded-2xl overflow-hidden border border-[#D7DDD6] bg-[#143D2B]">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE}
                  alt="Irrigated wheat and mustard farmland in golden-hour morning light"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-white bg-gradient-to-br from-[#143D2B] to-[#22593F]">
                  <Sprout className="w-12 h-12 text-[#86EFAC] mb-3" />
                  <p className="font-display text-lg font-bold">CULTIVO</p>
                  <p className="text-sm text-[#D1E7D8]">{t('tagline')}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-[#D1E7D8]">{t('tagline')}</p>
                  <p className="font-display text-lg font-bold">
                    Punjab · Haryana · UP · MP · Maharashtra · Rajasthan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('map')}
                  className="px-3.5 py-2 bg-white/95 hover:bg-white text-[#143D2B] text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('nav.map')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Proof Strip */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
            <p className="text-xs text-[#647068]">{t('metrics.mandisTracked')}</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#143D2B] mt-1">
              {meta?.mandiCount || 14} APMC
            </p>
          </div>
          <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
            <p className="text-xs text-[#647068]">{t('metrics.commoditiesCovered')}</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#143D2B] mt-1">
              {meta?.crops?.length || 10} Crops
            </p>
          </div>
          <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
            <p className="text-xs text-[#647068]">{t('metrics.historicalWindow')}</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#143D2B] mt-1">
              30 Days
            </p>
          </div>
          <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
            <p className="text-xs text-[#647068]">{t('metrics.languagesSupported')}</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#143D2B] mt-1">
              EN · हिं · ਪੰ
            </p>
          </div>
        </div>
      </section>

      {/* How It Works: Editorial 3-Step Workflow + Harvest Market Visual */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-[#E2E5DE] rounded-2xl p-6 sm:p-8">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#143D2B] tracking-tight">
                {t('howItWorks.heading')}
              </h2>
              <p className="text-sm text-[#525E57] max-w-2xl">
                {t('howItWorks.subheading')}
              </p>
            </div>

            <div className="divide-y divide-[#E2E5DE]">
              <div className="py-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-display text-base font-bold text-[#1C231F]">
                    {t('howItWorks.step1Title')}
                  </h3>
                  <p className="text-sm text-[#525E57]">{t('howItWorks.step1Desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('crops')}
                  className="text-xs font-semibold text-[#143D2B] hover:underline whitespace-nowrap shrink-0 mt-1"
                >
                  {t('nav.crops')} →
                </button>
              </div>

              <div className="py-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-display text-base font-bold text-[#1C231F]">
                    {t('howItWorks.step2Title')}
                  </h3>
                  <p className="text-sm text-[#525E57]">{t('howItWorks.step2Desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('map')}
                  className="text-xs font-semibold text-[#143D2B] hover:underline whitespace-nowrap shrink-0 mt-1"
                >
                  {t('nav.map')} →
                </button>
              </div>

              <div className="pt-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-display text-base font-bold text-[#1C231F]">
                    {t('howItWorks.step3Title')}
                  </h3>
                  <p className="text-sm text-[#525E57]">{t('howItWorks.step3Desc')}</p>
                </div>
                <a
                  href="#public-market"
                  className="text-xs font-semibold text-[#143D2B] hover:underline whitespace-nowrap shrink-0 mt-1"
                >
                  {t('nav.home')} →
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-64 lg:h-full min-h-[260px] rounded-xl overflow-hidden border border-[#E2E5DE] bg-[#F1F2ED]">
              {!harvestImgFailed ? (
                <img
                  src={HARVEST_IMAGE}
                  alt="Sorted wheat grain sacks weighed at a modern agricultural market yard"
                  referrerPolicy="no-referrer"
                  onError={() => setHarvestImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6 text-sm text-[#525E57]">
                  APMC Mandi Harvest Exchange
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live Public Market Intelligence Section */}
      <section
        id="public-market"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#143D2B] tracking-tight">
              {t('market.heading')}
            </h2>
            <p className="text-sm text-[#525E57]">{t('market.subheading')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#525E57] mb-1">
                {t('market.selectCrop')}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => {
                  setSelectedCrop(e.target.value);
                  setSelectedMandi('');
                }}
                className="px-3 py-2 text-sm bg-white border border-[#CFD6CE] rounded-lg focus:outline-none focus:border-[#143D2B]"
              >
                {(meta?.crops || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {getLocalizedCropName(c)}
                  </option>
                ))}
              </select>
            </div>

            {marketData?.mandiComparison?.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-[#525E57] mb-1">
                  {t('market.selectMandi')}
                </label>
                <select
                  value={marketData.selectedMandi.id}
                  onChange={(e) => setSelectedMandi(e.target.value)}
                  className="px-3 py-2 text-sm bg-white border border-[#CFD6CE] rounded-lg focus:outline-none focus:border-[#143D2B]"
                >
                  {marketData.mandiComparison.map((m) => (
                    <option key={m.mandiId} value={m.mandiId}>
                      {m.mandiName} ({m.state})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {loadingMarket && (
          <div className="bg-white border border-[#E2E5DE] rounded-2xl p-8 text-sm text-[#647068]">
            {t('common.loading')}
          </div>
        )}

        {!loadingMarket && marketError && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-6 flex items-center justify-between gap-4">
            <p className="text-sm text-[#991B1B]">{marketError}</p>
            <button
              type="button"
              onClick={() => loadMarketData(selectedCrop, selectedMandi)}
              className="px-4 py-2 text-xs font-semibold bg-white border border-[#FECACA] text-[#991B1B] rounded-lg"
            >
              {t('common.errorRetry')}
            </button>
          </div>
        )}

        {!loadingMarket && !marketError && marketData?.available && (
          <div className="space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
                <p className="text-xs text-[#647068]">{t('market.currentPrice')}</p>
                <p className="font-mono tabular-nums text-2xl font-bold text-[#143D2B] mt-1">
                  ₹{marketData.metrics.currentPrice.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-[#647068] mt-0.5">
                  {marketData.selectedMandi.name}
                </p>
              </div>

              <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
                <p className="text-xs text-[#647068]">{t('market.change7d')}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {marketData.metrics.change7dPct >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-[#DC2626]" />
                  )}
                  <p
                    className={`font-mono tabular-nums text-xl font-bold ${
                      marketData.metrics.change7dPct >= 0
                        ? 'text-[#16A34A]'
                        : 'text-[#DC2626]'
                    }`}
                  >
                    {marketData.metrics.change7dPct >= 0 ? '+' : ''}
                    {marketData.metrics.change7dPct}%
                  </p>
                </div>
                <p className="text-[11px] text-[#647068] font-mono tabular-nums mt-0.5">
                  {marketData.metrics.change7dInr >= 0 ? '+' : ''}₹
                  {marketData.metrics.change7dInr}/qtl
                </p>
              </div>

              <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
                <p className="text-xs text-[#647068]">{t('market.change30d')}</p>
                <p
                  className={`font-mono tabular-nums text-xl font-bold mt-1 ${
                    marketData.metrics.change30dPct >= 0
                      ? 'text-[#16A34A]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {marketData.metrics.change30dPct >= 0 ? '+' : ''}
                  {marketData.metrics.change30dPct}%
                </p>
                <p className="text-[11px] text-[#647068] font-mono tabular-nums mt-0.5">
                  {marketData.metrics.change30dInr >= 0 ? '+' : ''}₹
                  {marketData.metrics.change30dInr}/qtl
                </p>
              </div>

              <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
                <p className="text-xs text-[#647068]">{t('market.forecast30d')}</p>
                <p className="font-mono tabular-nums text-xl font-bold text-[#1C231F] mt-1">
                  ₹{marketData.metrics.projected30dPrice.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-[#647068] font-mono tabular-nums mt-0.5">
                  Est. {marketData.metrics.projectedDeltaPct >= 0 ? '+' : ''}
                  {marketData.metrics.projectedDeltaPct}%
                </p>
              </div>

              <div className="bg-white border border-[#E2E5DE] rounded-xl p-4 col-span-2 lg:col-span-1">
                <p className="text-xs text-[#647068]">{t('market.mspSpread')}</p>
                <p
                  className={`font-mono tabular-nums text-xl font-bold mt-1 ${
                    marketData.metrics.spreadVsMsp >= 0
                      ? 'text-[#143D2B]'
                      : 'text-[#B45309]'
                  }`}
                >
                  {marketData.metrics.spreadVsMsp >= 0 ? '+' : ''}₹
                  {marketData.metrics.spreadVsMsp.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-[#647068] font-mono tabular-nums mt-0.5">
                  MSP ₹{marketData.crop.benchmarkMspInr.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Chart + Sell-vs-Hold Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white border border-[#E2E5DE] rounded-2xl p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="font-display text-base font-bold text-[#1C231F]">
                    {getLocalizedCropName(marketData.crop)} —{' '}
                    {marketData.selectedMandi.name}
                  </h3>
                  <span className="text-xs text-[#647068]">
                    {marketData.selectedMandi.district}, {marketData.selectedMandi.state}
                  </span>
                </div>
                <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-3">
  Demo data: Mandi prices are sample values and are not verified live market rates.
</p>
                <PriceTrendChart
                  historicalSeries={marketData.historicalSeries}
                  forecastSeries={marketData.forecastSeries}
                  mspPrice={marketData.crop.benchmarkMspInr}
                />
              </div>

              <div className="lg:col-span-4 bg-white border border-[#E2E5DE] rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-[#647068]">
                    {t('market.sellVsHold')}
                  </p>
                  <h3 className="font-display text-xl font-bold text-[#143D2B]">
                    {marketData.decision.recommendation}
                  </h3>
                  <ul className="space-y-2.5 text-sm text-[#3B4740]">
                    {marketData.decision.rationale.map((item, i) => (
                      <li key={i} className="leading-relaxed flex gap-2">
                        <span className="text-[#228B4E] font-bold">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-[#E2E5DE] space-y-3">
                  <p className="text-[11px] text-[#647068] leading-relaxed">
                    {marketData.decision.methodologyNote}
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('map')}
                    className="w-full py-2.5 px-4 bg-[#143D2B] hover:bg-[#1B523A] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Compare Transport & Net Payout on AgriMap
                  </button>
                </div>
              </div>
            </div>

            {/* Cross-Mandi Comparison Table */}
            <div className="bg-white border border-[#E2E5DE] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E5DE] flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#1C231F]">
                  {t('market.tableTitle')}
                </h3>
                <span className="text-xs text-[#647068]">
                  {marketData.mandiComparison.length} active mandis
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E5DE] bg-[#F8F8F5] text-xs font-semibold text-[#525E57]">
                      <th className="py-3 px-6">{t('market.mandiCol')}</th>
                      <th className="py-3 px-6 text-right">{t('market.arrivalsCol')}</th>
                      <th className="py-3 px-6 text-right">{t('market.priceCol')}</th>
                      <th className="py-3 px-6 text-right">{t('market.vsMspCol')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF0EC] text-sm">
                    {marketData.mandiComparison.map((row) => (
                      <tr
                        key={row.mandiId}
                        onClick={() => setSelectedMandi(row.mandiId)}
                        className={`cursor-pointer transition-colors hover:bg-[#F8F8F5] ${
                          row.mandiId === marketData.selectedMandi.id
                            ? 'bg-[#EDF5F0]'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-6">
                          <span className="font-semibold text-[#1C231F]">
                            {row.mandiName}
                          </span>
                          <span className="text-xs text-[#647068] ml-2">
                            {row.district}, {row.state}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right font-mono tabular-nums text-[#525E57]">
                          {row.arrivalsTonnes.toLocaleString('en-IN')} t
                        </td>
                        <td className="py-3 px-6 text-right font-mono tabular-nums font-semibold text-[#143D2B]">
                          ₹{row.currentPrice.toLocaleString('en-IN')}/qtl
                        </td>
                        <td
                          className={`py-3 px-6 text-right font-mono tabular-nums font-medium ${
                            row.spreadVsMsp >= 0
                              ? 'text-[#16A34A]'
                              : 'text-[#B45309]'
                          }`}
                        >
                          {row.spreadVsMsp >= 0 ? '+' : ''}₹
                          {row.spreadVsMsp.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Farmer Field Proof / Testimonial */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E2E5DE] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-[#D7DDD6] shrink-0 bg-[#EDF5F0]">
            {!avatarImgFailed ? (
              <img
                src={FARMER_AVATAR}
                alt="Harjit Singh Gill, Wheat and Basmati Grower in Ludhiana"
                referrerPolicy="no-referrer"
                onError={() => setAvatarImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display font-bold text-[#143D2B]">
                HG
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm sm:text-base text-[#1C231F] leading-relaxed">
              “Before Cultivo, we always sold at the nearest gate without checking freight vs. mandi price spreads. Last Rabi season, comparing Ludhiana Gill Road against Khanna Grain Market showed ₹45/qtl higher gross rate—after subtracting ₹19/qtl diesel cost, we netted ₹26/qtl extra across 160 quintals.”
            </p>
            <div className="text-xs text-[#647068]">
              <span className="font-semibold text-[#143D2B]">Harjit Singh Gill</span>
              <span className="mx-1.5">·</span>
              <span>8-Acre Wheat & Basmati Grower, Jagraon Block, Ludhiana</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
