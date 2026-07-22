-- Run after 202607220001_whatsapp_crm.sql in a disposable/staging database.
-- The complete CRM scenario is transactional and always rolls back.
begin;

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  v_actor uuid := 'e7000000-0000-0000-0000-000000000001';
  v_contact uuid;
  v_conversation uuid;
  v_customer uuid;
  v_opportunity uuid;
  v_score integer;
  v_outbox uuid;
  v_message uuid;
  v_task uuid;
  v_duplicate uuid;
begin
  if has_function_privilege(
    'anon',
    'public.admin_send_whatsapp_reply(uuid,uuid,text,public.whatsapp_message_kind,jsonb,uuid)',
    'EXECUTE'
  ) then raise exception 'anon retained CRM reply permission'; end if;

  select contact_id, conversation_id into v_contact, v_conversation
  from public.record_whatsapp_inbound(
    '51900000707', 'crm-sql-inbound-1', 'text', 'Busco un vino para parrilla', null,
    jsonb_build_object('eventType', 'whatsapp.inbound_message.received')
  );
  if exists (
    select 1 from public.whatsapp_contacts where id = v_contact and customer_id is not null
  ) then raise exception 'a greeting/inbound message created a customer too early'; end if;

  select customer_id, opportunity_id, score
  into v_customer, v_opportunity, v_score
  from public.record_crm_signal(
    v_contact, v_conversation, 'crm:test:qualification', 'qualification',
    jsonb_build_object('occasion', 'parrilla')
  );
  if v_customer is null or v_score <> 20 then
    raise exception 'qualification did not create/link customer and score';
  end if;
  if v_opportunity is not null then
    raise exception 'qualification alone created a noisy opportunity';
  end if;

  update public.customers set last_activity_at = now() - interval '8 days' where id = v_customer;
  if (select score from public.crm_customer_summary where customer_id = v_customer) <> 0 then
    raise exception 'seven-day inactivity scoring was not applied';
  end if;
  update public.customers set last_activity_at = now() where id = v_customer;

  perform public.record_crm_signal(
    v_contact, v_conversation, 'crm:test:qualification', 'qualification', '{}'::jsonb
  );
  if (select count(*) from public.crm_score_events where event_key = 'crm:test:qualification') <> 1 then
    raise exception 'CRM score event is not idempotent';
  end if;

  select opportunity_id, score into v_opportunity, v_score
  from public.record_crm_signal(
    v_contact, v_conversation, 'crm:test:intent', 'purchase_intent', '{}'::jsonb
  );
  if v_opportunity is null or v_score <> 50 then
    raise exception 'purchase intent did not create the D2C opportunity';
  end if;
  if not exists (
    select 1 from public.opportunities where id = v_opportunity
      and stage = 'recommendation' and source_channel = 'whatsapp'
  ) then raise exception 'D2C opportunity stage/source are invalid'; end if;

  perform public.record_crm_signal(
    v_contact, v_conversation, 'crm:test:intent-duplicate-source', 'purchase_intent', '{}'::jsonb
  );
  if (
    select count(*) from public.opportunities
    where source_conversation_id = v_conversation and stage not in ('won', 'lost')
  ) <> 1 then raise exception 'conversation produced duplicate open opportunities'; end if;

  perform public.request_whatsapp_handoff(
    v_conversation, 'human_handoff', 'customer', 'Desea hablar con una persona', '{}'::jsonb
  );
  if not exists (
    select 1 from public.whatsapp_conversations where id = v_conversation
      and state = 'human' and sla_due_at is not null and priority = 3
  ) then raise exception 'handoff did not start the CRM SLA'; end if;
  if not exists (
    select 1 from public.activities where conversation_id = v_conversation
      and kind = 'crm.whatsapp_handoff' and status = 'planned'
  ) then raise exception 'handoff did not create a follow-up task'; end if;
  if not exists (
    select 1 from public.email_outbox where kind = 'crm.handoff.operations'
      and payload->>'conversationId' = v_conversation::text
  ) then raise exception 'handoff did not queue an operations alert'; end if;

  update public.whatsapp_conversations set sla_due_at = now() - interval '1 minute'
  where id = v_conversation;
  perform public.queue_crm_automations();
  perform public.queue_crm_automations();
  if (
    select count(*) from public.email_outbox where kind = 'crm.sla_breached.operations'
      and payload->>'conversationId' = v_conversation::text
  ) <> 1 then raise exception 'SLA alert was not idempotent'; end if;

  select outbox_id, message_id into v_outbox, v_message
  from public.admin_send_whatsapp_reply(
    v_conversation, v_contact, 'Respuesta humana desde el CRM', 'text', '{}'::jsonb, v_actor
  );
  if v_outbox is null or v_message is null then raise exception 'CRM reply was not queued'; end if;
  if not exists (
    select 1 from public.whatsapp_conversations where id = v_conversation
      and assigned_to = v_actor and first_human_response_at is not null and sla_due_at is null
  ) then raise exception 'CRM reply did not atomically take ownership and stop SLA'; end if;
  if exists (
    select 1 from public.activities where conversation_id = v_conversation
      and kind = 'crm.whatsapp_handoff' and status = 'planned'
  ) then raise exception 'CRM reply left the handoff task open'; end if;

  v_task := public.admin_manage_crm_task(
    null, 'create', 'Confirmar dirección', 'Validar distrito y horario', now(),
    v_customer, v_conversation, v_opportunity, 2, v_actor
  );
  perform public.admin_manage_crm_task(
    v_task, 'complete', null, null, null, null, null, null, 2, v_actor
  );
  if not exists (
    select 1 from public.activities where id = v_task and status = 'completed'
  ) then raise exception 'CRM task lifecycle failed'; end if;

  perform public.admin_manage_whatsapp_conversation(v_conversation, 'resolve', 'Atendido', v_actor);
  perform public.admin_manage_whatsapp_conversation(v_conversation, 'reopen', null, v_actor);
  if not exists (
    select 1 from public.whatsapp_conversations where id = v_conversation and state = 'human'
  ) then raise exception 'closed CRM conversation could not be reopened'; end if;

  insert into public.customers(name, email, phone, phone_normalized)
  values ('Duplicado CRM', 'duplicado-crm@example.com', '+51900000708', '51900000708')
  returning id into v_duplicate;
  insert into public.activities(customer_id, kind, subject)
  values (v_duplicate, 'crm.test', 'Actividad del duplicado');
  perform public.admin_merge_crm_customers(v_duplicate, v_customer, v_actor);
  if exists (select 1 from public.customers where id = v_duplicate)
    or not exists (
      select 1 from public.activities where customer_id = v_customer and subject = 'Actividad del duplicado'
    ) then raise exception 'controlled customer merge did not preserve linked history'; end if;
end;
$$;

rollback;
