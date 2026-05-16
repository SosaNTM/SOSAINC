import { describe, it, expect } from "vitest";
import { applyFilters } from "@/lib/personalTransactionStore";
import type { PersonalTransaction } from "@/types/finance";

const tx = (overrides: Partial<PersonalTransaction>): PersonalTransaction => ({
  id: "t",
  user_id: "u",
  type: "expense",
  amount: 100,
  currency: "EUR",
  category: "Food",
  description: "Pizza",
  date: "2026-05-15",
  is_recurring: false,
  created_at: "2026-05-15T00:00:00Z",
  updated_at: "2026-05-15T00:00:00Z",
  ...overrides,
});

describe("applyFilters", () => {
  const txs: PersonalTransaction[] = [
    tx({ id: "a", type: "income", amount: 1000, category: "Salary", date: "2026-05-01", description: "Monthly salary" }),
    tx({ id: "b", type: "expense", amount: 50, category: "Food", date: "2026-05-10", description: "Pizza dinner" }),
    tx({ id: "c", type: "expense", amount: 200, category: "Rent", date: "2026-05-15", description: "May rent" }),
  ];

  it("filters by type", () => {
    expect(applyFilters(txs, { type: "income" })).toHaveLength(1);
    expect(applyFilters(txs, { type: "expense" })).toHaveLength(2);
  });

  it("filters by date range", () => {
    expect(applyFilters(txs, { dateFrom: "2026-05-10", dateTo: "2026-05-15" })).toHaveLength(2);
  });

  it("filters by amount range", () => {
    expect(applyFilters(txs, { minAmount: 100 })).toHaveLength(2);
    expect(applyFilters(txs, { maxAmount: 100 })).toHaveLength(1);
  });

  it("filters by search (description + category, case-insensitive)", () => {
    expect(applyFilters(txs, { search: "RENT" })).toHaveLength(1);
    expect(applyFilters(txs, { search: "pizza" })).toHaveLength(1);
  });

  it("combines filters", () => {
    expect(applyFilters(txs, { type: "expense", minAmount: 100 })).toHaveLength(1);
  });

  it("returns all when no filter", () => {
    expect(applyFilters(txs, {})).toHaveLength(3);
  });
});
