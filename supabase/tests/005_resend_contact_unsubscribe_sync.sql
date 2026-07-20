begin;

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  v_customer uuid := gen_random_uuid();
  v_duplicate boolean;
  v_status text;
begin
  insert into public.customers(id, name, email, phone, phone_normalized)
  values (
    v_customer,
    'Cliente Baja',
    'resend-unsubscribe@example.com',
    '999777666',
    '51999777666'
  );
  insert into public.consents(customer_id, purpose, status, source)
  values (v_customer, 'marketing', 'granted', 'checkout');

  select result.duplicate into v_duplicate
  from public.record_resend_contact_event(
    'resend-contact-event-test',
    'contact.updated',
    'contact-test',
    'resend-unsubscribe@example.com',
    true
  ) result;
  if v_duplicate then raise exception 'first contact event marked duplicate'; end if;

  select co.status into v_status
  from public.consents co
  where co.customer_id = v_customer and co.purpose = 'marketing'
  order by co.recorded_at desc, co.id desc
  limit 1;
  if v_status <> 'withdrawn' then
    raise exception 'Resend unsubscribe was not recorded locally';
  end if;

  select result.duplicate into v_duplicate
  from public.record_resend_contact_event(
    'resend-contact-event-test',
    'contact.updated',
    'contact-test',
    'resend-unsubscribe@example.com',
    true
  ) result;
  if not v_duplicate then raise exception 'duplicate contact event was not detected'; end if;

  if (
    select count(*) from public.consents co
    where co.customer_id = v_customer
      and co.purpose = 'marketing'
      and co.status = 'withdrawn'
  ) <> 1 then
    raise exception 'duplicate contact event created repeated withdrawals';
  end if;
end;
$$;

rollback;
