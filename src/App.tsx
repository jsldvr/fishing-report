import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, useLayoutEffect } from "react";
import packageJson from "../package.json";
import Home from "./pages/Home";
import Results from "./pages/Results";
import About from "./pages/About";
import Wx from "./pages/Wx";
import Guide from "./pages/Guide";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookieConsent from "./pages/CookieConsent";
import ComplianceStatement from "./pages/ComplianceStatement";
import Icon from "./components/Icon";

const APP_VERSION = (packageJson as { version: string }).version;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const location = useLocation();
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const rawTheme = localStorage.getItem("theme");
    const savedTheme: "light" | "dark" | null =
      rawTheme === "light" || rawTheme === "dark" ? rawTheme : null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    const initialTheme = savedTheme ?? systemTheme;

    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when clicking nav links
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const systemTheme = e.matches ? "dark" : "light";
        setTheme(systemTheme);
        document.documentElement.setAttribute("data-theme", systemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Handle scroll restoration on route changes
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, []);

  const handleInstallApp = async () => {
    if (!installPromptEvent) {
      return;
    }

    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
        setInstallPromptEvent(null);
      }
    } catch (error) {
      console.error("Failed to complete app installation prompt:", error);
    }
  };

  const getRouteLabel = () => {
    if (location.pathname === "/") return "Home";
    if (location.pathname === "/results") return "Results";
    if (location.pathname === "/about") return "About";
    if (location.pathname === "/wx") return "Weather Resources";
    if (location.pathname === "/guide") return "Guide";
    return "Fishing Forecast";
  };

  const getContextLine = () => {
    if (location.pathname === "/") {
      return "Use location, timing, and observed conditions to generate a daily forecast.";
    }

    if (location.pathname === "/results") {
      const params = new URLSearchParams(location.search);
      const locationLabel = params.get("name");
      const lat = params.get("lat");
      const lon = params.get("lon");
      const startDate = params.get("startDate");
      const days = params.get("days");
      const coords = lat && lon ? `${Number.parseFloat(lat).toFixed(4)}, ${Number.parseFloat(lon).toFixed(4)}` : "Location pending";
      const displayLocation = locationLabel || coords;
      const dateWindow =
        startDate && days ? `${startDate} for ${days} day${days === "1" ? "" : "s"}` : "Date window pending";

      return `${displayLocation} | ${dateWindow} | ${isOffline ? "Offline" : "Online"}`;
    }

    return "Forecast planning interface for North American waters.";
  };

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br" id="app-shell">
      <header className="app-shell__header" id="app-shell-header">
        <div className="app-shell__topbar" id="app-shell-topbar">
          <div className="app-shell__brand" id="app-shell-brand">
            <a className="app-shell__brand-link" id="app-shell-brand-link" href="#/">
              <Icon name="fish" />
              Fishing Forecast
            </a>
          </div>

          <div className="app-shell__route" id="app-shell-route-label">
            {getRouteLabel()}
          </div>

          <div className="app-shell__utilities" id="app-shell-utilities">
            <nav className="app-shell__nav" id="primary-navigation">
              <a className="app-shell__nav-link" id="nav-link-home" href="#/" onClick={closeMobileMenu}>
                Home
              </a>
              <a className="app-shell__nav-link" id="nav-link-wx" href="#/wx" onClick={closeMobileMenu}>
                Weather
              </a>
              <a className="app-shell__nav-link" id="nav-link-guide" href="#/guide" onClick={closeMobileMenu}>
                Guide
              </a>
              <a className="app-shell__nav-link" id="nav-link-about" href="#/about" onClick={closeMobileMenu}>
                About
              </a>
            </nav>

            {installPromptEvent && (
              <button
                className="btn btn-secondary app-shell__install-button"
                id="install-app-button"
                onClick={handleInstallApp}
                type="button"
              >
                Install App
              </button>
            )}

            <button
              className="app-shell__theme-toggle"
              id="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} />
            </button>

            <button
              className={`mobile-menu-toggle ${mobileMenuOpen ? "active" : ""}`}
              id="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle navigation"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>
        </div>

        <div className="app-shell__context-strip" id="app-shell-context-strip">
          <p className="app-shell__context-copy" id="app-shell-context-copy">
            {getContextLine()}
          </p>
          <p className="app-shell__version" id="app-version">
            v{APP_VERSION}
          </p>
        </div>

        {mobileMenuOpen && (
          <div
            className="mobile-menu-overlay"
            id="mobile-menu-overlay"
            onClick={closeMobileMenu}
          >
            <div
              className="mobile-menu-content"
              id="mobile-menu-content"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="mobile-nav" id="mobile-navigation">
                <a
                  href="#/"
                  className="mobile-nav-link"
                  id="mobile-nav-home"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-text">Home</span>
                  <span className="nav-description">Forecast setup</span>
                </a>
                <a
                  href="#/wx"
                  className="mobile-nav-link"
                  id="mobile-nav-wx"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-text">Weather</span>
                  <span className="nav-description">Official resources</span>
                </a>
                <a
                  href="#/guide"
                  className="mobile-nav-link"
                  id="mobile-nav-guide"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-text">GUIDE</span>
                  <span className="nav-description">Method overview</span>
                </a>
                <a
                  href="#/about"
                  className="mobile-nav-link"
                  id="mobile-nav-about"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-text">About</span>
                  <span className="nav-description">Sources and approach</span>
                </a>
              </nav>
            </div>
          </div>
        )}
      </header>

      <main className="animate-slide-in" id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/about" element={<About />} />
          <Route path="/wx" element={<Wx />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cookies" element={<CookieConsent />} />
          <Route path="/compliance" element={<ComplianceStatement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer" id="site-footer">
        <div className="footer-links" id="footer-links">
          <a href="#/privacy" className="footer-link" id="footer-link-privacy">
            Privacy Policy
          </a>
          <a href="#/terms" className="footer-link" id="footer-link-terms">
            Terms of Service
          </a>
          <a href="#/cookies" className="footer-link" id="footer-link-cookies">
            Cookie Consent
          </a>
          <a
            href="#/compliance"
            className="footer-link"
            id="footer-link-compliance"
          >
            Compliance
          </a>
        </div>
        <div className="footer-disclaimer" id="site-disclaimer">
          Forecast output is planning guidance and should be verified with
          official marine and weather advisories.
        </div>
      </footer>
    </div>
  );
}

export default App;
