// Generates small, original, hand-made placeholder art for the seed reels.
// Every frame is a plain SVG built from basic shapes so no external or
// copyrighted imagery is used anywhere in the repo.
//
// Run with:  node scripts/generate-frames.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
// IMPORTANT: this directory is never mounted with express.static. Frame
// bytes only ever leave the server through the paywalled/SIWX-gated route
// in server/index.js, so a locked frame can't be fetched by guessing a URL.
const OUT = path.join(ROOT, "assets", "reels");

const W = 480;
const H = 360;

const INK = "#3b2a1a";
const PAPER = "#f1e6cf";
const PAPER_DARK = "#e4d3ab";
const ACCENT = "#8a3b2b";
const ACCENT_2 = "#2b5a4a";

function frameShell(inner, frameIndex, totalFrames, caption) {
  // A circular "bioscope eyepiece" vignette around the scene, plus a
  // hand-cranked frame counter so the reel visibly plays frame by frame.
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
      <stop offset="60%" stop-color="${PAPER}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0.55"/>
    </radialGradient>
    <clipPath id="round">
      <circle cx="${W / 2}" cy="${H / 2}" r="${H / 2 - 6}"/>
    </clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <g clip-path="url(#round)">
    <rect width="${W}" height="${H}" fill="${PAPER}"/>
    ${inner}
  </g>
  <circle cx="${W / 2}" cy="${H / 2}" r="${H / 2 - 6}" fill="url(#vignette)"/>
  <circle cx="${W / 2}" cy="${H / 2}" r="${H / 2 - 6}" fill="none" stroke="${INK}" stroke-width="6"/>
  <text x="${W - 16}" y="${H - 14}" text-anchor="end" font-family="Georgia, serif" font-size="14" fill="${INK}" opacity="0.7">frame ${frameIndex + 1} / ${totalFrames}</text>
  <text x="16" y="${H - 14}" font-family="Georgia, serif" font-size="14" fill="${INK}" opacity="0.7">${caption}</text>
</svg>`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ---- Reel 1: The Esplanade Tram ---------------------------------------
function tramFrame(i, n) {
  const t = i / (n - 1);
  const x = lerp(-90, W + 90, t);
  const wobble = Math.sin(t * Math.PI * 4) * 2;
  const scene = `
    <rect x="0" y="${H - 70}" width="${W}" height="70" fill="${PAPER_DARK}"/>
    <line x1="0" y1="${H - 40}" x2="${W}" y2="${H - 40}" stroke="${INK}" stroke-width="3"/>
    <line x1="0" y1="${H - 30}" x2="${W}" y2="${H - 30}" stroke="${INK}" stroke-width="2" stroke-dasharray="10 10"/>
    <rect x="40" y="${H - 220}" width="60" height="150" fill="${PAPER_DARK}" stroke="${INK}" stroke-width="2"/>
    <rect x="${W - 130}" y="${H - 260}" width="90" height="190" fill="${PAPER_DARK}" stroke="${INK}" stroke-width="2"/>
    <line x1="200" y1="${H - 260}" x2="200" y2="${H - 90}" stroke="${INK}" stroke-width="4"/>
    <circle cx="200" cy="${H - 262}" r="6" fill="${ACCENT}"/>
    <g transform="translate(${x}, ${H - 100 + wobble})">
      <rect x="-70" y="-40" width="140" height="40" rx="6" fill="${ACCENT}" stroke="${INK}" stroke-width="3"/>
      <rect x="-58" y="-32" width="30" height="18" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>
      <rect x="-18" y="-32" width="30" height="18" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>
      <rect x="22" y="-32" width="30" height="18" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>
      <line x1="0" y1="-40" x2="0" y2="-58" stroke="${INK}" stroke-width="3"/>
      <line x1="-14" y1="-58" x2="14" y2="-58" stroke="${INK}" stroke-width="3"/>
      <circle cx="-45" cy="4" r="10" fill="${INK}"/>
      <circle cx="45" cy="4" r="10" fill="${INK}"/>
    </g>
  `;
  return frameShell(scene, i, n, "Esplanade Tram");
}

// ---- Reel 2: Durga Puja Immersion --------------------------------------
function pujaFrame(i, n) {
  const t = i / (n - 1);
  const x = lerp(60, W - 60, t);
  const river = H - 46;
  const people = [0, 1, 2, 3].map((k) => {
    const px = x + (k - 1.5) * 26;
    const bob = Math.sin(t * Math.PI * 6 + k) * 4;
    return `<g transform="translate(${px}, ${H - 96 + bob})">
      <circle cx="0" cy="-30" r="8" fill="${INK}"/>
      <line x1="0" y1="-22" x2="0" y2="0" stroke="${INK}" stroke-width="4"/>
      <line x1="0" y1="-14" x2="-12" y2="-4" stroke="${INK}" stroke-width="4"/>
      <line x1="0" y1="-14" x2="12" y2="-4" stroke="${INK}" stroke-width="4"/>
      <line x1="0" y1="0" x2="-8" y2="16" stroke="${INK}" stroke-width="4"/>
      <line x1="0" y1="0" x2="8" y2="16" stroke="${INK}" stroke-width="4"/>
    </g>`;
  }).join("");
  const scene = `
    <rect x="0" y="${river}" width="${W}" height="${H - river}" fill="${ACCENT_2}" opacity="0.55"/>
    <path d="M0 ${river} q 40 -6 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 v6 h -480 z" fill="${ACCENT_2}" opacity="0.35"/>
    <polygon points="70,${H - 260} 130,${H - 260} 150,${H - 190} 50,${H - 190}" fill="${PAPER_DARK}" stroke="${INK}" stroke-width="2"/>
    <polygon points="90,${H - 300} 110,${H - 300} 100,${H - 260}" fill="${ACCENT}" stroke="${INK}" stroke-width="2"/>
    ${people}
    <g transform="translate(${x}, ${H - 150})">
      <rect x="-30" y="-10" width="60" height="24" rx="4" fill="${ACCENT}" stroke="${INK}" stroke-width="3"/>
      <polygon points="0,-46 -18,-10 18,-10" fill="${PAPER_DARK}" stroke="${INK}" stroke-width="2"/>
      <circle cx="0" cy="-52" r="8" fill="${INK}"/>
    </g>
  `;
  return frameShell(scene, i, n, "Durga Puja Immersion");
}

// ---- Reel 3: The Circus Elephant ----------------------------------------
function elephantFrame(i, n) {
  const t = i / (n - 1);
  const legLift = Math.sin(t * Math.PI * 2) * 14;
  const trunkSwing = Math.sin(t * Math.PI * 2) * 18;
  const stripes = Array.from({ length: 8 }, (_, k) =>
    `<rect x="${k * 60}" y="0" width="30" height="${H - 60}" fill="${k % 2 === 0 ? ACCENT : PAPER_DARK}" opacity="0.25"/>`
  ).join("");
  const scene = `
    ${stripes}
    <rect x="0" y="${H - 60}" width="${W}" height="60" fill="${PAPER_DARK}"/>
    <ellipse cx="${W / 2}" cy="${H - 70}" rx="46" ry="14" fill="${ACCENT}" stroke="${INK}" stroke-width="3"/>
    <g transform="translate(${W / 2}, ${H - 150})">
      <ellipse cx="0" cy="0" rx="80" ry="55" fill="${PAPER_DARK}" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="70" cy="-10" rx="34" ry="30" fill="${PAPER_DARK}" stroke="${INK}" stroke-width="3"/>
      <path d="M 96 10 q 20 20 ${trunkSwing} 46" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
      <ellipse cx="55" cy="-28" rx="18" ry="22" fill="${ACCENT}" stroke="${INK}" stroke-width="2"/>
      <circle cx="80" cy="-16" r="3.5" fill="${INK}"/>
      <line x1="-40" y1="45" x2="${-40 - legLift * 0.2}" y2="80" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
      <line x1="10" y1="50" x2="${10 + legLift * 0.2}" y2="82" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    </g>
    <g transform="translate(${W - 60}, ${H - 110})">
      <circle cx="0" cy="-30" r="9" fill="${INK}"/>
      <line x1="0" y1="-21" x2="0" y2="10" stroke="${INK}" stroke-width="4"/>
      <line x1="0" y1="-10" x2="-14" y2="-16" stroke="${INK}" stroke-width="4"/>
      <line x1="0" y1="-10" x2="14" y2="4" stroke="${INK}" stroke-width="4"/>
      <line x1="0" y1="10" x2="-8" y2="30" stroke="${INK}" stroke-width="4"/>
      <line x1="0" y1="10" x2="8" y2="30" stroke="${INK}" stroke-width="4"/>
      <polygon points="-10,-42 10,-42 0,-58" fill="${ACCENT}"/>
    </g>
  `;
  return frameShell(scene, i, n, "The Circus Elephant");
}

const REELS = [
  { id: "esplanade-tram", title: "The Esplanade Tram", frames: 6, gen: tramFrame,
    description: "A single-deck tram rattles past the Esplanade, coal smoke curling behind it." },
  { id: "durga-puja-immersion", title: "Durga Puja Immersion", frames: 6, gen: pujaFrame,
    description: "Drummers lead the goddess to the river on the last day of Puja." },
  { id: "circus-elephant", title: "The Circus Elephant", frames: 6, gen: elephantFrame,
    description: "Tapan Ghosh's favourite reel: a circus elephant balancing its trunk under the big top." },
];

fs.mkdirSync(OUT, { recursive: true });
const meta = [];

for (const reel of REELS) {
  const dir = path.join(OUT, reel.id);
  fs.mkdirSync(dir, { recursive: true });
  const frameFiles = [];
  for (let i = 0; i < reel.frames; i++) {
    const svg = reel.gen(i, reel.frames);
    const file = `frame-${i}.svg`;
    fs.writeFileSync(path.join(dir, file), svg, "utf8");
    frameFiles.push(file);
  }
  meta.push({
    id: reel.id,
    title: reel.title,
    description: reel.description,
    frames: frameFiles,
  });
  console.log(`generated ${reel.frames} frames for "${reel.title}"`);
}

const reelsJsonPath = path.join(ROOT, "server", "data", "reels.json");
fs.mkdirSync(path.dirname(reelsJsonPath), { recursive: true });
fs.writeFileSync(reelsJsonPath, JSON.stringify(meta, null, 2), "utf8");
console.log(`wrote metadata for ${meta.length} reels to ${reelsJsonPath}`);
