-- Fixes ambiguous references between the function's TABLE output column
-- `order_id` and columns with the same name in commerce tables.

begin;

create or replace function public.confirm_test_checkout_payment(
  p_order_id uuid,
  p_payment_attempt_id uuid
)
returns table (
  order_id uuid,
  payment_status text,
  fulfillment_status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_item record;
  v_on_hand bigint;
  v_reserved_by_others bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'test_order_not_found';
  end if;
  if coalesce(v_order.attribution->>'medium', '') <> 'test_coupon'
    or coalesce(v_order.attribution->>'source', '') <> 'internal_test' then
    raise exception using errcode = '22023', message = 'test_coupon_order_required';
  end if;
  if v_order.payment_status = 'approved' then
    return query select v_order.id, 'approved'::text, v_order.fulfillment_status::text;
    return;
  end if;
  if v_order.payment_status <> 'pending' or v_order.payment_provider <> 'manual' then
    raise exception using errcode = '22023', message = 'test_order_not_pending';
  end if;

  select pa.* into v_attempt
  from public.payment_attempts pa
  where pa.id = p_payment_attempt_id
    and pa.order_id = p_order_id
  for update;

  if not found or v_attempt.provider <> 'manual' then
    raise exception using errcode = '22023', message = 'test_payment_attempt_invalid';
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
      raise exception using errcode = 'P0001', message = 'test_checkout_insufficient_stock';
    end if;
  end loop;

  update public.payment_attempts pa
  set status = 'approved',
      provider_reference = coalesce(pa.provider_reference, 'test_coupon:' || p_order_id::text),
      provider_status_detail = 'approved_simulated_test_coupon',
      response_snapshot = jsonb_build_object(
        'mode', 'sandbox',
        'simulated', true,
        'legalPayment', false,
        'confirmedAt', now()
      ),
      error_code = null
  where pa.id = v_attempt.id;

  update public.orders o
  set status = 'paid',
      payment_status = 'approved',
      fulfillment_status = 'reserved',
      paid_at = coalesce(o.paid_at, now())
  where o.id = p_order_id;

  update public.stock_reservations sr
  set status = 'converted'
  where sr.order_id = p_order_id
    and sr.status = 'active';

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
    order by oi.product_id
  loop
    insert into public.inventory_ledger(product_id, order_id, quantity_delta, event_type, reason)
    values (v_item.product_id, p_order_id, -v_item.quantity, 'sale', 'test_coupon_approved')
    on conflict do nothing;
  end loop;

  insert into public.activities(customer_id, order_id, kind, subject, status, metadata)
  select o.customer_id, o.id, 'payment.test_coupon_approved',
    'Pago simulado aprobado para prueba', 'completed',
    jsonb_build_object('mode', 'sandbox', 'simulated', true, 'paymentAttemptId', v_attempt.id)
  from public.orders o
  where o.id = p_order_id;

  insert into public.notification_outbox(order_id, kind)
  values (p_order_id, 'ycloud.payment_confirmed')
  on conflict on constraint notification_outbox_order_id_kind_key do nothing;

  insert into public.audit_log(actor_type, action, entity_type, entity_id, after_data)
  values (
    'system', 'payment.test_coupon_approved', 'order', p_order_id::text,
    jsonb_build_object('mode', 'sandbox', 'simulated', true, 'paymentAttemptId', v_attempt.id)
  );

  return query select p_order_id, 'approved'::text, 'reserved'::text;
end;
$$;

revoke all on function public.confirm_test_checkout_payment(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_test_checkout_payment(uuid, uuid)
  to service_role;

commit;
