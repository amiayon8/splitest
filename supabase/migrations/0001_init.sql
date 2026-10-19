create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id text primary key,
  email text not null unique,
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

create or replace function public.handle_ensure_profile(raw_email text)
returns text as $$
declare
  clean_email text;
  display_name text;
  handle text;
begin
  if raw_email is null then
    return null;
  end if;
  clean_email := lower(trim(raw_email));
  if clean_email = '' then
    return null;
  end if;

  if not exists (select 1 from public.profiles where lower(email) = clean_email) then
    display_name := initcap(replace(split_part(clean_email, '@', 1), '.', ' '));
    handle := lower(regexp_replace(split_part(clean_email, '@', 1), '[^a-z0-9]', '.', 'g'));
    insert into public.profiles (
      id,
      email,
      full_name,
      username,
      avatar_url,
      default_currency
    ) values (
      'stub-' || md5(clean_email),
      clean_email,
      display_name,
      handle,
      'https://www.gravatar.com/avatar/' || md5(clean_email) || '?s=160&d=mp',
      'USD'
    ) on conflict (email) do nothing;
  end if;

  return clean_email;
end;
$$ language plpgsql security definer;

create table if not exists groups (
  id text primary key,
  name text not null,
  icon text not null default 'Users',
  category text not null default 'Trip',
  description text,
  default_currency varchar(3) not null default 'USD',
  simplify_debts boolean not null default true,
  user_role text not null default 'owner',
  created_by text references profiles(email) on update cascade on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  email text not null references profiles(email) on update cascade on delete cascade,
  role text not null default 'editor',
  is_current_user boolean not null default false,
  joined_at timestamptz not null default now()
);

create or replace function public.trg_group_members_ensure_profile()
returns trigger as $$
begin
  if new.email is not null then
    new.email := public.handle_ensure_profile(new.email);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger trg_group_members_profile_check
before insert or update of email on public.group_members
for each row execute function public.trg_group_members_ensure_profile();

create table if not exists expenses (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  description text not null,
  category text not null default 'general',
  amount numeric(12,2) not null check (amount > 0),
  currency_code varchar(3) not null default 'USD',
  exchange_rate_to_group numeric(12,6) not null default 1.0,
  paid_by_email text not null references profiles(email) on update cascade on delete cascade,
  split_method text not null default 'equal',
  date text not null,
  has_receipt boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.trg_expenses_ensure_profile()
returns trigger as $$
begin
  if new.paid_by_email is not null then
    new.paid_by_email := public.handle_ensure_profile(new.paid_by_email);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger trg_expenses_profile_check
before insert or update of paid_by_email on public.expenses
for each row execute function public.trg_expenses_ensure_profile();

create table if not exists expense_splits (
  id text primary key,
  expense_id text not null references expenses(id) on delete cascade,
  member_email text not null references profiles(email) on update cascade on delete cascade,
  share_amount numeric(12,2) not null default 0,
  percentage numeric(10,2),
  shares numeric(10,2)
);

create or replace function public.trg_expense_splits_ensure_profile()
returns trigger as $$
begin
  if new.member_email is not null then
    new.member_email := public.handle_ensure_profile(new.member_email);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger trg_expense_splits_profile_check
before insert or update of member_email on public.expense_splits
for each row execute function public.trg_expense_splits_ensure_profile();

create table if not exists comments (
  id text primary key,
  expense_id text not null references expenses(id) on delete cascade,
  author_email text not null references profiles(email) on update cascade on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create or replace function public.trg_comments_ensure_profile()
returns trigger as $$
begin
  if new.author_email is not null then
    new.author_email := public.handle_ensure_profile(new.author_email);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger trg_comments_profile_check
before insert or update of author_email on public.comments
for each row execute function public.trg_comments_ensure_profile();

create table if not exists settlements (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  payer_email text not null references profiles(email) on update cascade on delete cascade,
  recipient_email text not null references profiles(email) on update cascade on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency_code varchar(3) not null default 'USD',
  method text not null default 'Manual',
  notes text,
  created_at timestamptz not null default now()
);

create or replace function public.trg_settlements_ensure_profile()
returns trigger as $$
begin
  if new.payer_email is not null then
    new.payer_email := public.handle_ensure_profile(new.payer_email);
  end if;
  if new.recipient_email is not null then
    new.recipient_email := public.handle_ensure_profile(new.recipient_email);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger trg_settlements_profile_check
before insert or update of payer_email, recipient_email on public.settlements
for each row execute function public.trg_settlements_ensure_profile();

create table if not exists chat_messages (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  sender_email text not null references profiles(email) on update cascade on delete cascade,
  sender_is_current_user boolean not null default false,
  content text not null,
  mentions jsonb not null default '[]'::jsonb,
  attachment jsonb,
  likes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.trg_chat_messages_ensure_profile()
returns trigger as $$
begin
  if new.sender_email is not null then
    new.sender_email := public.handle_ensure_profile(new.sender_email);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger trg_chat_messages_profile_check
before insert or update of sender_email on public.chat_messages
for each row execute function public.trg_chat_messages_ensure_profile();

create table if not exists friends (
  id text primary key,
  user_email text not null references profiles(email) on update cascade on delete cascade,
  email text not null references profiles(email) on update cascade on delete cascade,
  net_balance numeric(12,2) default 0,
  group_count integer default 0,
  added_via text default 'directory',
  created_at timestamptz not null default now(),
  constraint friends_user_friend_unique unique (user_email, email)
);

create or replace function public.trg_friends_ensure_profile()
returns trigger as $$
begin
  if new.user_email is not null then
    new.user_email := public.handle_ensure_profile(new.user_email);
  end if;
  if new.email is not null then
    new.email := public.handle_ensure_profile(new.email);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger trg_friends_profile_check
before insert or update of user_email, email on public.friends
for each row execute function public.trg_friends_ensure_profile();

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
  created_by text references profiles(email) on update cascade on delete set null,
  created_at timestamptz not null default now()
);

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
