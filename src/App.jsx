import { useEffect, useMemo, useState } from "react";
import Globe, { color, LIMIT } from "./Globe.jsx";
import Timeline from "./Timeline.jsx";
import Writeup from "./Writeup.jsx";
import {
  boxSeries,
  runningMean,
  crossingYears,
  boxAt,
  boxBounds,
  fmtLat,
  fmtLon,
  fmtTemp,
} from "./grid.js";
import "./App.css";

const base = import.meta.env.BASE_URL;

// Box grids (rows x cols). The model grid is 96 x 144 cells of 1.875° lat x 2.5° lon.
const BLOCKS = [
  { rows: 48, cols: 72, label: "3.75° × 5° (fine)" },
  { rows: 40, cols: 60, label: "4.5° × 6°" },
  { rows: 32, cols: 48, label: "5.6° × 7.5°" },
  { rows: 24, cols: 36, label: "7.5° × 10° (coarse)" },
];

const THRESHOLDS = [1.5, 2, 3, 4];

// The three scenarios, ordered by emissions. One red hue stepped light -> dark,
// so "darker = more emissions" reads the same way as on our static scenario chart.
const SCENARIOS = [
  { key: "ssp126", name: "SSP1-2.6", short: "1-2.6", color: "#f4a582" },
  { key: "ssp245", name: "SSP2-4.5", short: "2-4.5", color: "#d6604d" },
  { key: "ssp585", name: "SSP5-8.5", short: "5-8.5", color: "#a50f15" },
];

// Cities to fly to, spread across continents and climates, ordered west -> east
const CITIES = [
  { name: "Los Angeles", lat: 34.05, lon: -118.25 },
  { name: "Mexico City", lat: 19.4, lon: -99.1 },
  { name: "Chicago", lat: 41.9, lon: -87.6 },
  { name: "Toronto", lat: 43.7, lon: -79.4 },
  { name: "New York", lat: 40.7, lon: -74.0 },
  { name: "Lima", lat: -12.05, lon: -77.0 },
  { name: "Buenos Aires", lat: -34.6, lon: -58.4 },
  { name: "São Paulo", lat: -23.55, lon: -46.6 },
  { name: "London", lat: 51.5, lon: -0.1 },
  { name: "Paris", lat: 48.85, lon: 2.35 },
  { name: "Lagos", lat: 6.5, lon: 3.4 },
  { name: "Johannesburg", lat: -26.2, lon: 28.05 },
  { name: "Cairo", lat: 30.05, lon: 31.25 },
  { name: "Nairobi", lat: -1.3, lon: 36.8 },
  { name: "Moscow", lat: 55.75, lon: 37.6 },
  { name: "Dubai", lat: 25.2, lon: 55.3 },
  { name: "Mumbai", lat: 19.1, lon: 72.9 },
  { name: "Delhi", lat: 28.6, lon: 77.2 },
  { name: "Singapore", lat: 1.35, lon: 103.8 },
  { name: "Jakarta", lat: -6.2, lon: 106.8 },
  { name: "Beijing", lat: 39.9, lon: 116.4 },
  { name: "Shanghai", lat: 31.2, lon: 121.5 },
  { name: "Seoul", lat: 37.55, lon: 126.98 },
  { name: "Tokyo", lat: 35.7, lon: 139.7 },
  { name: "Sydney", lat: -33.9, lon: 151.2 },
];

