import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function PriceTrendChart({
  historicalSeries = [],
  forecastSeries = [],
  mspPrice = 0,
}) {
  const { t } = useLanguage();
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const combined = [...historicalSeries, ...forecastSeries];
  if (combined.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-[#647068] border border-dashed border-[#D7DDD6] rounded-xl">
        {t('common.noData')}
      </div>
    );
  }

  const allValues = [
    ...combined.map((d) => d.price),
    ...forecastSeries.map((d) => d.high),
    ...forecastSeries.map((d) => d.low),
    mspPrice || combined[0].price,
  ].filter((v) => Number.isFinite(v));

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const padding = Math.max(40, Math.round((rawMax - rawMin) * 0.16));
  const minVal = Math.max(0, rawMin - padding);
  const maxVal = rawMax + padding;

  const width = 760;
  const height = 270;
  const padLeft = 58;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const xPos = (idx) =>
    padLeft + (idx / Math.max(1, combined.length - 1)) * plotW;
  const yPos = (val) =>
    padTop + ((maxVal - val) / Math.max(1, maxVal - minVal)) * plotH;

  const histEndIdx = historicalSeries.length - 1;
  const histPath = historicalSeries
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(pt.price).toFixed(1)}`)
    .join(' ');

  const forecastPointsWithAnchor =
    historicalSeries.length > 0
      ? [{ ...historicalSeries[histEndIdx], idx: histEndIdx }, ...forecastSeries.map((f, j) => ({ ...f, idx: historicalSeries.length + j }))]
      : forecastSeries.map((f, j) => ({ ...f, idx: j }));

  const forecastPath = forecastPointsWithAnchor
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xPos(pt.idx).toFixed(1)} ${yPos(pt.price).toFixed(1)}`)
    .join(' ');

  // Confidence band polygon for forecast
  let bandPath = '';
  if (forecastSeries.length > 0 && historicalSeries.length > 0) {
    const anchor = historicalSeries[histEndIdx];
    const upperPts = [
      `${xPos(histEndIdx).toFixed(1)},${yPos(anchor.price).toFixed(1)}`,
      ...forecastSeries.map((f, j) => `${xPos(historicalSeries.length + j).toFixed(1)},${yPos(f.high).toFixed(1)}`),
    ];
    const lowerPts = [
      ...forecastSeries
        .map((f, j) => `${xPos(historicalSeries.length + j).toFixed(1)},${yPos(f.low).toFixed(1)}`)
        .reverse(),
      `${xPos(histEndIdx).toFixed(1)},${yPos(anchor.price).toFixed(1)}`,
    ];
    bandPath = `M ${upperPts.join(' L ')} L ${lowerPts.join(' L ')} Z`;
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) =>
    Math.round(minVal + (maxVal - minVal) * r)
  );

  const hoveredPoint = hoveredIdx !== null ? combined[hoveredIdx] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-5 text-[#4C5851]">
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-0.5 bg-[#143D2B] inline-block" />
            <span>{t('market.historicalLabel')}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-[#228B4E] inline-block" />
            <span>{t('market.forecastLabel')}</span>
          </span>
          {mspPrice > 0 && (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-0.5 border-t border-dotted border-[#B45309] inline-block" />
              <span>
                {t('market.mspLabel')} (₹{mspPrice.toLocaleString('en-IN')})
              </span>
            </span>
          )}
        </div>

        {hoveredPoint && (
          <div className="font-mono tabular-nums text-xs text-[#1C231F] bg-[#F1F2ED] px-2.5 py-1 rounded-md border border-[#E2E5DE]">
            <span>{hoveredPoint.label}</span>
            <span className="mx-1.5 text-[#8A948D]">·</span>
            <span className="font-semibold">
              ₹{hoveredPoint.price.toLocaleString('en-IN')}/qtl
            </span>
            <span className="mx-1.5 text-[#8A948D]">·</span>
            <span className="text-[#525E57]">
              {hoveredPoint.type === 'forecast'
                ? `${t('market.forecastLabel')} (₹${hoveredPoint.low}–₹${hoveredPoint.high})`
                : t('market.historicalLabel')}
            </span>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[540px] select-none"
          role="img"
          aria-label="30-day historical and 30-day forecasted mandi price trend"
        >
          {/* Y-axis gridlines */}
          {yTicks.map((val, i) => {
            const y = yPos(val);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E5E8E2"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#647068] text-[10px] font-mono"
                >
                  ₹{val}
                </text>
              </g>
            );
          })}

          {/* Vertical separator for Today */}
          {histEndIdx >= 0 && (
            <line
              x1={xPos(histEndIdx)}
              y1={padTop}
              x2={xPos(histEndIdx)}
              y2={height - padBottom}
              stroke="#C9D0C8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* MSP Reference Line */}
          {mspPrice > 0 && mspPrice >= minVal && mspPrice <= maxVal && (
            <line
              x1={padLeft}
              y1={yPos(mspPrice)}
              x2={width - padRight}
              y2={yPos(mspPrice)}
              stroke="#B45309"
              strokeWidth="1.25"
              strokeDasharray="2 4"
            />
          )}

          {/* Forecast Confidence Band */}
          {bandPath && (
            <path d={bandPath} fill="#228B4E" fillOpacity="0.12" />
          )}

          {/* Historical Line */}
          <path
            d={histPath}
            fill="none"
            stroke="#143D2B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Forecast Dashed Line */}
          <path
            d={forecastPath}
            fill="none"
            stroke="#228B4E"
            strokeWidth="2.2"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X-axis labels (sampled cleanly) */}
          {combined.map((pt, idx) => {
            const showLabel =
              idx === 0 ||
              idx === histEndIdx ||
              idx === combined.length - 1 ||
              idx % 3 === 0;
            if (!showLabel) return null;
            return (
              <text
                key={idx}
                x={xPos(idx)}
                y={height - 12}
                textAnchor="middle"
                className={`text-[10px] font-mono ${
                  idx === histEndIdx ? 'fill-[#143D2B] font-semibold' : 'fill-[#647068]'
                }`}
              >
                {pt.label}
              </text>
            );
          })}

          {/* Interactive Data Points */}
          {combined.map((pt, idx) => {
            const cx = xPos(idx);
            const cy = yPos(pt.price);
            const isHovered = hoveredIdx === idx;
            const isToday = idx === histEndIdx;
            return (
              <g key={idx}>
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padTop}
                    x2={cx}
                    y2={height - padBottom}
                    stroke="#143D2B"
                    strokeOpacity="0.25"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5.5 : isToday ? 4.5 : 3}
                  fill={pt.type === 'forecast' ? '#228B4E' : '#143D2B'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <rect
                  x={cx - 14}
                  y={padTop}
                  width="28"
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
