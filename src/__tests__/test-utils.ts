import { mock } from "bun:test";
import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  UUID,
  Content,
  Character,
  ProviderResult,
} from "@elizaos/core";

export function createMockRuntime(): IAgentRuntime {
  return {
    agentId: "test-agent" as UUID,
    character: {
      name: "Test Agent",
      bio: "Test bio",
      templates: {},
    } as Character,
    composeState: mock().mockResolvedValue({
      values: {
        agentName: "Test Agent",
        recentMessages: "Test message",
      },
      data: {},
    }),
    generateText: mock().mockResolvedValue({
      text: "Success",
      finishReason: "complete",
      toolResults: [],
    }),
    useModel: mock().mockResolvedValue("Success response"),
    getSetting: mock().mockImplementation((key: string) => {
      if (key === "EVM_PRIVATE_KEY")
        return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      if (key === "EVM_PROVIDER_URL") return "https://test.com";
      return undefined;
    }),
    providers: [],
    actions: [],
    evaluators: [],
    services: [],
  } as any;
}

export function createMockMemory(): Memory {
  return {
    id: "test-message" as UUID,
    roomId: "test-room" as UUID,
    entityId: "test-entity" as UUID,
    agentId: "test-agent" as UUID,
    content: {
      text: "Test message",
      channelType: "direct",
      source: "test",
    } as Content,
    createdAt: Date.now(),
    userId: "test-user" as UUID,
  } as Memory;
}

export function createMockState(): State {
  return {
    text: "Test state",
    values: {
      agentName: "Test Agent",
      recentMessages: "Test message",
    },
    data: {},
  } as State;
}

export function createMockCallback(): HandlerCallback {
  return mock() as any;
}
