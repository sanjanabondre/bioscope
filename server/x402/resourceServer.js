import path from "node:path";
import { fileURLToPath } from "node:url";
import { x402ResourceServer } from "@x402/core/server";
import { HTTPFacilitatorClient } from "@x402/core/http";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { createSIWxResourceServerExtension } from "@x402/extensions/sign-in-with-x";
import { FileSIWxStorage } from "./fileSiwxStorage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Base Sepolia by default -- a public testnet, so anyone can try this
// without spending real money. Switch to "eip155:8453" (Base mainnet) and
// a production facilitator once you're happy with the flow.
export const NETWORK = process.env.X402_NETWORK || "eip155:84532";
export const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";
export const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || "http://localhost:3000";
export const PRICE_USD = process.env.PRICE_USD || "$0.01";
export const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS;

if (!PAY_TO_ADDRESS) {
  console.warn(
    "[bioscope] PAY_TO_ADDRESS is not set in .env -- reels cannot be unlocked until you set your Base Sepolia receiving address.",
  );
}

// This storage instance is both (a) the SIWX "has this wallet paid?" lookup
// and (b) the server-side purchase record required by the assignment.
// It's a flat JSON file on disk at server/data/purchases.json.
export const siwxStorage = new FileSIWxStorage(path.join(__dirname, "..", "data"));

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

export const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme())
  .registerExtension(
    createSIWxResourceServerExtension({
      storage: siwxStorage,
      origin: PUBLIC_ORIGIN,
    }),
  );
