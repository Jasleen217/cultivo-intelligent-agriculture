import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Bot,
  Check,
  Edit3,
  LogOut,
  Plus,
  Trash2,
  Bookmark,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import PriceTrendChart from './PriceTrendChart.jsx';

export default function DashboardView({
  meta,
  onOpenAuth,
  onOpenAgriBot,
  onNavigate,
}) {
  const { isAuthenticated, user, setUser, apiFetch, logout } = useAuth();
  const { t, getLocalizedCropName } = useLanguage();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(null);

  const [alertCropId, setAlertCropId] = useState('wheat');
  const [alertCondition, setAlertCondition] = useState('above');
  const [alertTargetPrice, setAlertTargetPrice] = useState('2500');

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/farmer/dashboard');
      setDashboard(data);
      setUser(data.user);
      setProfileForm(data.user.profile);
      setAlertCropId(data.user.profile.primaryCrop || 'wheat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, apiFetch, setUser]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-[#E2E5DE] rounded-2xl p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#EDF5F0] text-[#143D2B] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h1 className="font-display text-2xl font-bold text-[#143D2B]">
              Farmer Dashboard
            </h1>
            <p className="text-sm text-[#525E57]">
              Sign in with your mobile number to save your farm profile, set mandi price threshold alerts, save market comparisons, and view personalized selling insights.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-5 py-2.5 bg-[#143D2B] hover:bg-[#1B523A] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {t('nav.login')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="px-5 py-2.5 bg-[#F1F2ED] hover:bg-[#E4EAE2] text-[#1C231F] text-sm font-semibold rounded-lg transition-colors"
            >
              Explore Public Market
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/farmer/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      setUser(res.user);
      setEditingProfile(false);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddAlert = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/farmer/alerts', {
        method: 'POST',
        body: JSON.stringify({
          cropId: alertCropId,
          condition: alertCondition,
          targetPrice: Number(alertTargetPrice),
        }),
      });
      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                priceAlerts: res.priceAlerts,
                notifications: res.notifications,
              },
            }
          : prev
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAlert = async (id) => {
    const res = await apiFetch(`/api/farmer/alerts/${id}`, {
      method: 'DELETE',
    });
    setDashboard((prev) =>
      prev ? { ...prev, user: { ...prev.user, priceAlerts: res.priceAlerts } } : prev
    );
  };

  const handleMarkRead = async (id) => {
    const res = await apiFetch(`/api/farmer/notifications/${id}/read`, {
      method: 'POST',
    });
    setDashboard((prev) =>
      prev
        ? { ...prev, user: { ...prev.user, notifications: res.notifications } }
        : prev
    );
  };

  const handleTogglePref = async (key, value) => {
    const res = await apiFetch('/api/farmer/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ [key]: value }),
    });
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            user: {
              ...prev.user,
              notificationPreferences: res.notificationPreferences,
            },
          }
        : prev
    );
  };

  const handleDeleteComparison = async (id) => {
    const res = await apiFetch(`/api/farmer/comparisons/${id}`, {
      method: 'DELETE',
    });
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            user: { ...prev.user, savedComparisons: res.savedComparisons },
          }
        : prev
    );
  };

  const activeUser = dashboard?.user || user;
  const profile = activeUser?.profile;
  const unreadCount = (activeUser?.notifications || []).filter((n) => !n.read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Bar */}
      <div className="bg-white border border-[#E2E5DE] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#228B4E]">
            {profile?.locationName} · +91 {profile?.phone}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#143D2B]">
            {t('dashboard.welcome')}, {profile?.name}
          </h1>
          <p className="text-sm text-[#525E57]">
            {profile?.landAreaAcres} {t('common.acres')} · {profile?.soilType} Soil ·{' '}
            {profile?.season} Season · Primary Crop:{' '}
            <span className="font-semibold text-[#1C231F] capitalize">
              {profile?.primaryCrop}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenAgriBot}
            className="px-4 py-2.5 bg-[#143D2B] hover:bg-[#1B523A] text-white text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Bot className="w-4 h-4" />
            <span>{t('dashboard.openAgriBot')}</span>
          </button>

          <button
            type="button"
            onClick={() => setEditingProfile((prev) => !prev)}
            className="px-4 py-2.5 bg-[#F1F2ED] hover:bg-[#E4EAE2] text-[#143D2B] text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Edit3 className="w-4 h-4" />
            <span>{t('dashboard.editProfile')}</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="px-3.5 py-2.5 bg-white hover:bg-[#FEF2F2] border border-[#CFD6CE] text-[#525E57] hover:text-[#991B1B] text-xs sm:text-sm font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Edit Farm Profile Drawer/Panel */}
      {editingProfile && profileForm && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white border border-[#228B4E] rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-display text-base font-bold text-[#143D2B]">
            {t('dashboard.profileTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#525E57] mb-1">
                Name
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D7DDD6] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#525E57] mb-1">
                {t('hero.locationLabel')}
              </label>
              <select
                value={profileForm.locationId}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, locationId: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D7DDD6] rounded-lg"
              >
                {(meta?.locations || []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#525E57] mb-1">
                {t('hero.cropLabel')}
              </label>
              <select
                value={profileForm.primaryCrop}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, primaryCrop: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D7DDD6] rounded-lg"
              >
                {(meta?.crops || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {getLocalizedCropName(c)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#525E57] mb-1">
                {t('hero.soilLabel')}
              </label>
              <select
                value={profileForm.soilType}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, soilType: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D7DDD6] rounded-lg"
              >
                {(meta?.soilTypes || []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#525E57] mb-1">
                {t('hero.seasonLabel')}
              </label>
              <select
                value={profileForm.season}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, season: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#D7DDD6] rounded-lg"
              >
                {(meta?.seasons || []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#525E57] mb-1">
                {t('hero.areaLabel')}
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={profileForm.landAreaAcres}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    landAreaAcres: Number(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D7DDD6] rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditingProfile(false)}
              className="px-4 py-2 text-xs font-semibold text-[#525E57] bg-[#F1F2ED] rounded-lg"
            >
              {t('dashboard.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#143D2B] rounded-lg"
            >
              {t('dashboard.saveProfile')}
            </button>
          </div>
        </form>
      )}

      {loading && !dashboard ? (
        <div className="bg-white border border-[#E2E5DE] rounded-2xl p-8 text-sm text-[#647068]">
          {t('common.loading')}
        </div>
      ) : (
        dashboard && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 columns: Market Trend, Selling Insights, Crops, Saved Comparisons */}
            <div className="lg:col-span-8 space-y-6">
              {/* Personalized Market Intelligence */}
              {dashboard.marketIntelligence?.available && (
                <div className="bg-white border border-[#E2E5DE] rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#228B4E]">
                        {t('market.sellVsHold')}:{' '}
                        {dashboard.marketIntelligence.decision.recommendation}
                      </p>
                      <h2 className="font-display text-lg font-bold text-[#143D2B]">
                        {getLocalizedCropName(dashboard.marketIntelligence.crop)} —{' '}
                        {dashboard.marketIntelligence.selectedMandi.name}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="font-mono tabular-nums text-2xl font-bold text-[#143D2B]">
                        ₹
                        {dashboard.marketIntelligence.metrics.currentPrice.toLocaleString(
                          'en-IN'
                        )}
                        /qtl
                      </p>
                      <p className="text-xs font-mono tabular-nums text-[#647068]">
                        30d Est: ₹
                        {dashboard.marketIntelligence.metrics.projected30dPrice.toLocaleString(
                          'en-IN'
                        )}{' '}
                        (
                        {dashboard.marketIntelligence.metrics.projectedDeltaPct >=
                        0
                          ? '+'
                          : ''}
                        {dashboard.marketIntelligence.metrics.projectedDeltaPct}%)
                      </p>
                    </div>
                  </div>

                  <PriceTrendChart
                    historicalSeries={
                      dashboard.marketIntelligence.historicalSeries
                    }
                    forecastSeries={dashboard.marketIntelligence.forecastSeries}
                    mspPrice={
                      dashboard.marketIntelligence.crop.benchmarkMspInr
                    }
                  />

                  {dashboard.nearbyMandis?.mandis?.[0] && (
                    <div className="pt-4 border-t border-[#EEF0EC] flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div>
                        <span className="text-[#525E57]">
                          Top Net Mandi from {profile?.locationName}:{' '}
                        </span>
                        <span className="font-semibold text-[#143D2B]">
                          {dashboard.nearbyMandis.mandis[0].name}
                        </span>{' '}
                        <span className="font-mono tabular-nums text-xs text-[#647068]">
                          (~{dashboard.nearbyMandis.mandis[0].estimatedRoadKm}{' '}
                          km · Est. Net ₹
                          {dashboard.nearbyMandis.mandis[0].netPricePerQuintal}
                          /qtl)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('map')}
                        className="text-xs font-semibold text-[#228B4E] hover:underline"
                      >
                        Open AgriMap →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Personalized Crop Recommendations */}
              <div className="bg-white border border-[#E2E5DE] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#1C231F]">
                    Recommended Crops for {profile?.soilType} Soil ({profile?.season})
                  </h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('crops')}
                    className="text-xs font-semibold text-[#143D2B] hover:underline"
                  >
                    Full Advisor →
                  </button>
                </div>

                <div className="divide-y divide-[#EEF0EC]">
                  {(dashboard.cropRecommendations || []).map((rec) => (
                    <div
                      key={rec.cropId}
                      className="py-3 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-semibold text-sm text-[#1C231F]">
                          {rec.cropName}{' '}
                          <span className="text-xs font-normal text-[#647068]">
                            · {rec.suitabilityTier} ({rec.suitabilityScore}/100)
                          </span>
                        </p>
                        <p className="text-xs text-[#525E57]">
                          Est. Yield: {rec.estimatedTotalYieldQuintals.avg} qtl ·
                          Avg Rate: ₹{rec.avgMandiPriceInr.toLocaleString('en-IN')}
                          /qtl
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono tabular-nums text-sm font-bold text-[#228B4E]">
                          ₹{rec.estimatedNetMarginInr.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[11px] text-[#647068]">
                          Est. Net Margin
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved Market Comparisons */}
              <div className="bg-white border border-[#E2E5DE] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[#143D2B]" />
                    <h2 className="font-display text-base font-bold text-[#1C231F]">
                      {t('dashboard.savedComparisonsTitle')}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('map')}
                    className="text-xs font-semibold text-[#143D2B] hover:underline"
                  >
                    New Comparison →
                  </button>
                </div>

                {(activeUser?.savedComparisons || []).length === 0 ? (
                  <p className="text-sm text-[#647068]">
                    No saved market comparisons yet. Open AgriMap and click “Save Comparison” on any mandi.
                  </p>
                ) : (
                  <div className="divide-y divide-[#EEF0EC]">
                    {activeUser.savedComparisons.map((cmp) => (
                      <div
                        key={cmp.id}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#1C231F]">
                            {cmp.bestMandiName} ({cmp.cropName})
                          </p>
                          <p className="text-xs text-[#647068] font-mono tabular-nums">
                            From {cmp.originName} (~{cmp.estimatedRoadKm} km) ·{' '}
                            {cmp.quantityQuintals} qtl · Net ₹
                            {cmp.netPricePerQuintal}/qtl
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteComparison(cmp.id)}
                          aria-label="Remove saved comparison"
                          className="p-1.5 text-[#647068] hover:text-[#DC2626] rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 columns: Notification Centre & Price Alerts */}
            <div className="lg:col-span-4 space-y-6">
              {/* Notification Centre */}
              <div className="bg-white border border-[#E2E5DE] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#143D2B]" />
                    <h2 className="font-display text-base font-bold text-[#1C231F]">
                      {t('dashboard.notificationsTitle')} ({unreadCount})
                    </h2>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead('all')}
                      className="text-xs font-semibold text-[#228B4E] hover:underline"
                    >
                      {t('dashboard.markAllRead')}
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {(activeUser?.notifications || []).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        n.read
                          ? 'bg-[#F8F8F5] border-[#EEF0EC] text-[#525E57]'
                          : 'bg-[#EDF5F0] border-[#BBF7D0] text-[#1C231F]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[#143D2B]">{n.title}</p>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            aria-label="Mark read"
                            className="text-[#143D2B] hover:text-[#228B4E]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Threshold Alerts */}
              <div className="bg-white border border-[#E2E5DE] rounded-2xl p-5 space-y-4">
                <h2 className="font-display text-base font-bold text-[#1C231F]">
                  {t('dashboard.alertsTitle')}
                </h2>

                <form onSubmit={handleAddAlert} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <select
                      value={alertCropId}
                      onChange={(e) => setAlertCropId(e.target.value)}
                      className="px-2.5 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg"
                    >
                      {(meta?.crops || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={alertCondition}
                      onChange={(e) => setAlertCondition(e.target.value)}
                      className="px-2.5 py-2 text-xs bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg"
                    >
                      <option value="above">
                        {t('dashboard.conditionAbove')}
                      </option>
                      <option value="below">
                        {t('dashboard.conditionBelow')}
                      </option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={alertTargetPrice}
                      onChange={(e) => setAlertTargetPrice(e.target.value)}
                      placeholder={t('dashboard.targetPrice')}
                      className="flex-1 px-3 py-2 text-xs font-mono tabular-nums bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-[#143D2B] hover:bg-[#1B523A] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('dashboard.addAlert')}</span>
                    </button>
                  </div>
                </form>

                <div className="divide-y divide-[#EEF0EC]">
                  {(activeUser?.priceAlerts || []).map((alert) => (
                    <div
                      key={alert.id}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold capitalize text-[#1C231F]">
                          {alert.cropId}
                        </span>{' '}
                        <span className="text-[#525E57]">
                          {alert.condition === 'below' ? '≤' : '≥'}
                        </span>{' '}
                        <span className="font-mono tabular-nums font-semibold text-[#143D2B]">
                          ₹{alert.targetPrice.toLocaleString('en-IN')}/qtl
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAlert(alert.id)}
                        aria-label="Delete price alert"
                        className="p-1 text-[#647068] hover:text-[#DC2626]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white border border-[#E2E5DE] rounded-2xl p-5 space-y-3">
                <h2 className="font-display text-sm font-bold text-[#1C231F]">
                  {t('dashboard.prefsTitle')}
                </h2>
                {[
                  { key: 'priceAlerts', label: 'Price threshold alerts' },
                  { key: 'sellingSignals', label: 'Sell-vs-hold market updates' },
                  { key: 'cropUpdates', label: 'Seasonal crop recommendations' },
                ].map((pref) => (
                  <label
                    key={pref.key}
                    className="flex items-center justify-between text-xs text-[#3B4740] cursor-pointer py-1"
                  >
                    <span>{pref.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(
                        activeUser?.notificationPreferences?.[pref.key]
                      )}
                      onChange={(e) =>
                        handleTogglePref(pref.key, e.target.checked)
                      }
                      className="w-4 h-4 accent-[#143D2B]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
