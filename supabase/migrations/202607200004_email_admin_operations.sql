-- Administrative recovery for failed email jobs.
-- Only the server-side service role can retry a job, and every manual retry is audited.

begin;

create or replace function public.admin_retry_email_outbox(
  p_outbox_id uuid,
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_before public.email_outbox%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  select * into v_before
  from public.email_outbox eo
  where eo.id = p_outbox_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'email_outbox_not_found';
  end if;
  if v_before.state not in ('failed', 'dead') then
    raise exception using errcode = '22023', message = 'email_outbox_not_retryable';
  end if;

  update public.email_outbox
  set state = 'pending',
      attempts = 0,
      next_attempt_at = now(),
      locked_by = null,
      locked_at = null,
      provider_reference = null,
      delivery_status = null,
      last_error = null,
      last_event_at = null,
      sent_at = null,
      delivered_at = null
  where id = p_outbox_id;

  insert into public.audit_log(
    actor_id, actor_type, action, entity_type, entity_id, before_data, after_data
  ) values (
    coalesce(p_actor_id, auth.uid()),
    'admin',
    'email.retry_requested',
    'email_outbox',
    p_outbox_id::text,
    jsonb_build_object(
      'state', v_before.state,
      'attempts', v_before.attempts,
      'lastError', v_before.last_error
    ),
    jsonb_build_object('state', 'pending', 'attempts', 0)
  );
end;
$$;

revoke all on function public.admin_retry_email_outbox(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.admin_retry_email_outbox(uuid,uuid)
  to service_role;

commit;
