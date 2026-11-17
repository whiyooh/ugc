alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_status_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_status_check
  check (status in ('trial', 'active', 'pending', 'past_due', 'expired', 'canceled'));

alter table public.user_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_event_created bigint;

create unique index if not exists user_subscriptions_stripe_customer_id_key
  on public.user_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists user_subscriptions_stripe_subscription_id_key
  on public.user_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

create or replace function public.process_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_plan text,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_cancel_at_period_end boolean,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_grace_until timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.user_subscriptions%rowtype;
  v_status text;
  v_plan text;
  v_started_at timestamptz;
  v_expires_at timestamptz;
  v_stripe_subscription_id text;
  v_inserted integer;
begin
  if p_event_id = '' or p_event_type = '' or p_event_created < 0 then
    raise exception 'Invalid Stripe event metadata';
  end if;
  if p_plan not in ('plus', 'pro', 'premium') then
    raise exception 'Invalid subscription plan';
  end if;
  if p_status not in (
    'pending', 'unchanged', 'active', 'past_due', 'expired', 'canceled'
  ) then
    raise exception 'Invalid subscription status';
  end if;
  if p_customer_id = '' or p_subscription_id = '' then
    raise exception 'Missing Stripe identifiers';
  end if;

  insert into public.stripe_webhook_events (id, event_type)
  values (p_event_id, p_event_type)
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return jsonb_build_object('processed', false, 'reason', 'duplicate');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select *
    into v_existing
    from public.user_subscriptions
    where user_id = p_user_id
    for update;

  if found and v_existing.stripe_event_created > p_event_created then
    return jsonb_build_object('processed', false, 'reason', 'stale');
  end if;

  if found and v_existing.status = 'trial' and p_status <> 'active' then
    v_status := 'trial';
    v_plan := v_existing.plan;
    v_started_at := v_existing.started_at;
    v_expires_at := v_existing.expires_at;
    v_stripe_subscription_id := case
      when p_event_type = 'customer.subscription.deleted' or p_status = 'expired'
        then null
      else p_subscription_id
    end;
  elsif found and p_status = 'unchanged' then
    v_status := v_existing.status;
    v_plan := v_existing.plan;
    v_started_at := v_existing.started_at;
    v_expires_at := case
      when v_existing.status in ('active', 'canceled') then p_period_end
      else v_existing.expires_at
    end;
    v_stripe_subscription_id := p_subscription_id;
  elsif found and v_existing.status = 'active' and p_status = 'pending' then
    v_status := v_existing.status;
    v_plan := v_existing.plan;
    v_started_at := v_existing.started_at;
    v_expires_at := p_period_end;
    v_stripe_subscription_id := p_subscription_id;
  else
    v_status := case when p_status = 'unchanged' then 'pending' else p_status end;
    v_plan := p_plan;
    v_started_at := coalesce(p_period_start, now());

    if v_status = 'active' then
      v_expires_at := p_period_end;
    elsif v_status = 'past_due' then
      v_expires_at := p_grace_until;
    elsif v_status = 'canceled' then
      v_expires_at := p_period_end;
      if v_expires_at is null or v_expires_at <= now() then
        v_status := 'expired';
        v_expires_at := coalesce(v_expires_at, now());
      end if;
    elsif v_status = 'expired' then
      v_expires_at := coalesce(p_period_end, now());
    else
      v_expires_at := null;
    end if;

    if p_cancel_at_period_end and v_status = 'active' then
      v_status := 'canceled';
      v_expires_at := p_period_end;
    end if;
    v_stripe_subscription_id := case
      when v_status = 'expired' then null
      else p_subscription_id
    end;
  end if;

  insert into public.user_subscriptions (
    user_id,
    plan,
    status,
    started_at,
    expires_at,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_event_created
  )
  values (
    p_user_id,
    v_plan,
    v_status,
    v_started_at,
    v_expires_at,
    p_customer_id,
    v_stripe_subscription_id,
    p_event_created
  )
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = excluded.status,
        started_at = excluded.started_at,
        expires_at = excluded.expires_at,
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_event_created = excluded.stripe_event_created,
        updated_at = now();

  return jsonb_build_object('processed', true, 'status', v_status);
end;
$$;

revoke all on function public.process_stripe_subscription_event(
  text, text, bigint, uuid, text, text, text, text, boolean,
  timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.process_stripe_subscription_event(
  text, text, bigint, uuid, text, text, text, text, boolean,
  timestamptz, timestamptz, timestamptz
) to service_role;
