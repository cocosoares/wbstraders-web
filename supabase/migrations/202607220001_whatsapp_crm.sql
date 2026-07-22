-- WBStraders CRM for conversational commerce.
-- This migration is additive: it preserves all customers, conversations,
-- messages, orders and opportunities already present in the project.

begin;

alter table public.customers
  add column if not exists lifecycle_stage text not null default 'prospect',
  add column if not exists source_channel text not null default 'web',
  add column if not exists assigned_to uuid,
  add column if not exists last_activity_at timestamptz,
  add column if not exists last_purchase_at timestamptz;

alter table public.customers drop constraint if exists customers_lifecycle_stage_check;
alter table public.customers add constraint customers_lifecycle_stage_check
  check (lifecycle_stage in ('prospect', 'engaged', 'customer', 'repeat', 'vip', 'inactive', 'horeca'));
alter table public.customers drop constraint if exists customers_source_channel_check;
alter table public.customers add constraint customers_source_channel_check
  check (source_channel in ('web', 'whatsapp', 'email', 'admin', 'horeca'));
create index if not exists customers_crm_stage_activity_idx
  on public.customers(lifecycle_stage, last_activity_at desc nulls last);

alter table public.whatsapp_conversations
  add column if not exists priority smallint not null default 2,
  add column if not exists last_read_at timestamptz,
  add column if not exists sla_due_at timestamptz,
  add column if not exists first_human_response_at timestamptz;
alter table public.whatsapp_conversations drop constraint if exists whatsapp_conversations_priority_check;
alter table public.whatsapp_conversations add constraint whatsapp_conversations_priority_check
  check (priority between 1 and 4);
create index if not exists whatsapp_conversations_sla_idx
  on public.whatsapp_conversations(sla_due_at, priority, last_message_at desc)
  where state <> 'closed' and first_human_response_at is null;

alter table public.activities
  add column if not exists conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete cascade,
  add column if not exists assigned_to uuid,
  add column if not exists priority smallint not null default 2,
  add column if not exists dedupe_key text;
alter table public.activities drop constraint if exists activities_priority_check;
alter table public.activities add constraint activities_priority_check check (priority between 1 and 4);
create unique index if not exists activities_dedupe_key_uidx
  on public.activities(dedupe_key) where dedupe_key is not null;
create index if not exists activities_crm_queue_idx
  on public.activities(status, due_at, priority) where status = 'planned';
create index if not exists activities_conversation_idx
  on public.activities(conversation_id, created_at desc) where conversation_id is not null;

alter table public.opportunities
  add column if not exists source_channel text not null default 'admin',
  add column if not exists source_conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  add column if not exists won_order_id uuid references public.orders(id) on delete set null,
  add column if not exists score integer not null default 0;
alter table public.opportunities drop constraint if exists opportunities_stage_check;
alter table public.opportunities add constraint opportunities_stage_check check (stage in (
  'lead', 'qualified', 'recommendation', 'checkout',
  'tasting', 'proposal', 'negotiation', 'won', 'lost'
));
alter table public.opportunities drop constraint if exists opportunities_source_channel_check;
alter table public.opportunities add constraint opportunities_source_channel_check
  check (source_channel in ('web', 'whatsapp', 'email', 'admin', 'horeca'));
alter table public.opportunities drop constraint if exists opportunities_score_check;
alter table public.opportunities add constraint opportunities_score_check check (score between -1000 and 10000);
create unique index if not exists opportunities_one_open_d2c_conversation_uidx
  on public.opportunities(source_conversation_id)
  where segment = 'd2c' and source_conversation_id is not null and stage not in ('won', 'lost');
create index if not exists opportunities_crm_pipeline_idx
  on public.opportunities(segment, stage, updated_at desc);

create table if not exists public.crm_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 40),
  color text not null default 'olive' check (color in ('olive', 'wine', 'gold', 'blue', 'gray')),
  created_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.crm_customer_tags (
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id uuid not null references public.crm_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid,
  primary key(customer_id, tag_id)
);

create table if not exists public.crm_saved_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 80),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  category text not null default 'general' check (category in ('general', 'sales', 'delivery', 'support', 'horeca')),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create trigger crm_saved_replies_set_updated_at
before update on public.crm_saved_replies
for each row execute function public.set_updated_at();

insert into public.crm_saved_replies(title, body, category, position)
values
  ('Saludo humano', '¡Hola! Soy parte del equipo de WBStraders. Ya revisé tu consulta y con gusto te ayudo.', 'general', 10),
  ('Confirmar selección', 'Perfecto. Puedo dejarte la selección lista en la web para que revises cantidades, entrega y datos antes de confirmar.', 'sales', 20),
  ('Coordinar entrega', 'Gracias. Voy a revisar la disponibilidad y te confirmo enseguida la fecha y rango de entrega.', 'delivery', 30),
  ('Seguimiento asistido', '¡Hola! Quería saber si aún deseas ayuda con la selección que revisamos. Si me dices tu presupuesto, la ajusto contigo.', 'sales', 40)
on conflict do nothing;

