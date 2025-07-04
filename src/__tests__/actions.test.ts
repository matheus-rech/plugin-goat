import { describe, expect, it, beforeEach, mock } from "bun:test";
import { getOnChainActions } from "../actions";
import {
  createMockRuntime,
  createMockMemory,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("GOAT Actions", () => {
  describe("getOnChainActions", () => {
    it("should export a function", () => {
      expect(typeof getOnChainActions).toBe("function");
    });

    it("should return an array of actions", async () => {
      const mockWallet = {
        getAddress: () => "0x1234",
        getCoreTools: () => [],
        getChain: () => ({ name: "Mode", id: 34443 }),
      };

      const actions = await getOnChainActions(mockWallet);

      expect(Array.isArray(actions)).toBe(true);
      if (actions.length > 0) {
        expect(actions[0]).toHaveProperty("name");
        expect(actions[0]).toHaveProperty("description");
        expect(actions[0]).toHaveProperty("handler");
        expect(actions[0]).toHaveProperty("validate");
      }
    });
  });

  describe("Action Handler", () => {
    it("should handle action execution", async () => {
      const mockWallet = {
        getAddress: () => "0x1234",
        getCoreTools: () => [],
        getChain: () => ({ name: "Mode", id: 34443 }),
      };

      const actions = await getOnChainActions(mockWallet);
      if (actions.length === 0) return; // Skip if no actions

      const action = actions[0];
      const runtime = createMockRuntime();
      const message = createMockMemory();
      const state = createMockState();
      const callback = createMockCallback();

      // Test validation
      const isValid = await action.validate();
      expect(isValid).toBe(true);

      // Test handler
      const result = await action.handler(
        runtime,
        message,
        state,
        {},
        callback
      );
      expect(typeof result).toBe("boolean");

      // Verify callback was called
      expect(callback).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      const mockWallet = {
        getAddress: () => "0x1234",
        getCoreTools: () => [],
        getChain: () => ({ name: "Mode", id: 34443 }),
      };

      const actions = await getOnChainActions(mockWallet);
      if (actions.length === 0) {
        // If no actions were created (due to chain support), that's ok
        expect(actions).toEqual([]);
        return;
      }

      const action = actions[0];
      const runtime = createMockRuntime();
      const message = createMockMemory();
      const state = createMockState();
      const callback = createMockCallback();

      // Make generateText throw an error first, then succeed on second call
      let callCount = 0;
      runtime.useModel = mock().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Test error"));
        }
        return Promise.resolve({
          text: "Error response generated",
          finishReason: "complete",
          toolResults: [],
        });
      });

      // Handler should handle the error and return false
      const result = await action.handler(
        runtime,
        message,
        state,
        {},
        callback
      );

      expect(result).toBe(false);

      // The callback should have been called
      expect(callback).toHaveBeenCalled();
      const callbackCall = (callback as any).mock.calls[0][0];
      expect(callbackCall).toHaveProperty("text");
      expect(callbackCall).toHaveProperty("content");
      expect(callbackCall.content).toHaveProperty("error", "Test error");
    });
  });
});
