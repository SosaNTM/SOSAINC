import { dynamicSupabase } from './portalDb';

type PortalPrefix = 'sosa' | 'keylo' | 'redx' | 'trustme';

interface DefaultCategory {
  name: string;
  slug: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  sort_order: number;
}

const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: 'Rent', slug: 'rent', icon: '🏠', color: '#8b5cf6', type: 'expense', sort_order: 1 },
  { name: 'Utilities', slug: 'utilities', icon: '💡', color: '#f59e0b', type: 'expense', sort_order: 2 },
  { name: 'Groceries', slug: 'groceries', icon: '🛒', color: '#10b981', type: 'expense', sort_order: 3 },
  { name: 'Transport', slug: 'transport', icon: '🚗', color: '#3b82f6', type: 'expense', sort_order: 4 },
  { name: 'Dining', slug: 'dining', icon: '🍽️', color: '#ef4444', type: 'expense', sort_order: 5 },
  { name: 'Subscriptions', slug: 'subscriptions', icon: '📱', color: '#6366f1', type: 'expense', sort_order: 6 },
  { name: 'Healthcare', slug: 'healthcare', icon: '🏥', color: '#ec4899', type: 'expense', sort_order: 7 },
  { name: 'Shopping', slug: 'shopping', icon: '🛍️', color: '#f97316', type: 'expense', sort_order: 8 },
  { name: 'Entertainment', slug: 'entertainment', icon: '🎬', color: '#14b8a6', type: 'expense', sort_order: 9 },
  { name: 'Education', slug: 'education', icon: '📚', color: '#8b5cf6', type: 'expense', sort_order: 10 },
  { name: 'Taxes', slug: 'taxes', icon: '📋', color: '#64748b', type: 'expense', sort_order: 11 },
  { name: 'Insurance', slug: 'insurance', icon: '🛡️', color: '#475569', type: 'expense', sort_order: 12 },
  { name: 'Other', slug: 'other-expense', icon: '📌', color: '#94a3b8', type: 'expense', sort_order: 99 },
];

const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { name: 'Salary', slug: 'salary', icon: '💰', color: '#4ade80', type: 'income', sort_order: 1 },
  { name: 'Freelance', slug: 'freelance', icon: '💻', color: '#34d399', type: 'income', sort_order: 2 },
  { name: 'Investments', slug: 'investments', icon: '📈', color: '#22d3ee', type: 'income', sort_order: 3 },
  { name: 'Sales', slug: 'sales', icon: '🏷️', color: '#a78bfa', type: 'income', sort_order: 4 },
  { name: 'Refunds', slug: 'refunds', icon: '🔄', color: '#fbbf24', type: 'income', sort_order: 5 },
  { name: 'Other', slug: 'other-income', icon: '📌', color: '#94a3b8', type: 'income', sort_order: 99 },
];

const sb = dynamicSupabase;

export async function seedDefaultCategories(portal: PortalPrefix, userId: string): Promise<void> {
  const tableName = `${portal}_transaction_categories`;

  const { count } = await sb
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_default', true);

  if (count && count > 0) return;

  const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].map(cat => ({
    ...cat,
    user_id: userId,
    is_default: true,
    is_active: true,
  }));

  const { error } = await sb.from(tableName).insert(allCategories);
  // TODO: Replace with structured error logging (Sentry, etc.)
  if (error) console.error(`Failed to seed categories for ${portal}:`, error);
}