create table if not exists public.crm_score_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  event_key text not null unique check (char_length(event_key) between 4 and 240),
  event_type text not null check (event_type in (
    'qualification', 'purchase_intent', 'human_handoff', 'checkout_started', 'purchase_confirmed'
  )),
  points integer not null check (points between -100 and 100),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists crm_score_events_customer_idx
  on public.crm_score_events(customer_id, occurred_at desc);

insert into public.crm_tags(name, color) values
  ('Regalo', 'gold'),
  ('Parrilla', 'wine'),
  ('Cliente VIP', 'gold'),
  ('HORECA', 'blue'),
  ('Reclamo', 'wine')
on conflict (name) do nothing;

-- Email jobs reuse the existing durable Resend outbox.
alter table public.email_outbox drop constraint if exists email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'order.received.customer', 'order.received.operations',
  'payment.confirmed.customer', 'payment.refunded.customer',
  'fulfillment.preparing.customer', 'fulfillment.shipped.customer',
  'fulfillment.delivered.customer', 'order.cancelled.customer',
  'fiscal.issued.customer', 'claim.received.customer',
  'claim.received.operations', 'marketing.contact_sync',
  'crm.handoff.operations', 'crm.sla_breached.operations'
));

-- Private storage for files sent by an operator from the CRM.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-media', 'whatsapp-media', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists whatsapp_media_admin_access on storage.objects;
create policy whatsapp_media_admin_access on storage.objects
for all to authenticated
using (bucket_id = 'whatsapp-media' and public.is_admin())
with check (bucket_id = 'whatsapp-media' and public.is_admin());

create or replace function public.crm_stage_rank(p_stage text)
returns integer language sql immutable parallel safe as $$
  select case p_stage
    when 'lead' then 10 when 'qualified' then 20 when 'recommendation' then 30
    when 'tasting' then 30 when 'checkout' then 40 when 'proposal' then 40
    when 'negotiation' then 50 when 'won' then 100 when 'lost' then 100 else 0 end
$$;

create or replace function public.ensure_crm_customer_for_contact(
  p_contact_id uuid,
  p_name text default null,
  p_actor_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_contact public.whatsapp_contacts%rowtype;
  v_customer_id uuid;
  v_name text;
  v_email text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  select * into v_contact from public.whatsapp_contacts where id = p_contact_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'whatsapp_contact_not_found'; end if;

  v_name := coalesce(nullif(trim(p_name), ''), nullif(trim(v_contact.display_name), ''), 'Contacto WhatsApp');
  v_email := case
    when coalesce(v_contact.metadata->>'email', '') ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      then lower(v_contact.metadata->>'email') else null end;

  if v_contact.customer_id is not null then
    update public.customers set
      name = case when nullif(trim(p_name), '') is not null then left(trim(p_name), 160) else name end,
      email = coalesce(email, v_email),
      source_channel = case when source_channel = 'web' then source_channel else 'whatsapp' end,
      lifecycle_stage = case when lifecycle_stage = 'prospect' then 'engaged' else lifecycle_stage end,
      last_activity_at = greatest(coalesce(last_activity_at, '-infinity'::timestamptz), now())
    where id = v_contact.customer_id
    returning id into v_customer_id;
    return v_customer_id;
  end if;

  insert into public.customers(
    name, email, phone, phone_normalized, lifecycle_stage, source_channel, last_activity_at, metadata
  ) values (
    left(v_name, 160), v_email, '+' || v_contact.phone_normalized, v_contact.phone_normalized,
    'engaged', 'whatsapp', now(), jsonb_build_object('createdFrom', 'whatsapp_crm')
  )
  on conflict (phone_normalized) do update set
    name = case
      when excluded.name <> 'Contacto WhatsApp' then excluded.name
      else public.customers.name end,
    email = coalesce(public.customers.email, excluded.email),
    lifecycle_stage = case when public.customers.lifecycle_stage = 'prospect' then 'engaged' else public.customers.lifecycle_stage end,
    last_activity_at = greatest(coalesce(public.customers.last_activity_at, '-infinity'::timestamptz), now())
  returning id into v_customer_id;

  update public.whatsapp_contacts set customer_id = v_customer_id where id = p_contact_id;
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, after_data)
  values (p_actor_id, case when p_actor_id is null then 'system' else 'admin' end,
    'crm.customer_linked', 'customer', v_customer_id::text,
    jsonb_build_object('contactId', p_contact_id, 'source', 'whatsapp'));
  return v_customer_id;
end;
$$;

