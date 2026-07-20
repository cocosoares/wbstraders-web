-- Operational hardening for coordinated payments and inventory exceptions.
-- Manual reconciliation is an admin-only financial action. Inventory allocation
-- remains all-or-nothing and uses the same deterministic advisory locks as
-- checkout and provider payment processing.

create or replace function public.admin_record_manual_payment(
  p_order_id uuid,
  p_provider_reference text,
  p_amount_cents integer,
  p_note text,
  p_actor_id uuid default null
)
returns table(
  inventory_allocated boolean,
  resulting_fulfillment_status public.fulfillment_status
)
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_order public.orders%rowtype;
  v_attempt_id uuid;
  v_existing_reference text;
  v_reference text := trim(coalesce(p_provider_reference, ''));
  v_note text := trim(coalesce(p_note, ''));
  v_item record;
  v_on_hand bigint;
  v_reserved_by_others bigint;
  v_inventory_available boolean := true;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and not coalesce(public.is_admin(), false)
  then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if char_length(v_reference) not between 4 and 120 then
    raise exception using errcode = '22023', message = 'invalid_manual_payment_reference';
  end if;
  if char_length(v_note) not between 8 and 500 then
    raise exception using errcode = '22023', message = 'manual_payment_note_required';
  end if;
  if p_amount_cents is null or p_amount_cents < 0 then
    raise exception using errcode = '22023', message = 'invalid_manual_payment_amount';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'order_not_found';
  end if;
  if v_order.payment_provider <> 'manual' then
    raise exception using errcode = '22023', message = 'manual_payment_only';
  end if;
  if p_amount_cents <> v_order.total_cents then
    raise exception using errcode = '22023', message = 'manual_payment_amount_mismatch';
  end if;

  select pa.id, pa.provider_reference
  into v_attempt_id, v_existing_reference
  from public.payment_attempts pa
  where pa.order_id = p_order_id and pa.provider = 'manual'
  order by pa.created_at desc
  limit 1
  for update;

  if v_order.payment_status = 'approved' then
    if v_existing_reference = v_reference then
      return query
      select
        v_order.fulfillment_status <> 'unfulfilled'::public.fulfillment_status,
        v_order.fulfillment_status;
      return;
    end if;
    raise exception using errcode = '22023', message = 'payment_already_reconciled';
  end if;
  if v_order.payment_status <> 'pending' or v_order.status <> 'pending_payment' then
    raise exception using errcode = '22023', message = 'payment_not_pending';
  end if;
  if exists (
    select 1
    from public.payment_attempts pa
    where pa.provider = 'manual'
      and pa.provider_reference = v_reference
      and pa.order_id <> p_order_id
  ) then
    raise exception using errcode = '23505', message = 'manual_payment_reference_already_used';
  end if;

  for v_item in
    select distinct oi.product_id
    from public.order_items oi
    where oi.order_id = p_order_id
    order by oi.product_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_item.product_id, 0));
  end loop;

  perform sr.id
  from public.stock_reservations sr
  where sr.order_id = p_order_id
  order by sr.product_id
  for update;

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
    order by oi.product_id
  loop
    select sum(il.quantity_delta)
    into v_on_hand
    from public.inventory_ledger il
    where il.product_id = v_item.product_id;

    select coalesce(sum(sr.quantity), 0)
    into v_reserved_by_others
    from public.stock_reservations sr
    where sr.product_id = v_item.product_id
      and sr.order_id <> p_order_id
      and sr.status = 'active'
      and sr.expires_at > now();

    if v_on_hand is null or v_on_hand - v_reserved_by_others < v_item.quantity then
      v_inventory_available := false;
    end if;
  end loop;

  if v_attempt_id is null then
    insert into public.payment_attempts(
      order_id, provider, provider_reference, status, amount_cents, currency,
      provider_status_detail, response_snapshot
    ) values (
      p_order_id, 'manual', v_reference, 'approved', p_amount_cents, v_order.currency,
      'verified_by_admin',
      jsonb_build_object(
        'verificationMethod', 'admin_reconciliation',
        'verificationNote', v_note,
        'verifiedBy', case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end,
        'verifiedAt', now()
      )
    ) returning id into v_attempt_id;
  else
    update public.payment_attempts set
      provider_reference = v_reference,
      status = 'approved',
      amount_cents = p_amount_cents,
      provider_status_detail = 'verified_by_admin',
      error_code = null,
      response_snapshot = response_snapshot || jsonb_build_object(
        'verificationMethod', 'admin_reconciliation',
        'verificationNote', v_note,
        'verifiedBy', case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end,
        'verifiedAt', now()
      )
    where id = v_attempt_id;
  end if;

  update public.orders set
    status = 'paid',
    payment_status = 'approved',
    fulfillment_status = case
      when v_inventory_available then 'reserved'::public.fulfillment_status
      else 'unfulfilled'::public.fulfillment_status
    end,
    paid_at = coalesce(paid_at, now())
  where id = p_order_id;

  if v_inventory_available then
    update public.stock_reservations
    set status = 'converted'
    where order_id = p_order_id and status <> 'converted';

    for v_item in
      select oi.product_id, oi.quantity
      from public.order_items oi
      where oi.order_id = p_order_id
      order by oi.product_id
    loop
      insert into public.inventory_ledger(
        product_id, order_id, quantity_delta, event_type, reason, created_by
      ) values (
        v_item.product_id, p_order_id, -v_item.quantity, 'sale',
        'manual_payment_verified',
        case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end
      )
      on conflict do nothing;
    end loop;

    insert into public.activities(customer_id, order_id, kind, subject, status, metadata, created_by)
    select customer_id, id, 'whatsapp.payment_confirmation.pending',
      'Notificar pago confirmado por WhatsApp', 'planned',
      jsonb_build_object('outbox', true, 'paymentProvider', 'manual'),
      case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end
    from public.orders o
    where o.id = p_order_id
      and not exists (
        select 1 from public.activities a
        where a.order_id = p_order_id
          and a.kind = 'whatsapp.payment_confirmation.pending'
      );

    insert into public.notification_outbox(order_id, kind)
    values (p_order_id, 'ycloud.payment_confirmed')
    on conflict (order_id, kind) do nothing;
  else
    update public.stock_reservations
    set status = 'released'
    where order_id = p_order_id and status = 'active';

    insert into public.activities(customer_id, order_id, kind, subject, status, metadata, created_by)
    select customer_id, id, 'inventory.exception',
      'Pago manual verificado sin stock disponible: revisión requerida', 'planned',
      jsonb_build_object(
        'reason', 'approved_manual_payment_without_available_inventory',
        'providerReference', v_reference
      ),
      case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end
    from public.orders
    where id = p_order_id;
  end if;

  insert into public.audit_log(
    actor_id, actor_type, action, entity_type, entity_id, before_data, after_data
  ) values (
    case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end,
    'admin', 'payment.manual_reconciled',
    'order', p_order_id::text,
    jsonb_build_object(
      'paymentStatus', v_order.payment_status,
      'fulfillmentStatus', v_order.fulfillment_status
    ),
    jsonb_build_object(
      'paymentStatus', 'approved',
      'fulfillmentStatus', case when v_inventory_available then 'reserved' else 'unfulfilled' end,
      'amountCents', p_amount_cents,
      'providerReference', v_reference,
      'inventoryAllocated', v_inventory_available
    )
  );

  return query
  select
    v_inventory_available,
    case
      when v_inventory_available then 'reserved'::public.fulfillment_status
      else 'unfulfilled'::public.fulfillment_status
    end;
