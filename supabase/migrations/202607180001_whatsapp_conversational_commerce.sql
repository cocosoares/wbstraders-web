-- WhatsApp conversational commerce for WBStraders.
-- This domain is deliberately separate from notification_outbox: payment
-- confirmations remain transactional, while chat messages need their own
-- consent, handoff, delivery and retry lifecycle.

create extension if not exists pgcrypto with schema extensions;

create type public.whatsapp_conversation_state as enum ('bot', 'human', 'closed');
create type public.whatsapp_message_direction as enum ('inbound', 'outbound');
create type public.whatsapp_message_kind as enum ('text', 'interactive', 'template', 'media', 'status', 'system');
create type public.whatsapp_outbox_state as enum ('pending', 'processing', 'sent', 'failed', 'cancelled');
create type public.whatsapp_handoff_status as enum ('open', 'assigned', 'resolved', 'cancelled');

create table public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  whatsapp_user_id text,
  phone_normalized text not null unique check (phone_normalized ~ '^[1-9][0-9]{7,14}$'),
  display_name text check (display_name is null or char_length(display_name) between 1 and 160),
  age_verified_at timestamptz,
  marketing_consent_status text not null default 'unknown'
    check (marketing_consent_status in ('unknown', 'granted', 'denied', 'withdrawn')),
  marketing_consent_updated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index whatsapp_contacts_customer_idx on public.whatsapp_contacts(customer_id);

create table public.whatsapp_consents (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  consent_id uuid references public.consents(id) on delete set null,
  purpose text not null check (purpose in ('marketing', 'age_verification')),
  status text not null check (status in ('granted', 'denied', 'withdrawn')),
  policy_version text,
  source text not null default 'whatsapp',
  evidence jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);
create index whatsapp_consents_contact_purpose_idx
  on public.whatsapp_consents(contact_id, purpose, recorded_at desc);

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  state public.whatsapp_conversation_state not null default 'bot',
  assigned_to uuid,
  current_intent text,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  last_message_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index whatsapp_one_open_conversation_per_contact
  on public.whatsapp_conversations(contact_id)
  where state <> 'closed';
create index whatsapp_conversations_inbox_idx
  on public.whatsapp_conversations(state, last_message_at desc);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  provider_message_id text unique,
  direction public.whatsapp_message_direction not null,
  kind public.whatsapp_message_kind not null default 'text',
  body text check (body is null or char_length(body) <= 4000),
  delivery_status text not null default 'received'
    check (delivery_status in ('queued', 'received', 'sent', 'delivered', 'read', 'failed')),
  reply_to_provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index whatsapp_messages_conversation_idx
  on public.whatsapp_messages(conversation_id, occurred_at asc);
create index whatsapp_messages_provider_status_idx
  on public.whatsapp_messages(provider_message_id, delivery_status)
  where provider_message_id is not null;

create table public.whatsapp_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('ycloud')),
  provider_event_id text not null,
  contact_id uuid references public.whatsapp_contacts(id) on delete set null,
  conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  message_id uuid references public.whatsapp_messages(id) on delete set null,
  event_type text not null,
  status text not null default 'processed' check (status in ('processed', 'ignored', 'failed')),
  -- Store only normalized metadata, never an unbounded raw provider payload.
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  received_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);
create index whatsapp_events_conversation_idx on public.whatsapp_events(conversation_id, received_at desc);

create table public.whatsapp_handoffs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  status public.whatsapp_handoff_status not null default 'open',
  reason text not null check (char_length(reason) between 2 and 160),
  requested_by text not null check (requested_by in ('customer', 'bot', 'system', 'admin')),
  assigned_to uuid,
  summary text check (summary is null or char_length(summary) <= 2000),
  requested_at timestamptz not null default now(),
  assigned_at timestamptz,
  resolved_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index whatsapp_one_active_handoff_per_conversation
  on public.whatsapp_handoffs(conversation_id)
  where status in ('open', 'assigned');
create index whatsapp_handoffs_inbox_idx on public.whatsapp_handoffs(status, requested_at asc);