create or replace function public.record_crm_signal(
  p_contact_id uuid,
  p_conversation_id uuid,
  p_event_key text,
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(customer_id uuid, opportunity_id uuid, score integer)
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_customer_id uuid;
  v_opportunity_id uuid;
  v_points integer;
  v_score integer;
  v_target_stage text;
  v_current_stage text;
  v_name text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if p_event_type not in ('qualification', 'purchase_intent', 'human_handoff', 'checkout_started', 'purchase_confirmed')
    or char_length(coalesce(p_event_key, '')) not between 4 and 240 then
    raise exception using errcode = '22023', message = 'invalid_crm_signal';
  end if;
  if not exists (
    select 1 from public.whatsapp_conversations
    where id = p_conversation_id and contact_id = p_contact_id
  ) then
    raise exception using errcode = '22023', message = 'crm_conversation_contact_mismatch';
  end if;

  v_points := case p_event_type
    when 'qualification' then 20 when 'purchase_intent' then 30
    when 'human_handoff' then 30 when 'checkout_started' then 40
    when 'purchase_confirmed' then 100 end;
  v_customer_id := public.ensure_crm_customer_for_contact(p_contact_id, null, null);
  update public.activities set customer_id = v_customer_id
  where conversation_id = p_conversation_id and customer_id is null;

  insert into public.crm_score_events(
    customer_id, conversation_id, event_key, event_type, points, metadata
  ) values (
    v_customer_id, p_conversation_id, left(p_event_key, 240), p_event_type, v_points,
    coalesce(p_metadata, '{}'::jsonb)
  ) on conflict (event_key) do nothing;

  select coalesce(sum(cse.points), 0) into v_score
  from public.crm_score_events cse where cse.customer_id = v_customer_id;

  if p_event_type in ('purchase_intent', 'human_handoff', 'checkout_started', 'purchase_confirmed') then
    perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text, 17));
    select o.id, o.stage into v_opportunity_id, v_current_stage
    from public.opportunities o
    where o.segment = 'd2c' and o.source_conversation_id = p_conversation_id
      and o.stage not in ('won', 'lost')
    order by o.created_at desc limit 1 for update;

    v_target_stage := case p_event_type
      when 'human_handoff' then 'lead'
      when 'purchase_intent' then 'recommendation'
      when 'checkout_started' then 'checkout'
      when 'purchase_confirmed' then 'won' end;

    if v_opportunity_id is null then
      select name into v_name from public.customers where id = v_customer_id;
      insert into public.opportunities(
        customer_id, segment, stage, title, source_channel, source_conversation_id,
        score, next_action, next_action_at, metadata
      ) values (
        v_customer_id, 'd2c', v_target_stage,
        'Venta WhatsApp · ' || coalesce(v_name, 'Contacto'), 'whatsapp', p_conversation_id,
        v_score, 'Revisar conversación y acompañar la compra', now(),
        jsonb_build_object('createdBySignal', p_event_type)
      ) returning id into v_opportunity_id;
    else
      update public.opportunities set
        stage = case
          when public.crm_stage_rank(v_target_stage) > public.crm_stage_rank(stage) then v_target_stage
          else stage end,
        score = v_score,
        next_action = case when v_target_stage = 'won' then null else next_action end,
        next_action_at = case when v_target_stage = 'won' then null else next_action_at end
      where id = v_opportunity_id;
    end if;

    update public.crm_score_events set opportunity_id = v_opportunity_id
    where event_key = p_event_key and opportunity_id is null;
  end if;

  update public.customers set
    lifecycle_stage = case
      when p_event_type = 'purchase_confirmed' then 'customer'
      when lifecycle_stage = 'prospect' then 'engaged'
      else lifecycle_stage end,
    last_activity_at = now(),
    last_purchase_at = case when p_event_type = 'purchase_confirmed' then now() else last_purchase_at end
  where id = v_customer_id;

  return query select v_customer_id, v_opportunity_id, v_score;
end;
$$;

create or replace function public.admin_mark_whatsapp_read(
  p_conversation_id uuid,
  p_actor_id uuid default null
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare v_actor_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  v_actor_id := case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end;
  update public.whatsapp_conversations set last_read_at = now() where id = p_conversation_id;
  if not found then raise exception using errcode = 'P0002', message = 'whatsapp_conversation_not_found'; end if;
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id)
  values (v_actor_id, 'admin', 'whatsapp.conversation_read', 'whatsapp_conversation', p_conversation_id::text);
end;
$$;

