import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LocationInput from "./LocationInput";

describe("LocationInput", () => {
  const onLocationChange = vi.fn();

  beforeEach(() => {
    onLocationChange.mockReset();
  });

  function renderInput() {
    return render(
      <LocationInput
        onLocationChange={onLocationChange}
        initialLat={40.7128}
        initialLon={-74.006}
        initialName=""
      />
    );
  }

  describe("geocode button", () => {
    it("has id='geocode-submit'", () => {
      renderInput();
      const button = screen.getByRole("button", { name: /recon/i });
      expect(button).toHaveAttribute("id", "geocode-submit");
    });

    it("is disabled when location name is empty", () => {
      renderInput();
      const button = screen.getByRole("button", { name: /recon/i });
      expect(button).toBeDisabled();
    });

    it("shows inline error when geocoded result is outside North America", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              features: [
                {
                  geometry: { coordinates: [2.3522, 48.8566] }, // Paris — outside NA
                },
              ],
            }),
        })
      );

      renderInput();
      const input = screen.getByPlaceholderText(/oklahoma city/i);
      fireEvent.change(input, { target: { value: "Paris, France" } });

      fireEvent.click(screen.getByRole("button", { name: /recon/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Location is outside North America")
        ).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });

    it("shows inline error when no location is found by any strategy", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ features: [] }),
        })
      );

      renderInput();
      const input = screen.getByPlaceholderText(/oklahoma city/i);
      fireEvent.change(input, { target: { value: "Totally Unknown Place XYZ" } });

      fireEvent.click(screen.getByRole("button", { name: /recon/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/not found/i)
        ).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });

    it("shows inline error when geocode fetch throws", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValueOnce(new Error("network failure"))
      );

      renderInput();
      const input = screen.getByPlaceholderText(/oklahoma city/i);
      fireEvent.change(input, { target: { value: "Totally Unknown Place XYZ" } });

      fireEvent.click(screen.getByRole("button", { name: /recon/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/not found|Failed to find/i)
        ).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });

    it("does not call window.alert for geocode errors", async () => {
      const alertSpy = vi.spyOn(window, "alert");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ features: [] }),
        })
      );

      renderInput();
      const input = screen.getByPlaceholderText(/oklahoma city/i);
      fireEvent.change(input, { target: { value: "Nowhere" } });
      fireEvent.click(screen.getByRole("button", { name: /recon/i }));

      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });

      expect(alertSpy).not.toHaveBeenCalled();

      alertSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });

  describe("geolocation button", () => {
    it("has id='geolocation-button'", () => {
      renderInput();
      const button = screen.getByRole("button", { name: /gps lock/i });
      expect(button).toHaveAttribute("id", "geolocation-button");
    });

    it("shows inline error when geolocation is not supported", () => {
      const originalGeolocation = navigator.geolocation;
      Object.defineProperty(navigator, "geolocation", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      renderInput();
      fireEvent.click(screen.getByRole("button", { name: /gps lock/i }));

      expect(
        screen.getByText("Geolocation is not supported by this browser")
      ).toBeInTheDocument();

      Object.defineProperty(navigator, "geolocation", {
        value: originalGeolocation,
        writable: true,
        configurable: true,
      });
    });

    it("does not call window.alert for geolocation not supported", () => {
      const alertSpy = vi.spyOn(window, "alert");
      const originalGeolocation = navigator.geolocation;
      Object.defineProperty(navigator, "geolocation", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      renderInput();
      fireEvent.click(screen.getByRole("button", { name: /gps lock/i }));

      expect(alertSpy).not.toHaveBeenCalled();

      alertSpy.mockRestore();
      Object.defineProperty(navigator, "geolocation", {
        value: originalGeolocation,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("stale error cleared on valid manual input", () => {
    it("clears locationError when the user corrects coordinates manually", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              features: [
                {
                  geometry: { coordinates: [2.3522, 48.8566] }, // Paris — outside NA
                },
              ],
            }),
        })
      );

      renderInput();
      const input = screen.getByPlaceholderText(/oklahoma city/i);
      fireEvent.change(input, { target: { value: "Paris, France" } });
      fireEvent.click(screen.getByRole("button", { name: /recon/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Location is outside North America")
        ).toBeInTheDocument();
      });

      // Now user manually enters valid NA coordinates
      fireEvent.change(screen.getByLabelText(/latitude/i), {
        target: { value: "35.4" },
      });
      fireEvent.change(screen.getByLabelText(/longitude/i), {
        target: { value: "-97.5" },
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Location is outside North America")
        ).not.toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });
  });
});
