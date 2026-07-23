begin;

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  v_customer uuid := gen_random_uuid();
  v_order uuid := gen_random_uuid();
  v_document uuid := gen_random_uuid();
  v_actor uuid := gen_random_uuid();
  v_series text;
  v_number text;
begin
  insert into public.customers(id, name, email, phone, phone_normalized)
  values (v_customer, 'Cliente Fiscal Prueba', 'fiscal-test@example.com', '999444333', '51999444333');

  insert into public.orders(
    id, public_access_token_hash, customer_id, status, payment_status,
    fulfillment_status, fiscal_status, payment_provider, subtotal_cents,
    delivery_cents, discount_cents, total_cents, customer_snapshot,
    delivery_snapshot, fiscal_snapshot, pricing_snapshot, attribution,
    age_confirmed, terms_accepted
  ) values (
    v_order, encode(digest(v_order::text, 'sha256'), 'hex'), v_customer,
    'paid', 'approved', 'reserved', 'pending', 'manual',
    10000, 1800, 0, 11800,
    jsonb_build_object('name', 'Cliente Fiscal Prueba', 'email', 'fiscal-test@example.com'),
    '{}'::jsonb, jsonb_build_object('receiptType', 'boleta', 'documentType', 'dni', 'documentNumber', '12345678'),
    '{}'::jsonb, jsonb_build_object('medium', 'test_coupon'), true, true
  );

  insert into public.fiscal_documents(id, order_id, document_type, provider, recipient_snapshot, status)
  values (v_document, v_order, 'boleta', 'manual', '{}'::jsonb, 'pending');

  select series, number into v_series, v_number
  from public.admin_issue_sandbox_fiscal_document(v_document, v_actor);

  if v_series <> 'TEST-B' or v_number !~ '^[0-9]{8}$' then
    raise exception 'sandbox numbering is invalid';
  end if;
  if not exists (
    select 1 from public.fiscal_documents
    where id = v_document and status = 'issued' and provider = 'sandbox'
      and test_mode and (issuer_snapshot->>'legalValidity')::boolean = false
  ) then
    raise exception 'sandbox fiscal document was not marked as test-only';
  end if;
  if not exists (
    select 1 from public.email_outbox
    where kind = 'fiscal.issued.customer' and payload->>'fiscalDocumentId' = v_document::text
  ) then
    raise exception 'sandbox issuance did not queue transactional email';
  end if;
end;
$$;

rollback;