create or replace function public.admin_send_whatsapp_reply(
  p_conversation_id uuid,
  p_contact_id uuid,
  p_body text,
  p_message_kind public.whatsapp_message_kind default 'text',
  p_metadata jsonb default '{}'::jsonb,
  p_actor_id uuid default null
)
returns table(outbox_id uuid, message_id uuid)
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid;
  v_outbox_id uuid;
  v_message_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  v_actor_id := case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end;
  if v_actor_id is null then raise exception using errcode = '42501', message = 'admin_actor_required'; end if;

  if not exists (
    select 1 from public.whatsapp_conversations
    where id = p_conversation_id and contact_id = p_contact_id
  ) then raise exception using errcode = '22023', message = 'whatsapp_conversation_contact_mismatch'; end if;

  perform public.ensure_crm_customer_for_contact(p_contact_id, null, v_actor_id);

  update public.whatsapp_conversations set
    state = 'human', assigned_to = v_actor_id, resolved_at = null,
    last_read_at = now(), first_human_response_at = coalesce(first_human_response_at, now()),
    sla_due_at = null
  where id = p_conversation_id;

  insert into public.whatsapp_handoffs(
    conversation_id, status, reason, requested_by, assigned_to, assigned_at, summary
  ) values (
    p_conversation_id, 'assigned', 'admin_reply', 'admin', v_actor_id, now(),
    'Conversación atendida desde el CRM.'
  ) on conflict (conversation_id) where status in ('open', 'assigned') do update set
    status = 'assigned', assigned_to = v_actor_id, assigned_at = coalesce(public.whatsapp_handoffs.assigned_at, now());

  select e.outbox_id, e.message_id into v_outbox_id, v_message_id
  from public.enqueue_whatsapp_outbound(
    p_conversation_id, p_contact_id, p_body, p_message_kind,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('sentBy', 'admin', 'actorId', v_actor_id)
  ) e;

  update public.activities set status = 'completed', completed_at = now(), assigned_to = v_actor_id
  where conversation_id = p_conversation_id and status = 'planned' and kind = 'crm.whatsapp_handoff';
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, after_data)
  values (v_actor_id, 'admin', 'whatsapp.reply_queued', 'whatsapp_conversation', p_conversation_id::text,
    jsonb_build_object('messageId', v_message_id, 'kind', p_message_kind));
  return query select v_outbox_id, v_message_id;
end;
$$;

create or replace function public.admin_set_whatsapp_priority(
  p_conversation_id uuid,
  p_priority smallint,
  p_actor_id uuid default null
)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_actor_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if p_priority not between 1 and 4 then raise exception using errcode = '22023', message = 'invalid_priority'; end if;
  v_actor_id := case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end;
  update public.whatsapp_conversations set priority = p_priority where id = p_conversation_id;
  if not found then raise exception using errcode = 'P0002', message = 'whatsapp_conversation_not_found'; end if;
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, after_data)
  values (v_actor_id, 'admin', 'whatsapp.priority_changed', 'whatsapp_conversation', p_conversation_id::text,
    jsonb_build_object('priority', p_priority));
end;
$$;

create or replace function public.admin_manage_whatsapp_conversation(
  p_conversation_id uuid,
  p_action text,
  p_resolution_note text default null,
  p_actor_id uuid default null
)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_conversation public.whatsapp_conversations%rowtype;
  v_handoff public.whatsapp_handoffs%rowtype;
  v_actor_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if p_action not in ('take', 'resolve', 'reopen') then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_conversation_action';
  end if;
  v_actor_id := case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end;
  if v_actor_id is null then raise exception using errcode = '42501', message = 'admin_actor_required'; end if;
  select * into v_conversation from public.whatsapp_conversations where id = p_conversation_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'whatsapp_conversation_not_found'; end if;
  select * into v_handoff from public.whatsapp_handoffs
  where conversation_id = p_conversation_id and status in ('open', 'assigned')
  order by requested_at desc limit 1 for update;

  if p_action in ('take', 'reopen') then
    if found then
      update public.whatsapp_handoffs set status = 'assigned', assigned_to = v_actor_id,
        assigned_at = coalesce(assigned_at, now()), resolved_at = null where id = v_handoff.id;
    else
      insert into public.whatsapp_handoffs(
        conversation_id, status, reason, requested_by, assigned_to, assigned_at, summary
      ) values (
        p_conversation_id, 'assigned', case when p_action = 'reopen' then 'reopened' else 'manual_takeover' end,
        'admin', v_actor_id, now(), 'Conversación gestionada manualmente desde el CRM.'
      );
    end if;
    update public.whatsapp_conversations set state = 'human', assigned_to = v_actor_id,
      resolved_at = null, last_read_at = now() where id = p_conversation_id;
  else
    if found then
      update public.whatsapp_handoffs set status = 'resolved', resolved_at = now(),
        resolution_note = nullif(left(trim(p_resolution_note), 2000), '') where id = v_handoff.id;
    end if;
    update public.whatsapp_conversations set state = 'closed', resolved_at = now(),
      sla_due_at = null, last_read_at = now() where id = p_conversation_id;
  end if;
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, before_data, after_data)
  values (v_actor_id, 'admin', 'whatsapp.conversation_' || p_action,
    'whatsapp_conversation', p_conversation_id::text,
    jsonb_build_object('state', v_conversation.state, 'assignedTo', v_conversation.assigned_to),
    jsonb_build_object('state', case when p_action = 'resolve' then 'closed' else 'human' end,
      'resolutionNote', nullif(left(trim(p_resolution_note), 2000), '')));
end;
$$;

