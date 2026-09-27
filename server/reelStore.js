import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const REELS_JSON = path.join(__dirname, "data", "reels.json");
// Deliberately NOT under public/: nothing here is reachable by a direct
// URL. Frame bytes are only ever handed out through reelStore functions
// called from routes that enforce payment/SIWX first.
const REELS_DIR = path.join(ROOT, "assets", "reels");

let cache = null;

function load() {
  if (cache) return cache;
  const raw = JSON.parse(fs.readFileSync(REELS_JSON, "utf8"));
  cache = raw;
  return cache;
}

export function getReels() {
  return load();
}

export function getReel(id) {
  return load().find((r) => r.id === id) ?? null;
}

const MIME_BY_EXT = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Returns a self-contained data: URI for a frame. Frames are never exposed
// as static files, so the only way to get frame bytes for index > 0 is by
// going through the paywalled /api/reels/:id/frames route below.
export function loadFrameDataUri(reelId, index) {
  const reel = getReel(reelId);
  if (!reel || !reel.frames[index]) return null;
  const file = path.join(REELS_DIR, reelId, reel.frames[index]);
  const ext = path.extname(file).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const bytes = fs.readFileSync(file);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}
