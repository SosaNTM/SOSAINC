import { describe, it, expect } from "vitest";
import { encryptVaultData, decryptVaultData } from "@/lib/vaultCrypto";

const USER_ID = "81811fcb-a587-439f-b465-5df67a5fc00a";
const PORTAL_ID = "a1000000-0000-0000-0000-000000000001";

describe("vault unlock smoke", () => {
  it("credential is encrypted before storage and decryptable after unlock", async () => {
    const secret = JSON.stringify({ username: "admin", password: "hunter2", url: "https://example.com", notes: "" });
    const encrypted = await encryptVaultData(secret, USER_ID, PORTAL_ID);

    // Ciphertext must not expose plaintext
    expect(encrypted).not.toContain("hunter2");
    expect(encrypted).not.toContain("admin");

    // After unlock (correct user+portal), data is readable
    const decrypted = await decryptVaultData(encrypted, USER_ID, PORTAL_ID);
    const parsed = JSON.parse(decrypted);
    expect(parsed.password).toBe("hunter2");
    expect(parsed.username).toBe("admin");
  });

  it("vault item cannot be read with wrong userId", async () => {
    const secret = JSON.stringify({ key: "sk-prod-xxxxx", service: "OpenAI" });
    const encrypted = await encryptVaultData(secret, USER_ID, PORTAL_ID);

    const decrypted = await decryptVaultData(encrypted, "00000000-0000-0000-0000-000000000000", PORTAL_ID);
    expect(decrypted).toBe("");
  });

  it("vault item cannot be read with wrong portalId (cross-portal isolation)", async () => {
    const secret = JSON.stringify({ content: "confidential note" });
    const encrypted = await encryptVaultData(secret, USER_ID, PORTAL_ID);

    const wrongPortal = "b2000000-0000-0000-0000-000000000002";
    const decrypted = await decryptVaultData(encrypted, USER_ID, wrongPortal);
    expect(decrypted).toBe("");
  });

  it("pre-encryption legacy plaintext passes through unchanged (backward compat)", async () => {
    const legacy = "plain text credential from before encryption was added";
    const decrypted = await decryptVaultData(legacy, USER_ID, PORTAL_ID);
    expect(decrypted).toBe(legacy);
  });

  it("empty string survives round-trip without error", async () => {
    expect(await encryptVaultData("", USER_ID, PORTAL_ID)).toBe("");
    expect(await decryptVaultData("", USER_ID, PORTAL_ID)).toBe("");
  });
});