create or replace function public.admin_manage_crm_task(
  p_activity_id uuid,
  p_action text,
  p_subject text default null,
  p_body text default null,
  p_due_at timestamptz default null,
  p_customer_id uuid default null,
  p_conversation_id uuid default null,
  p_opportunity_id uuid default null,
  p_priority smallint default 2,
  p_actor_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid; v_actor_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  v_actor_id := case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end;
  if p_action = 'create' then
    if char_length(coalesce(trim(p_subject), '')) < 2 or p_priority not between 1 and 4 then
      raise exception using errcode = '22023', message = 'invalid_crm_task';
    end if;
    insert into public.activities(
      customer_id, conversation_id, opportunity_id, kind, subject, body, status,
      due_at, assigned_to, priority, created_by
    ) values (
      p_customer_id, p_conversation_id, p_opportunity_id, 'crm.task', left(trim(p_subject), 200),
      nullif(left(trim(p_body), 4000), ''), 'planned', p_due_at, v_actor_id, p_priority, v_actor_id
    ) returning id into v_id;
  elsif p_action in ('complete', 'cancel') and p_activity_id is not null then
    update public.activities set
      status = case when p_action = 'complete' then 'completed' else 'cancelled' end,
      completed_at = case when p_action = 'complete' then now() else completed_at end,
      assigned_to = coalesce(assigned_to, v_actor_id)
    where id = p_activity_id and status = 'planned' returning id into v_id;
    if v_id is null then raise exception using errcode = 'P0002', message = 'crm_task_not_found'; end if;
  else
    raise exception using errcode = '22023', message = 'invalid_crm_task_action';
  end if;
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id)
  values (v_actor_id, 'admin', 'crm.task_' || p_action, 'activity', v_id::text);
  return v_id;
end;
$$;

create or replace function public.admin_update_crm_customer(
  p_customer_id uuid,
  p_name text,
  p_email text,
  p_lifecycle_stage text,
  p_actor_id uuid default null
)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_actor_id uuid; v_before public.customers%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if char_length(coalesce(trim(p_name), '')) < 2 or p_lifecycle_stage not in
    ('prospect', 'engaged', 'customer', 'repeat', 'vip', 'inactive', 'horeca') then
    raise exception using errcode = '22023', message = 'invalid_crm_customer';
  end if;
  if nullif(trim(p_email), '') is not null and trim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'invalid_crm_email';
  end if;
  v_actor_id := case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end;
  select * into v_before from public.customers where id = p_customer_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'crm_customer_not_found'; end if;
  update public.customers set name = left(trim(p_name), 160),
    email = nullif(lower(trim(p_email)), ''), lifecycle_stage = p_lifecycle_stage
  where id = p_customer_id;
  update public.whatsapp_contacts set display_name = left(trim(p_name), 160)
  where customer_id = p_customer_id;
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, before_data, after_data)
  values (v_actor_id, 'admin', 'crm.customer_updated', 'customer', p_customer_id::text,
    to_jsonb(v_before), jsonb_build_object('name', trim(p_name), 'email', nullif(lower(trim(p_email)), ''), 'lifecycleStage', p_lifecycle_stage));
end;
$$;

create or replace function public.admin_set_crm_customer_tag(
  p_customer_id uuid,
  p_tag_id uuid,
  p_enabled boolean,
  p_actor_id uuid default null
)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_actor_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  v_actor_id := case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end;
  if p_enabled then
    insert into public.crm_customer_tags(customer_id, tag_id, created_by)
    values (p_customer_id, p_tag_id, v_actor_id) on conflict do nothing;
  else
    delete from public.crm_customer_tags where customer_id = p_customer_id and tag_id = p_tag_id;
  end if;
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, after_data)
  values (v_actor_id, 'admin', 'crm.customer_tag_changed', 'customer', p_customer_id::text,
    jsonb_build_object('tagId', p_tag_id, 'enabled', p_enabled));
end;
$$;

create or replace function public.admin_merge_crm_customers(
  p_source_customer_id uuid,
  p_target_customer_id uuid,
  p_actor_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid;
  v_source public.customers%rowtype;
  v_target public.customers%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if p_source_customer_id is null or p_target_customer_id is null
    or p_source_customer_id = p_target_customer_id then
    raise exception using errcode = '22023', message = 'invalid_customer_merge';
  end if;
  v_actor_id := case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end;

  select * into v_source from public.customers where id = p_source_customer_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'source_customer_not_found'; end if;
  select * into v_target from public.customers where id = p_target_customer_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'target_customer_not_found'; end if;

  insert into public.crm_customer_tags(customer_id, tag_id, created_at, created_by)
  select p_target_customer_id, tag_id, created_at, coalesce(created_by, v_actor_id)
  from public.crm_customer_tags where customer_id = p_source_customer_id
  on conflict (customer_id, tag_id) do nothing;
  delete from public.crm_customer_tags where customer_id = p_source_customer_id;

  update public.orders set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
  update public.activities set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
  update public.opportunities set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
  update public.consents set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
  update public.whatsapp_contacts set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
  update public.crm_score_events set customer_id = p_target_customer_id where customer_id = p_source_customer_id;

  update public.customers set
    name = case when name = 'Contacto WhatsApp' then v_source.name else name end,
    email = coalesce(email, v_source.email),
    lifecycle_stage = case
      when lifecycle_stage in ('vip', 'horeca') then lifecycle_stage
      when v_source.lifecycle_stage in ('vip', 'horeca') then v_source.lifecycle_stage
      when lifecycle_stage = 'repeat' or v_source.lifecycle_stage = 'repeat' then 'repeat'
      when lifecycle_stage = 'customer' or v_source.lifecycle_stage = 'customer' then 'customer'
      when lifecycle_stage = 'engaged' or v_source.lifecycle_stage = 'engaged' then 'engaged'
      else lifecycle_stage end,
    last_activity_at = greatest(last_activity_at, v_source.last_activity_at),
    last_purchase_at = greatest(last_purchase_at, v_source.last_purchase_at),
    metadata = coalesce(v_source.metadata, '{}'::jsonb) || coalesce(metadata, '{}'::jsonb)
  where id = p_target_customer_id;

  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, before_data, after_data)
  values (
    v_actor_id, 'admin', 'crm.customer_merged', 'customer', p_target_customer_id::text,
    jsonb_build_object('source', to_jsonb(v_source), 'target', to_jsonb(v_target)),
    jsonb_build_object('sourceCustomerId', p_source_customer_id, 'targetCustomerId', p_target_customer_id)
  );
  delete from public.customers where id = p_source_customer_id;
  return p_target_customer_id;
