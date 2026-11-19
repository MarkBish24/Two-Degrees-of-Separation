"""Build the globe's data files from CMIP6 (CESM2-WACCM r1i1p1f1).

For each emissions scenario, writes the historical run (1850-2014) followed by that
scenario (2015-2100), as an anomaly vs. the 1850-1900 mean of the historical run:

  public/data/anom_<scenario>.bin  int16 [year][lat][lon], hundredths of a degree C.
                                   Rows run north -> south, columns -180 -> 180 longitude.
  public/data/meta.json            years, grid size, scale factor, and per-scenario
                                   area-weighted global-mean series

Run from the project root:  python preprocess/make_data.py
"""
import json
from pathlib import Path

import gcsfs
import numpy as np
import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

SCENARIOS = {
    "ssp126": "SSP1-2.6 (low emissions)",
    "ssp245": "SSP2-4.5 (intermediate)",
    "ssp585": "SSP5-8.5 (very high emissions)",
}

cat = pd.read_csv(ROOT / "cmip6-zarr-consolidated-stores.csv")
rows = cat.query(
    "source_id == 'CESM2-WACCM' and member_id == 'r1i1p1f1' and table_id == 'Amon' "
    "and variable_id == 'tas'"
)
fs = gcsfs.GCSFileSystem(token="anon")


def annual_tas(experiment, years):
    zstore = rows[rows.experiment_id == experiment].zstore.iloc[0]
    print(f"opening {experiment}: {zstore}")
    ds = xr.open_zarr(fs.get_mapper(zstore), consolidated=True)
    print(f"  computing annual means for {experiment} (a few minutes)...")
    return ds.tas.groupby("time.year").mean().sel(year=years).load()


def to_grid(da):
    """192x288 -> 96x144 grid, 0..360 -> -180..180 longitude, north at the top."""
    da = da.coarsen(lat=2, lon=2, boundary="trim").mean()
    da = da.assign_coords(lon=((da.lon + 180) % 360) - 180).sortby("lon")
    return da.sortby("lat", ascending=False)


hist = annual_tas("historical", slice(1850, 2014))
baseline = hist.sel(year=slice(1850, 1900)).mean("year")

meta = {"scenarios": {}}
for key, label in SCENARIOS.items():
    future = annual_tas(key, slice(2015, 2100))
    anom = to_grid(xr.concat([hist, future], dim="year") - baseline)
    assert anom.sizes["year"] == 251, f"{key}: expected 1850-2100, got {anom.sizes['year']} years"

    w = np.cos(np.deg2rad(anom.lat))
    gmean = anom.weighted(w).mean(("lat", "lon"))

    q = np.clip(np.round(anom.values * 100), -32767, 32767).astype("<i2")
    q.tofile(OUT / f"anom_{key}.bin")
    print(f"  wrote anom_{key}.bin ({q.nbytes / 1e6:.1f} MB), 2100 global mean {float(gmean[-1]):+.2f} C")

    meta["years"] = [int(y) for y in anom.year.values]
    meta["nlat"] = int(anom.sizes["lat"])
    meta["nlon"] = int(anom.sizes["lon"])
    meta["scale"] = 0.01
    meta["scenarios"][key] = {
        "label": label,
        "globalMean": [round(float(v), 3) for v in gmean.values],
    }

(OUT / "meta.json").write_text(json.dumps(meta))
print("wrote meta.json")
