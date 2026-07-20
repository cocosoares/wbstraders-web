begin;

select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  v_outbox_id uuid := gen_random_uuid();
  v_actor_id uuid := gen_random_uuid();
  v_state text;
  v_attempts integer;
  v_audit_count integer;
begin
  insert into public.email_outbox(
    id, kind, dedupe_key, recipient_email, state, attempts, max_attempts, last_error
  ) values (
    v_outbox_id,
    'order.received.customer',
    'sql-email-admin-retry-' || v_outbox_id::text,
    'retry@example.com',
    'dead',
    6,
    6,
    'provider_error'
  );

  perform public.admin_retry_email_outbox(v_outbox_id, v_actor_id);

  select state, attempts into v_state, v_attempts
  from public.email_outbox
  where id = v_outbox_id;

  if v_state <> 'pending' or v_attempts <> 0 then
    raise exception 'email retry did not reset the job: state %, attempts %', v_state, v_attempts;
  end if;

  select count(*) into v_audit_count
  from public.audit_log
  where entity_type = 'email_outbox'
    and entity_id = v_outbox_id::text
    and action = 'email.retry_requested'
    and actor_id = v_actor_id;

  if v_audit_count <> 1 then
    raise exception 'email retry audit missing';
  end if;

  begin
    perform public.admin_retry_email_outbox(v_outbox_id, v_actor_id);
    raise exception 'pending email unexpectedly allowed a second retry';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'email_outbox_not_retryable' then
        raise;
      end if;
  end;
end;
$$;

rollback;