end;
$$;

-- Replaces the earlier transition function. Resolving a paid inventory exception
-- now allocates every SKU and writes every sale movement before the order can be
-- marked reserved.
create or replace function public.admin_set_order_fulfillment(
  p_order_id uuid,
  p_fulfillment_status public.fulfillment_status,
  p_actor_id uuid default null
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_before public.orders%rowtype;
  v_current_rank integer;
  v_next_rank integer;
  v_item record;
  v_on_hand bigint;
  v_reserved_by_others bigint;
  v_sale_exists boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and not coalesce(public.is_admin(), false)
  then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  select * into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;

  if p_fulfillment_status = 'cancelled' then
    if v_before.payment_status in ('approved', 'partially_refunded') then
      raise exception using errcode = '22023', message = 'refund_required_before_cancellation';
    end if;
    update public.orders set fulfillment_status = 'cancelled', status = 'cancelled', cancelled_at = now()
      where id = p_order_id;
    update public.stock_reservations set status = 'released'
      where order_id = p_order_id and status = 'active';
  else
    v_current_rank := case v_before.fulfillment_status
      when 'unfulfilled' then 0 when 'reserved' then 1 when 'preparing' then 2
      when 'shipped' then 3 when 'delivered' then 4 else -1 end;
    v_next_rank := case p_fulfillment_status
      when 'unfulfilled' then 0 when 'reserved' then 1 when 'preparing' then 2
      when 'shipped' then 3 when 'delivered' then 4 else -1 end;
    if v_current_rank < 0 or v_next_rank < v_current_rank or v_next_rank > v_current_rank + 1 then
      raise exception using errcode = '22023', message = 'invalid_fulfillment_transition';
    end if;
    if p_fulfillment_status in ('preparing', 'shipped', 'delivered')
      and v_before.payment_status <> 'approved'
    then
      raise exception using errcode = '22023', message = 'payment_required';
    end if;

    if v_before.fulfillment_status = 'unfulfilled'
      and p_fulfillment_status = 'reserved'
    then
      if v_before.payment_status <> 'approved' then
        raise exception using errcode = '22023', message = 'payment_required';
      end if;

      for v_item in
        select distinct oi.product_id
        from public.order_items oi
        where oi.order_id = p_order_id
        order by oi.product_id
      loop
        perform pg_advisory_xact_lock(hashtextextended(v_item.product_id, 0));
      end loop;

      perform sr.id
      from public.stock_reservations sr
      where sr.order_id = p_order_id
      order by sr.product_id
      for update;

      for v_item in
        select oi.product_id, oi.quantity
        from public.order_items oi
        where oi.order_id = p_order_id
        order by oi.product_id
      loop
        select exists (
          select 1 from public.inventory_ledger il
          where il.order_id = p_order_id
            and il.product_id = v_item.product_id
            and il.event_type = 'sale'
        ) into v_sale_exists;

        if not v_sale_exists then
          select sum(il.quantity_delta)
          into v_on_hand
          from public.inventory_ledger il
          where il.product_id = v_item.product_id;

          select coalesce(sum(sr.quantity), 0)
          into v_reserved_by_others
          from public.stock_reservations sr
          where sr.product_id = v_item.product_id
            and sr.order_id <> p_order_id
            and sr.status = 'active'
            and sr.expires_at > now();

          if v_on_hand is null or v_on_hand - v_reserved_by_others < v_item.quantity then
            raise exception using errcode = 'P0001',
              message = 'inventory_still_unavailable:' || v_item.product_id;
          end if;
        end if;
      end loop;

      for v_item in
        select oi.product_id, oi.quantity
        from public.order_items oi
        where oi.order_id = p_order_id
        order by oi.product_id
      loop
        insert into public.inventory_ledger(
          product_id, order_id, quantity_delta, event_type, reason, created_by
        ) values (
          v_item.product_id, p_order_id, -v_item.quantity, 'sale',
          'inventory_exception_resolved',
          case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end
        )
        on conflict do nothing;
      end loop;

      update public.stock_reservations
      set status = 'converted'
      where order_id = p_order_id and status <> 'converted';

      update public.activities set
        status = 'completed',
        completed_at = now(),
        metadata = metadata || jsonb_build_object(
          'resolvedAt', now(),
          'resolvedBy', case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end
        )
      where order_id = p_order_id
        and kind = 'inventory.exception'
        and status = 'planned';

      insert into public.activities(customer_id, order_id, kind, subject, status, metadata, created_by)
      select customer_id, id, 'whatsapp.payment_confirmation.pending',
        'Notificar pago confirmado por WhatsApp', 'planned',
        jsonb_build_object('outbox', true, 'inventoryExceptionResolved', true),
        case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end
      from public.orders o
      where o.id = p_order_id
        and not exists (
          select 1 from public.activities a
          where a.order_id = p_order_id
            and a.kind = 'whatsapp.payment_confirmation.pending'
        );

      insert into public.notification_outbox(order_id, kind)
      values (p_order_id, 'ycloud.payment_confirmed')
      on conflict (order_id, kind) do nothing;
    end if;

    update public.orders set
      fulfillment_status = p_fulfillment_status,
      status = case
        when p_fulfillment_status = 'delivered' then 'fulfilled'::public.order_status
        else status
      end
    where id = p_order_id;
  end if;

  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, before_data, after_data)
  values (
    case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end,
    'admin', 'order.fulfillment_updated', 'order', p_order_id::text,
    jsonb_build_object('fulfillmentStatus', v_before.fulfillment_status),
    jsonb_build_object(
      'fulfillmentStatus', p_fulfillment_status,
      'inventoryAllocated', v_before.fulfillment_status = 'unfulfilled'
        and p_fulfillment_status = 'reserved'
    )
  );
