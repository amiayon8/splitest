create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id text primary key,
  email text not null,
  full_name text not null,
  username text,
  avatar_url text,
  default_currency varchar(3) not null default 'USD',
  phone text,
  payment_handle text,
  upi_id text,
  bio text,
  theme_preference text not null default 'system',
  google_connected boolean not null default false,
  google_email text,
  notifications_enabled boolean not null default true,
  notify_on_expense boolean not null default true,
  notify_on_settlement boolean not null default true,
  notify_on_mention boolean not null default true,
  notify_weekly_digest boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique_idx on profiles (lower(username)) where username is not null;

create table if not exists groups (
  id text primary key,
  name text not null,
  icon text not null default 'Users',
  category text not null default 'Trip',
  description text,
  default_currency varchar(3) not null default 'USD',
  simplify_debts boolean not null default true,
  user_role text not null default 'owner',
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  name text not null,
  email text,
  avatar_url text,
  role text not null default 'editor',
  is_current_user boolean not null default false,
  joined_at timestamptz not null default now()
);

create table if not exists expenses (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  description text not null,
  category text not null default 'general',
  amount numeric(12,2) not null check (amount > 0),
  currency_code varchar(3) not null default 'USD',
  exchange_rate_to_group numeric(12,6) not null default 1.0,
  paid_by_name text not null,
  split_method text not null default 'equal',
  date text not null,
  has_receipt boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists expense_splits (
  id text primary key,
  expense_id text not null references expenses(id) on delete cascade,
  member_name text not null,
  share_amount numeric(12,2) not null default 0,
  percentage numeric(10,2),
  shares numeric(10,2)
);

create table if not exists comments (
  id text primary key,
  expense_id text not null references expenses(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists settlements (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  payer_name text not null,
  recipient_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency_code varchar(3) not null default 'USD',
  method text not null default 'Manual',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  sender_name text not null,
  sender_avatar_url text,
  sender_is_current_user boolean not null default false,
  content text not null,
  mentions jsonb not null default '[]'::jsonb,
  attachment jsonb,
  likes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists friends (
  id text primary key,
  name text not null,
  username text,
  email text,
  avatar_url text,
  phone text,
  net_balance numeric(12,2) default 0,
  group_count integer default 0,
  added_via text default 'directory',
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  type text not null,
  title text not null,
  subtitle text,
  timestamp timestamptz not null default now(),
  icon_name text,
  icon_color_class text
);

create table if not exists group_invites (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  role text not null default 'editor',
  created_by text,
  created_at timestamptz not null default now()
);

alter table group_members add column if not exists user_id text;
alter table friends add column if not exists user_id text;

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table comments enable row level security;
alter table settlements enable row level security;
alter table chat_messages enable row level security;
alter table friends enable row level security;
alter table activity_logs enable row level security;
alter table group_invites enable row level security;

create policy "Allow all access to profiles" on profiles for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to groups" on groups for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to group_members" on group_members for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to expenses" on expenses for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to expense_splits" on expense_splits for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to comments" on comments for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to settlements" on settlements for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to chat_messages" on chat_messages for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to friends" on friends for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to activity_logs" on activity_logs for all to anon, authenticated using (true) with check (true);
create policy "Allow all access to group_invites" on group_invites for all to anon, authenticated using (true) with check (true);

alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table group_members;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_splits;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table friends;
alter publication supabase_realtime add table activity_logs;
alter publication supabase_realtime add table group_invites;
