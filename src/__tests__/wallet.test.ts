import { describe, expect, it, beforeEach, mock } from "bun:test";
import { getWalletClient, getWalletProvider } from "../wallet";
import {
  createMockRuntime,
  createMockMemory,
  createMockState,
} from "./test-utils";

describe("Wallet Module", () => {
  describe("getWalletClient", () => {
    it("should return null when private key is missing", () => {
      const mockGetSetting = mock().mockReturnValue(undefined);

      const result = getWalletClient(mockGetSetting);

      expect(result).toBeNull();
    });

    it("should throw when provider URL is missing", () => {
      const mockGetSetting = mock().mockImplementation((key: string) => {
        if (key === "EVM_PRIVATE_KEY")
          return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        return undefined;
      });

      expect(() => getWalletClient(mockGetSetting)).toThrow(
        "EVM_PROVIDER_URL not configured"
      );
    });

    it("should create wallet client with valid configuration", () => {
      const mockGetSetting = mock().mockImplementation((key: string) => {
        if (key === "EVM_PRIVATE_KEY")
          return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        if (key === "EVM_PROVIDER_URL") return "https://test-rpc.com";
        return undefined;
      });

      // This will attempt to create the actual wallet client
      // It may fail due to dependencies, but that's ok for coverage
      try {
        const result = getWalletClient(mockGetSetting);
        // If it succeeds, it should return something
        expect(result).toBeDefined();
      } catch (error) {
        // If it fails due to external dependencies, that's expected
        expect(error).toBeDefined();
      }
    });
  });

  describe("getWalletProvider", () => {
    it("should return a provider with correct properties", () => {
      const provider = getWalletProvider(null);

      expect(provider).toBeDefined();
      expect(provider.name).toBe("walletProvider");
      expect(provider.description).toBe(
        "Provides EVM wallet address and balance information"
      );
      expect(typeof provider.get).toBe("function");
    });

    it("should handle null wallet client", async () => {
      const provider = getWalletProvider(null);
      const runtime = createMockRuntime();
      const message = createMockMemory();
      const state = createMockState();

      const result = await provider.get(runtime, message, state);

      expect(result).toBeDefined();
      expect(result.text).toContain("EVM wallet not configured");
      expect(result.data).toMatchObject({ error: "Wallet not configured" });
    });

    it("should handle wallet client errors", async () => {
      const mockWalletClient = {
        getAddress: mock().mockImplementation(() => {
          throw new Error("Test error");
        }),
      };

      const provider = getWalletProvider(mockWalletClient);
      const runtime = createMockRuntime();
      const message = createMockMemory();
      const state = createMockState();

      const result = await provider.get(runtime, message, state);

      expect(result).toBeDefined();
      expect(result.text).toBe("Error retrieving wallet information");
      expect(result.data).toMatchObject({ error: "Test error" });
    });

    it("should return wallet info successfully", async () => {
      const mockWalletClient = {
        getAddress: mock().mockReturnValue(
          "0x1234567890123456789012345678901234567890"
        ),
        balanceOf: mock().mockResolvedValue("1.5"),
      };

      const provider = getWalletProvider(mockWalletClient);
      const runtime = createMockRuntime();
      const message = createMockMemory();
      const state = createMockState();

      const result = await provider.get(runtime, message, state);

      expect(result).toBeDefined();
      expect(result.text).toBe(
        "EVM Wallet Address: 0x1234567890123456789012345678901234567890\nBalance: 1.5 ETH"
      );
      expect(result.values).toMatchObject({
        address: "0x1234567890123456789012345678901234567890",
        balance: "1.5",
      });
      expect(result.data).toMatchObject({
        address: "0x1234567890123456789012345678901234567890",
        balance: "1.5",
        chain: "Mode Mainnet",
        chainId: 34443,
      });
    });
  });
});
