import type {
  NWSAlert,
  NWSPointMetadata,
  NWSOfficeInfo,
  LocalWeatherOfficeInfo,
  MarineWeatherData,
  SafetyAssessment,
  EnhancedWeatherData,
  WeatherData,
  DayInputs,
} from "../types/forecast.js";

interface NWSPointResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecastOffice: string;
    forecastZone: string;
    county: string;
    fireWeatherZone: string;
    timeZone: string;
  };
}

interface NWSGridpointResponse {
  properties: {
    temperature?: { values: Array<{ validTime: string; value: number }> };
    windSpeed?: { values: Array<{ validTime: string; value: number }> };
    probabilityOfPrecipitation?: {
      values: Array<{ validTime: string; value: number }>;
    };
    skyCover?: { values: Array<{ validTime: string; value: number }> };
    pressure?: { values: Array<{ validTime: string; value: number }> };
    waveHeight?: { values: Array<{ validTime: string; value: number }> };
    primarySwellDirection?: {
      values: Array<{ validTime: string; value: number }>;
    };
    waterTemperature?: { values: Array<{ validTime: string; value: number }> };
    visibility?: { values: Array<{ validTime: string; value: number }> };
    windWaveHeight?: { values: Array<{ validTime: string; value: number }> };
  };
}

interface NWSAlertsResponse {
  features: Array<{
    id: string;
    properties: {
      headline: string;
      severity: string;
      urgency: string;
      certainty: string;
      event: string;
      description: string;
      instruction?: string;
      areaDesc: string;
    };
  }>;
}

interface NWSOfficeResponse {
  "@id": string;
  name: string;
  address: {
    "@type": string;
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
  };
  telephone: string;
  faxNumber: string;
  email: string;
  nwsRegion: string;
  parentOrganization: string;
  responsibleCounties: string[];
  responsibleForecastZones: string[];
  responsibleFireZones: string[];
  approvedObservationStations: string[];
}

export class NWSWeatherService {
  private readonly baseUrl = "https://api.weather.gov";
  private readonly userAgent = "(fishing-report-app, jsldvr@example.com)";
  private readonly timeout = 15000;

  private async fetchWithHeaders(url: string): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/geo+json",
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `NWS API error: ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  async getPointMetadata(lat: number, lon: number): Promise<NWSPointMetadata> {
    try {
      const url = `${this.baseUrl}/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
      const response = await this.fetchWithHeaders(url);
      const data: NWSPointResponse = await response.json();

