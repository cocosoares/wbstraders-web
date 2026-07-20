-- Run after all migrations in a disposable/staging database. This verifies the
-- WhatsApp data boundary, idempotency, service-window outbox and secure order
-- attribution. It always rolls back.
begin;

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  v_actor uuid := 'e0000000-0000-0000-0000-000000000009';
  v_customer uuid := 'e0000000-0000-0000-0000-000000000001';
  v_order uuid := 'e0000000-0000-0000-0000-000000000002';
  v_contact uuid;
  v_conversation uuid;
  v_checkout_token text;
  v_outbox uuid;
  v_message uuid;
  v_duplicate boolean;
  v_converted boolean;
begin
  if has_function_privilege(
    'anon',
    'public.record_whatsapp_inbound(text,text,public.whatsapp_message_kind,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'anon retained execute on inbound WhatsApp recorder';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.create_whatsapp_checkout_session(uuid,uuid,jsonb,jsonb,integer)',
    'EXECUTE'
  ) then
    raise exception 'authenticated retained execute on checkout session creator';
  end if;

  insert into public.customers(id, name, phone, phone_normalized)
  values (v_customer, 'WhatsApp SQL test', '+51900000003', '51900000003');
  insert into public.orders(
    id, public_access_token_hash, customer_id, payment_provider,
    subtotal_cents, delivery_cents, discount_cents, total_cents,
    customer_snapshot, delivery_snapshot, fiscal_snapshot, pricing_snapshot,
    age_confirmed, terms_accepted
  ) values (
    v_order, repeat('e', 64), v_customer, 'manual', 0, 0, 0, 0,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true, true
  );

  select contact_id, conversation_id, duplicate
  into v_contact, v_conversation, v_duplicate
  from public.record_whatsapp_inbound(
    '51900000003', 'sql-whatsapp-inbound-1', 'text', 'Quiero un vino', null,
    jsonb_build_object('eventType', 'whatsapp.inbound_message.received')
  );
  if v_duplicate then raise exception 'first inbound WhatsApp message was duplicate'; end if;
  if not exists (
    select 1 from public.whatsapp_contacts where id = v_contact and customer_id = v_customer
  ) then
    raise exception 'inbound contact was not linked to matching customer';
  end if;

  select duplicate into v_duplicate
  from public.record_whatsapp_inbound(
    '51900000003', 'sql-whatsapp-inbound-1', 'text', 'Quiero un vino', null,
    '{}'::jsonb
  );
  if not v_duplicate then raise exception 'same provider message was not idempotent'; end if;

  perform public.record_whatsapp_consent(
    v_contact, 'age_verification', 'granted', 'sql-test', 'whatsapp', '{}'::jsonb
  );
  if not exists (
    select 1 from public.whatsapp_contacts where id = v_contact and age_verified_at is not null
  ) then
    raise exception 'age consent did not mark the WhatsApp contact';
  end if;

  select outbox_id, message_id into v_outbox, v_message
  from public.enqueue_whatsapp_outbound(
    v_conversation, v_contact, 'Mensaje dentro de la ventana activa', 'text', '{}'::jsonb
  );
  if v_outbox is null or v_message is null then raise exception 'outbound WhatsApp message was not queued'; end if;
  if not exists (
    select 1 from public.claim_whatsapp_outbox(
      'e0000000-0000-0000-0000-000000000010', 5, 120
    ) where outbox_id = v_outbox
  ) then
    raise exception 'outbound WhatsApp message was not claimable';
  end if;
  perform public.complete_whatsapp_outbox(
    v_outbox, 'e0000000-0000-0000-0000-000000000010', true, 'sql-provider-message', null
  );
  if not exists (
    select 1 from public.whatsapp_messages where id = v_message and delivery_status = 'sent'
  ) then
    raise exception 'sent WhatsApp outbox message did not update delivery status';
  end if;

  perform public.admin_manage_whatsapp_conversation(v_conversation, 'take', null, v_actor);
  if not exists (
    select 1 from public.whatsapp_conversations
    where id = v_conversation and state = 'human' and assigned_to = v_actor
  ) then
    raise exception 'admin could not take the WhatsApp conversation';
  end if;
  perform public.admin_manage_whatsapp_conversation(
    v_conversation, 'resolve', 'Consulta resuelta en prueba SQL', v_actor
  );
  if not exists (
    select 1 from public.whatsapp_conversations
    where id = v_conversation and state = 'closed' and resolved_at is not null
  ) then
    raise exception 'admin could not resolve the WhatsApp conversation';
  end if;

  select token into v_checkout_token
  from public.create_whatsapp_checkout_session(
    v_contact, v_conversation,
    jsonb_build_array(jsonb_build_object('productId', '1700-torrontes', 'quantity', 1)),
    jsonb_build_object('source', 'whatsapp'), 60
  );
  if v_checkout_token !~ '^[a-f0-9]{64}$' then
    raise exception 'checkout session did not return a secure opaque token';
  end if;
  if not exists (select 1 from public.consume_whatsapp_checkout_session(v_checkout_token)) then
    raise exception 'valid checkout token could not be consumed';
  end if;

  select converted into v_converted
  from public.mark_whatsapp_checkout_converted(v_checkout_token, v_order);
  if not v_converted then raise exception 'valid checkout token was not converted'; end if;
  if not exists (
    select 1 from public.orders where id = v_order and channel = 'whatsapp'
  ) then
    raise exception 'converted checkout did not attribute the order to WhatsApp';
  end if;
  if exists (select 1 from public.consume_whatsapp_checkout_session(v_checkout_token)) then
    raise exception 'converted checkout token remained reusable';
  end if;
end;
$$;

rollback;
