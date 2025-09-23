#!/usr/bin/env python3
"""
Fishing Forecast Script
- Uses lunar cycle (moon phase/illumination)
- Uses actual weather data (Open-Meteo; no API key required)
- Uses Farmer's Almanac data (preferred: API via env vars; fallback: local JSON)

Usage:
  python fishing_forecast.py --lat 35.4676 --lon -97.5164 --days 3 --almanac-mode api
  python fishing_forecast.py --lat 35.4676 --lon -97.5164 --days 3 --almanac-mode file --almanac-file ./almanac.json

Env (for API mode):
  OFA_API_KEY=<your_key>
  OFA_API_URL=<endpoint_with_placeholders>  # e.g., https://api.almanac.example/v1/fishing?lat={lat}&lon={lon}&date={date}&apikey={key}

almanac.json example (fallback):
{
  "2025-09-23": {"rating": 0.7, "notes": "Good"},
  "2025-09-24": {"rating": 0.5, "notes": "Fair"}
}
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
from dataclasses import dataclass
from typing import Dict, List, Optional

import requests
from astral import moon

# --------------------------- Data Models ---------------------------

@dataclass
class DayInputs:
    date: dt.date
    lat: float
    lon: float

@dataclass
class MoonData:
    phase_angle_deg: float
    illumination: float  # 0..1
    phase_name: str

@dataclass
class WeatherData:
    temp_c: float
    wind_kph: float
    precip_mm: float
    cloud_pct: float
    pressure_hpa: Optional[float] = None

@dataclass
class AlmanacData:
    rating_0_1: Optional[float]  # None if unavailable
    notes: Optional[str]

@dataclass
class ForecastScore:
    date: dt.date
    moon: MoonData
    weather: WeatherData
    almanac: AlmanacData
    bite_score_0_100: float
    components: Dict[str, float]


# --------------------------- Almanac Providers ---------------------------

def fetch_almanac_api(day: DayInputs) -> AlmanacData:
    """Fetch Farmer's Almanac via a user-provided API URL pattern + key."""
    key = os.getenv("OFA_API_KEY")
    url_tpl = os.getenv("OFA_API_URL")
    if not key or not url_tpl:
        return AlmanacData(None, None)

    url = url_tpl.format(
        lat=day.lat,
        lon=day.lon,
        date=day.date.isoformat(),
        key=key
    )
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()
        # Expect a normalized shape; adapt as needed:
        rating = data.get("rating")  # expect 0..1
        if rating is None:
            # If 1..5 stars style:
            stars = data.get("stars")
            if stars is not None:
                rating = max(0.0, min(1.0, (float(stars) - 1.0) / 4.0))
        notes = data.get("notes") or data.get("summary")
        if rating is None:
            return AlmanacData(None, notes)
        return AlmanacData(float(rating), notes)
    except Exception:
        return AlmanacData(None, None)


