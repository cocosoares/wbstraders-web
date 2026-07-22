-- Qualify CRM signal columns that share names with RETURNS TABLE output variables.
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
    select 1
    from public.whatsapp_conversations wc
    where wc.id = p_conversation_id
      and wc.contact_id = p_contact_id
  ) then
    raise exception using errcode = '22023', message = 'crm_conversation_contact_mismatch';
  end if;

  v_points := case p_event_type
    when 'qualification' then 20
    when 'purchase_intent' then 30
    when 'human_handoff' then 30
    when 'checkout_started' then 40
    when 'purchase_confirmed' then 100
  end;

  v_customer_id := public.ensure_crm_customer_for_contact(p_contact_id, null, null);

  update public.activities a
  set customer_id = v_customer_id
  where a.conversation_id = p_conversation_id
    and a.customer_id is null;

  insert into public.crm_score_events(
    customer_id, conversation_id, event_key, event_type, points, metadata
  ) values (
    v_customer_id,
    p_conversation_id,
    left(p_event_key, 240),
    p_event_type,
    v_points,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (event_key) do nothing;

  select coalesce(sum(cse.points), 0)
  into v_score
  from public.crm_score_events cse
  where cse.customer_id = v_customer_id;

  if p_event_type in ('purchase_intent', 'human_handoff', 'checkout_started', 'purchase_confirmed') then
    perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text, 17));

    select o.id, o.stage
    into v_opportunity_id, v_current_stage
    from public.opportunities o
    where o.segment = 'd2c'
      and o.source_conversation_id = p_conversation_id
      and o.stage not in ('won', 'lost')
    order by o.created_at desc
    limit 1
    for update;

    v_target_stage := case p_event_type
      when 'human_handoff' then 'lead'
      when 'purchase_intent' then 'recommendation'
      when 'checkout_started' then 'checkout'
      when 'purchase_confirmed' then 'won'
    end;

    if v_opportunity_id is null then
      select c.name
      into v_name
      from public.customers c
      where c.id = v_customer_id;

      insert into public.opportunities(
        customer_id,
        segment,
        stage,
        title,
        source_channel,
        source_conversation_id,
        score,
        next_action,
        next_action_at,
        metadata
      ) values (
        v_customer_id,
        'd2c',
        v_target_stage,
        'Venta WhatsApp · ' || coalesce(v_name, 'Contacto'),
        'whatsapp',
        p_conversation_id,
        v_score,
        'Revisar conversación y acompañar la compra',
        now(),
        jsonb_build_object('createdBySignal', p_event_type)
      )
      returning id into v_opportunity_id;
    else
      update public.opportunities o
      set
        stage = case
          when public.crm_stage_rank(v_target_stage) > public.crm_stage_rank(o.stage) then v_target_stage
          else o.stage
        end,
        score = v_score,
        next_action = case when v_target_stage = 'won' then null else o.next_action end,
        next_action_at = case when v_target_stage = 'won' then null else o.next_action_at end
      where o.id = v_opportunity_id;
    end if;

    update public.crm_score_events cse
    set opportunity_id = v_opportunity_id
    where cse.event_key = p_event_key
      and cse.opportunity_id is null;
  end if;

  update public.customers c
  set
    lifecycle_stage = case
      when p_event_type = 'purchase_confirmed' then 'customer'
      when c.lifecycle_stage = 'prospect' then 'engaged'
      else c.lifecycle_stage
    end,
    last_activity_at = now(),
    last_purchase_at = case
      when p_event_type = 'purchase_confirmed' then now()
      else c.last_purchase_at
    end
  where c.id = v_customer_id;

  return query
  select v_customer_id, v_opportunity_id, v_score;
end;
$$;

