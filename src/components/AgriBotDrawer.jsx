import { useState } from 'react';
import { Bot, Send, X, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function AgriBotDrawer({ isOpen, onClose, guestContext }) {
  const { apiFetch, user } = useAuth();
  const { language, t } = useLanguage();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      source: 'system-welcome',
      text:
        language === 'hi'
          ? 'नमस्ते! मैं AgriBot हूँ। फसल चयन, मिट्टी उपयुक्तता, मंडी भाव या बेचने के सही समय के बारे में पूछें।'
          : language === 'pa'
          ? 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ AgriBot ਹਾਂ। ਫਸਲ ਦੀ ਚੋਣ, ਮਿੱਟੀ, ਮੰਡੀ ਭਾਅ ਜਾਂ ਵੇਚਣ ਦੇ ਸਹੀ ਸਮੇਂ ਬਾਰੇ ਪੁੱਛੋ।'
          : 'Hello, I am AgriBot. Ask me what crop suits your soil, where to get the best net mandi payout, or whether to sell now or hold.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts =
    language === 'hi'
      ? [
          'मेरी मिट्टी और मौसम के लिए कौन सी फसल सबसे अच्छी है?',
          'गेहूं अभी बेचें या 2 हफ्ते रोकें?',
          'सबसे अधिक शुद्ध लाभ देने वाली मंडी कौन सी है?',
        ]
      : language === 'pa'
      ? [
          'ਮੇਰੀ ਮਿੱਟੀ ਅਤੇ ਸੀਜ਼ਨ ਲਈ ਕਿਹੜੀ ਫਸਲ ਵਧੀਆ ਹੈ?',
          'ਕਣਕ ਹੁਣੇ ਵੇਚੀਏ ਜਾਂ 2 ਹਫ਼ਤੇ ਰੁਕੀਏ?',
          'ਸਭ ਤੋਂ ਵੱਧ ਸ਼ੁੱਧ ਕਮਾਈ ਵਾਲੀ ਮੰਡੀ ਕਿਹੜੀ ਹੈ?',
        ]
      : [
          'Which crop fits my soil and season best?',
          'Should I sell wheat now or hold for 14 days?',
          'Which nearby mandi gives the highest net payout?',
        ];

  const sendMessage = async (textToSend) => {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    const userMsg = { role: 'user', text: query };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/agribot', {
        method: 'POST',
        body: JSON.stringify({
          message: query,
          history: nextMessages.slice(-6),
          guestContext: guestContext || {},
          language,
        }),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply,
          source: res.source,
          modelUsed: res.modelUsed,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Unable to reach AgriBot service: ${err.message}`,
          source: 'error',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/35"
      role="dialog"
      aria-modal="true"
      aria-label="AgriBot Assistant"
    >
      <div className="w-full max-w-lg bg-white h-full flex flex-col border-l border-[#D7DDD6] shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 bg-[#143D2B] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#228B4E] flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold truncate">
                {t('agribot.title')}
              </h2>
              <p className="text-xs text-[#C7DDD0] truncate">
                {user?.profile
                  ? `${user.profile.locationName} · ${user.profile.soilType} · ${user.profile.landAreaAcres} ac`
                  : t('agribot.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AgriBot"
            className="p-1.5 rounded-lg text-[#C7DDD0] hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F8F8F5]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-[#143D2B] text-white'
                    : 'bg-white text-[#1C231F] border border-[#E2E5DE]'
                }`}
              >
                {msg.text}
              </div>
              {msg.role === 'assistant' &&
                msg.source &&
                msg.source !== 'system-welcome' && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#647068]">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>
                      {msg.source === 'gemini-ai'
                        ? t('agribot.geminiBadge')
                        : t('agribot.fallbackBadge')}
                    </span>
                  </div>
                )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="bg-white border border-[#E2E5DE] rounded-xl px-4 py-3 text-xs text-[#647068]">
                Analyzing farm profile and mandi datasets...
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2.5 bg-white border-t border-[#E2E5DE] flex gap-2 overflow-x-auto">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendMessage(qp)}
              className="px-3 py-1.5 text-xs font-medium text-[#143D2B] bg-[#F1F2ED] hover:bg-[#E4EAE2] rounded-lg whitespace-nowrap shrink-0 transition-colors"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-4 bg-white border-t border-[#E2E5DE] flex items-center gap-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('agribot.placeholder')}
            className="flex-1 px-3.5 py-2.5 text-sm border border-[#CFD6CE] rounded-lg focus:outline-none focus:border-[#143D2B]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-[#143D2B] hover:bg-[#1B523A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{t('agribot.send')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
