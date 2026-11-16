import { useState } from 'react';
import { Phone, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const { apiFetch, completeLogin } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [devNotice, setDevNotice] = useState(null);
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setIsExisting(res.isExistingUser);
      setDevNotice({
        code: res.devOtp,
        notice: res.notice,
      });
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp, name }),
      });
      completeLogin(res.token, res.user);
      setStep('phone');
      setOtp('');
      setDevNotice(null);
      if (onSuccess) onSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#D7DDD6] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E5DE] bg-[#F8F8F5]">
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-[#143D2B]" />
            <h2
              id="auth-modal-title"
              className="font-display text-base font-bold text-[#1C231F]"
            >
              {t('auth.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#647068] hover:text-[#1C231F] hover:bg-[#E8ECE6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-[#525E57] leading-relaxed">{t('auth.subtitle')}</p>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3B4740] mb-1.5">
                  {t('auth.phoneLabel')}
                </label>
                <div className="flex items-center border border-[#CFD6CE] rounded-lg bg-white focus-within:border-[#143D2B] focus-within:ring-1 focus-within:ring-[#143D2B]">
                  <span className="px-3 py-2.5 text-sm font-mono text-[#525E57] border-r border-[#E2E5DE] bg-[#F8F8F5] rounded-l-lg">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full px-3 py-2.5 text-sm font-mono tabular-nums text-[#1C231F] bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full py-2.5 px-4 bg-[#143D2B] hover:bg-[#1B523A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {loading ? t('common.loading') : t('auth.sendOtp')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {devNotice && (
                <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#92400E]">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{t('auth.devOtpNotice')}</span>
                  </div>
                  <p className="text-xs text-[#78350F] leading-relaxed">{devNotice.notice}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#92400E]">Development OTP:</span>
                    <button
                      type="button"
                      onClick={() => setOtp(devNotice.code)}
                      className="font-mono text-sm font-bold tracking-widest text-[#143D2B] bg-white px-2.5 py-1 rounded border border-[#FCD34D] hover:bg-[#FEF3C7]"
                    >
                      {devNotice.code}
                    </button>
                  </div>
                </div>
              )}

              {!isExisting && (
                <div>
                  <label className="block text-xs font-semibold text-[#3B4740] mb-1.5">
                    {t('auth.nameLabel')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Gurpreet Singh"
                    className="w-full px-3 py-2.5 text-sm border border-[#CFD6CE] rounded-lg focus:outline-none focus:border-[#143D2B]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#3B4740] mb-1.5">
                  {t('auth.otpLabel')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit OTP"
                  className="w-full px-3 py-2.5 text-sm font-mono tracking-widest tabular-nums border border-[#CFD6CE] rounded-lg focus:outline-none focus:border-[#143D2B]"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setError('');
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-[#525E57] bg-[#F1F2ED] hover:bg-[#E5E8E2] rounded-lg transition-colors whitespace-nowrap"
                >
                  {t('auth.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 py-2.5 px-4 bg-[#143D2B] hover:bg-[#1B523A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {loading ? t('common.loading') : t('auth.verifyOtp')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
