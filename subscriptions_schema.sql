-- ============================================================
-- ICONOFF Finance Portal — Subscriptions Schema
-- Run this on your Supabase project SQL editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLE: subscriptions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id              uuid         default gen_random_uuid() primary key,
  user_id         uuid         references auth.users(id) on delete cascade not null,
  name            text         not null,
  description     text,
  amount          decimal(10,2) not null,
  currency        text         default 'EUR' not null,
  category        text,
  billing_cycle   text         not null
                  check (billing_cycle in ('monthly','quarterly','quadrimestral','biannual','annual')),
  billing_day     integer      not null check (billing_day between 1 and 31),
  start_date      date         not null,
  next_billing_date date       not null,
  is_active       boolean      default true not null,
  color           text,
  icon            text,
  account_id      uuid,
  deleted_at      timestamptz,
  created_at      timestamptz  default now() not null,
  updated_at      timestamptz  default now() not null
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);

create index if not exists subscriptions_next_billing_idx
  on public.subscriptions(next_billing_date)
  where is_active = true and deleted_at is null;

-- ─────────────────────────────────────────────────────────────
-- 2. TABLE: subscription_transactions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.subscription_transactions (
  id               uuid         default gen_random_uuid() primary key,
  subscription_id  uuid         references public.subscriptions(id) on delete cascade not null,
  user_id          uuid         references auth.users(id) not null,
  amount           decimal(10,2) not null,
  executed_at      timestamptz  default now() not null,
  billing_date     date         not null,
  status           text         default 'completed' not null
                   check (status in ('completed','failed','pending')),
  transaction_id   uuid,
  created_at       timestamptz  default now() not null
);

create index if not exists sub_tx_subscription_id_idx
  on public.subscription_transactions(subscription_id);

create index if not exists sub_tx_user_id_idx
  on public.subscription_transactions(user_id);

create index if not exists sub_tx_billing_date_idx
  on public.subscription_transactions(billing_date);

-- ─────────────────────────────────────────────────────────────
-- 3. auto-update updated_at on subscriptions
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
alter table public.subscriptions enable row level security;
alter table public.subscription_transactions enable row level security;

-- subscriptions
create policy "Users view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users insert own subscriptions"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users update own subscriptions"
  on public.subscriptions for update
  using (auth.uid() = user_id);

create policy "Users delete own subscriptions"
  on public.subscriptions for delete
  using (auth.uid() = user_id);

-- subscription_transactions
create policy "Users view own sub transactions"
  on public.subscription_transactions for select
  using (auth.uid() = user_id);

create policy "Users insert own sub transactions"
  on public.subscription_transactions for insert
  with check (auth.uid() = user_id);
