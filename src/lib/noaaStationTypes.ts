// NOAA CO-OPS Station Types Investigation
// Based on https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json documentation

/*
Available station types for NOAA CO-OPS:
- tidepredictions: Stations with harmonic tide predictions (coastal/ocean only)
- currents: Current velocity and direction measurements
- waterlevels: Real-time water level observations  
- watertemperature: Water temperature measurements
- wind: Wind speed and direction measurements
- airpressure: Barometric pressure measurements
- conductivity: Water conductivity measurements
- visibility: Visibility measurements
- waterdensity: Water density measurements
- salinity: Salinity measurements
- meteorology: General meteorological observations

The current algorithm only searches for "tidepredictions" stations, which:
1. Excludes Great Lakes stations (minimal tidal effects)
2. Excludes inland water body stations  
3. Forces the algorithm to find distant coastal stations

Better approach: Search for stations with ANY marine data products that would be useful:
- waterlevels (available on Great Lakes)
- watertemperature (available on Great Lakes/inland waters)
- wind (available on Great Lakes/inland waters)
- meteorology (available on Great Lakes/inland waters)
*/

export const NOAA_STATION_TYPES = {
  TIDE_PREDICTIONS: "tidepredictions", // Coastal/ocean only
  WATER_LEVELS: "waterlevels", // Includes Great Lakes
  WATER_TEMPERATURE: "watertemperature", // Includes Great Lakes/inland
  WIND: "wind", // Includes Great Lakes/inland
  METEOROLOGY: "meteorology", // Includes Great Lakes/inland
} as const;

export const PREFERRED_STATION_TYPES = [
  NOAA_STATION_TYPES.WATER_LEVELS, // Try water levels first (Great Lakes)
  NOAA_STATION_TYPES.METEOROLOGY, // Then meteorology (widespread)
  NOAA_STATION_TYPES.WIND, // Then wind data
  NOAA_STATION_TYPES.WATER_TEMPERATURE, // Then water temperature
  NOAA_STATION_TYPES.TIDE_PREDICTIONS, // Finally tide predictions (coastal)
] as const;