create table public.whatsapp_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  opaque_token_hash text not null unique check (opaque_token_hash ~ '^[a-f0-9]{64}$'),
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  cart_snapshot jsonb not null,
  attribution jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  visited_at timestamptz,
  converted_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index whatsapp_checkout_sessions_active_idx
  on public.whatsapp_checkout_sessions(expires_at)
  where visited_at is null and converted_at is null;

create table public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.whatsapp_messages(id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  state public.whatsapp_outbox_state not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  worker_id uuid,
  lease_expires_at timestamptz,
  provider_reference text,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'processing') = (worker_id is not null and lease_expires_at is not null))
);
create index whatsapp_outbox_claim_idx
  on public.whatsapp_outbox(next_attempt_at, created_at)
  where state in ('pending', 'failed', 'processing');

create trigger whatsapp_contacts_set_updated_at before update on public.whatsapp_contacts
for each row execute function public.set_updated_at();
create trigger whatsapp_conversations_set_updated_at before update on public.whatsapp_conversations
for each row execute function public.set_updated_at();
create trigger whatsapp_handoffs_set_updated_at before update on public.whatsapp_handoffs
for each row execute function public.set_updated_at();
create trigger whatsapp_outbox_set_updated_at before update on public.whatsapp_outbox
for each row execute function public.set_updated_at();

-- Records an inbound message exactly once and finds/creates the active thread.
-- It intentionally does not manufacture a public customer name from a WhatsApp
-- profile; contacts can later be linked to a checkout customer safely.
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

create or replace function public.record_whatsapp_consent(
  p_contact_id uuid,
  p_purpose text,
  p_status text,
  p_policy_version text default null,
  p_source text default 'whatsapp',
  p_evidence jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare v_customer_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_or_service_role_required';
  end if;
  if p_purpose not in ('marketing', 'age_verification')
    or p_status not in ('granted', 'denied', 'withdrawn') then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_consent';
  end if;
  select customer_id into v_customer_id from public.whatsapp_contacts where id = p_contact_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'whatsapp_contact_not_found'; end if;

  insert into public.whatsapp_consents(contact_id, customer_id, purpose, status, policy_version, source, evidence)
  values (p_contact_id, v_customer_id, p_purpose, p_status, nullif(left(p_policy_version, 100), ''),
    coalesce(nullif(left(p_source, 80), ''), 'whatsapp'), coalesce(p_evidence, '{}'::jsonb));

  if p_purpose = 'marketing' then
    update public.whatsapp_contacts set marketing_consent_status = p_status,
      marketing_consent_updated_at = now() where id = p_contact_id;
  elsif p_purpose = 'age_verification' and p_status = 'granted' then
    update public.whatsapp_contacts set age_verified_at = coalesce(age_verified_at, now())
      where id = p_contact_id;
  end if;
end;
$$;

create or replace function public.enqueue_whatsapp_outbound(
  p_conversation_id uuid,
  p_contact_id uuid,
  p_body text,
  p_message_kind public.whatsapp_message_kind default 'text',
  p_metadata jsonb default '{}'::jsonb
)
returns table(outbox_id uuid, message_id uuid)
language plpgsql security definer
set search_path = public, auth
as $$
declare v_message_id uuid; v_outbox_id uuid; v_last_inbound_at timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_or_service_role_required';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_outbound_body';
  end if;
  if not exists (select 1 from public.whatsapp_conversations where id = p_conversation_id and contact_id = p_contact_id) then
    raise exception using errcode = '22023', message = 'whatsapp_conversation_contact_mismatch';
  end if;
  select last_inbound_at into v_last_inbound_at
  from public.whatsapp_conversations where id = p_conversation_id;
  if v_last_inbound_at is null or v_last_inbound_at <= now() - interval '23 hours 45 minutes' then
    raise exception using errcode = '22023', message = 'whatsapp_service_window_expired';
  end if;
  insert into public.whatsapp_messages(conversation_id, direction, kind, body, delivery_status, metadata)
  values (p_conversation_id, 'outbound', p_message_kind, trim(p_body), 'queued', coalesce(p_metadata, '{}'::jsonb))
  returning id into v_message_id;
  insert into public.whatsapp_outbox(message_id, contact_id) values (v_message_id, p_contact_id)
  returning id into v_outbox_id;
  update public.whatsapp_conversations set
    current_intent = coalesce(nullif(left(p_metadata->>'intent', 100), ''), current_intent)
  where id = p_conversation_id;
  return query select v_outbox_id, v_message_id;
end;
$$;

create or replace function public.claim_whatsapp_outbox(
  p_worker_id uuid,
  p_limit integer default 10,
  p_lease_seconds integer default 120
)
returns table(outbox_id uuid, message_id uuid, phone_normalized text, body text, message_kind public.whatsapp_message_kind, attempt integer)
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if p_worker_id is null or p_limit not between 1 and 50 or p_lease_seconds not between 30 and 600 then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_outbox_claim';
  end if;
  return query
  with expired_service_window as (
    update public.whatsapp_outbox wo set state = 'cancelled', worker_id = null,
      lease_expires_at = null, last_error_code = 'service_window_expired'
    from public.whatsapp_messages wm
    join public.whatsapp_conversations wc on wc.id = wm.conversation_id
    where wo.message_id = wm.id and wo.state in ('pending', 'failed', 'processing')
      and (wc.last_inbound_at is null or wc.last_inbound_at <= now() - interval '23 hours 45 minutes')
    returning wo.id
  ), candidates as (
    select wo.id from public.whatsapp_outbox wo
    join public.whatsapp_messages wm on wm.id = wo.message_id
    join public.whatsapp_conversations wc on wc.id = wm.conversation_id
    where wc.last_inbound_at > now() - interval '23 hours 45 minutes'
      and wo.attempts < wo.max_attempts and (
      (wo.state in ('pending', 'failed') and wo.next_attempt_at <= now()) or
      (wo.state = 'processing' and wo.lease_expires_at <= now())
    ) order by wo.next_attempt_at, wo.created_at for update skip locked limit p_limit
  ), claimed as (
    update public.whatsapp_outbox wo set state = 'processing', worker_id = p_worker_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds), attempts = wo.attempts + 1
    from candidates c where wo.id = c.id
    returning wo.id, wo.message_id, wo.contact_id, wo.attempts
  )
  select c.id, c.message_id, wc.phone_normalized, wm.body, wm.kind, c.attempts
  from claimed c join public.whatsapp_contacts wc on wc.id = c.contact_id
  join public.whatsapp_messages wm on wm.id = c.message_id
  order by c.id;
