-- Run after migrations in a disposable/staging database. The transaction always
-- rolls back; any violated invariant raises and fails the script.
begin;

do $$
declare
  v_customer uuid := 'c0000000-0000-0000-0000-000000000001';
  v_success uuid := 'a0000000-0000-0000-0000-000000000001';
  v_short uuid := 'a0000000-0000-0000-0000-000000000002';
  v_blocker uuid := 'a0000000-0000-0000-0000-000000000003';
begin
  insert into public.customers(id, name, phone, phone_normalized)
  values (v_customer, 'SQL invariant test', '+51900000001', '51900000001');

  insert into public.orders(
    id, public_access_token_hash, customer_id, payment_provider,
    subtotal_cents, delivery_cents, discount_cents, total_cents,
    customer_snapshot, delivery_snapshot, fiscal_snapshot, pricing_snapshot,
    age_confirmed, terms_accepted
  ) values
    (v_success, repeat('a', 64), v_customer, 'mercadopago', 200, 0, 0, 200,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true, true),
    (v_short, repeat('b', 64), v_customer, 'mercadopago', 300, 0, 0, 300,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true, true),
    (v_blocker, repeat('c', 64), v_customer, 'manual', 0, 0, 0, 0,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true, true);

  insert into public.order_items(
    order_id, product_id, sku, product_name, product_snapshot, pricing_group,
    quantity, regular_unit_cents, applied_unit_cents, line_total_cents,
    tier_min_qty, tier_pack_total_cents
  ) values
    (v_success, 'sql-late-ok', 'sql-late-ok', 'Late OK', '{}'::jsonb, 'sql-ok', 2, 100, 100, 200, 1, 100),
    (v_short, 'sql-bundle-ok', 'sql-bundle-ok', 'Bundle OK', '{}'::jsonb, 'sql-bundle', 1, 100, 100, 100, 1, 100),
    (v_short, 'sql-late-short', 'sql-late-short', 'Late short', '{}'::jsonb, 'sql-short', 2, 100, 100, 200, 1, 100);

  insert into public.inventory_ledger(product_id, quantity_delta, event_type, reason)
  values
    ('sql-late-ok', 5, 'opening_balance', 'SQL invariant test'),
    ('sql-bundle-ok', 10, 'opening_balance', 'SQL invariant test'),
    ('sql-late-short', 5, 'opening_balance', 'SQL invariant test');

  insert into public.stock_reservations(order_id, product_id, quantity, expires_at)
  values
    (v_success, 'sql-late-ok', 2, now() - interval '5 minutes'),
    (v_short, 'sql-bundle-ok', 1, now() - interval '5 minutes'),
    (v_short, 'sql-late-short', 2, now() - interval '5 minutes'),
    (v_blocker, 'sql-late-short', 4, now() + interval '30 minutes');

  insert into public.payment_attempts(order_id, provider, amount_cents)
  values
    (v_success, 'mercadopago', 200),
    (v_short, 'mercadopago', 300);

  -- Expired reservation with enough net stock: payment, reservation and sale advance.
  perform public.apply_payment_result(v_success, 'sql-payment-ok', 'approved', 'accredited', '{}'::jsonb);
  if not exists (
    select 1 from public.orders
    where id = v_success and payment_status = 'approved' and fulfillment_status = 'reserved'
  ) then
    raise exception 'late payment with available stock did not advance';
  end if;
  if not exists (
    select 1 from public.inventory_ledger
    where order_id = v_success and product_id = 'sql-late-ok' and event_type = 'sale' and quantity_delta = -2
  ) then
    raise exception 'late payment with available stock did not create the sale movement';
  end if;

  -- One unavailable SKU makes the whole mixed order an exception. The payment
  -- remains approved, but neither the available nor unavailable SKU is decremented.
  perform public.apply_payment_result(v_short, 'sql-payment-short', 'approved', 'accredited', '{}'::jsonb);
  if not exists (
    select 1 from public.orders
    where id = v_short and payment_status = 'approved' and fulfillment_status = 'unfulfilled'
  ) then
    raise exception 'stock exception did not preserve approved payment/unfulfilled state';
  end if;
  if exists (
    select 1 from public.inventory_ledger
    where order_id = v_short and event_type = 'sale'
  ) then
    raise exception 'mixed order was partially decremented despite one unavailable SKU';
  end if;
  if not exists (
    select 1 from public.stock_reservations
    where order_id = v_short and status = 'released'
  ) then
    raise exception 'stock exception did not release stale reservations';
  end if;
  if not exists (
    select 1 from public.activities
    where order_id = v_short and kind = 'inventory.exception' and status = 'planned'
  ) then
    raise exception 'stock exception did not create manual-review activity';
  end if;
  if not exists (
    select 1 from public.audit_log
    where entity_id = v_short::text and action = 'inventory.exception'
  ) then
    raise exception 'stock exception did not create an audit event';
  end if;
end;
$$;

rollback;
