import { useRef } from "react";
import * as d3 from "d3";

const SPLIT = 2014; // last historical year; scenarios diverge after this

// Global-mean line chart that doubles as the year scrubber.
// Shows every scenario's 20-year mean as a line; the active one is bold, with its
// single years as small dots so the year-to-year noise is visible but quiet.
// End labels give the 2081-2100 average; clicking one switches the globe to that scenario.
export default function Timeline({ years, series, active, threshold, yearIdx, onChange, onScenario }) {
  const width = 760;
  const height = 200;
  const m = { top: 14, right: 70, bottom: 26, left: 40 };
  const svgRef = useRef(null);

  const allRaw = series.flatMap((s) => Array.from(s.raw));
  const x = d3
    .scaleLinear()
    .domain(d3.extent(years))
    .range([m.left, width - m.right]);
  const y = d3
    .scaleLinear()
    .domain([Math.min(-0.5, d3.min(allRaw)), Math.max(threshold + 0.3, d3.max(allRaw))])
    .nice()
    .range([height - m.bottom, m.top]);

  const splitIdx = years.indexOf(SPLIT);
  const line = d3
    .line()
    .defined((d) => d != null)
    .x((d) => x(years[d.i]))
    .y((d) => y(d.v));
  const points = (arr, from, to) =>
    Array.from(arr.slice(from, to), (v, k) => ({ i: from + k, v }));

  // click or drag on the plot to pick a year
  const pick = (event) => {
    if (event.type === "pointermove" && event.buttons !== 1) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    if (px > width - m.right) return; // the label area is for picking scenarios
    const year = Math.round(x.invert(px));
    onChange(Math.max(0, Math.min(years.length - 1, year - years[0])));
  };

  const act = series.find((s) => s.key === active);
  const cx = x(years[yearIdx]);
  const last = years.length - 1;

  // spread end labels apart so they don't overlap
  const labelY = series
    .map((s) => ({ key: s.key, y: y(s.endMean) }))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < labelY.length; k++) {
    labelY[k].y = Math.max(labelY[k].y, labelY[k - 1].y + 13);
  }
  const labelPos = Object.fromEntries(labelY.map((l) => [l.key, l.y]));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="timeline"
      onPointerDown={pick}
      onPointerMove={pick}
    >
      {y.ticks(5).map((t) => (
        <g key={t}>
          <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} className="grid" />
          <text x={m.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
            {t > 0 ? `+${t}` : t}
          </text>
        </g>
      ))}
      {x.ticks(6).map((t) => (
        <text key={t} x={x(t)} y={height - 6} textAnchor="middle">
          {t}
        </text>
      ))}
      <line x1={x(2015)} x2={x(2015)} y1={m.top} y2={height - m.bottom} className="divider" />
      <text x={x(2015) - 4} y={m.top + 10} className="label" textAnchor="end">
        ← simulated history
      </text>
      <text x={x(2015) + 4} y={m.top + 10} className="label">
        projections →
      </text>
      <line
        x1={m.left}
        x2={width - m.right}
        y1={y(threshold)}
        y2={y(threshold)}
        className="threshold"
      />
      <text x={m.left + 4} y={y(threshold) - 4} className="label">
        +{threshold} °C
      </text>

      {/* single years of the active scenario, as small dots */}
      <g className="year-dots">
        {Array.from(act.raw, (v, i) => (
          <circle key={i} cx={x(years[i])} cy={y(v)} r={1.4} />
        ))}
      </g>

      {/* shared history once, in neutral grey */}
      <path d={line(points(act.smooth, 0, splitIdx + 1))} className="series" />

      {/* each scenario from 2014 on; inactive ones thinner and faded */}
      {series.map((s) => (
        <path
          key={s.key}
          d={line(points(s.smooth, splitIdx, years.length))}
          className={`series scenario ${s.key === active ? "active" : ""}`}
          style={{ stroke: s.color }}
        />
      ))}

      {series.map((s) => (
        <text
          key={s.key}
          x={width - m.right + 6}
          y={labelPos[s.key]}
          dy="0.32em"
          className={`end-label ${s.key === active ? "active" : ""}`}
          style={{ fill: s.color }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onScenario(s.key);
          }}
        >
          {s.short} {s.endMean > 0 ? "+" : ""}
          {s.endMean.toFixed(1)}°
        </text>
      ))}

      <line x1={cx} x2={cx} y1={m.top} y2={height - m.bottom} className="cursor" />
      <circle cx={cx} cy={y(act.smooth[yearIdx])} r={4.5} className="dot" />
    </svg>
  );
}
