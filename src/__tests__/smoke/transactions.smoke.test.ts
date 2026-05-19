import { describe, it, expect, vi, beforeEach } from "vitest";
import { toPortalUUID } from "@/lib/portalUUID";

// Build a fresh chainable Supabase mock — both thenable (for fetchTransactions) and .single() (for createTransaction)
function makeChain(data: unknown = [], error: unknown = null) {
  const resolved = { data, error };
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "order", "limit",
                   "is", "gte", "lte", "range", "filter"];
  methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain); });
  // Thenable — await chain resolves like a PostgREST query
  chain["then"] = (resolve: (v: typeof resolved) => unknown) => Promise.resolve(resolved).then(resolve);
  // .single() returns a promise directly
  chain["single"] = vi.fn().mockResolvedValue(resolved);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
    },
  },
}));

vi.mock("@/lib/validation/schemas", () => ({
  newTransactionSchema: {},
  safeValidate: vi.fn().mockReturnValue({ success: true }),
}));

import { supabase } from "@/lib/supabase";
import { createTransaction, fetchTransactions, deleteTransaction } from "@/lib/services/personalTransactionService";

const PORTAL_SLUG = "sosa";
const PORTAL_UUID = toPortalUUID(PORTAL_SLUG);

describe("transaction CRUD smoke", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchTransactions queries personal_transactions with portal_id filter", async () => {
    const chain = makeChain([], null);
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    await fetchTransactions(PORTAL_SLUG);

    expect(supabase.from).toHaveBeenCalledWith("personal_transactions");
    expect((chain.eq as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("portal_id", PORTAL_UUID);
  });

  it("createTransaction inserts into personal_transactions and returns created record", async () => {
    const created = { id: "t1", amount: 100, type: "income", portal_id: PORTAL_UUID };
    const chain = makeChain(created, null);
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const result = await createTransaction(
      { amount: 100, type: "income", description: "Vendita", date: "2026-05-17", user_id: "u1" },
      PORTAL_SLUG,
    );

    expect(supabase.from).toHaveBeenCalledWith("personal_transactions");
    expect((chain.insert as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("deleteTransaction calls delete scoped to id and portal_id", async () => {
    const chain = makeChain(null, null);
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    await deleteTransaction("t1", PORTAL_SLUG);

    expect(supabase.from).toHaveBeenCalledWith("personal_transactions");
    expect((chain.delete as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((chain.eq as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("id", "t1");
  });
});
