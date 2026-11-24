import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import LocationInput from "./LocationInput";

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

function positionError(code: number): GeolocationPositionError {
  return {
    code,
    message: "denied",
    PERMISSION_DENIED,
    POSITION_UNAVAILABLE,
    TIMEOUT,
  } as GeolocationPositionError;
}

function position(latitude: number, longitude: number): GeolocationPosition {
  return { coords: { latitude, longitude } } as GeolocationPosition;
}

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

/**
 * Scripted geolocation: each getCurrentPosition / watchPosition call takes the
 * next queued outcome. getCurrentPosition answers synchronously for brevity;
 * watchPosition answers in a microtask, as the spec queues its callbacks after
 * the watch id is returned.
 */
function installGeolocation(
  outcomes: Array<{ ok: GeolocationPosition } | { error: number } | "pending">
) {
  const queue = [...outcomes];
  const respond = (success: SuccessCallback, failure?: ErrorCallback) => {
    const next = queue.shift();
    if (!next || next === "pending") return;
    if ("ok" in next) success(next.ok);
    else failure?.(positionError(next.error));
  };
  const geolocation = {
    getCurrentPosition: vi.fn(respond),
    watchPosition: vi.fn((success: SuccessCallback, failure?: ErrorCallback) => {
      queueMicrotask(() => respond(success, failure));
      return 7;
    }),
    clearWatch: vi.fn(),
  };
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: geolocation,
  });
  return geolocation;
}

function renderInput(props: Partial<Parameters<typeof LocationInput>[0]> = {}) {
  const onLocationChange = vi.fn();
  const onValidityChange = vi.fn();
  render(
    <LocationInput
      onLocationChange={onLocationChange}
      onValidityChange={onValidityChange}
      {...props}
    />
  );
  return { onLocationChange, onValidityChange };
}

function latitude() {
  return screen.getByLabelText(/latitude/i) as HTMLInputElement;
}

function longitude() {
  return screen.getByLabelText(/longitude/i) as HTMLInputElement;
}

function search() {
  return screen.getByLabelText("Search") as HTMLInputElement;
}

function status() {
  return screen.getByRole("status");
}

let consoleSpies: Array<ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
  vi.mocked(fetch).mockReset();
  consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map(
    (method) => vi.spyOn(console, method).mockImplementation(() => undefined)
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("LocationInput validity", () => {
  it("reports the visible coordinates as valid and publishes them", () => {
    const { onLocationChange, onValidityChange } = renderInput();
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    expect(onLocationChange).toHaveBeenLastCalledWith(40.7128, -74.006, undefined);
    expect(latitude()).toHaveAttribute("aria-invalid", "false");
    expect(latitude()).not.toHaveAttribute("aria-describedby");
  });

  it("reports invalid as soon as a coordinate is cleared, without publishing it", () => {
    const { onLocationChange, onValidityChange } = renderInput();
    onLocationChange.mockClear();

    fireEvent.change(latitude(), { target: { value: "" } });

    expect(onValidityChange).toHaveBeenLastCalledWith(false);
    expect(onLocationChange).not.toHaveBeenCalled();
    // The error waits for the user to leave the field.
    expect(latitude()).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("Enter a latitude.")).toBeNull();
  });

  it("connects each field's error after blur and clears it when fixed", () => {
    const { onValidityChange } = renderInput();

    fireEvent.change(longitude(), { target: { value: "-10" } });
    fireEvent.blur(longitude());

    const error = screen.getByText(
      "Longitude must be between -180 and -50 for North America."
    );
    expect(error).toHaveAttribute("id", "longitude-error");
    expect(longitude()).toHaveAttribute("aria-invalid", "true");
    expect(longitude()).toHaveAttribute("aria-describedby", "longitude-error");
    expect(longitude()).toHaveAccessibleDescription(
      "Longitude must be between -180 and -50 for North America."
    );
    expect(latitude()).toHaveAttribute("aria-invalid", "false");

    fireEvent.change(longitude(), { target: { value: "-80" } });
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    expect(longitude()).toHaveAttribute("aria-invalid", "false");
    expect(longitude()).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText(/Longitude must be between/)).toBeNull();
  });

  it("announces a new error once through the polite region after a delay", () => {
    vi.useFakeTimers();
    renderInput();
    const announcer = document.getElementById("location-error-announcer");
    expect(announcer).toHaveAttribute("aria-live", "polite");

    fireEvent.change(latitude(), { target: { value: "99" } });
    fireEvent.blur(latitude());
    expect(announcer).toHaveTextContent("");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(announcer).toHaveTextContent(
      "Latitude: Latitude must be between 14 and 83 for North America."
    );

    // Leaving the same still-invalid field again does not repeat it.
    fireEvent.focus(latitude());
    fireEvent.blur(latitude());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(announcer).toHaveTextContent(
      "Latitude: Latitude must be between 14 and 83 for North America."
    );
  });

  it("resynchronizes from a new prefill", () => {
    const onLocationChange = vi.fn();
    const { rerender } = render(
      <LocationInput onLocationChange={onLocationChange} prefillToken={0} />
    );
    rerender(
      <LocationInput
        onLocationChange={onLocationChange}
        initialLat={47.6}
        initialLon={-122.3}
        initialName="Seattle"
        prefillToken={1}
      />
    );
    expect(latitude().value).toBe("47.6");
    expect(longitude().value).toBe("-122.3");
    expect(search().value).toBe("Seattle");
    expect(onLocationChange).toHaveBeenLastCalledWith(47.6, -122.3, "Seattle");
  });
});

