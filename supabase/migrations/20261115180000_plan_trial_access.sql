alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_status_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_status_check
  check (status in ('trial', 'active', 'pending', 'expired', 'canceled'));

create function public.create_trial_for_confirmed_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null then
    insert into public.user_subscriptions
      (user_id, plan, status, started_at, expires_at)
    values
      (new.id, 'plus', 'trial', new.email_confirmed_at, null)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.create_trial_for_confirmed_user()
  from public, anon, authenticated;

create trigger create_trial_after_user_confirmation
  after insert or update of email_confirmed_at
  on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.create_trial_for_confirmed_user();

insert into public.user_subscriptions
  (user_id, plan, status, started_at, expires_at)
select id, 'plus', 'trial', email_confirmed_at, null
from auth.users
where email_confirmed_at is not null
on conflict (user_id) do nothing;
