import { describe, it, expect } from "vitest";
import { toPortalUUID } from "@/lib/portalUUID";

describe("portal switch smoke", () => {
  it("toPortalUUID produces different UUIDs for different portal slugs", () => {
    const sosaId = toPortalUUID("sosa");
    const keyloId = toPortalUUID("keylo");
    const redxId = toPortalUUID("redx");
    const trustmeId = toPortalUUID("trustme");

    // All different
    const ids = [sosaId, keyloId, redxId, trustmeId];
    expect(new Set(ids).size).toBe(4);
  });

  it("toPortalUUID returns valid UUID format", () => {
    const uuid = toPortalUUID("sosa");
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("toPortalUUID is deterministic — same slug always yields same UUID", () => {
    expect(toPortalUUID("keylo")).toBe(toPortalUUID("keylo"));
    expect(toPortalUUID("redx")).toBe(toPortalUUID("redx"));
  });
});
