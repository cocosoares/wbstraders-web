-- Repair for an already-applied WhatsApp migration. Checkout links use
-- cryptographically strong opaque tokens, so pgcrypto must be enabled.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.create_whatsapp_checkout_session(
  p_contact_id uuid,
  p_conversation_id uuid,
  p_cart_snapshot jsonb,
  p_attribution jsonb default '{}'::jsonb,
  p_ttl_minutes integer default 60
)
returns table(token text, expires_at timestamptz)
language plpgsql security definer
set search_path = public, auth
as $$
declare v_token text; v_expiry timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if p_ttl_minutes not between 5 and 1440 or jsonb_typeof(p_cart_snapshot) <> 'array'
    or jsonb_array_length(p_cart_snapshot) not between 1 and 8 then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_checkout_session';
  end if;
  if not exists (select 1 from public.whatsapp_conversations where id = p_conversation_id and contact_id = p_contact_id) then
    raise exception using errcode = '22023', message = 'whatsapp_conversation_contact_mismatch';
  end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expiry := now() + make_interval(mins => p_ttl_minutes);
  insert into public.whatsapp_checkout_sessions(opaque_token_hash, contact_id, conversation_id, cart_snapshot, attribution, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_contact_id, p_conversation_id, p_cart_snapshot,
    coalesce(p_attribution, '{}'::jsonb), v_expiry);
  return query select v_token, v_expiry;
end;
$$;

create or replace function public.consume_whatsapp_checkout_session(p_token text)
returns table(session_id uuid, cart_snapshot jsonb, attribution jsonb, conversation_id uuid, contact_id uuid)
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if p_token !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_checkout_token';
  end if;
  return query
  update public.whatsapp_checkout_sessions s set visited_at = now()
  where s.opaque_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and s.expires_at > now() and s.converted_at is null
  returning s.id, s.cart_snapshot, s.attribution, s.conversation_id, s.contact_id;
end;
$$;

create or replace function public.mark_whatsapp_checkout_converted(
  p_token text,
  p_order_id uuid
)
returns table(converted boolean)
language plpgsql security definer
set search_path = public, auth
as $$
declare v_session public.whatsapp_checkout_sessions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if p_token !~ '^[a-f0-9]{64}$' or p_order_id is null then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_checkout_conversion';
  end if;
  select * into v_session
  from public.whatsapp_checkout_sessions
  where opaque_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and expires_at > now() and converted_at is null
  for update;
  if not found then
    return query select false;
    return;
  end if;
  update public.whatsapp_checkout_sessions set converted_at = now(), order_id = p_order_id
  where id = v_session.id;
  update public.orders
  set channel = 'whatsapp',
      attribution = coalesce(attribution, '{}'::jsonb)
        || coalesce(v_session.attribution, '{}'::jsonb)
        || jsonb_build_object('source', 'whatsapp', 'conversationId', v_session.conversation_id)
  where id = p_order_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'whatsapp_conversion_order_not_found';
  end if;
  update public.whatsapp_contacts wc set customer_id = o.customer_id
  from public.orders o where wc.id = v_session.contact_id and o.id = p_order_id;
  insert into public.activities(customer_id, order_id, kind, subject, metadata)
  select o.customer_id, o.id, 'order.channel_attributed', 'Pedido atribuido a WhatsApp',
    jsonb_build_object('channel', 'whatsapp', 'conversationId', v_session.conversation_id)
  from public.orders o where o.id = p_order_id;
  return query select true;
end;
$$;
