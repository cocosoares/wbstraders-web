-- Durable email lifecycle for Resend.
-- Business events only enqueue work. A protected server worker performs the
-- external API calls, so checkout/payment transactions never depend on Resend.

begin;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'order.received.customer',
    'order.received.operations',
    'payment.confirmed.customer',
    'payment.refunded.customer',
    'fulfillment.preparing.customer',
    'fulfillment.shipped.customer',
    'fulfillment.delivered.customer',
    'order.cancelled.customer',
    'fiscal.issued.customer',
    'claim.received.customer',
    'claim.received.operations',
    'marketing.contact_sync'
  )),
  dedupe_key text not null unique,
  recipient_email text,
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'pending'
    check (state in ('pending', 'processing', 'sent', 'failed', 'dead', 'suppressed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 6 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  locked_by uuid,
  locked_at timestamptz,
  provider_reference text,
  delivery_status text,
  last_error text,
  last_event_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index email_outbox_dispatch_idx
  on public.email_outbox(state, next_attempt_at, created_at);
create index email_outbox_provider_reference_idx
  on public.email_outbox(provider_reference)
  where provider_reference is not null;

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  provider_email_id text,
  recipient_email text,
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index email_events_provider_email_idx
  on public.email_events(provider_email_id, received_at desc)
  where provider_email_id is not null;

create table public.email_suppressions (
  email text primary key check (email = lower(email)),
  reason text not null,
  provider_email_id text,
  provider_event_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger email_outbox_set_updated_at
before update on public.email_outbox
for each row execute function public.set_updated_at();

create trigger email_suppressions_set_updated_at
before update on public.email_suppressions
for each row execute function public.set_updated_at();

create or replace function public.enqueue_email_job(
  p_kind text,
  p_dedupe_key text,
  p_recipient_email text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.email_outbox(kind, dedupe_key, recipient_email, payload)
  values (
    p_kind,
    p_dedupe_key,
    nullif(lower(trim(p_recipient_email)), ''),
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.queue_order_email_events()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text := nullif(lower(trim(new.customer_snapshot->>'email')), '');
begin
  if tg_op = 'INSERT' then
    if v_email is not null then
      perform public.enqueue_email_job(
        'order.received.customer',
        'order:' || new.id::text || ':received:customer',
        v_email,
        jsonb_build_object('orderId', new.id)
      );
    end if;
    perform public.enqueue_email_job(
      'order.received.operations',
      'order:' || new.id::text || ':received:operations',
      null,
      jsonb_build_object('orderId', new.id)
    );
    return new;
  end if;

  if old.payment_status is distinct from new.payment_status and v_email is not null then
    if new.payment_status = 'approved' then
      perform public.enqueue_email_job(
        'payment.confirmed.customer',
        'order:' || new.id::text || ':payment:approved:customer',
        v_email,
        jsonb_build_object('orderId', new.id)
      );
    elsif new.payment_status in ('refunded', 'partially_refunded') then
      perform public.enqueue_email_job(
        'payment.refunded.customer',
        'order:' || new.id::text || ':payment:' || new.payment_status::text || ':customer',
        v_email,
        jsonb_build_object('orderId', new.id, 'paymentStatus', new.payment_status)
      );
    end if;
  end if;

  if old.fulfillment_status is distinct from new.fulfillment_status and v_email is not null then
    if new.fulfillment_status in ('preparing', 'shipped', 'delivered') then
      perform public.enqueue_email_job(
        'fulfillment.' || new.fulfillment_status::text || '.customer',
        'order:' || new.id::text || ':fulfillment:' || new.fulfillment_status::text || ':customer',
        v_email,
        jsonb_build_object('orderId', new.id, 'fulfillmentStatus', new.fulfillment_status)
      );
    elsif new.fulfillment_status = 'cancelled' then
      perform public.enqueue_email_job(
        'order.cancelled.customer',
        'order:' || new.id::text || ':cancelled:customer',
        v_email,
        jsonb_build_object('orderId', new.id)
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_queue_email_events
after insert or update of payment_status, fulfillment_status on public.orders
for each row execute function public.queue_order_email_events();

create or replace function public.queue_fiscal_email_event()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if old.status is distinct from new.status and new.status = 'issued' then
    select nullif(lower(trim(o.customer_snapshot->>'email')), '')
    into v_email
    from public.orders o
    where o.id = new.order_id;

    if v_email is not null then
      perform public.enqueue_email_job(
        'fiscal.issued.customer',
        'fiscal:' || new.id::text || ':issued:customer',
        v_email,
        jsonb_build_object('orderId', new.order_id, 'fiscalDocumentId', new.id)
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger fiscal_documents_queue_email_event
after update of status on public.fiscal_documents
for each row execute function public.queue_fiscal_email_event();

create or replace function public.queue_claim_email_events()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.enqueue_email_job(
    'claim.received.customer',
    'claim:' || new.id::text || ':received:customer',
    new.email,
    jsonb_build_object('claimId', new.id)
  );
  perform public.enqueue_email_job(
    'claim.received.operations',
    'claim:' || new.id::text || ':received:operations',
    null,
    jsonb_build_object('claimId', new.id)
  );
  return new;
end;
$$;

create trigger consumer_claims_queue_email_events
after insert on public.consumer_claims
for each row execute function public.queue_claim_email_events();

create or replace function public.queue_marketing_contact_sync()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if new.purpose <> 'marketing' then return new; end if;
  select nullif(lower(trim(c.email)), '') into v_email
  from public.customers c where c.id = new.customer_id;
  if v_email is not null then
    perform public.enqueue_email_job(
      'marketing.contact_sync',
      'consent:' || new.id::text || ':resend-contact',
      v_email,
      jsonb_build_object(
        'customerId', new.customer_id,
        'consentId', new.id,
        'consentStatus', new.status
      )
    );
  end if;
  return new;
end;
$$;

create trigger consents_queue_marketing_contact_sync
after insert on public.consents
for each row execute function public.queue_marketing_contact_sync();

create or replace function public.claim_email_outbox(
  p_worker_id uuid,
  p_limit integer default 10,
  p_lease_seconds integer default 120,
  p_include_transactional boolean default true,
  p_include_marketing boolean default true
)
returns table(
  outbox_id uuid,
  kind text,
  recipient_email text,
  payload jsonb,
  attempt integer
)
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if p_limit < 1 or p_limit > 50 or p_lease_seconds < 30 or p_lease_seconds > 900 then
    raise exception using errcode = '22023', message = 'invalid_email_outbox_claim';
  end if;

  update public.email_outbox eo
  set state = 'suppressed',
      delivery_status = 'suppressed',
      last_error = 'recipient_suppressed'
  where eo.kind like '%.customer'
    and eo.state in ('pending', 'failed')
    and eo.recipient_email is not null
    and exists (
      select 1 from public.email_suppressions es
      where es.email = lower(eo.recipient_email) and es.active
    );

  return query
  with candidates as (
    select eo.id
    from public.email_outbox eo
    where eo.attempts < eo.max_attempts
      and (
        (eo.state in ('pending', 'failed') and eo.next_attempt_at <= now())
        or (eo.state = 'processing' and eo.locked_at < now() - make_interval(secs => p_lease_seconds))
      )
      and (
        (eo.kind = 'marketing.contact_sync' and p_include_marketing)
        or (eo.kind <> 'marketing.contact_sync' and p_include_transactional)
      )
    order by eo.next_attempt_at, eo.created_at
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.email_outbox eo
    set state = 'processing',
        attempts = eo.attempts + 1,
        locked_by = p_worker_id,
        locked_at = now(),
        last_error = null
    from candidates c
    where eo.id = c.id
    returning eo.id, eo.kind, eo.recipient_email, eo.payload, eo.attempts
  )
  select c.id, c.kind, c.recipient_email, c.payload, c.attempts
  from claimed c;
end;
$$;

create or replace function public.complete_email_outbox(
  p_outbox_id uuid,
  p_worker_id uuid,
  p_sent boolean,
  p_provider_reference text default null,
  p_error_code text default null
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_outbox public.email_outbox%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  select * into v_outbox from public.email_outbox eo
  where eo.id = p_outbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'email_outbox_not_found'; end if;
  if v_outbox.state <> 'processing' or v_outbox.locked_by is distinct from p_worker_id then
    raise exception using errcode = '22023', message = 'email_outbox_lease_mismatch';
  end if;

  if p_sent then
    update public.email_outbox
    set state = 'sent',
        provider_reference = nullif(trim(p_provider_reference), ''),
        delivery_status = 'sent',
        sent_at = now(),
        locked_by = null,
        locked_at = null,
        last_error = null
    where id = p_outbox_id;
  else
    update public.email_outbox
    set state = case when attempts >= max_attempts then 'dead' else 'failed' end,
        next_attempt_at = now() + make_interval(
          secs => least(21600, (power(2, least(attempts, 10)) * 30)::integer)
        ),
        locked_by = null,
        locked_at = null,
        last_error = left(coalesce(nullif(p_error_code, ''), 'provider_error'), 500)
    where id = p_outbox_id;
  end if;
end;
$$;

create or replace function public.record_resend_email_event(
  p_provider_event_id text,
  p_event_type text,
  p_provider_email_id text,
  p_recipient_email text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(duplicate boolean)
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_event_id uuid;
  v_email text := nullif(lower(trim(p_recipient_email)), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  insert into public.email_events(
    provider_event_id, event_type, provider_email_id, recipient_email, metadata
  ) values (
    p_provider_event_id,
    p_event_type,
    nullif(trim(p_provider_email_id), ''),
    v_email,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return query select true;
    return;
  end if;

  update public.email_outbox
  set delivery_status = replace(p_event_type, 'email.', ''),
      last_event_at = now(),
      delivered_at = case when p_event_type = 'email.delivered' then now() else delivered_at end,
      last_error = case
        when p_event_type in ('email.bounced', 'email.complained', 'email.failed', 'email.suppressed')
          then left(coalesce(p_metadata->>'reason', p_event_type), 500)
        else last_error
      end
  where provider_reference = p_provider_email_id;

  if p_event_type in ('email.bounced', 'email.complained', 'email.suppressed') and v_email is not null then
    insert into public.email_suppressions(email, reason, provider_email_id, provider_event_id, active)
    values (v_email, p_event_type, p_provider_email_id, p_provider_event_id, true)
    on conflict (email) do update set
      reason = excluded.reason,
      provider_email_id = excluded.provider_email_id,
      provider_event_id = excluded.provider_event_id,
      active = true;

    update public.email_outbox eo
    set state = 'suppressed',
        delivery_status = 'suppressed',
        last_error = p_event_type
    where eo.recipient_email = v_email
      and eo.kind like '%.customer'
      and eo.state in ('pending', 'failed');

    perform public.enqueue_email_job(
      'marketing.contact_sync',
      'resend-event:' || p_provider_event_id || ':unsubscribe',
      v_email,
      jsonb_build_object('consentStatus', 'withdrawn', 'reason', p_event_type)
    );
  end if;

  return query select false;
end;
$$;

alter table public.email_outbox enable row level security;
alter table public.email_events enable row level security;
alter table public.email_suppressions enable row level security;

revoke all on table public.email_outbox from public, anon, authenticated;
revoke all on table public.email_events from public, anon, authenticated;
revoke all on table public.email_suppressions from public, anon, authenticated;
grant all on table public.email_outbox to service_role;
grant all on table public.email_events to service_role;
grant all on table public.email_suppressions to service_role;

revoke all on function public.enqueue_email_job(text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.queue_order_email_events() from public, anon, authenticated;
revoke all on function public.queue_fiscal_email_event() from public, anon, authenticated;
revoke all on function public.queue_claim_email_events() from public, anon, authenticated;
revoke all on function public.queue_marketing_contact_sync() from public, anon, authenticated;
revoke all on function public.claim_email_outbox(uuid,integer,integer,boolean,boolean) from public, anon, authenticated;
revoke all on function public.complete_email_outbox(uuid,uuid,boolean,text,text) from public, anon, authenticated;
revoke all on function public.record_resend_email_event(text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.claim_email_outbox(uuid,integer,integer,boolean,boolean) to service_role;
grant execute on function public.complete_email_outbox(uuid,uuid,boolean,text,text) to service_role;
grant execute on function public.record_resend_email_event(text,text,text,text,jsonb) to service_role;

commit;
