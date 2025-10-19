import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import Results from "./pages/Results";
import About from "./pages/About";

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="theme-toggle"
        aria-label="Toggle theme"
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      <header className="header">
        <div className="header-container">
          <div className="header-content">
            {/* Mission Logo & Title */}
            <div className="header-brand">
              <div className="brand-icon">🎣</div>
              <div className="brand-text">
                <h1 className="brand-title">TACTICAL FISHING INTEL</h1>
                <span className="brand-subtitle">
                  MISSION-READY FORECASTING
                </span>
              </div>
            </div>

            {/* Navigation Controls */}
            <nav className="header-nav">
              <div className="nav-primary">
                <a
                  href="#/"
                  className="nav-link"
                  data-section="intel"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">🏠</span>
                  <span className="nav-text">INTEL</span>
                </a>
                <a
                  href="#/about"
                  className="nav-link"
                  data-section="mission"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">📋</span>
                  <span className="nav-text">MISSION</span>
                </a>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                className={`mobile-menu-toggle ${
                  mobileMenuOpen ? "active" : ""
                }`}
                onClick={toggleMobileMenu}
                aria-label="Toggle navigation"
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
            </nav>
          </div>

          {/* Status Bar */}
          <div className="status-bar">
            <div className="status-indicator">
              <span className="status-dot active"></span>
              <span className="status-text">SYSTEM OPERATIONAL</span>
            </div>
            <div className="timestamp">
              {new Date().toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              LOCAL
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
            <div
              className="mobile-menu-content"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="mobile-nav">
                <a
                  href="#/"
                  className="mobile-nav-link"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">🏠</span>
                  <span className="nav-text">INTEL HUB</span>
                  <span className="nav-description">Mission Control</span>
                </a>
                <a
                  href="#/about"
                  className="mobile-nav-link"
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">📋</span>
                  <span className="nav-text">MISSION BRIEF</span>
                  <span className="nav-description">System Info</span>
                </a>
              </nav>
            </div>
          </div>
        )}
      </header>

      <main className="animate-slide-in">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
