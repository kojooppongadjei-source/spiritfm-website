-- Run this once in the Supabase SQL editor to set up streaming billing.
-- Table: station_subscriptions
-- Tracks the $25/month recurring streaming-hosting charge for each station.

create table if not exists station_subscriptions (
  id uuid primary key default gen_random_uuid(),
  station_key text unique not null,        -- 'sunnyfm' | 'spirit883' | 'spirit966' | 'spirit1045'
  station_name text not null,              -- display name, e.g. "Sunny 88.7 FM"
  billing_email text,
  paystack_customer_code text,
  paystack_authorization_code text,
  paystack_subscription_code text,
  status text not null default 'unpaid',   -- 'unpaid' | 'active' | 'past_due' | 'cancelled'
  amount_usd numeric not null default 25.00,
  last_charged_at timestamptz,
  next_billing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed the four stations (safe to re-run — does nothing if rows already exist)
insert into station_subscriptions (station_key, station_name, amount_usd)
values
  ('sunnyfm',   'Sunny 88.7 FM',        25.00),
  ('spirit883', 'Spirit 88.3 FM (Ghana)', 25.00),
  ('spirit966', 'Spirit FM 96.6 (Kampala)', 25.00),
  ('spirit1045','Spirit 104.5 (Koboko)', 25.00)
on conflict (station_key) do nothing;
