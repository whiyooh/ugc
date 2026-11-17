create table public.user_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('plus', 'pro', 'premium')),
  status text not null default 'pending'
    check (status in ('active', 'pending', 'expired', 'canceled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;

revoke all on public.user_subscriptions from anon, authenticated;
grant select on public.user_subscriptions to authenticated;

create policy "Users can read their own subscription"
  on public.user_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own workspace"
  on public.user_workspaces;
drop policy if exists "Users can create their own workspace"
  on public.user_workspaces;
drop policy if exists "Users can update their own workspace"
  on public.user_workspaces;
drop policy if exists "Users can delete their own workspace"
  on public.user_workspaces;

revoke all on public.user_workspaces from authenticated;

drop policy if exists "Users can read their own workspace images"
  on storage.objects;
drop policy if exists "Users can upload their own workspace images"
  on storage.objects;
drop policy if exists "Users can update their own workspace images"
  on storage.objects;
drop policy if exists "Users can delete their own workspace images"
  on storage.objects;
