-- Repair for installations where the initial WhatsApp migration was already
-- applied. The RETURN TABLE output parameter `contact_id` conflicted with an
-- unqualified table column inside record_whatsapp_inbound.

create or replace function public.record_whatsapp_inbound(
  p_phone_normalized text,
  p_provider_message_id text,
  p_message_kind public.whatsapp_message_kind,
  p_body text,
  p_reply_to_provider_message_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table(
  contact_id uuid,
  conversation_id uuid,
  age_verified_at timestamptz,
  conversation_state public.whatsapp_conversation_state,
  message_id uuid,
  duplicate boolean
)
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_contact public.whatsapp_contacts%rowtype;
  v_conversation public.whatsapp_conversations%rowtype;
  v_customer_id uuid;
  v_message_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if p_phone_normalized !~ '^[1-9][0-9]{7,14}$' then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_phone';
  end if;
  if char_length(coalesce(p_provider_message_id, '')) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_provider_message_id';
  end if;
  if char_length(coalesce(p_body, '')) > 4000 then
    raise exception using errcode = '22023', message = 'whatsapp_message_too_long';
  end if;

  select id into v_customer_id
  from public.customers where phone_normalized = p_phone_normalized;

  insert into public.whatsapp_contacts(phone_normalized, customer_id)
  values (p_phone_normalized, v_customer_id)
  on conflict (phone_normalized) do update set
    customer_id = coalesce(excluded.customer_id, public.whatsapp_contacts.customer_id)
  returning * into v_contact;

  select * into v_conversation
  from public.whatsapp_conversations as wc
  where wc.contact_id = v_contact.id and wc.state <> 'closed'
  order by wc.last_message_at desc
  limit 1
  for update;
  if not found then
    insert into public.whatsapp_conversations(contact_id, state, last_inbound_at, last_message_at)
    values (v_contact.id, 'bot', now(), now())
    returning * into v_conversation;
  end if;

  insert into public.whatsapp_messages(
    conversation_id, provider_message_id, direction, kind, body, delivery_status,
    reply_to_provider_message_id, metadata
  ) values (
    v_conversation.id, p_provider_message_id, 'inbound', p_message_kind,
    nullif(left(coalesce(p_body, ''), 4000), ''), 'received',
    nullif(left(p_reply_to_provider_message_id, 200), ''), coalesce(p_metadata, '{}'::jsonb)
  ) on conflict (provider_message_id) do nothing
  returning id into v_message_id;

  if v_message_id is null then
    return query select v_contact.id, v_conversation.id, v_contact.age_verified_at,
      v_conversation.state, null::uuid, true;
    return;
  end if;

  update public.whatsapp_conversations set
    last_inbound_at = now(), last_message_at = now(),
    metadata = metadata || jsonb_build_object('lastInboundMessageId', p_provider_message_id)
  where id = v_conversation.id;

  return query select v_contact.id, v_conversation.id, v_contact.age_verified_at,
    v_conversation.state, v_message_id, false;
end;
$$;