end;
$$;

create or replace function public.crm_handoff_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_contact_id uuid; v_customer_id uuid; v_phone text; v_name text;
begin
  if new.status <> 'open' then return new; end if;
  update public.whatsapp_conversations set
    priority = greatest(priority, 3),
    sla_due_at = coalesce(sla_due_at, new.requested_at + interval '10 minutes')
  where id = new.conversation_id
  returning contact_id into v_contact_id;
  select wc.customer_id, wc.phone_normalized, wc.display_name
  into v_customer_id, v_phone, v_name from public.whatsapp_contacts wc where wc.id = v_contact_id;
  insert into public.activities(
    customer_id, conversation_id, kind, subject, body, status, due_at, priority, dedupe_key, metadata
  ) values (
    v_customer_id, new.conversation_id, 'crm.whatsapp_handoff', 'Responder conversación de WhatsApp',
    coalesce(new.summary, new.reason), 'planned', new.requested_at + interval '10 minutes', 3,
    'crm:handoff:' || new.id::text || ':task', jsonb_build_object('handoffId', new.id, 'phone', v_phone)
  ) on conflict (dedupe_key) where dedupe_key is not null do nothing;
  perform public.enqueue_email_job(
    'crm.handoff.operations', 'crm:handoff:' || new.id::text || ':email', null,
    jsonb_build_object('conversationId', new.conversation_id, 'handoffId', new.id,
      'phone', v_phone, 'customerName', v_name, 'reason', new.reason, 'requestedAt', new.requested_at)
  );
  return new;
end;
$$;
drop trigger if exists crm_handoff_created_trigger on public.whatsapp_handoffs;
create trigger crm_handoff_created_trigger after insert on public.whatsapp_handoffs
for each row execute function public.crm_handoff_created();

create or replace function public.crm_checkout_visited()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if old.visited_at is null and new.visited_at is not null and new.conversation_id is not null then
    perform public.record_crm_signal(new.contact_id, new.conversation_id,
      'crm:checkout:' || new.id::text || ':started', 'checkout_started', jsonb_build_object('checkoutSessionId', new.id));
  end if;
  return new;
end;
$$;
drop trigger if exists crm_checkout_visited_trigger on public.whatsapp_checkout_sessions;
create trigger crm_checkout_visited_trigger after update of visited_at on public.whatsapp_checkout_sessions
for each row execute function public.crm_checkout_visited();

create or replace function public.crm_whatsapp_order_paid()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare v_session public.whatsapp_checkout_sessions%rowtype;
begin
  if old.payment_status is distinct from new.payment_status and new.payment_status = 'approved' and new.channel = 'whatsapp' then
    select * into v_session from public.whatsapp_checkout_sessions
    where order_id = new.id order by converted_at desc nulls last limit 1;
    if found and v_session.conversation_id is not null then
      perform public.record_crm_signal(v_session.contact_id, v_session.conversation_id,
        'crm:order:' || new.id::text || ':paid', 'purchase_confirmed', jsonb_build_object('orderId', new.id));
      update public.opportunities set won_order_id = new.id
      where source_conversation_id = v_session.conversation_id and segment = 'd2c' and stage = 'won';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists crm_whatsapp_order_paid_trigger on public.orders;
create trigger crm_whatsapp_order_paid_trigger after update of payment_status on public.orders
for each row execute function public.crm_whatsapp_order_paid();