end;
$$;

-- Intended for a protected cron endpoint. Besides expiring rows, pending orders
-- are returned to an accurate unfulfilled state so the admin cannot prepare them
-- on the strength of a stale reservation.
create or replace function public.expire_stock_reservations(
  -- Limit applies to orders claimed by this worker. An order may contain more
  -- than one expired SKU reservation, all of which are updated together.
  p_limit integer default 500
)
returns integer
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_expired_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if p_limit not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'invalid_reservation_expiry_limit';
  end if;

  -- Lock the order before its reservations, matching every payment/fulfillment
  -- path. Multiple workers skip orders already claimed without creating the
  -- order -> reservation / reservation -> order deadlock cycle.
  with order_candidates as materialized (
    select o.id
    from public.orders o
    where exists (
      select 1
      from public.stock_reservations sr
      where sr.order_id = o.id
        and sr.status = 'active'
        and sr.expires_at <= now()
    )
    order by o.id
    for update of o skip locked
    limit p_limit
  ), expired as (
    update public.stock_reservations sr set status = 'expired'
    from order_candidates oc
    where sr.order_id = oc.id
      and sr.status = 'active'
      and sr.expires_at <= now()
    returning sr.order_id
  ), affected as (
    select distinct e.order_id from expired e
  ), orders_updated as (
    update public.orders o set fulfillment_status = 'unfulfilled'
    from affected a
    where o.id = a.order_id
      and o.payment_status = 'pending'
      and o.fulfillment_status = 'reserved'
    returning o.id, o.customer_id
  ), activities_inserted as (
    insert into public.activities(customer_id, order_id, kind, subject, status, metadata)
    select ou.customer_id, ou.id, 'reservation.expired',
      'Reserva de inventario vencida', 'completed',
      jsonb_build_object('expiredAt', now())
    from orders_updated ou
    returning id
  ), audits_inserted as (
    insert into public.audit_log(actor_type, action, entity_type, entity_id, after_data)
    select 'system', 'inventory.reservation_expired', 'order', a.order_id::text,
      jsonb_build_object('fulfillmentStatus', 'unfulfilled')
    from affected a
    returning id
  )
  select count(*)::integer into v_expired_count from expired;

  return v_expired_count;
end;
$$;

revoke all on function public.admin_record_manual_payment(uuid,text,integer,text,uuid)
  from public, anon;
revoke all on function public.expire_stock_reservations(integer)
  from public, anon, authenticated;

grant execute on function public.admin_record_manual_payment(uuid,text,integer,text,uuid)
  to authenticated, service_role;
grant execute on function public.expire_stock_reservations(integer)
  to service_role;
