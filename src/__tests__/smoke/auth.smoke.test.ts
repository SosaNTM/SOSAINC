import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
  },
}));

import { supabase } from "@/lib/supabase";
import { signInWithEmail, signOut } from "@/lib/supabaseAuth";

const mockSignIn = supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>;
const mockSignOut = supabase.auth.signOut as ReturnType<typeof vi.fn>;

describe("auth smoke", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signInWithEmail calls signInWithPassword with correct args", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: "u1", email: "test@test.com" }, session: { access_token: "tok" } },
      error: null,
    });

    const result = await signInWithEmail("test@test.com", "password123");
    expect(mockSignIn).toHaveBeenCalledWith({ email: "test@test.com", password: "password123" });
    expect(result.user?.id).toBe("u1");
  });

  it("signInWithEmail throws on auth failure", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid credentials", name: "AuthApiError", status: 400 },
    });

    await expect(signInWithEmail("bad@test.com", "wrong")).rejects.toThrow();
  });

  it("signOut calls supabase.auth.signOut", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockSignOut).toHaveBeenCalledOnce();
  });
});
