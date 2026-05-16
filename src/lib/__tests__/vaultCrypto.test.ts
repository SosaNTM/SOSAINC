import { describe, it, expect } from "vitest";
import { encryptVaultData, decryptVaultData } from "@/lib/vaultCrypto";

const USER = "81811fcb-a587-439f-b465-5df67a5fc00a";
const PORTAL = "a1000000-0000-0000-0000-000000000001";

describe("vaultCrypto", () => {
  it("round-trips plaintext through encrypt → decrypt", async () => {
    const plain = JSON.stringify({ username: "alice", password: "s3cr3t" });
    const enc = await encryptVaultData(plain, USER, PORTAL);
    expect(enc).not.toEqual(plain);
    expect(JSON.parse(enc).v).toBe(1);
    const dec = await decryptVaultData(enc, USER, PORTAL);
    expect(dec).toEqual(plain);
  });

  it("produces different ciphertext for same plaintext (random IV)", async () => {
    const plain = "same input";
    const a = await encryptVaultData(plain, USER, PORTAL);
    const b = await encryptVaultData(plain, USER, PORTAL);
    expect(a).not.toEqual(b);
  });

  it("returns empty string when decrypting with wrong key", async () => {
    const enc = await encryptVaultData("secret", USER, PORTAL);
    const dec = await decryptVaultData(enc, "00000000-0000-0000-0000-000000000000", PORTAL);
    expect(dec).toEqual("");
  });

  it("passes through pre-encryption plaintext (backward-compat)", async () => {
    const dec = await decryptVaultData("plain legacy data", USER, PORTAL);
    expect(dec).toEqual("plain legacy data");
  });

  it("passes through empty string", async () => {
    expect(await encryptVaultData("", USER, PORTAL)).toEqual("");
    expect(await decryptVaultData("", USER, PORTAL)).toEqual("");
  });
});
