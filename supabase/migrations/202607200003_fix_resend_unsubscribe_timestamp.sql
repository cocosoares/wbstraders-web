-- now() is fixed at transaction start. Use clock_timestamp() so a withdrawal
-- always sorts after an earlier consent even in a transactional integration test.

begin;

create or replace function public.record_resend_contact_event(
  p_provider_event_id text,
  p_event_type text,
  p_contact_id text,
  p_recipient_email text,
  p_unsubscribed boolean
)
returns table(duplicate boolean)
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_event_id uuid;
  v_email text := nullif(lower(trim(p_recipient_email)), '');
  v_customer record;
  v_latest_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  insert into public.email_events(
    provider_event_id, event_type, provider_email_id, recipient_email, metadata
  ) values (
    p_provider_event_id,
    p_event_type,
    nullif(trim(p_contact_id), ''),
    v_email,
    jsonb_build_object('unsubscribed', p_unsubscribed)
  )
  on conflict (provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return query select true;
    return;
  end if;

  if p_event_type in ('contact.updated', 'contact.deleted')
    and p_unsubscribed
    and v_email is not null
  then
    for v_customer in
      select c.id from public.customers c where lower(c.email) = v_email
    loop
      select co.status into v_latest_status
      from public.consents co
      where co.customer_id = v_customer.id and co.purpose = 'marketing'
      order by co.recorded_at desc, co.id desc
      limit 1;

      if v_latest_status is distinct from 'withdrawn' then
        insert into public.consents(
          customer_id, purpose, status, source, evidence, recorded_at
        ) values (
          v_customer.id,
          'marketing',
          'withdrawn',
          'resend_unsubscribe',
          jsonb_build_object('providerEventId', p_provider_event_id),
          clock_timestamp()
        );
      end if;
    end loop;
  end if;

  return query select false;
end;
$$;

commit;
