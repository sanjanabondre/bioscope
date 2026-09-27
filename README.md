# The Bioscope

Tapan Ghosh carried a wooden bioscope from mela to mela across 1950s Bengal.
Drop a coin, press your face to the eyepiece, watch a hand-cranked reel. His
granddaughter Rituparna has digitized forty of those reels — this is the box,
back on the web.

- **Peek for free.** The first frame of every reel is always visible.
- **One small coin unlocks the rest.** Paid on Base Sepolia testnet via the
  [x402](https://x402.org) protocol — no card, no account, no crypto
  experience required beyond a browser wallet.
- **Never pay twice.** x402 V2's Sign-In-With-X (SIWX) lets your wallet prove
  it already paid, so coming back next week re-opens the reel for free.
- **Genuinely private.** Locked frames are never static files. They only
  ever leave the server through the same paywalled endpoint a payment
  unlocks, as base64-embedded image data in the JSON response — there's no
  `/reels/<id>/frame-3.svg` URL to guess.

## How it works

```
Browser (MetaMask)                 Express server                 Facilitator
  |  GET /api/reels/:id/frames        |                               |
  |----------------------------------->  no payment/SIWX proof yet    |
  |   <--- 402 Payment Required + SIWX challenge + price ---          |
  |                                   |                               |
  |  sign SIWX challenge (free)       |                               |
  |----------------------------------->  wallet hasn't paid this yet  |
  |   <--- 402 (still needs payment) ---                              |
  |                                   |                               |
  |  sign EIP-3009 payment auth       |                               |
  |----------------------------------->  verify + settle ------------>|
  |                                   |   <---- settled, tx hash -----|
  |                                   |  record payment (SIWX store)  |
  |   <--- 200 OK + every frame ------                                |
  |                                   |                               |
  ...next week, same wallet...       |                               |
  |  sign SIWX challenge (free)       |                               |
  |----------------------------------->  wallet already paid this!    |
  |   <--- 200 OK + every frame, no payment prompt at all ---         |
```

All of that handshake is handled for you by the official x402 SDK
(`@x402/express` on the server, `@x402/fetch` + `@x402/extensions` in the
browser) — this app just declares the price and the resource path.

### Where things live

```
server/
  index.js              Express app: free reel list, paywalled/SIWX reel route
  reelStore.js           Loads reel metadata + frame bytes (never as static files)
  x402/
    resourceServer.js     Facilitator client, exact-EVM scheme, SIWX extension
    routes.js              The one route x402 protects
    fileSiwxStorage.js     Persistent SIWxStorage — this file IS the purchase ledger
  data/
    reels.json             Seed reel metadata (id, title, description, frame files)
    purchases.json          Created at runtime: { wallet: { resource: { purchasedAt }}}
client/
  main.js                 Wallet bridging + x402/SIWX client wiring + reel UI
public/
  index.html, styles.css   Static shell
  bundle.js                Built from client/main.js (see Setup)
assets/reels/<id>/frame-N.svg
                          Original, procedurally generated placeholder art
                          (see scripts/generate-frames.mjs) — never served statically
scripts/
  generate-frames.mjs      Regenerates the three seed reels
  build-client.mjs         Bundles client/main.js -> public/bundle.js with esbuild
```

## Setup (testnet, ~10 minutes)

### 1. Prerequisites

- Node.js 18.18+ and npm
- A browser with an injected wallet extension (MetaMask is easiest)
- The wallet needs **Base Sepolia** added as a network and a small amount of
  **Base Sepolia ETH** (for the SIWX/payment signatures — these are gasless
  off-chain authorizations, but MetaMask still likes a nonzero balance) and
  **Base Sepolia USDC** (the actual coin the reel costs).

### 2. Get testnet funds

1. Add Base Sepolia to your wallet if it isn't already there (chain id
   `84532`, RPC `https://sepolia.base.org`).
2. Base Sepolia ETH: use the [Coinbase Developer Platform
   faucet](https://portal.cdp.coinbase.com/products/faucet) (or any Base
   Sepolia ETH faucet).