      return {
        gridId: data.properties.gridId,
        gridX: data.properties.gridX,
        gridY: data.properties.gridY,
        forecastOffice: data.properties.forecastOffice,
        forecastZone: data.properties.forecastZone,
        county: data.properties.county,
        fireWeatherZone: data.properties.fireWeatherZone,
        timeZone: data.properties.timeZone,
      };
    } catch (error) {
      console.warn("Failed to get NWS point metadata:", error);
      throw error;
    }
  }

  async getGridpointData(
    gridId: string,
    gridX: number,
    gridY: number
  ): Promise<NWSGridpointResponse> {
    try {
      const url = `${this.baseUrl}/gridpoints/${gridId}/${gridX},${gridY}`;
      const response = await this.fetchWithHeaders(url);
      return await response.json();
    } catch (error) {
      console.warn("Failed to get NWS gridpoint data:", error);
      throw error;
    }
  }

  async getActiveAlerts(zone: string): Promise<NWSAlert[]> {
    try {
      const url = `${this.baseUrl}/alerts/active/zone/${zone}`;
      const response = await this.fetchWithHeaders(url);
      const data: NWSAlertsResponse = await response.json();

      return data.features.map((feature) => ({
        id: feature.id,
        headline: feature.properties.headline,
        severity: feature.properties.severity as NWSAlert["severity"],
        urgency: feature.properties.urgency as NWSAlert["urgency"],
        certainty: feature.properties.certainty as NWSAlert["certainty"],
        event: feature.properties.event,
        description: feature.properties.description,
        instruction: feature.properties.instruction,
        areas: [feature.properties.areaDesc],
      }));
    } catch (error) {
      console.warn("Failed to get NWS alerts:", error);
      return [];
    }
  }

  async getOfficeInfo(officeId: string): Promise<NWSOfficeInfo | null> {
    try {
      const url = `${this.baseUrl}/offices/${officeId}`;
      const response = await this.fetchWithHeaders(url);
      const data: NWSOfficeResponse = await response.json();

      return {
        id: officeId,
        name: data.name || "Unknown Office",
        address: {
          streetAddress: data.address?.streetAddress || "",
          addressLocality: data.address?.addressLocality || "",
          addressRegion: data.address?.addressRegion || "",
          postalCode: data.address?.postalCode || "",
        },
        telephone: data.telephone || "",
        faxNumber: data.faxNumber || "",
        email: data.email || "",
        nwsRegion: data.nwsRegion || "",
        parentOrganization: data.parentOrganization || "",
        responsibleCounties: data.responsibleCounties || [],
        responsibleForecastZones: data.responsibleForecastZones || [],
        responsibleFireZones: data.responsibleFireZones || [],
        approvedObservationStations: data.approvedObservationStations || [],
      };
    } catch (error) {
      console.warn(`Failed to get NWS office info for ${officeId}:`, error);
      return null;
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async getLocalOfficeInfo(
    officeUrl: string,
    userLat: number,
    userLon: number
  ): Promise<LocalWeatherOfficeInfo | null> {
    try {
      const officeId = officeUrl.split("/").pop();
      if (!officeId) return null;

      const office = await this.getOfficeInfo(officeId);
      if (!office) return null;

      // NWS office coordinates (approximated from major offices)
      const officeCoords = this.getNWSOfficeCoordinates(officeId);
      const distance = officeCoords
        ? this.calculateDistance(
            userLat,
            userLon,
            officeCoords.lat,
            officeCoords.lon
          )
        : 0;

      return {
        office,
        distance,
        servingArea: `${office.address.addressLocality}, ${office.address.addressRegion}`,
      };
    } catch (error) {
      console.warn("Failed to get local office info:", error);
      return null;
    }
  }

  private getNWSOfficeCoordinates(
    officeId: string
  ): { lat: number; lon: number } | null {
    // Major NWS Weather Forecast Office coordinates
    const nwsOffices: Record<string, { lat: number; lon: number }> = {
      OUN: { lat: 35.1823, lon: -97.2617 }, // Norman, OK
      FWD: { lat: 32.5731, lon: -97.3035 }, // Dallas/Fort Worth, TX
      OKX: { lat: 40.8659, lon: -72.864 }, // New York, NY
      LOX: { lat: 33.9425, lon: -118.4081 }, // Los Angeles, CA
      MIA: { lat: 25.7617, lon: -80.1918 }, // Miami, FL
      CHI: { lat: 41.8781, lon: -87.6298 }, // Chicago, IL
      DEN: { lat: 39.7392, lon: -104.9903 }, // Denver, CO
      SEW: { lat: 47.6062, lon: -122.3321 }, // Seattle, WA
      GRR: { lat: 42.9634, lon: -85.6681 }, // Grand Rapids, MI
      MPX: { lat: 44.9778, lon: -93.265 }, // Minneapolis, MN
      BOX: { lat: 42.3601, lon: -71.0589 }, // Boston, MA
      PHI: { lat: 39.9526, lon: -75.1652 }, // Philadelphia, PA
      CHS: { lat: 32.7767, lon: -79.9311 }, // Charleston, SC
      JAX: { lat: 30.3322, lon: -81.6557 }, // Jacksonville, FL
      HUN: { lat: 34.7304, lon: -86.5855 }, // Huntsville, AL
      LWX: { lat: 38.9072, lon: -77.0369 }, // Washington, DC
      RNK: { lat: 37.2431, lon: -79.9733 }, // Roanoke, VA
      ILN: { lat: 39.4201, lon: -83.8235 }, // Wilmington, OH
      DTX: { lat: 42.6978, lon: -83.4726 }, // Detroit, MI
      GID: { lat: 40.9667, lon: -98.3167 }, // Hastings, NE
      DDC: { lat: 37.7606, lon: -99.9686 }, // Dodge City, KS
      ICT: { lat: 37.6872, lon: -97.3301 }, // Wichita, KS
      SGF: { lat: 37.2089, lon: -93.2923 }, // Springfield, MO
      LSX: { lat: 38.627, lon: -90.1994 }, // St. Louis, MO
      PAH: { lat: 37.0842, lon: -88.772 }, // Paducah, KY
      ILX: { lat: 40.1506, lon: -89.3375 }, // Lincoln, IL
      DVN: { lat: 41.6118, lon: -90.5776 }, // Davenport, IA
      ARX: { lat: 43.3228, lon: -91.1913 }, // La Crosse, WI
      DLH: { lat: 46.8372, lon: -92.2097 }, // Duluth, MN
      FGF: { lat: 47.9201, lon: -97.1828 }, // Grand Forks, ND
      BIS: { lat: 46.8083, lon: -100.7837 }, // Bismarck, ND
      ABR: { lat: 45.4633, lon: -98.4225 }, // Aberdeen, SD
      UNR: { lat: 44.0486, lon: -103.2003 }, // Rapid City, SD
      CYS: { lat: 41.152, lon: -104.8059 }, // Cheyenne, WY
      RIW: { lat: 43.0642, lon: -108.4779 }, // Riverton, WY
      SLC: { lat: 40.7608, lon: -111.891 }, // Salt Lake City, UT
      GJT: { lat: 39.0639, lon: -108.5506 }, // Grand Junction, CO
      PUB: { lat: 38.2544, lon: -104.6091 }, // Pueblo, CO
      ABQ: { lat: 35.0844, lon: -106.6504 }, // Albuquerque, NM
      EPZ: { lat: 31.7619, lon: -106.485 }, // El Paso, TX
      MAF: { lat: 31.9973, lon: -102.1892 }, // Midland, TX
      SJT: { lat: 31.4638, lon: -100.437 }, // San Angelo, TX
      EWX: { lat: 29.704, lon: -98.0284 }, // Austin/San Antonio, TX
      HGX: { lat: 29.4719, lon: -95.0778 }, // Houston, TX
      CRP: { lat: 27.7793, lon: -97.5114 }, // Corpus Christi, TX
      BRO: { lat: 25.9018, lon: -97.4975 }, // Brownsville, TX
      LCH: { lat: 30.1255, lon: -93.2169 }, // Lake Charles, LA
      LIX: { lat: 30.3367, lon: -89.8253 }, // New Orleans, LA
      JAN: { lat: 32.2988, lon: -90.1848 }, // Jackson, MS
      BMX: { lat: 33.1734, lon: -86.77 }, // Birmingham, AL
      FFC: { lat: 33.3637, lon: -84.5658 }, // Atlanta, GA
      TAE: { lat: 30.3965, lon: -84.3747 }, // Tallahassee, FL
      TBW: { lat: 27.7056, lon: -82.4016 }, // Tampa, FL
      MLB: { lat: 28.1133, lon: -80.6453 }, // Melbourne, FL
      KEY: { lat: 24.5557, lon: -81.7826 }, // Key West, FL
    };

    return nwsOffices[officeId] || null;
  }

  private extractValueForDate(
    values: Array<{ validTime: string; value: number }> | undefined,
    targetDate: string
  ): number | undefined {
    if (!values) return undefined;

    const targetDay = targetDate.split("T")[0];
    const dayValues = values.filter((v) => v.validTime.startsWith(targetDay));

    if (dayValues.length === 0) return undefined;

    // Return average of daylight hours (6-18)
    const daylightValues = dayValues.filter((v) => {
      const hour = new Date(v.validTime).getHours();
      return hour >= 6 && hour <= 18;
    });

    if (daylightValues.length === 0) return dayValues[0]?.value;

    const sum = daylightValues.reduce((acc, v) => acc + v.value, 0);
    return sum / daylightValues.length;
  }

  async fetchEnhancedWeather(day: DayInputs): Promise<EnhancedWeatherData> {
    try {
      // Get point metadata
      const pointMetadata = await this.getPointMetadata(day.lat, day.lon);

      // Extract zone ID from the full URL
      const zoneId = pointMetadata.forecastZone.split("/").pop() || "";

      // Get gridpoint data, alerts, and office info in parallel
      const [gridData, alerts, localOffice] = await Promise.all([
        this.getGridpointData(
          pointMetadata.gridId,
          pointMetadata.gridX,
          pointMetadata.gridY
        ),
        this.getActiveAlerts(zoneId),
        this.getLocalOfficeInfo(pointMetadata.forecastOffice, day.lat, day.lon),
      ]);

      // Extract weather data for the target date
      const targetDateTime = `${day.date}T12:00:00Z`;
      const temp = this.extractValueForDate(
        gridData.properties.temperature?.values,
        targetDateTime
      );
      const windSpeed = this.extractValueForDate(
        gridData.properties.windSpeed?.values,
        targetDateTime
      );
      const precipitation = this.extractValueForDate(
        gridData.properties.probabilityOfPrecipitation?.values,
        targetDateTime
      );
      const cloudCover = this.extractValueForDate(
        gridData.properties.skyCover?.values,
        targetDateTime
      );
      const pressure = this.extractValueForDate(
        gridData.properties.pressure?.values,
        targetDateTime
      );

      // Marine data (if available)
      const marine: MarineWeatherData = {
        waveHeight: this.extractValueForDate(
          gridData.properties.waveHeight?.values,
          targetDateTime
        ),
        swellDirection: this.extractValueForDate(
          gridData.properties.primarySwellDirection?.values,
          targetDateTime
        ),
        waterTemperature: this.extractValueForDate(
          gridData.properties.waterTemperature?.values,
          targetDateTime
        ),
        visibility: this.extractValueForDate(
          gridData.properties.visibility?.values,
          targetDateTime
        ),
        windWaveHeight: this.extractValueForDate(
          gridData.properties.windWaveHeight?.values,
          targetDateTime
        ),
      };

      // Only include marine if it has displayable data
      const hasMarineData =
        marine.waveHeight !== undefined ||
        marine.waterTemperature !== undefined;

      // Assess safety
      const safety = this.assessSafety(alerts, {
        tempC: temp || 20,
        windKph: (windSpeed || 10) * 3.6,
        precipMm: (precipitation || 0) / 100,
        cloudPct: cloudCover || 50,
        pressureHpa: pressure ? pressure / 100 : undefined,
      });

      // Calculate barometric trend (simplified)
      const barometricTrend = this.calculateBarometricTrend(
        gridData.properties.pressure?.values,
        targetDateTime
      );

      return {
        tempC: temp || 20,
        windKph: (windSpeed || 10) * 3.6, // m/s to km/h
        precipMm: (precipitation || 0) / 100, // probability to mm (simplified)
        cloudPct: cloudCover || 50,
        pressureHpa: pressure ? pressure / 100 : undefined, // Pa to hPa
        ...(hasMarineData && { marine }),
        safety,
        barometricTrend,
        source: "NWS",
        localOffice: localOffice || undefined,
      };
    } catch (error) {
      console.warn("NWS weather fetch failed, will use fallback:", error);
      throw error;
    }
  }

  private assessSafety(
    alerts: NWSAlert[],
    weather: WeatherData
  ): SafetyAssessment {
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Check alerts for dangerous conditions
    const severeAlerts = alerts.filter(
      (alert) => alert.severity === "Severe" || alert.severity === "Extreme"
    );

    const fishingRelatedAlerts = alerts.filter(
      (alert) =>
        alert.event.toLowerCase().includes("thunderstorm") ||
        alert.event.toLowerCase().includes("wind") ||
        alert.event.toLowerCase().includes("marine") ||
        alert.event.toLowerCase().includes("small craft") ||
        alert.event.toLowerCase().includes("gale") ||
        alert.event.toLowerCase().includes("tornado")
    );

    // Weather-based risk assessment
    if (weather.windKph > 40) {
      riskFactors.push("High winds (>40 km/h)");
      recommendations.push("Consider sheltered fishing spots");
    }

    if (weather.precipMm > 10) {
      riskFactors.push("Heavy precipitation expected");
      recommendations.push("Bring weather protection");
    }

    // Determine overall rating
    let rating: SafetyAssessment["rating"] = "EXCELLENT";

    if (severeAlerts.length > 0) {
      rating = "DANGEROUS";
      recommendations.push("DO NOT FISH - Severe weather expected");
    } else if (fishingRelatedAlerts.length > 0) {
      rating = weather.windKph > 30 ? "POOR" : "FAIR";
      recommendations.push("Exercise extreme caution");
    } else if (riskFactors.length > 2) {
      rating = "FAIR";
    } else if (riskFactors.length > 0) {
      rating = "GOOD";
    }

    return {
      rating,
      activeAlerts: alerts,
      recommendations,
      riskFactors,
    };
  }

  private calculateBarometricTrend(
    pressureValues: Array<{ validTime: string; value: number }> | undefined,
    targetDateTime: string
  ): "RISING" | "FALLING" | "STEADY" {
    if (!pressureValues || pressureValues.length < 2) return "STEADY";

    const targetTime = new Date(targetDateTime).getTime();
    const recentValues = pressureValues
      .filter((v) => {
        const time = new Date(v.validTime).getTime();
        return Math.abs(time - targetTime) <= 6 * 60 * 60 * 1000; // 6 hours
      })
      .sort(
        (a, b) =>
          new Date(a.validTime).getTime() - new Date(b.validTime).getTime()
      );

    if (recentValues.length < 2) return "STEADY";

    const first = recentValues[0].value;
    const last = recentValues[recentValues.length - 1].value;
    const change = last - first;

    if (change > 100) return "RISING"; // >1 hPa rise
    if (change < -100) return "FALLING"; // >1 hPa fall
    return "STEADY";
  }
}

export const nwsWeatherService = new NWSWeatherService();