def fetch_almanac_file(day: DayInputs, path: str) -> AlmanacData:
    """Fallback: read local JSON date->rating."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            j = json.load(f)
        rec = j.get(day.date.isoformat())
        if not rec:
            return AlmanacData(None, None)
        rating = rec.get("rating")
        notes = rec.get("notes")
        if rating is None:
            return AlmanacData(None, notes)
        return AlmanacData(float(rating), notes)
    except Exception:
        return AlmanacData(None, None)


# --------------------------- Moon/Lunar ---------------------------

_PHASE_NAMES = [
    (0, "New Moon"),
    (45, "Waxing Crescent"),
    (90, "First Quarter"),
    (135, "Waxing Gibbous"),
    (180, "Full Moon"),
    (225, "Waning Gibbous"),
    (270, "Last Quarter"),
    (315, "Waning Crescent"),
    (360, "New Moon")
]

def phase_name_from_angle(angle_deg: float) -> str:
    for threshold, name in _PHASE_NAMES:
        if angle_deg <= threshold:
            return name
    return "New Moon"

def get_moon_data(date: dt.date) -> MoonData:
    # Astral returns phase age in days (0=new, ~14.77=full, ~29.53=cycle)
    age = moon.phase(date)  # days into lunation
    # Convert to angle (approx): 360 * age / synodic month
    synodic = 29.530588853
    angle = (age / synodic) * 360.0
    angle = angle % 360.0
    # Illumination approximation: 0..1 using cosine of phase angle
    illumination = 0.5 * (1 - math.cos(math.radians(angle)))
    return MoonData(
        phase_angle_deg=angle,
        illumination=illumination,
        phase_name=phase_name_from_angle(angle)
    )


# --------------------------- Weather (Open-Meteo) ---------------------------

def fetch_weather(day: DayInputs) -> WeatherData:
    base = "https://api.open-meteo.com/v1/forecast"
    today = dt.date.today()
    days_from_today = (day.date - today).days
    
    # For future dates, use forecast_days; for today/past, don't specify dates
    if days_from_today >= 0:
        params = {
            "latitude": day.lat,
            "longitude": day.lon,
            "hourly": "temperature_2m,precipitation,cloud_cover,pressure_msl,windspeed_10m",
            "timezone": "auto",
            "forecast_days": max(1, days_from_today + 1),
        }
    else:
        # Past dates - this shouldn't happen in normal usage but handle gracefully
        params = {
            "latitude": day.lat,
            "longitude": day.lon,
            "hourly": "temperature_2m,precipitation,cloud_cover,pressure_msl,windspeed_10m",
            "timezone": "auto",
            "forecast_days": 1,
        }
    
    r = requests.get(base, params=params, timeout=20)
    r.raise_for_status()
    j = r.json()
    hours = j.get("hourly", {})
    # Use a simple daylight-window mean (~6-18 local)
    times = hours.get("time", [])
    target_date = day.date.isoformat()
    # Filter for the specific day we want and daylight hours
    idxs = [i for i, t in enumerate(times) 
            if t.startswith(target_date) and _hour_is_between(t, 6, 18)]

    def avg(field: str, default: float, scale: float = 1.0) -> float:
        arr = hours.get(field, [])
        vals = [arr[i] for i in idxs if i < len(arr)]
        if not vals:
            return default
        return float(sum(vals) / len(vals)) * scale

    temp_c = avg("temperature_2m", 20.0)
    wind_kph = avg("windspeed_10m", 10.0, scale=3.6)  # m/s -> km/h
    precip_mm = avg("precipitation", 0.0)
    cloud_pct = avg("cloud_cover", 50.0)
    pressure = avg("pressure_msl", None) if hours.get("pressure_msl") else None

    return WeatherData(
        temp_c=temp_c,
        wind_kph=wind_kph,
        precip_mm=precip_mm,
        cloud_pct=cloud_pct,
        pressure_hpa=pressure
    )

def _hour_is_between(iso_dt: str, start_h: int, end_h: int) -> bool:
    # iso_dt is like "2025-09-23T14:00"
    try:
        h = int(iso_dt.split("T")[1].split(":")[0])
        return start_h <= h <= end_h
    except Exception:
        return True


# --------------------------- Scoring ---------------------------

def score_moon(md: MoonData) -> float:
    """Return 0..1. Bias towards ~full and ~new peaks (solunar superstition)."""
    # Two humps: near 0° and 180°
    # Score = max(cos distance to 0°, cos distance to 180°)
    a = math.radians(md.phase_angle_deg)
    p0 = 1 - abs(math.cos(a))  # 0 at 0°, 1 at 90°, not desired
    # We want peaks at 0 and 180; use |cos(2a)| trick
    s = abs(math.cos(2 * a))  # 1 at 0/180, 0 at 90/270
    # Blend with illumination (some anglers favor brighter nights)
    return 0.6 * s + 0.4 * md.illumination

def score_weather(wd: WeatherData) -> float:
    """Return 0..1 based on wind, clouds, precip, temp comfort."""
    wind = wd.wind_kph
    clouds = wd.cloud_pct
    precip = wd.precip_mm
    temp_c = wd.temp_c

    # Wind: light-moderate best (3–18 km/h)
    if wind <= 3:
        wind_s = 0.5
    elif wind <= 18:
        wind_s = 1.0
    elif wind <= 28:
        wind_s = 0.6
    else:
        wind_s = 0.3

    # Clouds: slight clouds often good; full sun or full overcast less ideal
    if clouds <= 10:
        cloud_s = 0.6
    elif clouds <= 40:
        cloud_s = 0.9
    elif clouds <= 70:
        cloud_s = 0.8
    else:
        cloud_s = 0.5

    # Precip: light drizzle okay, heavy rain poor
    if precip == 0:
        precip_s = 0.9
    elif precip < 1:
        precip_s = 0.8
    elif precip < 5:
        precip_s = 0.5
    else:
        precip_s = 0.2

    # Temp comfort window 10–24°C
    if temp_c < -2 or temp_c > 32:
        temp_s = 0.2
    elif 10 <= temp_c <= 24:
        temp_s = 1.0
    else:
        # linear falloff from edges
        if temp_c < 10:
            temp_s = max(0.2, 0.2 + (temp_c + 2) / 12 * 0.8)
        else:
            temp_s = max(0.2, 0.2 + (32 - temp_c) / 8 * 0.8)

    # Weighted blend
    return clamp(0.0, 1.0, 0.35 * wind_s + 0.25 * cloud_s + 0.2 * precip_s + 0.2 * temp_s)

def score_almanac(ad: AlmanacData) -> Optional[float]:
    return None if ad.rating_0_1 is None else clamp(0.0, 1.0, ad.rating_0_1)

def combine_scores(moon_s: float, weather_s: float, almanac_s: Optional[float]) -> (float, Dict[str, float]):
    """
    Combine components to 0..100 score.
    Default weights: Moon 35%, Weather 45%, Almanac 20% (if provided).
    If Almanac missing, renormalize Moon 44%, Weather 56%.
    """
    if almanac_s is None:
        wm, ww = 0.44, 0.56
        total = wm * moon_s + ww * weather_s
        components = {"moon": 100 * wm * moon_s, "weather": 100 * ww * weather_s}
    else:
        wm, ww, wa = 0.35, 0.45, 0.20
        total = wm * moon_s + ww * weather_s + wa * almanac_s
        components = {
            "moon": 100 * wm * moon_s,
            "weather": 100 * ww * weather_s,
            "almanac": 100 * wa * almanac_s,
        }
    return 100 * clamp(0.0, 1.0, total), components


# --------------------------- Orchestration ---------------------------

def forecast_for_day(day: DayInputs, almanac_mode: str, almanac_file: Optional[str]) -> ForecastScore:
    md = get_moon_data(day.date)
    wd = fetch_weather(day)

    if almanac_mode == "api":
        ad = fetch_almanac_api(day)
    elif almanac_mode == "file":
        ad = fetch_almanac_file(day, almanac_file or "./almanac.json")
    else:
        ad = AlmanacData(None, None)

    m_s = score_moon(md)
    w_s = score_weather(wd)
    a_s = score_almanac(ad)
    total, components = combine_scores(m_s, w_s, a_s)

    return ForecastScore(
        date=day.date, moon=md, weather=wd, almanac=ad,
        bite_score_0_100=round(total, 1),
        components={k: round(v, 1) for k, v in components.items()}
    )


def run(lat: float, lon: float, days: int, start_date: Optional[str], almanac_mode: str, almanac_file: Optional[str]) -> List[ForecastScore]:
    base = dt.date.fromisoformat(start_date) if start_date else dt.date.today()
    out: List[ForecastScore] = []
    for d in range(days):
        day = DayInputs(date=base + dt.timedelta(days=d), lat=lat, lon=lon)
        out.append(forecast_for_day(day, almanac_mode, almanac_file))
    return out


# --------------------------- CLI ---------------------------

def clamp(lo: float, hi: float, x: float) -> float:
    return max(lo, min(hi, x))

def main():
    p = argparse.ArgumentParser(description="Fishing forecast using lunar, weather, and Farmer's Almanac data.")
    p.add_argument("--lat", type=float, required=True)
    p.add_argument("--lon", type=float, required=True)
    p.add_argument("--days", type=int, default=3)
    p.add_argument("--start-date", type=str, help="YYYY-MM-DD (default: today)")
    p.add_argument("--almanac-mode", choices=["api", "file", "none"], default="api")
    p.add_argument("--almanac-file", type=str, help="Path to local almanac JSON (when --almanac-mode=file)")
    args = p.parse_args()

    results = run(args.lat, args.lon, args.days, args.start_date, args.almanac_mode, args.almanac_file)

    # Minimal, machine-friendly output
    print(json.dumps([{
        "date": r.date.isoformat(),
        "bite_score_0_100": r.bite_score_0_100,
        "components": r.components,
        "moon": {
            "phase_angle_deg": round(r.moon.phase_angle_deg, 2),
            "illumination_0_1": round(r.moon.illumination, 3),
            "phase_name": r.moon.phase_name
        },
        "weather": {
            "temp_c": round(r.weather.temp_c, 1),
            "temp_f": round(r.weather.temp_c * 9/5 + 32, 1),
            "wind_kph": round(r.weather.wind_kph, 1),
            "precip_mm": round(r.weather.precip_mm, 2),
            "cloud_pct": round(r.weather.cloud_pct, 0),
            "pressure_hpa": None if r.weather.pressure_hpa is None else round(r.weather.pressure_hpa, 1)
        },
        "almanac": {
            "rating_0_1": r.almanac.rating_0_1,
            "notes": r.almanac.notes
        }
    } for r in results], indent=2))

if __name__ == "__main__":
    main()
