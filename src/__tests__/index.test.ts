import { describe, expect, it, beforeEach, mock } from "bun:test";
import createGoatPlugin from "../index";

describe("GOAT Plugin", () => {
  it("should export a function", () => {
    expect(typeof createGoatPlugin).toBe("function");
  });

  it("should return a plugin object with correct structure", async () => {
    const mockGetSetting = mock().mockReturnValue(undefined);

    const plugin = await createGoatPlugin(mockGetSetting);

    expect(plugin).toBeDefined();
    expect(plugin.name).toBe("[GOAT] Onchain Actions");
    expect(plugin.description).toBe("Mode integration plugin");
    expect(Array.isArray(plugin.providers)).toBe(true);
    expect(Array.isArray(plugin.actions)).toBe(true);
    expect(Array.isArray(plugin.evaluators)).toBe(true);
    expect(Array.isArray(plugin.services)).toBe(true);
    expect(plugin.evaluators).toEqual([]);
    expect(plugin.services).toEqual([]);
  });

  it("should handle missing wallet configuration", async () => {
    const mockGetSetting = mock().mockImplementation((key: string) => {
      if (key === "EVM_PROVIDER_URL") return "https://test.com";
      return undefined; // No private key
    });

    const plugin = await createGoatPlugin(mockGetSetting);

    expect(plugin.actions).toHaveLength(0);
    expect(plugin.providers).toHaveLength(1);
  });
});
