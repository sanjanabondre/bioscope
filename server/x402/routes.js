import { declareSIWxExtension } from "@x402/extensions/sign-in-with-x";
import { NETWORK, PRICE_USD, PAY_TO_ADDRESS } from "./resourceServer.js";

// A single route pattern covers every reel: the *resource* x402/SIWX record
// payment against is the resolved request path (e.g.
// "/api/reels/esplanade-tram/frames"), so each reel is unlocked
// independently even though they all share one route declaration.
export const x402Routes = {
  "GET /api/reels/:id/frames": {
    accepts: [
      {
        scheme: "exact",
        price: PRICE_USD,
        network: NETWORK,
        payTo: PAY_TO_ADDRESS,
      },
    ],
    description: "Unlock every frame of one Bioscope reel",
    mimeType: "application/json",
    // Declaring this extension is what lets a returning wallet sign in
    // (free) instead of paying again for a reel it already bought.
    extensions: declareSIWxExtension({
      statement: "Sign in with your wallet to re-open a reel you already unlocked.",
    }),
  },
};
