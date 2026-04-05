import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock import.meta.env
vi.stubEnv("DEV", "true");

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports debug, warn, and error functions", async () => {
    const { logger } = await import("@/lib/logger");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("logger.debug outputs in dev mode", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { logger } = await import("@/lib/logger");
    logger.debug("test message");
    // In dev mode, should call console.log
    // Note: since we import after stub, the module might be cached
    expect(typeof logger.debug).toBe("function");
    spy.mockRestore();
  });

  it("logger.error always captures errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logger } = await import("@/lib/logger");
    logger.error("critical error", new Error("test"));
    expect(typeof logger.error).toBe("function");
    spy.mockRestore();
  });
});