create or replace function public.queue_crm_automations()
returns table(sla_alerts integer, abandoned_checkouts integer, repurchase_tasks integer, stale_tasks integer)
language plpgsql security definer set search_path = public, auth as $$
declare v_sla integer := 0; v_abandoned integer := 0; v_repurchase integer := 0; v_stale integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  with inserted as (
    insert into public.email_outbox(kind, dedupe_key, recipient_email, payload)
    select 'crm.sla_breached.operations', 'crm:conversation:' || wc.id::text || ':sla-breached', null,
      jsonb_build_object('conversationId', wc.id, 'phone', wct.phone_normalized,
        'customerName', wct.display_name, 'slaDueAt', wc.sla_due_at)
    from public.whatsapp_conversations wc
    join public.whatsapp_contacts wct on wct.id = wc.contact_id
    where wc.state <> 'closed' and wc.first_human_response_at is null
      and wc.sla_due_at is not null and wc.sla_due_at <= now()
    on conflict (dedupe_key) do nothing returning 1
  ) select count(*) into v_sla from inserted;

  with inserted as (
    insert into public.activities(customer_id, conversation_id, kind, subject, body, status, due_at, priority, dedupe_key, metadata)
    select wct.customer_id, wcs.conversation_id, 'crm.checkout_abandoned', 'Retomar checkout abandonado',
      'Revisar la selección y preparar un seguimiento asistido; no enviar sin aprobación.',
      'planned', now(), 2, 'crm:checkout:' || wcs.id::text || ':abandoned',
      jsonb_build_object('checkoutSessionId', wcs.id)
    from public.whatsapp_checkout_sessions wcs
    join public.whatsapp_contacts wct on wct.id = wcs.contact_id
    where wcs.visited_at is not null and wcs.converted_at is null and wcs.expires_at <= now()
    on conflict (dedupe_key) where dedupe_key is not null do nothing returning 1
  ) select count(*) into v_abandoned from inserted;

  with candidates as (
    select o.id order_id, o.customer_id, o.updated_at, days.n
    from public.orders o cross join (values (30), (60), (90)) as days(n)
    where o.fulfillment_status = 'delivered'
      and o.updated_at + make_interval(days => days.n) <= now()
      and exists (
        select 1 from public.consents c where c.customer_id = o.customer_id and c.purpose = 'marketing'
          and c.status = 'granted' and not exists (
            select 1 from public.consents newer where newer.customer_id = c.customer_id
              and newer.purpose = 'marketing' and newer.recorded_at > c.recorded_at
          )
      )
  ), inserted as (
    insert into public.activities(customer_id, order_id, kind, subject, body, status, due_at, priority, dedupe_key, metadata)
    select customer_id, order_id, 'crm.repurchase', 'Revisar oportunidad de recompra',
      'Seguimiento asistido de recompra a ' || n || ' días. Confirmar preferencia y consentimiento antes de enviar.',
      'planned', now(), 3, 'crm:order:' || order_id::text || ':repurchase:' || n,
      jsonb_build_object('days', n)
    from candidates
    on conflict (dedupe_key) where dedupe_key is not null do nothing returning 1
  ) select count(*) into v_repurchase from inserted;

  with inserted as (
    insert into public.activities(customer_id, opportunity_id, kind, subject, body, status, due_at, priority, dedupe_key, metadata)
    select o.customer_id, o.id, 'crm.opportunity_stale', 'Actualizar oportunidad estancada',
      coalesce(o.next_action, 'Definir la siguiente acción comercial.'), 'planned', now(), 2,
      'crm:opportunity:' || o.id::text || ':stale:' || to_char(current_date, 'IYYY-IW'),
      jsonb_build_object('stage', o.stage)
    from public.opportunities o
    where o.stage not in ('won', 'lost')
      and coalesce(o.next_action_at, o.updated_at + interval '7 days') <= now()
    on conflict (dedupe_key) where dedupe_key is not null do nothing returning 1
  ) select count(*) into v_stale from inserted;

  return query select v_sla, v_abandoned, v_repurchase, v_stale;
end;
$$;

create or replace view public.crm_customer_summary
with (security_invoker = true)
as
select
  c.id customer_id,
  c.lifecycle_stage,
  c.source_channel,
  c.last_activity_at,
  c.last_purchase_at,
  count(distinct o.id) total_orders,
  count(distinct o.id) filter (where o.payment_status = 'approved') paid_orders,
  coalesce(sum(o.total_cents) filter (where o.payment_status = 'approved'), 0)::bigint total_spent_cents,
  coalesce(avg(o.total_cents) filter (where o.payment_status = 'approved'), 0)::numeric avg_order_cents,
  max(o.created_at) last_order_at,
  coalesce((select sum(se.points) from public.crm_score_events se where se.customer_id = c.id), 0)
    + case when c.last_activity_at is not null and c.last_activity_at <= now() - interval '7 days' then -20 else 0 end as score
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

-- Backfill the relations that are already unambiguous by normalized phone.
update public.whatsapp_contacts wc set customer_id = c.id
from public.customers c
where wc.customer_id is null and wc.phone_normalized = c.phone_normalized;
update public.customers c set
  last_purchase_at = stats.last_paid_at,
  last_activity_at = greatest(coalesce(c.last_activity_at, '-infinity'::timestamptz), stats.last_order_at),
  lifecycle_stage = case
    when stats.paid_count >= 3 then 'repeat'
    when stats.paid_count >= 1 then 'customer'
    else c.lifecycle_stage end
from (
  select customer_id, max(created_at) last_order_at,
    max(created_at) filter (where payment_status = 'approved') last_paid_at,
    count(*) filter (where payment_status = 'approved') paid_count
  from public.orders group by customer_id
) stats where stats.customer_id = c.id;

