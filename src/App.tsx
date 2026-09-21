import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
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
import MissionDrawer from "./components/MissionDrawer";
import ResultsDraftSync from "./state/ResultsDraftSync";
import { MissionProvider } from "./state/MissionProvider";

const APP_VERSION = (packageJson as { version: string }).version;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function App() {
  return (
    <MissionProvider>
      <AppShell />
    </MissionProvider>
  );
}

function AppShell() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const location = useLocation();
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const appShellRef = useRef<HTMLDivElement>(null);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    const initialTheme = savedTheme || systemTheme;

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

  // The mobile navigation menu and the Saved/Recent drawer are mutually
  // exclusive: opening either overlay closes the other.
  const toggleMobileMenu = () => {
    setMobileMenuOpen((open) => !open);
    setDrawerOpen(false);
  };

  // Close mobile menu when clicking nav links
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((open) => !open);
    setMobileMenuOpen(false);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

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

  // A route change must never leave either overlay in a stale open state.
  useEffect(() => {
    setMobileMenuOpen(false);
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

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

  return (
    <div
      className="min-h-screen bg-gradient-to-br"
      id="app-shell"
      data-testid="app-shell"
      ref={appShellRef}
    >
      <ResultsDraftSync />
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="theme-toggle"
        aria-label="Toggle theme"
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        <Icon name={theme === "light" ? "moon" : "sun"} />
      </button>

      <header className="header">
        <div className="header-container">
          <div className="header-content">
            {/* Brand */}
            <div className="header-brand">
              <button
                className="header-brand__drawer-toggle"
                id="mission-drawer-toggle"
                data-testid="mission-drawer-toggle"
                type="button"
                onClick={toggleDrawer}
                aria-label="Open My Forecasts"
                aria-expanded={drawerOpen}
                aria-controls="mission-drawer"
                ref={drawerTriggerRef}
              >
                <Icon name="hamburger" />
              </button>
              <h1 className="brand-title">Fishing Report</h1>
              <div className="app-version" id="app-version">
                v{APP_VERSION}
              </div>
              <div className="timestamp" id="status-timestamp">
                {new Date().toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {installPromptEvent && (
                <button
                  className="btn btn-secondary text-xs px-3 py-1"
                  id="install-app-button"
                  onClick={handleInstallApp}
                  type="button"
                >
                  <Icon name="arrowRight" className="mr-1" />
                  Install App
                </button>
              )}
            </div>

            {/* Navigation Controls */}
            <nav className="header-nav" id="primary-navigation">
              <div className="nav-primary" id="primary-navigation-links">
                <a
                  href="#/"
                  className="nav-link"
                  id="nav-link-home"
                  data-section="home"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">
                    <Icon name="home" />
                  </span>
                  <span className="nav-text">Home</span>
                </a>
                <a
                  href="#/wx"
                  className="nav-link"
                  id="nav-link-wx"
                  data-section="weather"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">
                    <Icon name="weather" />
                  </span>
                  <span className="nav-text">Weather</span>
                </a>
                <a
                  href="#/guide"
                  className="nav-link"
                  id="nav-link-guide"
                  data-section="guide"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">
                    <Icon name="compass" />
                  </span>
                  <span className="nav-text">Guide</span>
                </a>
                <a
                  href="#/about"
                  className="nav-link"
                  id="nav-link-about"
                  data-section="about"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">
                    <Icon name="clipboard" />
                  </span>
                  <span className="nav-text">About</span>
                </a>
              </div>

              {/* Mobile Menu Toggle: a down caret when closed, up when open */}
              <button
                className="mobile-menu-toggle"
                id="mobile-menu-toggle"
                data-testid="mobile-menu-toggle"
                onClick={toggleMobileMenu}
                aria-label="Toggle navigation"
                aria-expanded={mobileMenuOpen}
                data-open={mobileMenuOpen}
              >
                <Icon
                  name="caret"
                  className="mobile-menu-toggle__caret"
                />
              </button>
            </nav>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="mobile-menu-overlay"
            id="mobile-menu-overlay"
            data-testid="mobile-menu-overlay"
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
                  <span className="nav-icon">
                    <Icon name="home" />
                  </span>
                  <span className="nav-text">Home</span>
                  <span className="nav-description">Plan a forecast</span>
                </a>
                <a
                  href="#/wx"
                  className="mobile-nav-link"
                  id="mobile-nav-wx"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">
                    <Icon name="weather" />
                  </span>
                  <span className="nav-text">Weather</span>
                  <span className="nav-description">Official sources</span>
                </a>
                <a
                  href="#/guide"
                  className="mobile-nav-link"
                  id="mobile-nav-guide"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">
                    <Icon name="compass" />
                  </span>
                  <span className="nav-text">Guide</span>
                  <span className="nav-description">Field tips</span>
                </a>
                <a
                  href="#/about"
                  className="mobile-nav-link"
                  id="mobile-nav-about"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">
                    <Icon name="clipboard" />
                  </span>
                  <span className="nav-text">About</span>
                  <span className="nav-description">How it works</span>
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
          This website is for entertainment purposes only and any real life
          outcome is purely coincidental.
        </div>
      </footer>

      <MissionDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        triggerRef={drawerTriggerRef}
        inertTargetRef={appShellRef}
      />
    </div>
  );
}

export default App;
