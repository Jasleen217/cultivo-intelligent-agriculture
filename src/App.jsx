import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { useLanguage } from './context/LanguageContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Navbar, { CultivoLogo } from './components/Navbar.jsx';
import HomeView from './components/HomeView.jsx';
import AgriMapView from './components/AgriMapView.jsx';
import CropAdvisorView from './components/CropAdvisorView.jsx';
import AgriFinanceView from './components/AgriFinanceView.jsx';
import DashboardView from './components/DashboardView.jsx';
import AuthModal from './components/AuthModal.jsx';
import AgriBotDrawer from './components/AgriBotDrawer.jsx';

export default function App() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('home');
  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [agriBotOpen, setAgriBotOpen] = useState(false);

  const [farmContext, setFarmContext] = useState({
    locationId: 'loc-ludhiana',
    state: 'Punjab',
    cropId: 'wheat',
    soilType: 'Alluvial',
    season: 'Rabi',
    landAreaAcres: 5,
  });

  useEffect(() => {
    fetch('/api/meta')
      .then((res) => res.json())
      .then((data) => setMeta(data))
      .catch(() => setMetaError('Unable to load reference datasets.'));
  }, []);

  useEffect(() => {
    if (user?.profile) {
      setFarmContext((prev) => ({
        ...prev,
        locationId: user.profile.locationId || prev.locationId,
        state: user.profile.state || prev.state,
        cropId: user.profile.primaryCrop || prev.cropId,
        soilType: user.profile.soilType || prev.soilType,
        season: user.profile.season || prev.season,
        landAreaAcres: user.profile.landAreaAcres || prev.landAreaAcres,
      }));
    }
  }, [user]);

  const updateFarmContext = (patch) => {
    setFarmContext((prev) => ({ ...prev, ...patch }));
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F5] text-[#1C231F]">
      <Navbar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {metaError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
            {metaError}
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeView
            meta={meta}
            farmContext={farmContext}
            onUpdateFarmContext={updateFarmContext}
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'map' && (
          <AgriMapView
            meta={meta}
            farmContext={farmContext}
            onUpdateFarmContext={updateFarmContext}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'crops' && (
          <CropAdvisorView
            meta={meta}
            farmContext={farmContext}
            onUpdateFarmContext={updateFarmContext}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'finance' && (
          <AgriFinanceView meta={meta} farmContext={farmContext} />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            meta={meta}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenAgriBot={() => setAgriBotOpen(true)}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#E2E5DE] bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CultivoLogo className="w-6 h-6" />
            <div>
              <p className="font-display text-sm font-bold text-[#143D2B]">
                CULTIVO
              </p>
              <p className="text-xs text-[#647068]">{t('tagline')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#525E57]">
            <button
              type="button"
              onClick={() => handleNavigate('home')}
              className="hover:text-[#143D2B]"
            >
              {t('nav.home')}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('map')}
              className="hover:text-[#143D2B]"
            >
              {t('nav.map')}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('crops')}
              className="hover:text-[#143D2B]"
            >
              {t('nav.crops')}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('finance')}
              className="hover:text-[#143D2B]"
            >
              {t('nav.finance')}
            </button>
            <button
              type="button"
              onClick={() => setAgriBotOpen(true)}
              className="font-semibold text-[#143D2B] hover:underline"
            >
              AgriBot
            </button>
          </div>
        </div>
      </footer>

      {/* AgriBot Quick Launcher */}
      <button
        type="button"
        onClick={() => setAgriBotOpen(true)}
        aria-label="Open AgriBot"
        className="fixed bottom-5 right-5 z-40 px-4 py-2.5 bg-[#143D2B] hover:bg-[#1B523A] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg inline-flex items-center gap-2 transition-colors"
      >
        <Bot className="w-4 h-4 text-[#4ADE80]" />
        <span>AgriBot</span>
      </button>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => handleNavigate('dashboard')}
      />

      <AgriBotDrawer
        isOpen={agriBotOpen}
        onClose={() => setAgriBotOpen(false)}
        guestContext={{
          ...farmContext,
          primaryCrop: farmContext.cropId,
        }}
      />
    </div>
  );
}
