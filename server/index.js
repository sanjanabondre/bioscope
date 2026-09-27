import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { paymentMiddleware } from "@x402/express";
import { resourceServer, PRICE_USD, NETWORK } from "./x402/resourceServer.js";
import { x402Routes } from "./x402/routes.js";
import { getReels, getReel, loadFrameDataUri } from "./reelStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------------------------------------------------------------------
// Free: browse reels + peek the first frame of each one.
// ---------------------------------------------------------------------
app.get("/api/reels", (_req, res) => {
  const reels = getReels().map((reel) => ({
    id: reel.id,
    title: reel.title,
    description: reel.description,
    frameCount: reel.frames.length,
    priceUsd: PRICE_USD,
    network: NETWORK,
    // Frame 0 is the "drop a coin to see more" peek -- always free.
    preview: loadFrameDataUri(reel.id, 0),
  }));
  res.json({ reels });
});

// ---------------------------------------------------------------------
// Paywalled + Sign-In-With-X aware: the rest of a reel.
//
// First visit to a reel: the middleware answers 402, the browser wallet
// pays one small testnet coin, and this handler then runs and returns
// every frame.
//
// Any later visit (this session, next week, from a different browser --
// anything signed by the same wallet): the middleware sees a valid
// SIGN-IN-WITH-X proof for a wallet that already paid for *this exact
// resource path* and lets the request through with no new payment.
// ---------------------------------------------------------------------
app.use(paymentMiddleware(x402Routes, resourceServer));

app.get("/api/reels/:id/frames", (req, res) => {
  const reel = getReel(req.params.id);
  if (!reel) return res.status(404).json({ error: "Reel not found" });

  const frames = reel.frames.map((_file, i) => loadFrameDataUri(reel.id, i));
  res.json({ id: reel.id, title: reel.title, frames });
});

// Static frontend (index.html, styles.css, the bundled client) -- note
// this directory holds no reel imagery at all, see server/reelStore.js.
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`🎞  Bioscope listening on http://localhost:${PORT}`);
  console.log(`    network: ${NETWORK}   price/reel: ${PRICE_USD}`);
});
