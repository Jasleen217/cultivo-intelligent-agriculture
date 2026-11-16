import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function AgriFinanceView({ meta, farmContext }) {
  const { t, getLocalizedCropName } = useLanguage();

  const [cropId, setCropId] = useState(farmContext.cropId || 'wheat');
  const [landAreaAcres, setLandAreaAcres] = useState(
    farmContext.landAreaAcres || 5
  );
  const [seedCost, setSeedCost] = useState(11000);
  const [fertilizerCost, setFertilizerCost] = useState(19000);
  const [labourCost, setLabourCost] = useState(32500);
  const [irrigationCost, setIrrigationCost] = useState(12000);
  const [transportCost, setTransportCost] = useState(6500);
  const [otherCost, setOtherCost] = useState(10500);
  const [expectedYieldTotalQuintals, setExpectedYieldTotalQuintals] =
    useState(105);
  const [expectedSellingPricePerQuintal, setExpectedSellingPricePerQuintal] =
    useState(2540);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const applyCropBenchmarks = (targetCropId, area) => {
    const crop = (meta?.crops || []).find((c) => c.id === targetCropId);
    if (!crop) return;
    const acres = Math.max(0.5, Number(area) || 1);
    setSeedCost(Math.round(crop.benchmarkCostPerAcre.seed * acres));
    setFertilizerCost(Math.round(crop.benchmarkCostPerAcre.fertilizer * acres));
    setLabourCost(Math.round(crop.benchmarkCostPerAcre.labour * acres));
    setIrrigationCost(Math.round(crop.benchmarkCostPerAcre.irrigation * acres));
    const estYield = Math.round(crop.yieldQuintalsPerAcre.avg * acres);
    setExpectedYieldTotalQuintals(estYield);
    setTransportCost(Math.round(estYield * 60));
    setOtherCost(Math.round(crop.benchmarkCostPerAcre.other * acres));
    setExpectedSellingPricePerQuintal(crop.benchmarkMspInr);
  };

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profitability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landAreaAcres,
          seedCost,
          fertilizerCost,
          labourCost,
          irrigationCost,
          transportCost,
          otherCost,
          expectedYieldTotalQuintals,
          expectedSellingPricePerQuintal,
        }),
      });
      const json = await res.json();
      if (res.ok) setResult(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [
    landAreaAcres,
    seedCost,
    fertilizerCost,
    labourCost,
    irrigationCost,
    transportCost,
    otherCost,
    expectedYieldTotalQuintals,
    expectedSellingPricePerQuintal,
  ]);

  const costEntries = result
    ? [
        { label: 'Seed', value: result.costs.seed, color: '#143D2B' },
        { label: 'Fertilizer', value: result.costs.fertilizer, color: '#228B4E' },
        { label: 'Labour', value: result.costs.labour, color: '#3F6212' },
        { label: 'Irrigation', value: result.costs.irrigation, color: '#0369A1' },
        { label: 'Transport', value: result.costs.transport, color: '#B45309' },
        { label: 'Other', value: result.costs.other, color: '#647068' },
      ]
    : [];

  const maxBar = result
    ? Math.max(result.expectedRevenue, result.totalInvestment, 1)
    : 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#143D2B] tracking-tight">
            {t('finance.heading')}
          </h1>
          <p className="text-sm text-[#525E57]">{t('finance.subheading')}</p>
        </div>

        <button
          type="button"
          onClick={() => applyCropBenchmarks(cropId, landAreaAcres)}
          className="px-4 py-2 bg-white hover:bg-[#F1F2ED] border border-[#CFD6CE] text-[#143D2B] text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>{t('finance.loadBenchmark')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            calculate();
          }}
          className="lg:col-span-5 bg-white border border-[#E2E5DE] rounded-2xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#525E57] mb-1">
                {t('hero.cropLabel')}
              </label>
              <select
                value={cropId}
                onChange={(e) => {
                  setCropId(e.target.value);
                  applyCropBenchmarks(e.target.value, landAreaAcres);
                }}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
              >
                {(meta?.crops || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {getLocalizedCropName(c)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#525E57] mb-1">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EEF0EC]">
            {[
              { label: t('finance.seedCost'), val: seedCost, set: setSeedCost },
              {
                label: t('finance.fertilizerCost'),
                val: fertilizerCost,
                set: setFertilizerCost,
              },
              {
                label: t('finance.labourCost'),
                val: labourCost,
                set: setLabourCost,
              },
              {
                label: t('finance.irrigationCost'),
                val: irrigationCost,
                set: setIrrigationCost,
              },
              {
                label: t('finance.transportCost'),
                val: transportCost,
                set: setTransportCost,
              },
              {
                label: t('finance.otherCost'),
                val: otherCost,
                set: setOtherCost,
              },
            ].map((field, idx) => (
              <div key={idx}>
                <label className="block text-xs font-medium text-[#525E57] mb-1">
                  {field.label}
                </label>
                <input
                  type="number"
                  min="0"
                  value={field.val}
                  onChange={(e) =>
                    field.set(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F8F8F5] border border-[#D7DDD6] rounded-lg focus:outline-none focus:border-[#143D2B]"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EEF0EC]">
            <div>
              <label className="block text-xs font-semibold text-[#143D2B] mb-1">
                {t('finance.expectedYield')}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={expectedYieldTotalQuintals}
                onChange={(e) =>
                  setExpectedYieldTotalQuintals(
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#CFD6CE] rounded-lg focus:outline-none focus:border-[#143D2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#143D2B] mb-1">
                {t('finance.expectedPrice')}
              </label>
              <input
                type="number"
                min="0"
                value={expectedSellingPricePerQuintal}
                onChange={(e) =>
                  setExpectedSellingPricePerQuintal(
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#CFD6CE] rounded-lg focus:outline-none focus:border-[#143D2B]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#143D2B] hover:bg-[#1B523A] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {t('finance.calculateBtn')}
          </button>
        </form>

        {/* Results & Charts */}
        <div className="lg:col-span-7 space-y-6">
          {result && (
            <>
              {/* KPI Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
                  <p className="text-xs text-[#647068]">
                    {t('finance.totalInvestment')}
                  </p>
                  <p className="font-mono tabular-nums text-xl font-bold text-[#1C231F] mt-1">
                    ₹{result.totalInvestment.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#647068] font-mono tabular-nums">
                    ₹{result.costPerAcre.toLocaleString('en-IN')}/acre
                  </p>
                </div>

                <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
                  <p className="text-xs text-[#647068]">
                    {t('finance.expectedRevenue')}
                  </p>
                  <p className="font-mono tabular-nums text-xl font-bold text-[#143D2B] mt-1">
                    ₹{result.expectedRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#647068] font-mono tabular-nums">
                    {expectedYieldTotalQuintals} qtl × ₹
                    {expectedSellingPricePerQuintal}
                  </p>
                </div>

                <div className="bg-white border border-[#E2E5DE] rounded-xl p-4 col-span-2 sm:col-span-1">
                  <p className="text-xs text-[#647068]">
                    {t('finance.estimatedProfit')}
                  </p>
                  <p
                    className={`font-mono tabular-nums text-xl font-bold mt-1 ${
                      result.estimatedProfit >= 0
                        ? 'text-[#16A34A]'
                        : 'text-[#DC2626]'
                    }`}
                  >
                    {result.estimatedProfit >= 0 ? '+' : ''}₹
                    {result.estimatedProfit.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#647068] font-mono tabular-nums">
                    ₹{result.profitPerAcre.toLocaleString('en-IN')}/acre
                  </p>
                </div>

                <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
                  <p className="text-xs text-[#647068]">
                    {t('finance.profitMargin')}
                  </p>
                  <p className="font-mono tabular-nums text-xl font-bold text-[#1C231F] mt-1">
                    {result.profitMarginPct}%
                  </p>
                </div>

                <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
                  <p className="text-xs text-[#647068]">{t('finance.roi')}</p>
                  <p
                    className={`font-mono tabular-nums text-xl font-bold mt-1 ${
                      result.roiPct >= 0 ? 'text-[#228B4E]' : 'text-[#DC2626]'
                    }`}
                  >
                    {result.roiPct}%
                  </p>
                </div>

                <div className="bg-white border border-[#E2E5DE] rounded-xl p-4">
                  <p className="text-xs text-[#647068]">
                    {t('finance.breakeven')}
                  </p>
                  <p className="font-mono tabular-nums text-xl font-bold text-[#143D2B] mt-1">
                    ₹{result.breakevenPricePerQuintal.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Revenue vs Investment Chart */}
              <div className="bg-white border border-[#E2E5DE] rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-[#1C231F]">
                  Revenue vs. Total Cost & Net Profit
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      label: t('finance.expectedRevenue'),
                      amount: result.expectedRevenue,
                      barColor: '#143D2B',
                    },
                    {
                      label: t('finance.totalInvestment'),
                      amount: result.totalInvestment,
                      barColor: '#94A39B',
                    },
                    {
                      label: t('finance.estimatedProfit'),
                      amount: Math.max(0, result.estimatedProfit),
                      barColor:
                        result.estimatedProfit >= 0 ? '#228B4E' : '#DC2626',
                      displayAmount: result.estimatedProfit,
                    },
                  ].map((item, idx) => {
                    const pct = Math.min(
                      100,
                      Math.round((item.amount / maxBar) * 100)
                    );
                    const shown =
                      item.displayAmount !== undefined
                        ? item.displayAmount
                        : item.amount;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-[#3B4740]">
                            {item.label}
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-[#1C231F]">
                            ₹{shown.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-[#F1F2ED] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: item.barColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expense Breakdown Chart */}
              <div className="bg-white border border-[#E2E5DE] rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-[#1C231F]">
                  {t('finance.costBreakdown')}
                </h2>
                <div className="space-y-3">
                  {costEntries.map((entry) => {
                    const share =
                      result.totalInvestment > 0
                        ? Number(
                            (
                              (entry.value / result.totalInvestment) *
                              100
                            ).toFixed(1)
                          )
                        : 0;
                    return (
                      <div key={entry.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#4C5851]">{entry.label}</span>
                          <span className="font-mono tabular-nums text-[#1C231F]">
                            ₹{entry.value.toLocaleString('en-IN')} ({share}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#F1F2ED] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${share}%`,
                              backgroundColor: entry.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