end;
$$;

create or replace function public.complete_whatsapp_outbox(
  p_outbox_id uuid,
  p_worker_id uuid,
  p_sent boolean,
  p_provider_reference text default null,
  p_error_code text default null
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare v_outbox public.whatsapp_outbox%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  select * into v_outbox from public.whatsapp_outbox where id = p_outbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'whatsapp_outbox_not_found'; end if;
  if v_outbox.state <> 'processing' or v_outbox.worker_id <> p_worker_id then
    raise exception using errcode = 'P0001', message = 'whatsapp_outbox_not_leased';
  end if;
  if p_sent then
    update public.whatsapp_outbox set state = 'sent', provider_reference = nullif(left(p_provider_reference, 200), ''),
      sent_at = now(), worker_id = null, lease_expires_at = null, last_error_code = null where id = p_outbox_id;
    update public.whatsapp_messages set delivery_status = 'sent', provider_message_id = coalesce(provider_message_id, nullif(left(p_provider_reference, 200), ''))
      where id = v_outbox.message_id;
    update public.whatsapp_conversations set last_outbound_at = now(), last_message_at = now()
      where id = (select conversation_id from public.whatsapp_messages where id = v_outbox.message_id);
  else
    update public.whatsapp_outbox set state = case when attempts >= max_attempts then 'cancelled'::public.whatsapp_outbox_state else 'failed'::public.whatsapp_outbox_state end,
      worker_id = null, lease_expires_at = null, last_error_code = coalesce(nullif(left(p_error_code, 100), ''), 'provider_error'),
      next_attempt_at = now() + make_interval(mins => least(60, power(2, greatest(attempts - 1, 0))::integer))
      where id = p_outbox_id;
    if v_outbox.attempts >= v_outbox.max_attempts then
      update public.whatsapp_messages set delivery_status = 'failed' where id = v_outbox.message_id;
    end if;
  end if;
end;
$$;

create or replace function public.request_whatsapp_handoff(
  p_conversation_id uuid,
  p_reason text,
  p_requested_by text,
  p_summary text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare v_handoff_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_or_service_role_required';
  end if;
  if p_requested_by not in ('customer', 'bot', 'system', 'admin') then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_handoff_requester';
  end if;
  update public.whatsapp_conversations set state = 'human' where id = p_conversation_id;
  if not found then raise exception using errcode = 'P0002', message = 'whatsapp_conversation_not_found'; end if;
  insert into public.whatsapp_handoffs(conversation_id, reason, requested_by, summary, metadata)
  values (p_conversation_id, left(trim(p_reason), 160), p_requested_by, nullif(left(p_summary, 2000), ''), coalesce(p_metadata, '{}'::jsonb))
  on conflict (conversation_id) where (status in ('open', 'assigned')) do update set
    summary = coalesce(excluded.summary, public.whatsapp_handoffs.summary),
    metadata = public.whatsapp_handoffs.metadata || excluded.metadata
  returning id into v_handoff_id;
  return v_handoff_id;
end;
$$;

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

-- Converts a valid opaque checkout token into server-side order attribution.
-- It is intentionally a separate, service-only operation because checkout is
-- performed in a browser and query-string attribution is forgeable.
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

  update public.whatsapp_checkout_sessions
  set converted_at = now(), order_id = p_order_id
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

  update public.whatsapp_contacts wc
  set customer_id = o.customer_id
  from public.orders o
  where wc.id = v_session.contact_id and o.id = p_order_id;

  insert into public.activities(customer_id, order_id, kind, subject, metadata)
  select o.customer_id, o.id, 'order.channel_attributed', 'Pedido atribuido a WhatsApp',
    jsonb_build_object('channel', 'whatsapp', 'conversationId', v_session.conversation_id)
  from public.orders o where o.id = p_order_id;

  return query select true;
end;
$$;

-- Lets an authenticated administrator explicitly take ownership or resolve a
-- chat. This is separate from the bot handoff RPC so operators cannot silently
-- overwrite each other's work and every transition is auditable.
create or replace function public.admin_manage_whatsapp_conversation(
  p_conversation_id uuid,
  p_action text,
  p_resolution_note text default null,
  p_actor_id uuid default null
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_conversation public.whatsapp_conversations%rowtype;
  v_handoff public.whatsapp_handoffs%rowtype;
  v_actor_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if p_action not in ('take', 'resolve') then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_conversation_action';
  end if;
  v_actor_id := case when coalesce(auth.role(), '') = 'service_role'
    then coalesce(p_actor_id, auth.uid()) else auth.uid() end;
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'admin_actor_required';
  end if;

  select * into v_conversation from public.whatsapp_conversations
  where id = p_conversation_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'whatsapp_conversation_not_found'; end if;

  select * into v_handoff from public.whatsapp_handoffs
  where conversation_id = p_conversation_id and status in ('open', 'assigned')
  order by requested_at desc limit 1 for update;

  if p_action = 'take' then
    if found then
      update public.whatsapp_handoffs set status = 'assigned', assigned_to = v_actor_id,
        assigned_at = coalesce(assigned_at, now()) where id = v_handoff.id;
    else
      insert into public.whatsapp_handoffs(
        conversation_id, status, reason, requested_by, assigned_to, assigned_at, summary
      ) values (
        p_conversation_id, 'assigned', 'manual_takeover', 'admin', v_actor_id, now(),
        'Conversación tomada manualmente por el equipo.'
      );
    end if;
    update public.whatsapp_conversations set state = 'human', assigned_to = v_actor_id,
      resolved_at = null where id = p_conversation_id;
  else
    if found then
      update public.whatsapp_handoffs set status = 'resolved', resolved_at = now(),
        resolution_note = nullif(left(trim(p_resolution_note), 2000), '')
      where id = v_handoff.id;
    end if;
    update public.whatsapp_conversations set state = 'closed', resolved_at = now()
      where id = p_conversation_id;
  end if;

  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, before_data, after_data)
  values (
    v_actor_id, 'admin', 'whatsapp.conversation_' || p_action,
    'whatsapp_conversation', p_conversation_id::text,
    jsonb_build_object('state', v_conversation.state, 'assignedTo', v_conversation.assigned_to),
    jsonb_build_object('state', case when p_action = 'take' then 'human' else 'closed' end,
      'resolutionNote', nullif(left(trim(p_resolution_note), 2000), ''))
  );
end;
$$;

alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_consents enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_events enable row level security;
alter table public.whatsapp_handoffs enable row level security;
alter table public.whatsapp_checkout_sessions enable row level security;
alter table public.whatsapp_outbox enable row level security;

create policy whatsapp_contacts_admin_read on public.whatsapp_contacts for select to authenticated using (public.is_admin());
create policy whatsapp_consents_admin_read on public.whatsapp_consents for select to authenticated using (public.is_admin());
create policy whatsapp_conversations_admin_read on public.whatsapp_conversations for select to authenticated using (public.is_admin());
create policy whatsapp_messages_admin_read on public.whatsapp_messages for select to authenticated using (public.is_admin());
create policy whatsapp_events_admin_read on public.whatsapp_events for select to authenticated using (public.is_admin());
create policy whatsapp_handoffs_admin_read on public.whatsapp_handoffs for select to authenticated using (public.is_admin());
create policy whatsapp_checkout_sessions_admin_read on public.whatsapp_checkout_sessions for select to authenticated using (public.is_admin());
create policy whatsapp_outbox_admin_read on public.whatsapp_outbox for select to authenticated using (public.is_admin());

revoke all on function public.record_whatsapp_inbound(text,text,public.whatsapp_message_kind,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.record_whatsapp_consent(uuid,text,text,text,text,jsonb) from public, anon;
revoke all on function public.enqueue_whatsapp_outbound(uuid,uuid,text,public.whatsapp_message_kind,jsonb) from public, anon;
revoke all on function public.claim_whatsapp_outbox(uuid,integer,integer) from public, anon, authenticated;
revoke all on function public.complete_whatsapp_outbox(uuid,uuid,boolean,text,text) from public, anon, authenticated;
revoke all on function public.request_whatsapp_handoff(uuid,text,text,text,jsonb) from public, anon;
revoke all on function public.create_whatsapp_checkout_session(uuid,uuid,jsonb,jsonb,integer) from public, anon, authenticated;
revoke all on function public.consume_whatsapp_checkout_session(text) from public, anon, authenticated;
revoke all on function public.mark_whatsapp_checkout_converted(text,uuid) from public, anon, authenticated;
revoke all on function public.admin_manage_whatsapp_conversation(uuid,text,text,uuid) from public, anon;

grant execute on function public.record_whatsapp_consent(uuid,text,text,text,text,jsonb) to authenticated, service_role;
grant execute on function public.enqueue_whatsapp_outbound(uuid,uuid,text,public.whatsapp_message_kind,jsonb) to authenticated, service_role;
grant execute on function public.request_whatsapp_handoff(uuid,text,text,text,jsonb) to authenticated, service_role;
grant execute on function public.record_whatsapp_inbound(text,text,public.whatsapp_message_kind,text,text,jsonb) to service_role;
grant execute on function public.claim_whatsapp_outbox(uuid,integer,integer) to service_role;
grant execute on function public.complete_whatsapp_outbox(uuid,uuid,boolean,text,text) to service_role;
grant execute on function public.create_whatsapp_checkout_session(uuid,uuid,jsonb,jsonb,integer) to service_role;
grant execute on function public.consume_whatsapp_checkout_session(text) to service_role;
grant execute on function public.mark_whatsapp_checkout_converted(text,uuid) to service_role;
grant execute on function public.admin_manage_whatsapp_conversation(uuid,text,text,uuid) to authenticated, service_role;
