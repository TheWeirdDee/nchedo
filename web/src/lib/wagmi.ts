import { http, createConfig } from "wagmi";
import { injected } from "@wagmi/core";
import { monad } from "./chain";

// Imported from @wagmi/core, not wagmi/connectors. The connectors barrel pulls
// in Coinbase's SDK, which pulls in an @x402 package it does not depend on, and
// the build dies. We only ever wanted the injected connector.
export const wagmiConfig = createConfig({
  chains: [monad],
  connectors: [injected()],
  transports: {
    [monad.id]: http(monad.rpcUrls.default.http[0]),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
