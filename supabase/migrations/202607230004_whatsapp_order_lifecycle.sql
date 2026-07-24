-- Transactional WhatsApp notifications for the web checkout lifecycle.
-- The purchase remains on the website; this outbox only communicates state.

alter table public.notification_outbox
  drop constraint if exists notification_outbox_kind_check;

update public.notification_outbox
set kind = 'payment.confirmed'
where kind = 'ycloud.payment_confirmed';

alter table public.notification_outbox
  add constraint notification_outbox_kind_check check (kind in (
    'order.received',
    'payment.confirmed',
    'fulfillment.preparing',
    'fulfillment.shipped',
    'fulfillment.delivered',
    'order.cancelled'
  ));

create or replace function public.normalize_legacy_whatsapp_notification_kind()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind = 'ycloud.payment_confirmed' then
    new.kind := 'payment.confirmed';
  end if;
  return new;
end;
$$;

drop trigger if exists notification_outbox_normalize_legacy_kind
  on public.notification_outbox;
create trigger notification_outbox_normalize_legacy_kind
before insert or update of kind on public.notification_outbox
for each row execute function public.normalize_legacy_whatsapp_notification_kind();

create or replace function public.queue_whatsapp_order_lifecycle()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_kind text;
begin
  if tg_op = 'INSERT' then
    v_kind := 'order.received';
  elsif old.payment_status is distinct from new.payment_status
    and new.payment_status = 'approved'
  then
    v_kind := 'payment.confirmed';
  elsif old.fulfillment_status is distinct from new.fulfillment_status then
    v_kind := case new.fulfillment_status
      when 'preparing' then 'fulfillment.preparing'
      when 'shipped' then 'fulfillment.shipped'
      when 'delivered' then 'fulfillment.delivered'
      when 'cancelled' then 'order.cancelled'
      else null
    end;
  end if;

  if v_kind is not null
    and coalesce(
      new.customer_snapshot->>'phoneNormalized',
      regexp_replace(new.customer_snapshot->>'phone', '[^0-9]', '', 'g')
    ) ~ '^[1-9][0-9]{7,14}$'
  then
    insert into public.notification_outbox(order_id, kind)
    values (new.id, v_kind)
    on conflict (order_id, kind) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_queue_whatsapp_lifecycle on public.orders;
create trigger orders_queue_whatsapp_lifecycle
after insert or update of payment_status, fulfillment_status on public.orders
for each row execute function public.queue_whatsapp_order_lifecycle();

-- The former YCloud-only worker used the same table but assumed every row was
-- a payment confirmation. It is intentionally retired so it cannot claim a
-- preparation or delivery event and send the wrong template. The unified
-- /api/whatsapp/outbox worker below is now provider-aware.
create or replace function public.claim_ycloud_outbox(
  p_worker_id uuid,
  p_limit integer default 10,
  p_lease_seconds integer default 120
)
returns table(
  outbox_id uuid,
  order_id uuid,
  phone text,
  order_number text,
  attempt integer
)
language plpgsql security definer
set search_path = public
as $$
begin
  return;
end;
$$;

create or replace function public.claim_whatsapp_order_notifications(
  p_worker_id uuid,
  p_limit integer default 10,
  p_lease_seconds integer default 120
)
returns table(
  outbox_id uuid,
  order_id uuid,
  kind text,
  phone text,
  order_number text,
  customer_name text,
  total_cents integer,
  attempt integer
)
language plpgsql security definer
set search_path = public
as $$
begin
  if p_worker_id is null
    or p_limit not between 1 and 50
    or p_lease_seconds not between 30 and 600
  then
    raise exception using errcode = '22023', message = 'invalid_order_notification_claim';
  end if;

  return query
  with candidates as (
    select no.id
    from public.notification_outbox no
    where no.kind in (
        'order.received', 'payment.confirmed', 'fulfillment.preparing',
        'fulfillment.shipped', 'fulfillment.delivered', 'order.cancelled'
      )
      and no.attempts < no.max_attempts
      and (
        (no.state in ('pending', 'failed') and no.next_attempt_at <= now())
        or (no.state = 'processing' and no.lease_expires_at <= now())
      )
    order by no.next_attempt_at, no.created_at
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.notification_outbox no set
      state = 'processing',
      worker_id = p_worker_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      attempts = no.attempts + 1
    from candidates c
    where no.id = c.id
    returning no.id, no.order_id, no.kind, no.attempts, no.created_at
  )
  select
    c.id,
    c.order_id,
    c.kind,
    coalesce(
      o.customer_snapshot->>'phoneNormalized',
      regexp_replace(o.customer_snapshot->>'phone', '[^0-9]', '', 'g')
    ),
    o.order_number,
    nullif(o.customer_snapshot->>'name', ''),
    o.total_cents,
    c.attempts
  from claimed c
  join public.orders o on o.id = c.order_id
  order by c.created_at;
end;
$$;

create or replace function public.complete_whatsapp_order_notification(
  p_outbox_id uuid,
  p_worker_id uuid,
  p_sent boolean,
  p_provider_reference text default null,
  p_error_code text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_outbox public.notification_outbox%rowtype;
begin
  select * into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'order_notification_not_found';
  end if;
  if v_outbox.state <> 'processing' or v_outbox.worker_id <> p_worker_id then
    raise exception using errcode = '40001', message = 'order_notification_lease_lost';
  end if;

  if p_sent then
    update public.notification_outbox set
      state = 'sent',
      worker_id = null,
      lease_expires_at = null,
      provider_reference = nullif(left(p_provider_reference, 250), ''),
      last_error_code = null,
      sent_at = now()
    where id = p_outbox_id;
  else
    update public.notification_outbox set
      state = 'failed',
      worker_id = null,
      lease_expires_at = null,
      last_error_code = coalesce(nullif(left(p_error_code, 100), ''), 'provider_error'),
      next_attempt_at = now() + make_interval(
        mins => least(60, power(2, greatest(attempts - 1, 0))::integer)
      )
    where id = p_outbox_id;
  end if;

  insert into public.audit_log(actor_type, action, entity_type, entity_id, after_data)
  values (
    'system',
    case when p_sent then 'whatsapp.order_notification_sent'
      else 'whatsapp.order_notification_failed' end,
    'notification_outbox',
    p_outbox_id::text,
    jsonb_build_object(
      'kind', v_outbox.kind,
      'attempt', v_outbox.attempts,
      'sent', p_sent
    )
  );
end;
$$;

revoke all on function public.claim_whatsapp_order_notifications(uuid,integer,integer)
  from public, anon, authenticated;
revoke all on function public.complete_whatsapp_order_notification(uuid,uuid,boolean,text,text)
  from public, anon, authenticated;
grant execute on function public.claim_whatsapp_order_notifications(uuid,integer,integer)
  to service_role;
grant execute on function public.complete_whatsapp_order_notification(uuid,uuid,boolean,text,text)
  to service_role;
