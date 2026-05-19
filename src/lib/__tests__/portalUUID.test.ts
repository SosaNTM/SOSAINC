import { describe, it, expect } from "vitest";
import { toPortalUUID, toPortalSlug, PORTAL_UUID_MAP } from "@/lib/portalUUID";

describe("portalUUID", () => {
  it("maps every known slug to a UUID", () => {
    for (const slug of Object.keys(PORTAL_UUID_MAP)) {
      const uuid = toPortalUUID(slug);
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });

  it("round-trips slug ↔ UUID for known portals", () => {
    for (const [slug, uuid] of Object.entries(PORTAL_UUID_MAP)) {
      expect(toPortalUUID(slug)).toEqual(uuid);
      expect(toPortalSlug(uuid)).toEqual(slug);
    }
  });

  it("passes through unknown input (treated as already a UUID)", () => {
    const unknownUuid = "00000000-0000-0000-0000-000000000999";
    expect(toPortalUUID(unknownUuid)).toEqual(unknownUuid);
  });
});