describe("LocationInput search", () => {
  it("does not search while an IME composition is active", () => {
    renderInput();
    fireEvent.change(search(), { target: { value: "東京" } });

    fireEvent.keyDown(search(), { key: "Enter", isComposing: true });
    fireEvent.keyDown(search(), { key: "Enter", keyCode: 229 });
    fireEvent.keyDown(search(), { key: "a" });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("searches on a committed Enter", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ features: [{ geometry: { coordinates: [-97.4867, 35.3383] } }] })
    );
    renderInput();
    fireEvent.change(search(), { target: { value: "Moore, OK" } });

    await act(async () => {
      fireEvent.keyDown(search(), { key: "Enter", keyCode: 13 });
    });

    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("photon.komoot.io");
    expect(latitude().value).toBe("35.3383");
    expect(longitude().value).toBe("-97.4867");
  });

  it("applies coordinates typed into search without a network request", async () => {
    renderInput();
    fireEvent.change(search(), { target: { value: "35.3383, -97.4867" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Search" }));
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(latitude().value).toBe("35.3383");
  });

  it("reports results outside North America in the status region", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ features: [{ geometry: { coordinates: [2.35, 48.85] } }] })
    );
    renderInput();
    fireEvent.change(search(), { target: { value: "Paris" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Search" }));
    });
    expect(status()).toHaveTextContent("Location is outside North America.");
    expect(latitude().value).toBe("40.7128");
  });

  it("falls back to common locations, then explains a miss", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    renderInput();

    fireEvent.change(search(), { target: { value: "Denver, CO" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Search" }));
    });
    expect(latitude().value).toBe("39.7392");

    vi.mocked(fetch).mockResolvedValue(jsonResponse({ features: [] }));
    fireEvent.change(search(), { target: { value: "Nowhere Lake" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Search" }));
    });
    expect(status()).toHaveTextContent('Location "Nowhere Lake" not found.');
  });
});

describe("LocationInput device and IP location", () => {
  it("discloses the IP fallback on the button before it is used", () => {
    renderInput();
    const button = screen.getByRole("button", { name: /use my location/i });
    expect(button).toHaveAttribute("aria-describedby", "location-privacy-notice");
    expect(button).toHaveAccessibleDescription(
      expect.stringContaining("your IP address is sent to a third-party lookup service")
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "#/privacy"
    );
  });

  it("uses the device location when permitted", () => {
    installGeolocation([{ ok: position(44.97781, -93.26501) }]);
    renderInput();
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    expect(latitude().value).toBe("44.9778");
    expect(longitude().value).toBe("-93.2650");
  });

  it("rejects a device location outside North America", () => {
    installGeolocation([{ ok: position(51.5, -0.12) }]);
    renderInput();
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    expect(status()).toHaveTextContent("outside North America");
  });

  it("falls back to IP location on denial without logging the response or coordinates", async () => {
    installGeolocation([{ error: PERMISSION_DENIED }]);
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        ip: "203.0.113.7",
        latitude: 35.4676,
        longitude: -97.5164,
        city: "Oklahoma City",
        region: "Oklahoma",
      })
    );
    renderInput();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    });

    expect(latitude().value).toBe("35.4676");
    expect(search().value).toBe("Oklahoma City, Oklahoma");
    const logged = consoleSpies
      .flatMap((spy) => spy.mock.calls.flat())
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
      .join("\n");
    expect(logged).not.toMatch(/35\.4676|-97\.5164|203\.0\.113\.7|Oklahoma/);
  });

  it("explains when denial and every IP service fail", async () => {
    installGeolocation([{ error: PERMISSION_DENIED }]);
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false));
    renderInput();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    });
    expect(status()).toHaveTextContent("Location permission denied.");
    expect(screen.getByRole("button", { name: /use my location/i })).toBeEnabled();
  });

  it("retries with watchPosition after a quick-location timeout", async () => {
    const geolocation = installGeolocation([
      { error: TIMEOUT },
      { ok: position(41.8781, -87.6298) },
    ]);
    renderInput();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    });
    expect(geolocation.watchPosition).toHaveBeenCalledTimes(1);
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
    expect(latitude().value).toBe("41.8781");
  });

  it("tries a last resort, then IP, then explains the failure", async () => {
    installGeolocation([
      { error: TIMEOUT },
      { error: POSITION_UNAVAILABLE },
      { error: POSITION_UNAVAILABLE },
    ]);
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false));
    renderInput();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    });
    expect(status()).toHaveTextContent(
      "Unable to get your location. Location services are unavailable. Please enter coordinates manually."
    );
  });

  it("abandons a silent watchPosition after five seconds", async () => {
    vi.useFakeTimers();
    const geolocation = installGeolocation([
      { error: TIMEOUT },
      "pending",
      { ok: position(29.7604, -95.3698) },
    ]);
    renderInput();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    });
    expect(screen.getByRole("button", { name: /finding your location/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(latitude().value).toBe("29.7604");
  });

  it("explains when geolocation is unsupported", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
    renderInput();
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    expect(status()).toHaveTextContent("Geolocation is not supported by this browser.");
  });
});
