create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  avatar_url text,
  default_currency varchar(3) not null default 'USD',
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id bigint generated always as identity primary key,
  name text not null,
  icon_emoji text not null default 'wallet',
  default_currency varchar(3) not null default 'USD',
  simplify_debts boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id bigint generated always as identity primary key,
  group_id bigint not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')) default 'editor',
  joined_at timestamptz not null default now(),
  constraint group_members_group_user_unique unique (group_id, user_id)
);

create table if not exists group_invitations (
  id bigint generated always as identity primary key,
  group_id bigint not null references groups(id) on delete cascade,
  invited_by uuid not null references profiles(id) on delete cascade,
  invitee_email text,
  token text not null unique,
  role text not null check (role in ('editor', 'viewer')) default 'editor',
  status text not null check (status in ('pending', 'accepted', 'revoked')) default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id bigint generated always as identity primary key,
  group_id bigint references groups(id) on delete set null,
  description text not null,
  category text not null default 'General',
  amount numeric(12,2) not null check (amount > 0),
  currency_code varchar(3) not null default 'USD',
  exchange_rate_to_group numeric(12,6) not null default 1.0,
  paid_by uuid not null references profiles(id),
  split_type text not null check (split_type in ('equal', 'exact', 'percent', 'shares')) default 'equal',
  expense_date timestamptz not null default now(),
  created_by uuid not null references profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists expense_splits (
  id bigint generated always as identity primary key,
  expense_id bigint not null references expenses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  amount_owed numeric(12,2) not null default 0,
  share_value numeric(10,2) not null default 1.0
);

create table if not exists settlements (
  id bigint generated always as identity primary key,
  group_id bigint not null references groups(id) on delete cascade,
  from_user_id uuid not null references profiles(id),
  to_user_id uuid not null references profiles(id),
  amount numeric(12,2) not null check (amount > 0),
  currency_code varchar(3) not null default 'USD',
  settled_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id bigint generated always as identity primary key,
  group_id bigint not null references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_invitations enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;
alter table activity_logs enable row level security;

create policy "Profiles visible to authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Members can view their groups"
  on groups for select
  to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy "Authenticated users can create groups"
  on groups for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Owners and editors can update group details"
  on groups for update
  to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
      and group_members.role in ('owner', 'editor')
    )
  );

create policy "Only owners can delete group"
  on groups for delete
  to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
      and group_members.role = 'owner'
    )
    or created_by = auth.uid()
  );

create policy "Members can view group members"
  on group_members for select
  to authenticated
  using (
    exists (
      select 1 from group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

create policy "Owners can manage group members"
  on group_members for all
  to authenticated
  using (
    exists (
      select 1 from group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
    )
    or group_members.user_id = auth.uid()
  );

create policy "Members can view group invitations"
  on group_invitations for select
  to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = group_invitations.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Owners and editors can create invitations"
  on group_invitations for insert
  to authenticated
  with check (
    exists (
      select 1 from group_members
      where group_members.group_id = group_invitations.group_id
      and group_members.user_id = auth.uid()
      and group_members.role in ('owner', 'editor')
    )
  );

create policy "Owners can update invitations"
  on group_invitations for update
  to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = group_invitations.group_id
      and group_members.user_id = auth.uid()
      and group_members.role = 'owner'
    )
  );

create policy "Members can view expenses"
  on expenses for select
  to authenticated
  using (
    group_id is null
    or exists (
      select 1 from group_members
      where group_members.group_id = expenses.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Owners and editors can insert expenses"
  on expenses for insert
  to authenticated
  with check (
    group_id is null
    or exists (
      select 1 from group_members
      where group_members.group_id = expenses.group_id
      and group_members.user_id = auth.uid()
      and group_members.role in ('owner', 'editor')
    )
  );

create policy "Owners and editors can update expenses"
  on expenses for update
  to authenticated
  using (
    group_id is null
    or exists (
      select 1 from group_members
      where group_members.group_id = expenses.group_id
      and group_members.user_id = auth.uid()
      and group_members.role in ('owner', 'editor')
    )
  );

create policy "Owners and editors can delete expenses"
  on expenses for delete
  to authenticated
  using (
    group_id is null
    or exists (
      select 1 from group_members
      where group_members.group_id = expenses.group_id
      and group_members.user_id = auth.uid()
      and group_members.role in ('owner', 'editor')
    )
  );

create policy "Members can view splits"
  on expense_splits for select
  to authenticated
  using (
    exists (
      select 1 from expenses
      left join group_members on group_members.group_id = expenses.group_id
      where expenses.id = expense_splits.expense_id
      and (expenses.group_id is null or group_members.user_id = auth.uid())
    )
  );

create policy "Owners and editors can manage splits"
  on expense_splits for all
  to authenticated
  using (
    exists (
      select 1 from expenses
      left join group_members on group_members.group_id = expenses.group_id
      where expenses.id = expense_splits.expense_id
      and (expenses.group_id is null or (group_members.user_id = auth.uid() and group_members.role in ('owner', 'editor')))
    )
  );

create policy "Members can view settlements"
  on settlements for select
  to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = settlements.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Owners and editors can insert settlements"
  on settlements for insert
  to authenticated
  with check (
    exists (
      select 1 from group_members
      where group_members.group_id = settlements.group_id
      and group_members.user_id = auth.uid()
      and group_members.role in ('owner', 'editor')
    )
  );

create policy "Members can view activity logs"
  on activity_logs for select
  to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = activity_logs.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Members can insert activity logs"
  on activity_logs for insert
  to authenticated
  with check (
    exists (
      select 1 from group_members
      where group_members.group_id = activity_logs.group_id
      and group_members.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table group_members;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_splits;
alter publication supabase_realtime add table settlements;
