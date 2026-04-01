import {
  Utensils, Car, ShoppingBag, Heart, Tv, Home, Zap,
  Coffee, Plane, BookOpen, Music, Dumbbell, Gift,
  Briefcase, CreditCard, Wallet, type LucideIcon,
} from "lucide-react";

export const BUDGET_ICON_NAMES = [
  "Utensils", "Car", "ShoppingBag", "Heart", "Tv", "Home", "Zap",
  "Coffee", "Plane", "BookOpen", "Music", "Dumbbell", "Gift",
  "Briefcase", "CreditCard", "Wallet",
] as const;

export type BudgetIconName = typeof BUDGET_ICON_NAMES[number];

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils, Car, ShoppingBag, Heart, Tv, Home, Zap,
  Coffee, Plane, BookOpen, Music, Dumbbell, Gift,
  Briefcase, CreditCard, Wallet,
};

export function getBudgetIcon(name: string, size = 16): React.ReactElement {
  const Comp = ICON_MAP[name] ?? Wallet;
  return <Comp width={size} height={size} />;
}

export const BUDGET_COLORS = [
  "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6",
  "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
  "#f97316", "#e8ff00", "#64748b", "#1f2937",
];
