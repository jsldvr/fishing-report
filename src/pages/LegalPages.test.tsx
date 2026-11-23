import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ComplianceStatement from "./ComplianceStatement";
import CookieConsent from "./CookieConsent";
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";
import { IP_LOCATION_SERVICES } from "../lib/locationLookup";

const APP_NAME = "Fishing Forecast";

const legalPages: Array<{ title: string; Page: ComponentType }> = [
  { title: "Compliance Statement", Page: ComplianceStatement },
  { title: "Cookie Consent", Page: CookieConsent },
  { title: "Privacy Policy", Page: PrivacyPolicy },
  { title: "Terms of Service", Page: TermsOfService },
];

describe("legal and consent pages", () => {
  it.each(legalPages)(
    "$title names the app Fishing Forecast",
    ({ title, Page }) => {
      const { container } = render(<Page />);

      expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible();
      expect(container).toHaveTextContent(APP_NAME);
      expect(container).not.toHaveTextContent(/fishing report/i);
    }
  );

  it("keeps the Privacy Policy domain reference unchanged", () => {
    const { container } = render(<PrivacyPolicy />);

    expect(container).toHaveTextContent("scoped to the fishing-report domain");
  });

  it("discloses the IP location fallback and every lookup service it uses", () => {
    const { container } = render(<PrivacyPolicy />);

    expect(
      screen.getByRole("heading", { name: "Location Lookup and Third-Party Services" })
    ).toBeVisible();
    expect(container).toHaveTextContent(
      /falls back to an approximate location based on your IP address/
    );
    for (const host of IP_LOCATION_SERVICES.map((service) => service.host)) {
      expect(container).toHaveTextContent(host);
    }
    expect(container).toHaveTextContent(
      "does not write the response or your coordinates to the browser console"
    );
  });
});
