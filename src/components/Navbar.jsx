import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function CultivoLogo({ className = 'w-6 h-6' }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="#143D2B" />
      <path
        d="M9 21.5C9 15.2 13.8 10 22 9.5C21.5 17.5 16.5 22 10.5 22"
        stroke="#4ADE80"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 22L16.5 15.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Navbar({ activeTab, onNavigate, onOpenAuth }) {
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'home', label: t('nav.home') },
    { id: 'map', label: t('nav.map') },
    { id: 'crops', label: t('nav.crops') },
    { id: 'finance', label: t('nav.finance') },
    { id: 'dashboard', label: t('nav.dashboard') },
  ];

  const handleSelect = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F8F8F5]/95 backdrop-blur-sm border-b border-[#E2E5DE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Mark */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143D2B] rounded-md"
        >
          <CultivoLogo className="w-7 h-7 shrink-0" />
          <span className="font-display text-lg font-extrabold tracking-tight text-[#143D2B] whitespace-nowrap shrink-0">
            {t('brand')}
          </span>
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143D2B] rounded-sm ${
                  isActive
                    ? 'text-[#143D2B] font-semibold'
                    : 'text-[#525E57] hover:text-[#143D2B]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-[#228B4E] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Language Selector + 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            role="group"
            aria-label="Language"
            className="hidden sm:flex items-center border border-[#D7DDD6] rounded-lg bg-white p-0.5"
          >
            {[
              { code: 'en', label: 'EN' },
              { code: 'hi', label: 'हिं' },
              { code: 'pa', label: 'ਪੰ' },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  language === lang.code
                    ? 'bg-[#143D2B] text-white'
                    : 'text-[#525E57] hover:text-[#143D2B]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => handleSelect('dashboard')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#143D2B] hover:bg-[#1B523A] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {user?.profile?.name ? user.profile.name.split(' ')[0] : t('nav.myFarm')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#143D2B] hover:bg-[#1B523A] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {t('nav.login')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle Menu"
            className="md:hidden p-2 rounded-lg border border-[#D7DDD6] bg-white text-[#1C231F]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E2E5DE] bg-white px-4 py-3 space-y-2">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === item.id
                    ? 'bg-[#EDF5F0] text-[#143D2B] font-semibold'
                    : 'text-[#525E57] hover:bg-[#F8F8F5]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-2 border-t border-[#E2E5DE] flex items-center justify-between">
            <span className="text-xs text-[#647068]">Language</span>
            <div className="flex items-center gap-1">
              {[
                { code: 'en', label: 'EN' },
                { code: 'hi', label: 'हिंदी' },
                { code: 'pa', label: 'ਪੰਜਾਬੀ' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                    language === lang.code
                      ? 'bg-[#143D2B] text-white'
                      : 'bg-[#F1F2ED] text-[#525E57]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