alter table public.crm_tags enable row level security;
alter table public.crm_customer_tags enable row level security;
alter table public.crm_saved_replies enable row level security;
alter table public.crm_score_events enable row level security;
drop policy if exists crm_tags_admin_all on public.crm_tags;
drop policy if exists crm_customer_tags_admin_all on public.crm_customer_tags;
drop policy if exists crm_saved_replies_admin_all on public.crm_saved_replies;
drop policy if exists crm_score_events_admin_read on public.crm_score_events;
create policy crm_tags_admin_all on public.crm_tags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy crm_customer_tags_admin_all on public.crm_customer_tags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy crm_saved_replies_admin_all on public.crm_saved_replies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy crm_score_events_admin_read on public.crm_score_events for select to authenticated
  using (public.is_admin());

revoke all on function public.ensure_crm_customer_for_contact(uuid,text,uuid) from public, anon;
revoke all on function public.record_crm_signal(uuid,uuid,text,text,jsonb) from public, anon;
revoke all on function public.admin_mark_whatsapp_read(uuid,uuid) from public, anon;
revoke all on function public.admin_send_whatsapp_reply(uuid,uuid,text,public.whatsapp_message_kind,jsonb,uuid) from public, anon;
revoke all on function public.admin_set_whatsapp_priority(uuid,smallint,uuid) from public, anon;
revoke all on function public.admin_manage_crm_task(uuid,text,text,text,timestamptz,uuid,uuid,uuid,smallint,uuid) from public, anon;
revoke all on function public.admin_update_crm_customer(uuid,text,text,text,uuid) from public, anon;
revoke all on function public.admin_set_crm_customer_tag(uuid,uuid,boolean,uuid) from public, anon;
revoke all on function public.admin_merge_crm_customers(uuid,uuid,uuid) from public, anon;
revoke all on function public.queue_crm_automations() from public, anon, authenticated;
grant execute on function public.ensure_crm_customer_for_contact(uuid,text,uuid) to authenticated, service_role;
grant execute on function public.record_crm_signal(uuid,uuid,text,text,jsonb) to authenticated, service_role;
grant execute on function public.admin_mark_whatsapp_read(uuid,uuid) to authenticated, service_role;
grant execute on function public.admin_send_whatsapp_reply(uuid,uuid,text,public.whatsapp_message_kind,jsonb,uuid) to authenticated, service_role;
grant execute on function public.admin_set_whatsapp_priority(uuid,smallint,uuid) to authenticated, service_role;
grant execute on function public.admin_manage_crm_task(uuid,text,text,text,timestamptz,uuid,uuid,uuid,smallint,uuid) to authenticated, service_role;
grant execute on function public.admin_update_crm_customer(uuid,text,text,text,uuid) to authenticated, service_role;
grant execute on function public.admin_set_crm_customer_tag(uuid,uuid,boolean,uuid) to authenticated, service_role;
grant execute on function public.admin_merge_crm_customers(uuid,uuid,uuid) to authenticated, service_role;
grant execute on function public.queue_crm_automations() to service_role;
grant select on public.crm_customer_summary to authenticated, service_role;

-- Realtime is best effort and idempotent across projects where some tables may
-- already have been added to the publication manually.
do $$
declare v_table text;
begin
  foreach v_table in array array['whatsapp_conversations','whatsapp_messages','whatsapp_handoffs','activities','opportunities']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

-- Keep the established administrative contract while supporting both CRM pipelines.
create or replace function public.admin_set_opportunity_stage(
  p_opportunity_id uuid,
  p_stage text,
  p_lost_reason text default null,
  p_actor_id uuid default null
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_before public.opportunities%rowtype;
  v_allowed text[];
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and not coalesce(public.is_admin(), false)
  then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;

  select * into v_before
  from public.opportunities
  where id = p_opportunity_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'opportunity_not_found';
  end if;

  v_allowed := case
    when v_before.segment = 'd2c'
      then array['lead','qualified','recommendation','checkout','won','lost']
    else array['lead','qualified','tasting','proposal','negotiation','won','lost']
  end;
  if not (p_stage = any(v_allowed)) then
    raise exception using errcode = '22023', message = 'invalid_opportunity_stage';
  end if;
  if p_stage = 'lost' and nullif(trim(p_lost_reason), '') is null then
    raise exception using errcode = '22023', message = 'lost_reason_required';
  end if;

  update public.opportunities
  set stage = p_stage,
      lost_reason = case when p_stage = 'lost' then trim(p_lost_reason) else null end
  where id = p_opportunity_id;

  insert into public.audit_log(
    actor_id, actor_type, action, entity_type, entity_id, before_data, after_data
  ) values (
    case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end,
    'admin', 'opportunity.stage_updated', 'opportunity', p_opportunity_id::text,
    jsonb_build_object('stage', v_before.stage, 'lostReason', v_before.lost_reason),
    jsonb_build_object('stage', p_stage, 'lostReason', p_lost_reason)
  );
end;
$$;

commit;