3. Base Sepolia USDC: use the [Circle USDC faucet](https://faucet.circle.com)
   and pick "Base Sepolia". The USDC contract there is
   `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.

### 3. Install and configure

```bash
git clone <this-repo>
cd bioscope
npm install
cp .env.example .env
```

Open `.env` and set `PAY_TO_ADDRESS` to a wallet address you control on Base
Sepolia (this is where unlock payments land). The other defaults
(`X402_NETWORK`, `X402_FACILITATOR_URL`, `PUBLIC_ORIGIN`, `PRICE_USD`) work
out of the box for local testing — the facilitator is the public,
signup-free `https://x402.org/facilitator` test facilitator for Base
Sepolia.

### 4. Build and run

```bash
npm run build   # generates the seed reel frames + bundles the browser client
npm start
```

Open **http://localhost:3000**.

> If you change `PUBLIC_ORIGIN` (e.g. to a deployed URL), SIWX signatures are
> bound to that exact origin, so update `.env` and rebuild/restart.

### 5. Try the flow

1. Click **Connect wallet** and approve the connection in MetaMask, on Base
   Sepolia.
2. Every reel's card shows its first frame for free — that's the "peek".
3. Click **Watch reel**. Your wallet will be asked for a free signature
   first (the SIWX sign-in attempt); since you haven't paid yet, the server
   still asks for payment, so MetaMask will then prompt you to sign a small
   USDC payment authorization (no gas, it's an EIP-3009 authorization, not a
   raw transaction). Approve it.
4. The reel opens frame by frame. Use **Crank back / forward** or
   **Auto-crank** to play it the way it was cranked by hand.
5. Reload the page (or come back "next week") and click **Watch reel**
   again on the same reel with the same wallet: this time it opens
   immediately with just a free sign-in — no payment prompt.
6. Look at `server/data/purchases.json` — that's the server-side purchase
   record the assignment asks for, keyed by wallet address and resource
   path.

## Design notes

- **One route, many resources.** There's a single x402-protected Express
  route, `GET /api/reels/:id/frames`. x402/SIWX record payment against the
  *resolved* request path (e.g. `/api/reels/circus-elephant/frames`), so
  each reel is unlocked independently per wallet without needing one route
  declaration per reel.
- **Frames are data, not files.** `assets/reels/` is outside `public/` and is
  never mounted with `express.static`. The only code path that can read a
  locked frame's bytes is the handler behind `paymentMiddleware`, which
  returns frames as `data:` URIs inside the JSON body. There is no locked
  frame URL to copy-paste or guess.
- **The purchase ledger is the SIWX storage.** `FileSIWxStorage` in
  `server/x402/fileSiwxStorage.js` implements x402's `SIWxStorage` interface
  (`hasPaid` / `recordPayment`, plus nonce replay-protection) backed by a
  plain JSON file. It is simultaneously "the thing x402 checks before
  granting free repeat access" and "the server-side purchase record" —
  there's no separate bookkeeping to keep in sync.
- **Seed reels are original art.** `assets/reels/**/*.svg` are procedurally
  generated placeholder illustrations (simple shapes evoking a Calcutta
  tram, a Durga Puja procession, and a circus elephant), produced by
  `scripts/generate-frames.mjs`. No third-party or copyrighted imagery is
  used anywhere in this repo.

## Known limitations / what to check if something breaks

The x402 V2 SDK (`@x402/*` packages) and its Sign-In-With-X extension are
young and evolve quickly. This project was written directly against their
published documentation, but wasn't executed end-to-end in the environment
that produced it (no network access to install packages or reach a
facilitator there). Before you dig for a bug in the app logic, it's worth
first running `npm ls @x402/core @x402/express @x402/evm @x402/extensions
@x402/fetch` and skimming `node_modules/@x402/extensions/dist/sign-in-with-x`
for the exact current export names — a minor version bump is the most
likely source of any mismatch, not the payment/SIWX design itself.

Things that are worth double-checking on your machine:

- `registerExactEvmScheme` (client) and `ExactEvmScheme` (server) export
  paths under `@x402/evm/exact/client` and `@x402/evm/exact/server`.
- `createSIWxClientExtension` / `createSIWxResourceServerExtension` export
  paths under `@x402/extensions/sign-in-with-x`.
- That your installed `@x402/express` version's `paymentMiddleware` accepts
  `(routesConfig, resourceServer)` in that order (this is how the official
  quickstart shows it as of when this was written).

## Adding your own reels

1. Drop a new folder in `assets/reels/<your-id>/` with `frame-0.svg` (or
   `.png`/`.jpg`/`.webp`), `frame-1.svg`, etc.
2. Add an entry to `server/data/reels.json`:
   ```json
   { "id": "your-id", "title": "…", "description": "…", "frames": ["frame-0.svg", "frame-1.svg"] }
   ```
3. Restart the server. No code changes needed — the paywall and SIWX
   extension apply automatically because they're declared on the route
   pattern, not per reel.