export default function App() {
  const [meta, setMeta] = useState(null);
  const [scenario, setScenario] = useState("ssp245");
  const [cache, setCache] = useState({}); // scenario key -> Int16Array, loaded on first use
  const [data, setData] = useState(null); // grid currently on the globe
  const [yearIdx, setYearIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [block, setBlock] = useState(1); // index into BLOCKS: 4.5° x 6°
  const [smooth, setSmooth] = useState(true);
  const [threshold, setThreshold] = useState(2);
  const [relief, setRelief] = useState(14); // bump-map strength, 0 = flat
  const [shine, setShine] = useState(0.3); // ocean glossiness, 0 = matte
  const [hover, setHover] = useState(null); // { row, col, x, y } or null
  const [place, setPlace] = useState(null); // pinned place from the fly-to buttons
  const [flyTo, setFlyTo] = useState(null);

  // metadata (years, grid size, every scenario's global mean) once
  useEffect(() => {
    fetch(`${base}data/meta.json`)
      .then((r) => r.json())
      .then((m) => {
        setMeta(m);
        setYearIdx(m.years.indexOf(2014));
      });
  }, []);

  // each scenario's grid (~7 MB) the first time it's chosen; the old one stays on screen meanwhile
  useEffect(() => {
    if (cache[scenario]) {
      setData(cache[scenario]);
      return;
    }
    let cancelled = false;
    fetch(`${base}data/anom_${scenario}.bin`)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        if (cancelled) return;
        const arr = new Int16Array(buf);
        setCache((c) => ({ ...c, [scenario]: arr }));
        setData(arr);
      });
    return () => {
      cancelled = true;
    };
  }, [scenario, cache]);
  const loadingScenario = !cache[scenario];

  // play button: advance one year every 120 ms, stop at the end
  useEffect(() => {
    if (!playing || !meta) return;
    const id = setInterval(() => {
      setYearIdx((i) => {
        if (i >= meta.years.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 120);
    return () => clearInterval(id);
  }, [playing, meta]);

  // every box's value for every year (recomputed only when the box size changes)
  const grid = useMemo(
    () => (meta && data ? boxSeries(data, meta, BLOCKS[block].rows, BLOCKS[block].cols) : null),
    [data, meta, block]
  );
  const smoothed = useMemo(
    () => (grid ? runningMean(grid.series, grid.ny, grid.n) : null),
    [grid]
  );
  const crossing = useMemo(
    () => (grid ? crossingYears(smoothed, grid.ny, grid.n, threshold, meta.years) : null),
    [grid, smoothed, threshold, meta]
  );

  const boxes = useMemo(() => {
    if (!grid) return null;
    const src = smooth ? smoothed : grid.series;
    return {
      values: src.subarray(yearIdx * grid.n, (yearIdx + 1) * grid.n),
      rows: grid.rows,
      cols: grid.cols,
    };
  }, [grid, smoothed, smooth, yearIdx]);

  // global mean for every scenario: raw + 20-year smoothed, and the year it crosses the threshold
  const globals = useMemo(() => {
    if (!meta) return null;
    return SCENARIOS.map((s) => {
      const raw = Float32Array.from(meta.scenarios[s.key].globalMean);
      const smooth = runningMean(raw, raw.length, 1);
      const cross = crossingYears(smooth, raw.length, 1, threshold, meta.years)[0];
      // fixed thresholds for the write-up table
      const crossAt = Object.fromEntries(
        [1.5, 2, 3].map((t) => [t, crossingYears(smooth, raw.length, 1, t, meta.years)[0]])
      );
      // end-of-century average, 2081-2100
      const endMean = raw.slice(-20).reduce((a, b) => a + b, 0) / 20;
      return { ...s, label: meta.scenarios[s.key].label, raw, smooth, cross, crossAt, endMean };
    });
  }, [meta, threshold]);
  const global = globals?.find((g) => g.key === scenario);

  // the globe only needs row/col to draw outlines; keeping x/y out avoids repainting on every mouse move
  const hoverCell = useMemo(
    () => (hover ? { row: hover.row, col: hover.col } : null),
    [hover?.row, hover?.col]
  );
  const selectedCell = useMemo(
    () => (place && grid ? boxAt(place.lat, place.lon, grid.rows, grid.cols) : null),
    [place, grid]
  );

  if (!meta || !data) return <p className="loading">Loading climate data…</p>;

  const year = meta.years[yearIdx];
  const gm = (smooth ? global.smooth : global.raw)[yearIdx];

  const togglePlay = () => {
    if (!playing && yearIdx >= meta.years.length - 1) setYearIdx(0);
    setPlaying(!playing);
  };

  const goTo = (p) => {
    setPlace(p);
    setFlyTo({ ...p }); // new object so flying to the same place twice still triggers
  };

  const cellInfo = (cell) => ({
    value: boxes.values[cell.row * boxes.cols + cell.col],
    cross: crossing[cell.row * boxes.cols + cell.col],
    bounds: boxBounds(cell.row, cell.col, boxes.rows, boxes.cols),
  });

  return (
    <main>
      <header>
        <h1>When does your city cross the +{threshold} °C threshold?</h1>
        <p>
          Annual surface air temperature compared with the 1850–1900 average,
          under three emissions scenarios. Drag to spin the globe, hover a box
          for its value, or jump to a city.
        </p>
      </header>

      <div className="scenario-row">
        <span className="row-label">Scenario</span>
        <div className="segmented" role="radiogroup" aria-label="Emissions scenario">
          {globals.map((s) => (
            <button
              key={s.key}
              role="radio"
              aria-checked={scenario === s.key}
              className={scenario === s.key ? "active" : ""}
              style={{ "--swatch": s.color }}
              onClick={() => setScenario(s.key)}
            >
              <span className="swatch" />
              {s.label}
            </button>
          ))}
        </div>
        {loadingScenario && <span className="row-label">loading…</span>}
      </div>

      <div className="places">
        <span className="row-label">Cities</span>
        {CITIES.map((p) => (
          <button
            key={p.name}
            className={place?.name === p.name ? "active" : ""}
            onClick={() => goTo(p)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="stage">
        <Globe
          boxes={boxes}
          hover={hoverCell}
          selected={selectedCell}
          onHover={setHover}
          flyTo={flyTo}
          relief={relief}
          shine={shine}
        />
        <div className="readout">
          <div className="year">{year}</div>
          <div className="gm">
            Global mean: {fmtTemp(gm)}
            {smooth && " (20-yr mean)"}
          </div>
          <div className="gm scenario-name" style={{ color: global.color }}>
            {global.label}
          </div>
          <div className="gm">
            World reaches +{threshold} °C:{" "}
            <strong>{global.cross === -1 ? "not by 2100" : global.cross}</strong>
          </div>
        </div>
        {place && selectedCell && (
          <PlaceCard
            place={place}
            info={cellInfo(selectedCell)}
            year={year}
            threshold={threshold}
            onClose={() => setPlace(null)}
          />
        )}
        <Legend />
        {hover && (
          <Tooltip hover={hover} info={cellInfo(hover)} year={year} threshold={threshold} />
        )}
      </div>

      <div className="controls">
        <button onClick={togglePlay}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
        <input
          type="range"
          min={0}
          max={meta.years.length - 1}
          value={yearIdx}
          onChange={(e) => {
            setPlaying(false);
            setYearIdx(+e.target.value);
          }}
        />
      </div>

      <div className="controls options">
        <label>
          Box size{" "}
          <select value={block} onChange={(e) => setBlock(+e.target.value)}>
            {BLOCKS.map((b, i) => (
              <option key={b.label} value={i}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Threshold{" "}
          <select value={threshold} onChange={(e) => setThreshold(+e.target.value)}>
            {THRESHOLDS.map((t) => (
              <option key={t} value={t}>
                +{t} °C
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} />{" "}
          20-year mean
        </label>
        <label className="relief">
          Relief{" "}
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={relief}
            onChange={(e) => setRelief(+e.target.value)}
          />
        </label>
        <label className="relief">
          Ocean shine{" "}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={shine}
            onChange={(e) => setShine(+e.target.value)}
          />
        </label>
      </div>

      <Timeline
        years={meta.years}
        series={globals}
        active={scenario}
        onScenario={setScenario}
        threshold={threshold}
        yearIdx={yearIdx}
        onChange={(i) => {
          setPlaying(false);
          setYearIdx(i);
        }}
      />

      <Writeup />

      <footer>
        Data: CMIP6 CESM2-WACCM r1i1p1f1 (NCAR), historical (1850–2014) then
        SSP1-2.6, SSP2-4.5 or SSP5-8.5 (2015–2100), via Google Cloud Public Datasets.
        Terrain relief: NASA-derived elevation map from the three-globe examples.
      </footer>
    </main>
  );
}

function CrossLine({ cross, threshold }) {
  return (
    <>
      Reaches +{threshold} °C (20-yr mean):{" "}
      <strong>{cross === -1 ? "not by 2100" : cross}</strong>
    </>
  );
}

function Tooltip({ hover, info, year, threshold }) {
  const { value, cross, bounds: b } = info;
  return (
    <div className="tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
      <div className="tt-value">
        <span className="swatch" style={{ background: color(value) }} />
        {fmtTemp(value)}
      </div>
      <div className="tt-sub">vs. 1850–1900, in {year}</div>
      <div className="tt-sub">
        <CrossLine cross={cross} threshold={threshold} />
      </div>
      <div className="tt-sub">
        {fmtLat(b.latS)} to {fmtLat(b.latN)}, {fmtLon(b.lonW)} to {fmtLon(b.lonE)}
      </div>
    </div>
  );
}

function PlaceCard({ place, info, year, threshold, onClose }) {
  return (
    <div className="place-card">
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className="pc-name">{place.name}</div>
      <div className="tt-value">
        <span className="swatch" style={{ background: color(info.value) }} />
        {fmtTemp(info.value)} <span className="tt-sub">in {year}</span>
      </div>
      <div className="tt-sub">
        <CrossLine cross={info.cross} threshold={threshold} />
      </div>
      {place.note && <p>{place.note}</p>}
    </div>
  );
}

function Legend() {
  const stops = [-LIMIT, -LIMIT / 2, 0, LIMIT / 2, LIMIT];
  const gradient = `linear-gradient(to right, ${stops.map((s) => color(s)).join(", ")})`;
  return (
    <div className="legend">
      <div className="bar" style={{ background: gradient }} />
      <div className="ticks">
        {stops.map((s) => (
          <span key={s}>{s > 0 ? `+${s}` : s}</span>
        ))}
      </div>
      <div className="caption">°C vs. 1850–1900</div>
    </div>
  );
}
