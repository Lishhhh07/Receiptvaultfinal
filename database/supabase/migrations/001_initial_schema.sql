create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  merchant text not null,
  receipt_date date not null,
  expiry_date date,
  total_amount numeric(12,2) not null,
  currency text not null default 'INR',
  alert_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  item_name text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  renewal_date date not null,
  amount numeric(12,2) not null,
  billing_cycle text not null,
  is_active boolean not null default true,
  user_decision text,
  alert_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists alerts_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  alert_type text not null,
  scheduled_for timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  product_name text not null,
  price numeric(12,2) not null,
  observed_at timestamptz not null default now(),
  source_url text
);
