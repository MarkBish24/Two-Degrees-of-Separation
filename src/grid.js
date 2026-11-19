// Average the model grid into a rows x cols grid of boxes, for every year at once.
// Each model cell goes into the box its centre falls in, so boxes can hold
// slightly different numbers of cells (e.g. 2 or 3 across) and any grid size works.
// Fine-grid rows run north -> south, columns run -180 -> 180 longitude.
// Each fine cell is weighted by cos(latitude), since cells near the poles cover less area.
// Returns series laid out as [year][box], in degrees C.
export function boxSeries(data, meta, rows, cols) {
  const { nlat, nlon, scale, years } = meta;
  const ny = years.length;
  const n = rows * cols;

  const rowOf = new Int32Array(nlat);
  const colOf = new Int32Array(nlon);
  const latW = new Float64Array(nlat);
  const rowWeight = new Float64Array(rows); // summed cos(lat) of the model rows in each box-row
  const colCount = new Float64Array(cols); // number of model columns in each box-column
  for (let r = 0; r < nlat; r++) {
    rowOf[r] = Math.floor(((r + 0.5) * rows) / nlat);
    latW[r] = Math.cos(((90 - ((r + 0.5) * 180) / nlat) * Math.PI) / 180);
    rowWeight[rowOf[r]] += latW[r];
  }
  for (let c = 0; c < nlon; c++) {
    colOf[c] = Math.floor(((c + 0.5) * cols) / nlon);
    colCount[colOf[c]] += 1;
  }

  const series = new Float32Array(ny * n);
  for (let y = 0; y < ny; y++) {
    for (let r = 0; r < nlat; r++) {
      const br = rowOf[r];
      const w = (latW[r] * scale) / rowWeight[br];
      const src = y * nlat * nlon + r * nlon;
      const dst = y * n + br * cols;
      for (let c = 0; c < nlon; c++) {
        const bc = colOf[c];
        series[dst + bc] += (data[src + c] * w) / colCount[bc];
      }
    }
  }
  return { series, rows, cols, n, ny };
}

// Centered 20-year mean along the year axis (window = 2*half years: t-half .. t+half-1).
// 20 years is the period the IPCC uses to define a warming level, long enough
// to average out natural year-to-year swings.
// Near 1850 and 2100 the window is clipped, so those years average fewer values.
export function runningMean(series, ny, n, half = 10) {
  const out = new Float32Array(ny * n);
  const prefix = new Float64Array(ny + 1);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < ny; t++) prefix[t + 1] = prefix[t] + series[t * n + k];
    for (let t = 0; t < ny; t++) {
      const a = Math.max(0, t - half);
      const b = Math.min(ny, t + half);
      out[t * n + k] = (prefix[b] - prefix[a]) / (b - a);
    }
  }
  return out;
}

// The year each box reaches the threshold: the first year whose 20-year mean is at or
// above it (the centre of the first 20-year period that warm, as the IPCC dates
// warming levels). Pass the smoothed series. -1 = not reached by 2100.
export function crossingYears(smoothed, ny, n, threshold, years) {
  const out = new Int16Array(n).fill(-1);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < ny; t++) {
      if (smoothed[t * n + k] >= threshold) {
        out[k] = years[t];
        break;
      }
    }
  }
  return out;
}

// Which box contains a latitude/longitude
export function boxAt(lat, lon, rows, cols) {
  const row = Math.min(rows - 1, Math.floor(((90 - lat) / 180) * rows));
  const col = Math.min(cols - 1, Math.floor(((lon + 180) / 360) * cols));
  return { row, col };
}

// Latitude/longitude edges of a box, for the tooltip
export function boxBounds(row, col, rows, cols) {
  const latH = 180 / rows;
  const lonW = 360 / cols;
  return {
    latN: 90 - row * latH,
    latS: 90 - (row + 1) * latH,
    lonW: -180 + col * lonW,
    lonE: -180 + (col + 1) * lonW,
  };
}

export const fmtLat = (v) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? "N" : "S"}`;
export const fmtLon = (v) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? "E" : "W"}`;
export const fmtTemp = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} °C`;
