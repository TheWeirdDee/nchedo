import { defineChain } from "viem";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 10143);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://testnet-rpc.monad.xyz";

const IS_MAINNET = CHAIN_ID === 143;

export const monad = defineChain({
  id: CHAIN_ID,
  name: IS_MAINNET ? "Monad" : "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: IS_MAINNET ? "https://monadvision.com" : "https://testnet.monadvision.com",
    },
  },
  testnet: !IS_MAINNET,
});

export const EXPLORER = monad.blockExplorers.default.url;

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (address: string) => `${EXPLORER}/address/${address}`;
