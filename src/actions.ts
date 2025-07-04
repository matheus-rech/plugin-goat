import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { MODE, USDC, erc20 } from "@goat-sdk/plugin-erc20";
import { kim } from "@goat-sdk/plugin-kim";
import { sendETH } from "@goat-sdk/wallet-evm";

import {
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
  composePromptFromState,
  elizaLogger,
} from "@elizaos/core";

export async function getOnChainActions(wallet: any) {
  const actionsWithoutHandler = [
    {
      name: "SWAP_TOKENS",
      description: "Swap two different tokens using KIM protocol",
      similes: [],
      validate: async () => true,
      examples: [],
    },
    // 1. Add your actions here
  ];

  const tools = await getOnChainTools({
    wallet: wallet as any,
    // 2. Configure the plugins you need to perform those actions
    plugins: [sendETH(), erc20({ tokens: [USDC, MODE] }), kim()],
  });

  // 3. Let GOAT handle all the actions
  return actionsWithoutHandler.map((action) => ({
    ...action,
    handler: getActionHandler(action.name, action.description, tools),
  }));
}

function getActionHandler(
  actionName: string,
  actionDescription: string,
  tools: any
) {
  return async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.composeState(message, ["RECENT_MESSAGES"]);
    }

    try {
      // 1. Call the tools needed
      const context = composeActionContext(
        actionName,
        actionDescription,
        currentState
      );
      const result = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: context,
        tools,
        maxSteps: 10,
        // Uncomment to see the log each tool call when debugging
        // onStepFinish: (step) => {
        //     console.log(step.toolResults);
        // },
      });

      // 2. Compose the response
      const response = composeResponseContext(result, currentState);
      const responseText = await generateResponse(runtime, response);

      callback?.({
        text: responseText,
        content: {},
      });
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 3. Compose the error response
      const errorResponse = composeErrorResponseContext(
        errorMessage,
        currentState
      );
      const errorResponseText = await generateResponse(runtime, errorResponse);

      callback?.({
        text: errorResponseText,
        content: { error: errorMessage },
      });
      return false;
    }
  };
}

function composeActionContext(
  actionName: string,
  actionDescription: string,
  state: State
): string {
  const actionTemplate = `
# Knowledge
{{knowledge}}

About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}


# Action: ${actionName}
${actionDescription}

{{recentMessages}}

Based on the action chosen and the previous messages, execute the action and respond to the user using the tools you were given.
`;
  return composePromptFromState({ state, template: actionTemplate });
}

function composeResponseContext(result: unknown, state: State): string {
  const responseTemplate = `
    # Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

Here is the result:
${JSON.stringify(result)}

{{actions}}

Respond to the message knowing that the action was successful and these were the previous messages:
{{recentMessages}}
  `;
  return composePromptFromState({ state, template: responseTemplate });
}

function composeErrorResponseContext(
  errorMessage: string,
  state: State
): string {
  const errorResponseTemplate = `
# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{actions}}

Respond to the message knowing that the action failed.
The error was:
${errorMessage}

These were the previous messages:
{{recentMessages}}
    `;
  return composePromptFromState({ state, template: errorResponseTemplate });
}

async function generateResponse(
  runtime: IAgentRuntime,
  context: string
): Promise<string> {
  return runtime.useModel(ModelType.TEXT_SMALL, {
    prompt: context,
  });
}
