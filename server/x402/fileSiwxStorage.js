// A small, file-backed implementation of the x402 `SIWxStorage` interface
// (see @x402/extensions/sign-in-with-x). This doubles as the server's
// purchase ledger: every row here is a wallet that paid for a reel.
//
// Swap this for a real database in production; the on-disk JSON file is
// intentionally simple so a stranger can `cat` it and see exactly what
// "never pay twice" means under the hood.

import fs from "node:fs";
import path from "node:path";

const NONCE_TTL_MS = 10 * 60 * 1000; // matches SIWX's default 5 min message TTL, with headroom

export class FileSIWxStorage {
  constructor(dataDir) {
    this.purchasesPath = path.join(dataDir, "purchases.json");
    this.noncesPath = path.join(dataDir, "used-nonces.json");
    this._load();
  }

  _load() {
    this.purchases = this._readJson(this.purchasesPath, {});
    this.nonces = this._readJson(this.noncesPath, {});
    this._pruneNonces();
  }

  _readJson(file, fallback) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return fallback;
    }
  }

  _writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  }

  _pruneNonces() {
    const now = Date.now();
    let changed = false;
    for (const [nonce, ts] of Object.entries(this.nonces)) {
      if (now - ts > NONCE_TTL_MS) {
        delete this.nonces[nonce];
        changed = true;
      }
    }
    if (changed) this._writeJson(this.noncesPath, this.nonces);
  }

  // --- required SIWxStorage methods --------------------------------------

  async hasPaid(resource, address) {
    const addr = address.toLowerCase();
    return Boolean(this.purchases[addr]?.[resource]);
  }

  async recordPayment(resource, address) {
    const addr = address.toLowerCase();
    this.purchases[addr] ??= {};
    this.purchases[addr][resource] = {
      purchasedAt: new Date().toISOString(),
    };
    this._writeJson(this.purchasesPath, this.purchases);
  }

  // --- optional replay-protection methods --------------------------------

  async hasUsedNonce(nonce) {
    this._pruneNonces();
    return Boolean(this.nonces[nonce]);
  }

  async recordNonce(nonce) {
    this.nonces[nonce] = Date.now();
    this._writeJson(this.noncesPath, this.nonces);
  }

  // --- convenience for humans reading the repo ---------------------------

  listPurchases() {
    return this.purchases;
  }
}
