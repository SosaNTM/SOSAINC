// ── Vault encryption (AES-256-GCM, user-derived key) ────────────────────────
//
// Encryption-at-rest for vault_items.encrypted_data. The key is derived from
// the user's auth UID + portal_id + an app-wide salt via PBKDF2 (200k iters).
// Each item has its own random 12-byte IV. Output stored as JSON:
//
//   { v: 1, iv: <base64 12 bytes>, ct: <base64 ciphertext+gcm-tag> }
//
// Threat model covered: full DB dump leak (ciphertext alone cannot be read).
// NOT covered: client-side JWT theft (attacker with JWT can re-derive key).
// For stronger guarantees move to a user-passphrase-derived key.
//
// Backward compat: if input does not parse as our envelope, returns the raw
// string (assumed pre-encryption plaintext). New writes always emit envelope.

const APP_SALT = "sosa-inc-vault-v1";
const PBKDF2_ITERS = 200_000;

function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(userId: string, portalId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(`${userId}:${portalId}`),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(APP_SALT),
      iterations: PBKDF2_ITERS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

interface Envelope { v: 1; iv: string; ct: string }

function isEnvelope(s: string): boolean {
  try {
    const o = JSON.parse(s) as Partial<Envelope>;
    return o.v === 1 && typeof o.iv === "string" && typeof o.ct === "string";
  } catch {
    return false;
  }
}

export async function encryptVaultData(
  plaintext: string,
  userId: string,
  portalId: string,
): Promise<string> {
  if (!plaintext) return plaintext;
  const key = await deriveKey(userId, portalId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const env: Envelope = { v: 1, iv: b64encode(iv), ct: b64encode(new Uint8Array(ct)) };
  return JSON.stringify(env);
}

export async function decryptVaultData(
  stored: string,
  userId: string,
  portalId: string,
): Promise<string> {
  if (!stored) return stored;
  // Backward-compat: plaintext leftovers from before encryption was added
  if (!isEnvelope(stored)) return stored;
  const env = JSON.parse(stored) as Envelope;
  const key = await deriveKey(userId, portalId);
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64decode(env.iv) },
      key,
      b64decode(env.ct),
    );
    return new TextDecoder().decode(pt);
  } catch {
    // Decryption failed — could mean a different user/portal wrote this, or
    // tampering. Return empty string so the UI shows the item as unreadable
    // rather than crashing.
    return "";
  }
}
