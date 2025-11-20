import "@testing-library/jest-dom";

// Mock tz-lookup for tests
vi.mock("tz-lookup", () => ({
  default: () => "America/New_York",
}));

// Mock fetch for tests
globalThis.fetch = vi.fn();

// Mock AbortSignal.timeout
if (!globalThis.AbortSignal.timeout) {
  globalThis.AbortSignal.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}
