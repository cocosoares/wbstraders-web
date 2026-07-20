begin;

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  v_customer uuid := gen_random_uuid();
  v_order uuid := gen_random_uuid();
  v_fiscal uuid := gen_random_uuid();
  v_claim uuid := gen_random_uuid();
  v_worker uuid := gen_random_uuid();
  v_outbox uuid;
  v_claimed_outbox uuid;
  v_count integer;
  v_duplicate boolean;
begin
  insert into public.customers(id, name, email, phone, phone_normalized)
  values (v_customer, 'Cliente Email', 'email-lifecycle@example.com', '999888777', '51999888777');

  insert into public.orders(
    id, public_access_token_hash, customer_id, status, payment_status,
    fulfillment_status, fiscal_status, payment_provider, subtotal_cents,
    delivery_cents, discount_cents, total_cents, customer_snapshot,
    delivery_snapshot, fiscal_snapshot, pricing_snapshot, age_confirmed,
    terms_accepted
  ) values (
    v_order, encode(digest(v_order::text, 'sha256'), 'hex'), v_customer,
    'pending_payment', 'pending', 'reserved', 'pending', 'manual',
    10000, 1000, 0, 11000,
    jsonb_build_object(
      'name', 'Cliente Email',
      'email', 'email-lifecycle@example.com',
      'phone', '999888777'
    ),
    jsonb_build_object('district', 'Miraflores', 'address', 'Av. Prueba 123'),
    jsonb_build_object('receiptType', 'boleta'),
    '{}'::jsonb,
    true,
    true
  );

  insert into public.order_items(
    order_id, product_id, sku, product_name, product_snapshot, pricing_group,
    quantity, regular_unit_cents, applied_unit_cents, line_total_cents,
    tier_min_qty, tier_pack_total_cents
  ) values (
    v_order, 'email-test-wine', 'EMAIL-TEST', 'Vino de prueba', '{}'::jsonb,
    'email-test', 1, 10000, 10000, 10000, 1, 10000
  );

  insert into public.consents(customer_id, purpose, status, source)
  values (v_customer, 'marketing', 'granted', 'checkout');

  update public.orders set payment_status = 'approved', status = 'paid' where id = v_order;
  update public.orders set fulfillment_status = 'preparing' where id = v_order;
  update public.orders set fulfillment_status = 'shipped' where id = v_order;
  update public.orders set fulfillment_status = 'delivered', status = 'fulfilled' where id = v_order;

  insert into public.fiscal_documents(
    id, order_id, document_type, provider, recipient_snapshot, status
  ) values (v_fiscal, v_order, 'boleta', 'manual', '{}'::jsonb, 'pending');
  update public.fiscal_documents
  set status = 'issued', series = 'B001', number = '1', issued_at = now()
  where id = v_fiscal;

  insert into public.consumer_claims(
    id, claim_number, customer_name, document_type, document_number, address,
    phone, phone_normalized, email, item_type, item_description, claim_type,
    detail, consumer_request, privacy_accepted_at, privacy_notice_path
  ) values (
    v_claim, 'LR-EMAIL-TEST', 'Cliente Email', 'dni', '12345678',
    'Av. Prueba 123', '999888777', '51999888777',
    'email-lifecycle@example.com', 'product', 'Vino de prueba', 'reclamo',
    'Detalle suficiente para la prueba de email.', 'Solicito una revisión.',
    now(), '/privacidad'
  );

  select count(*) into v_count
  from public.email_outbox eo
  where eo.payload->>'orderId' = v_order::text
     or eo.payload->>'claimId' = v_claim::text
     or eo.payload->>'customerId' = v_customer::text;
  if v_count <> 10 then
    raise exception 'expected 10 email jobs, got %', v_count;
  end if;

  select eo.id into v_outbox
  from public.email_outbox eo
  where eo.kind = 'order.received.customer'
    and eo.payload->>'orderId' = v_order::text;

  update public.email_outbox
  set next_attempt_at = now() + interval '1 day'
  where id <> v_outbox;

  select claimed.outbox_id into v_claimed_outbox
  from public.claim_email_outbox(v_worker, 1, 120, true, true) claimed;
  if v_claimed_outbox is distinct from v_outbox then
    raise exception 'expected email job was not claimed';
  end if;

  perform public.complete_email_outbox(v_outbox, v_worker, true, 'resend-email-test', null);

  select event_result.duplicate into v_duplicate
  from public.record_resend_email_event(
    'resend-event-test',
    'email.bounced',
    'resend-email-test',
    'email-lifecycle@example.com',
    jsonb_build_object('reason', 'test bounce')
  ) event_result;
  if v_duplicate then raise exception 'first webhook event marked duplicate'; end if;

  select event_result.duplicate into v_duplicate
  from public.record_resend_email_event(
    'resend-event-test',
    'email.bounced',
    'resend-email-test',
    'email-lifecycle@example.com',
    jsonb_build_object('reason', 'test bounce')
  ) event_result;
  if not v_duplicate then raise exception 'duplicate webhook event was not detected'; end if;

  if not exists (
    select 1 from public.email_suppressions
    where email = 'email-lifecycle@example.com' and active
  ) then
    raise exception 'bounce did not create suppression';
  end if;

  if not exists (
    select 1 from public.email_outbox
    where dedupe_key = 'resend-event:resend-event-test:unsubscribe'
      and kind = 'marketing.contact_sync'
  ) then
    raise exception 'bounce did not enqueue marketing unsubscribe sync';
  end if;
end;
$$;

rollback;
