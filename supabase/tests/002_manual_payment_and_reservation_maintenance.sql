-- Run after all migrations in a disposable/staging database. This validates
-- coordinated-payment reconciliation, inventory-exception recovery and expiry.
begin;

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  v_actor uuid := 'd0000000-0000-0000-0000-000000000001';
  v_customer uuid := 'd0000000-0000-0000-0000-000000000002';
  v_manual_ok uuid := 'd0000000-0000-0000-0000-000000000003';
  v_manual_short uuid := 'd0000000-0000-0000-0000-000000000004';
  v_blocker uuid := 'd0000000-0000-0000-0000-000000000005';
  v_expiring uuid := 'd0000000-0000-0000-0000-000000000006';
  v_allocated boolean;
  v_fulfillment public.fulfillment_status;
  v_expired integer;
begin
  if has_function_privilege(
    'anon',
    'public.admin_record_manual_payment(uuid,text,integer,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'anon retained EXECUTE on manual payment reconciliation';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.admin_record_manual_payment(uuid,text,integer,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated admins cannot execute manual reconciliation';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.expire_stock_reservations(integer)',
    'EXECUTE'
  ) then
    raise exception 'authenticated retained EXECUTE on reservation maintenance';
  end if;

  insert into public.customers(id, name, phone, phone_normalized)
  values (v_customer, 'Manual payment SQL test', '+51900000002', '51900000002');

  insert into public.orders(
    id, public_access_token_hash, customer_id, payment_provider, fulfillment_status,
    subtotal_cents, delivery_cents, discount_cents, total_cents,
    customer_snapshot, delivery_snapshot, fiscal_snapshot, pricing_snapshot,
    age_confirmed, terms_accepted
  ) values
    (v_manual_ok, repeat('d', 64), v_customer, 'manual', 'reserved', 200, 0, 0, 200,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true, true),
    (v_manual_short, repeat('e', 64), v_customer, 'manual', 'reserved', 200, 0, 0, 200,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true, true),
    (v_blocker, repeat('f', 64), v_customer, 'manual', 'reserved', 0, 0, 0, 0,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true, true),
    (v_expiring, repeat('0', 64), v_customer, 'manual', 'reserved', 100, 0, 0, 100,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true, true);

  insert into public.order_items(
    order_id, product_id, sku, product_name, product_snapshot, pricing_group,
    quantity, regular_unit_cents, applied_unit_cents, line_total_cents,
    tier_min_qty, tier_pack_total_cents
  ) values
    (v_manual_ok, 'sql-manual-ok', 'sql-manual-ok', 'Manual OK', '{}'::jsonb, 'manual', 2, 100, 100, 200, 1, 100),
    (v_manual_short, 'sql-manual-short', 'sql-manual-short', 'Manual short', '{}'::jsonb, 'manual', 1, 100, 100, 100, 1, 100),
    (v_manual_short, 'sql-manual-available', 'sql-manual-available', 'Manual available', '{}'::jsonb, 'manual', 1, 100, 100, 100, 1, 100),
    (v_expiring, 'sql-expiring', 'sql-expiring', 'Expiring', '{}'::jsonb, 'manual', 1, 100, 100, 100, 1, 100);

  insert into public.inventory_ledger(product_id, quantity_delta, event_type, reason)
  values
    ('sql-manual-ok', 3, 'opening_balance', 'SQL manual test'),
    ('sql-manual-short', 1, 'opening_balance', 'SQL manual test'),
    ('sql-manual-available', 5, 'opening_balance', 'SQL manual test'),
    ('sql-expiring', 2, 'opening_balance', 'SQL expiry test');

  insert into public.stock_reservations(order_id, product_id, quantity, expires_at)
  values
    (v_manual_ok, 'sql-manual-ok', 2, now() + interval '30 minutes'),
    (v_manual_short, 'sql-manual-short', 1, now() - interval '5 minutes'),
    (v_blocker, 'sql-manual-short', 1, now() + interval '30 minutes'),
    (v_expiring, 'sql-expiring', 1, now() - interval '5 minutes');

  insert into public.payment_attempts(order_id, provider, amount_cents)
  values
    (v_manual_ok, 'manual', 200),
    (v_manual_short, 'manual', 200),
    (v_expiring, 'manual', 100);

  select inventory_allocated, resulting_fulfillment_status
  into v_allocated, v_fulfillment
  from public.admin_record_manual_payment(
    v_manual_ok, 'manual-ref-ok', 200, 'Verified in bank statement', v_actor
  );
  if not v_allocated or v_fulfillment <> 'reserved' then
    raise exception 'available manual payment did not allocate inventory';
  end if;
  if not exists (
    select 1 from public.inventory_ledger
    where order_id = v_manual_ok and event_type = 'sale' and quantity_delta = -2
  ) then
    raise exception 'manual payment did not create sale movement';
  end if;
  if not exists (
    select 1 from public.notification_outbox
    where order_id = v_manual_ok and kind = 'ycloud.payment_confirmed'
  ) then
    raise exception 'allocated manual payment did not enqueue confirmation';
  end if;

  -- Repeating an already reconciled reference is idempotent: no second sale,
  -- notification or audit side effect is created.
  perform public.admin_record_manual_payment(
    v_manual_ok, 'manual-ref-ok', 200, 'Verified in bank statement', v_actor
  );
  if (select count(*) from public.inventory_ledger
      where order_id = v_manual_ok and event_type = 'sale') <> 1 then
    raise exception 'repeated manual reconciliation duplicated the sale';
  end if;
  if (select count(*) from public.notification_outbox
      where order_id = v_manual_ok and kind = 'ycloud.payment_confirmed') <> 1 then
    raise exception 'repeated manual reconciliation duplicated the notification';
  end if;
  if (select count(*) from public.audit_log
      where entity_id = v_manual_ok::text and action = 'payment.manual_reconciled') <> 1 then
    raise exception 'repeated manual reconciliation duplicated the audit event';
  end if;

  -- The same provider reference cannot be used by another order.
  begin
    perform public.admin_record_manual_payment(
      v_expiring, 'manual-ref-ok', 100, 'Verified in bank statement', v_actor
    );
    raise exception 'duplicate manual reference was accepted';
  exception
    when unique_violation then null;
  end;

  -- Missing/anonymous JWT context must not satisfy an admin-only RPC.
  perform set_config('request.jwt.claim.role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    perform public.admin_record_manual_payment(
      v_expiring, 'manual-ref-unauthorized', 100, 'Verified in bank statement', v_actor
    );
    raise exception 'anonymous reconciliation was accepted';
  exception
    when insufficient_privilege then null;
  end;

  -- An authenticated admin cannot choose a different audit actor. Only the
  -- service backend may forward the already authenticated user's UUID.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'role', 'authenticated',
      'sub', v_actor,
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
  );
  perform public.admin_set_order_fulfillment(v_expiring, 'reserved', v_customer);
  if not exists (
    select 1 from public.audit_log
    where entity_id = v_expiring::text
      and action = 'order.fulfillment_updated'
      and actor_id = v_actor
  ) then
    raise exception 'authenticated admin could spoof the audit actor';
  end if;
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  select inventory_allocated, resulting_fulfillment_status
  into v_allocated, v_fulfillment
  from public.admin_record_manual_payment(
    v_manual_short, 'manual-ref-short', 200, 'Verified in bank statement', v_actor
  );
  if v_allocated or v_fulfillment <> 'unfulfilled' then
    raise exception 'unavailable manual payment did not become an inventory exception';
  end if;
  if exists (
    select 1 from public.inventory_ledger
    where order_id = v_manual_short and event_type = 'sale'
  ) then
    raise exception 'unavailable manual payment decremented inventory';
  end if;
  if not exists (
    select 1 from public.activities
    where order_id = v_manual_short and kind = 'inventory.exception' and status = 'planned'
  ) then
    raise exception 'manual inventory exception activity was not created';
  end if;

  insert into public.inventory_ledger(product_id, quantity_delta, event_type, reason)
  values ('sql-manual-short', 2, 'purchase', 'Stock replenished for SQL test');
  perform public.admin_set_order_fulfillment(v_manual_short, 'reserved', v_actor);
  if (select count(*) from public.inventory_ledger
      where order_id = v_manual_short and event_type = 'sale') <> 2 then
    raise exception 'resolved mixed inventory exception did not create every sale movement';
  end if;
  if not exists (
    select 1 from public.activities
    where order_id = v_manual_short and kind = 'inventory.exception' and status = 'completed'
  ) then
    raise exception 'resolved inventory exception was not completed';
  end if;
  if not exists (
    select 1 from public.notification_outbox
    where order_id = v_manual_short and kind = 'ycloud.payment_confirmed'
  ) then
    raise exception 'resolved inventory exception did not enqueue confirmation';
  end if;

  select public.expire_stock_reservations(100) into v_expired;
  if v_expired < 1 then
    raise exception 'expired reservation maintenance did not update rows';
  end if;
  if not exists (
    select 1 from public.stock_reservations
    where order_id = v_expiring and status = 'expired'
  ) then
    raise exception 'expired reservation status was not persisted';
  end if;
  if not exists (
    select 1 from public.orders
    where id = v_expiring and payment_status = 'pending' and fulfillment_status = 'unfulfilled'
  ) then
    raise exception 'pending order retained a stale reserved fulfillment state';
  end if;
  if not exists (
    select 1 from public.activities
    where order_id = v_expiring and kind = 'reservation.expired'
  ) then
    raise exception 'reservation expiry activity was not created';
  end if;
end;
$$;

rollback;
