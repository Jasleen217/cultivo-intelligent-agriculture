# CULTIVO — Intelligent Agriculture & Market Decision Platform

**Grow Smarter. Harvest Better.**

CULTIVO is a full-stack agricultural decision-support platform designed to help farmers answer three critical questions with transparent, data-backed clarity:

1. **What should I grow?** (Soil, season, state, and yield suitability intelligence)
2. **Where should I sell?** (Interactive Leaflet + OpenStreetMap mandi map with transport-adjusted net payouts)
3. **When should I sell?** (30-day historical price trends, arrival context, 30-day model estimates, and sell-versus-hold guidance)

---

## Key Features

- **Hybrid Access Model**
  - **Public Access (No Login Required):** Explore mandi prices, search commodities, view 30-day price trend charts, run Crop Intelligence recommendations, calculate farm profitability in AgriFinance, and compare nearby markets on AgriMap.
  - **Registered Farmer Access:** Phone-number sign-in with OTP verification, saved farm profile, personalized dashboard, saved mandi comparisons, price threshold alerts, Notification Centre, and personalized AgriBot context.
- **AgriMap (Leaflet + OpenStreetMap):** Interactive geospatial mandi explorer using genuine APMC coordinates, road-distance estimation (`1.18x` Haversine), freight & handling deduction, net realization ranking, and OpenStreetMap turn-by-turn directions links.
- **Crop Intelligence (`recommendationEngine.js`):** Evaluates soil type, sowing season, state, and land area against crop yield benchmarks and current mandi rates, with side-by-side 3-crop comparison.
- **Market Intelligence (`predictionEngine.js`):** Clearly separates observed historical prices, current APMC rates, MSP reference benchmarks, and damped linear-regression 30-day forecast bands.
- **AgriFinance Profitability Calculator:** Calculates total investment, expected revenue, net profit, profit margin, ROI, and breakeven selling price with visual expense breakdown charts.
- **AgriBot (`geminiService.js` + `advisoryEngine.js`):** Context-aware farming assistant powered by `@google/genai` (`gemini-4-hydrogen`) on the server. When `GEMINI_API_KEY` is unavailable, transparently routes queries through the deterministic Advisory Engine fallback.
- **Multilingual Interface:** Instant language switching across **English**, **Hindi (हिंदी)**, and **Punjabi (ਪੰਜਾਬੀ)**.
- **Transparent Development OTP Authentication:** When no live SMS gateway is configured, `/api/auth/request-otp` issues a clearly labeled Development OTP so flows can be tested without pretending real SMS delivery.

---

## Technology Stack

- **Frontend:** React 19 (`.jsx` modules), Vite, Tailwind CSS v4, Leaflet, Lucide Icons
- **Backend:** Node.js, Express (`server.ts`), modular ES backend engines (`.js`), JSON datasets
- **AI Integration:** `@google/genai` (server-side only)

---

## Project Structure

```text
├── index.html
├── server.ts                          # Express API + Vite dev/static server
├── server/
│   ├── data/
│   │   ├── crops.json                 # Crop suitability, yields, MSP & cost benchmarks
│   │   ├── locations.json             # Reference agricultural district coordinates
│   │   └── mandis.json                # APMC mandis with coords & 30-day price series
│   └── services/
│       ├── advisoryEngine.js          # Rule-based advisory & AgriBot fallback
│       ├── arbitrageEngine.js         # Haversine distance & net realization engine
│       ├── authService.js             # Phone + Dev OTP auth, alerts & notifications
│       ├── dataStore.js               # JSON dataset & user persistence helpers
│       ├── geminiService.js           # Server-side @google/genai AgriBot integration
│       ├── predictionEngine.js        # 30-day trend, forecast & sell-vs-hold logic
│       └── recommendationEngine.js    # Soil/season/state crop suitability scorer
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── i18n/translations.js           # English, Hindi, Punjabi dictionaries
    ├── context/
    │   ├── AuthContext.jsx
    │   └── LanguageContext.jsx
    └── components/
        ├── AgriBotDrawer.jsx
        ├── AgriFinanceView.jsx
        ├── AgriMapView.jsx
        ├── AuthModal.jsx
        ├── CropAdvisorView.jsx
        ├── DashboardView.jsx
        ├── HomeView.jsx
        ├── Navbar.jsx
        └── PriceTrendChart.jsx
```

---

## Environment Variables

Copy `.env.example` to `.env` if running outside AI Studio:

- `GEMINI_API_KEY` *(Optional)* — Enables live Gemini AI responses in AgriBot. If omitted, AgriBot transparently uses the local Advisory Engine fallback.
- `PORT` *(Optional, defaults to `3000`)* — Server listening port.
- `APP_URL` *(Optional)* — Hosting URL.

---

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production build:

```bash
npm run build
NODE_ENV=production npm start
```

---

## Testing & Verification Checklist

1. **Public Access:** Visit the homepage, switch commodities/mandis, inspect the 30-day historical vs. forecast chart, and confirm no login is forced.
2. **Crop Advisor:** Test different Soil + Season + State combinations and compare up to 3 crops side-by-side.
3. **AgriMap:** Select an origin district, adjust quantity and freight rate, inspect Leaflet markers, click directions, and verify Net Realization ordering.
4. **AgriFinance:** Load crop benchmark costs, adjust inputs, and verify Total Investment, Revenue, Net Profit, ROI, and Breakeven price calculations.
5. **Authentication & Dashboard:** Click **Farmer Login**, enter a 10-digit Indian mobile number (`6-9` start), use the clearly labeled Development OTP, edit your farm profile, save a mandi comparison, and create a price threshold alert in the Notification Centre.
6. **AgriBot:** Ask farming questions with and without `GEMINI_API_KEY` configured to verify transparent Gemini vs. Advisory Engine fallback labeling.
7. **Multilingual:** Toggle between `EN`, `हिं`, and `ਪੰ` across all views.
