import type { Provider, ProviderResult } from "@elizaos/core";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mode } from "viem/chains";

// Add the chain you want to use, remember to update also
// the EVM_PROVIDER_URL to the correct one for the chain
export const chain = mode;

export function getWalletClient(
  getSetting: (key: string) => string | undefined
) {
  const privateKey = getSetting("EVM_PRIVATE_KEY");
  if (!privateKey) return null;

  const provider = getSetting("EVM_PROVIDER_URL");
  if (!provider) throw new Error("EVM_PROVIDER_URL not configured");

  const wallet = createWalletClient({
    account: privateKeyToAccount(privateKey as `0x${string}`),
    chain: chain,
    transport: http(provider),
  });

  return viem(wallet);
}

export function getWalletProvider(walletClient: any): Provider {
  return {
    name: "walletProvider",
    description: "Provides EVM wallet address and balance information",
    async get(_runtime, _message, state): Promise<ProviderResult> {
      if (!walletClient) {
        return {
          text: "EVM wallet not configured. Please set EVM_PRIVATE_KEY and EVM_PROVIDER_URL.",
          data: { error: "Wallet not configured" },
        };
      }

      try {
        const address = walletClient.getAddress();
        const balance = await walletClient.balanceOf(address);
        return {
          text: `EVM Wallet Address: ${address}\nBalance: ${balance} ETH`,
          values: {
            address,
            balance: balance.toString(),
          },
          data: {
            address,
            balance: balance.toString(),
            chain: chain.name,
            chainId: chain.id,
          },
        };
      } catch (error) {
        console.error("Error in EVM wallet provider:", error);
        return {
          text: "Error retrieving wallet information",
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };
}
