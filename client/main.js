import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";

import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import {
  createSIWxPayload,
  encodeSIWxHeader,
  SIGN_IN_WITH_X,
} from "@x402/extensions/sign-in-with-x";

// -------------------------------------------------------------------------
// Wallet + x402 client setup
// -------------------------------------------------------------------------

let walletClient = null;
let address = null;
let signer = null;
let payFetch = null; // wrapFetchWithPayment(fetch, client) — handles 402 -> pay -> retry
let network = "eip155:84532"; // overwritten once /api/reels tells us the real network

function buildSigner() {
  // Bridges an injected browser wallet (MetaMask etc.) to the shape x402's
  // EVM scheme and the SIWX extension expect. No private key ever touches
  // this code — every signature is a normal wallet popup.
  return {
    address,
    signTypedData: (params) =>
      walletClient.signTypedData({
        account: address,
        domain: params.domain,
        types: params.types,
        primaryType: params.primaryType,
        message: params.message,
      }),
    signMessage: (params) => {
      const message = typeof params === "string" ? params : params.message;
      return walletClient.signMessage({ account: address, message });
    },
  };
}

async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No browser wallet found. Install MetaMask (or any injected wallet) and reload.");
  }
  const [acct] = await window.ethereum.request({ method: "eth_requestAccounts" });
  address = acct;
  walletClient = createWalletClient({
    account: address,
    chain: baseSepolia,
    transport: custom(window.ethereum),
  });

  signer = buildSigner();

  const client = new x402Client().register(network, new ExactEvmScheme(signer));
  payFetch = wrapFetchWithPayment(fetch, client);

  return address;
}

function shortAddress(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// -------------------------------------------------------------------------
// Sign-In-With-X: try a free wallet sign-in before ever paying
// -------------------------------------------------------------------------

async function trySignIn(url) {
  const first = await fetch(url);
  if (first.status !== 402) return first; // already OK, or an unrelated error

  const body = await first.clone().json().catch(() => null);
  const extension = body?.extensions?.[SIGN_IN_WITH_X] ?? body?.extensions?.["sign-in-with-x"];
  if (!extension) return first; // this route doesn't offer SIWX

  const paymentNetwork = body.accepts?.[0]?.network;
  const matchingChain = extension.supportedChains?.find((c) => c.chainId === paymentNetwork);
  if (!matchingChain) return first;

  const completeInfo = { ...extension.info, chainId: matchingChain.chainId, type: matchingChain.type };
  const payload = await createSIWxPayload(completeInfo, signer, first.url);
  const header = encodeSIWxHeader(payload);

  return fetch(url, { headers: { "SIGN-IN-WITH-X": header } });
}

// -------------------------------------------------------------------------
// UI
// -------------------------------------------------------------------------

const reelsEl = document.getElementById("reels");
const connectBtn = document.getElementById("connect");
const walletStatus = document.getElementById("wallet-status");
const template = document.getElementById("reel-template");

const playerBackdrop = document.getElementById("player-backdrop");
const playerImg = document.getElementById("player-frame");
const playerTitle = document.getElementById("player-title");
const playerCounter = document.getElementById("player-counter");
const playerClose = document.getElementById("player-close");
const playerPrev = document.getElementById("player-prev");
const playerNext = document.getElementById("player-next");
const playerAuto = document.getElementById("player-auto");

let player = { frames: [], index: 0, timer: null, title: "" };

function openPlayer(title, frames) {
  player = { frames, index: 0, timer: null, title };
  playerTitle.textContent = title;
  renderPlayerFrame();
  playerBackdrop.classList.remove("hidden");
}

function closePlayer() {
  playerBackdrop.classList.add("hidden");
  stopAutoplay();
}

function renderPlayerFrame() {
  playerImg.src = player.frames[player.index];
  playerCounter.textContent = `frame ${player.index + 1} / ${player.frames.length}`;
}

function crank(delta) {
  player.index = (player.index + delta + player.frames.length) % player.frames.length;
  renderPlayerFrame();
}

function stopAutoplay() {
  if (player.timer) clearInterval(player.timer);
  player.timer = null;
  playerAuto.textContent = "▶ Auto-crank";
}

function toggleAutoplay() {
  if (player.timer) {
    stopAutoplay();
    return;
  }
  playerAuto.textContent = "⏸ Stop";
  player.timer = setInterval(() => crank(1), 550);
}

playerPrev.addEventListener("click", () => crank(-1));
playerNext.addEventListener("click", () => crank(1));
playerAuto.addEventListener("click", toggleAutoplay);
playerClose.addEventListener("click", closePlayer);

connectBtn.addEventListener("click", async () => {
  connectBtn.disabled = true;
  connectBtn.textContent = "Connecting…";
  try {
    const addr = await connectWallet();
    walletStatus.textContent = `Connected: ${shortAddress(addr)}`;
    connectBtn.textContent = "Connected";
  } catch (err) {
    walletStatus.textContent = err.message;
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect wallet";
  }
});

async function unlockReel(id, statusEl) {
  if (!payFetch) {
    await connectWallet();
    walletStatus.textContent = `Connected: ${shortAddress(address)}`;
    connectBtn.textContent = "Connected";
  }

  const url = `/api/reels/${id}/frames`;

  statusEl.textContent = "Signing in with your wallet (free)…";
  let res = await trySignIn(url);

  if (res.status === 402) {
    statusEl.textContent = "Not unlocked yet — approve one small payment in your wallet…";
    res = await payFetch(url);
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Could not unlock this reel (HTTP ${res.status}).`);
  }
  return res.json();
}

async function renderReels() {
  const { reels } = await (await fetch("/api/reels")).json();
  if (reels[0]?.network) network = reels[0].network;

  reelsEl.innerHTML = "";

  for (const reel of reels) {
    const node = template.content.cloneNode(true);
    node.querySelector(".reel-preview").src = reel.preview;
    node.querySelector(".reel-title").textContent = reel.title;
    node.querySelector(".reel-desc").textContent = reel.description;
    node.querySelector(".reel-meta").textContent =
      `${reel.frameCount} frames · ${reel.priceUsd} to unlock · ${reel.network}`;

    const btn = node.querySelector(".reel-unlock");
    const statusEl = node.querySelector(".reel-status");

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const { title, frames } = await unlockReel(reel.id, statusEl);
        statusEl.textContent = "";
        openPlayer(title, frames);
      } catch (err) {
        statusEl.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });

    reelsEl.appendChild(node);
  }
}

renderReels().catch((err) => {
  reelsEl.textContent = `Could not load reels: ${err.message}`;
});