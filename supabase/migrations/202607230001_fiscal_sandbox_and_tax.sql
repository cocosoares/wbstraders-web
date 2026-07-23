-- Fiscal foundation for WBStraders.
-- The seeded configuration is intentionally a SANDBOX with an invalid issuer.
-- It can only issue a document labelled as a test for an internal test-coupon
-- order. It cannot send a CPE to SUNAT and is not a fiscal document.

begin;

alter table public.fiscal_documents
  add column if not exists test_mode boolean not null default false,
  add column if not exists issuer_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists tax_snapshot jsonb not null default '{}'::jsonb;

alter table public.fiscal_documents
  drop constraint if exists fiscal_documents_provider_check;

alter table public.fiscal_documents
  add constraint fiscal_documents_provider_check
  check (provider in ('sunat_sol', 'pse', 'manual', 'sandbox'));

create table if not exists public.fiscal_settings (
  singleton boolean primary key default true check (singleton),
  mode text not null default 'disabled' check (mode in ('disabled', 'sandbox', 'production')),
  provider text not null default 'manual' check (provider in ('manual', 'nubefact')),
  issuer_legal_name text not null default '',
  issuer_ruc text not null default '',
  issuer_fiscal_address text not null default '',
  issuer_email text,
  currency char(3) not null default 'PEN' check (currency = 'PEN'),
  igv_bps integer not null default 1800 check (igv_bps between 0 and 10000),
  isc_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    mode <> 'production'
    or (
      issuer_legal_name <> ''
      and issuer_ruc ~ '^[0-9]{11}$'
      and issuer_fiscal_address <> ''
      and provider = 'nubefact'
    )
  )
);

create table if not exists public.fiscal_test_sequences (
  document_type text primary key check (document_type in ('boleta', 'factura')),
  next_number bigint not null default 1 check (next_number > 0),
  updated_at timestamptz not null default now()
);

drop trigger if exists fiscal_settings_set_updated_at on public.fiscal_settings;
create trigger fiscal_settings_set_updated_at
before update on public.fiscal_settings
for each row execute function public.set_updated_at();

drop trigger if exists fiscal_test_sequences_set_updated_at on public.fiscal_test_sequences;
create trigger fiscal_test_sequences_set_updated_at
before update on public.fiscal_test_sequences
for each row execute function public.set_updated_at();

-- This is deliberately non-credible as a legal issuer and is never rendered
-- publicly by default. Replace it through an audited production migration only.
insert into public.fiscal_settings(
  singleton, mode, provider, issuer_legal_name, issuer_ruc,
  issuer_fiscal_address, issuer_email, igv_bps, isc_enabled
) values (
  true, 'sandbox', 'manual', 'WBStraders DEMO S.A.C. — PRUEBA',
  'RUC-DEMO-NO-VALIDO', 'DirecciÃ³n ficticia — no usar para operaciones reales',
  'pruebas-fiscales@example.invalid', 1800, false
)
on conflict (singleton) do nothing;

create or replace function public.admin_issue_sandbox_fiscal_document(
  p_fiscal_document_id uuid,
  p_actor_id uuid default null
)
returns table (
  fiscal_document_id uuid,
  series text,
  number text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_settings public.fiscal_settings%rowtype;
  v_document public.fiscal_documents%rowtype;
  v_order public.orders%rowtype;
  v_next_number bigint;
  v_series text;
  v_number text;
  v_tax_base integer;
  v_igv integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  select * into v_settings
  from public.fiscal_settings
  where singleton = true
  for update;

  if not found or v_settings.mode <> 'sandbox' then
    raise exception using errcode = '22023', message = 'fiscal_sandbox_not_enabled';
  end if;

  select * into v_document
  from public.fiscal_documents
  where id = p_fiscal_document_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'fiscal_document_not_found';
  end if;
  if v_document.status <> 'pending' or v_document.document_type not in ('boleta', 'factura') then
    raise exception using errcode = '22023', message = 'fiscal_document_not_pending';
  end if;

  select * into v_order
  from public.orders
  where id = v_document.order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'fiscal_order_not_found';
  end if;
  if v_order.payment_status <> 'approved' then
    raise exception using errcode = '22023', message = 'sandbox_payment_not_approved';
  end if;
  if coalesce(v_order.attribution->>'medium', '') <> 'test_coupon' then
    raise exception using errcode = '22023', message = 'sandbox_internal_test_order_required';
  end if;

  insert into public.fiscal_test_sequences(document_type, next_number)
  values (v_document.document_type, 2)
  on conflict (document_type) do update
    set next_number = public.fiscal_test_sequences.next_number + 1
  returning next_number - 1 into v_next_number;

  v_series := case when v_document.document_type = 'factura' then 'TEST-F' else 'TEST-B' end;
  v_number := lpad(v_next_number::text, 8, '0');
  v_tax_base := round((v_order.total_cents::numeric * 10000) / (10000 + v_settings.igv_bps))::integer;
  v_igv := v_order.total_cents - v_tax_base;

  update public.fiscal_documents
  set provider = 'sandbox',
      status = 'issued',
      test_mode = true,
      series = v_series,
      number = v_number,
      provider_reference = 'sandbox:' || id::text,
      issuer_snapshot = jsonb_build_object(
        'legalName', v_settings.issuer_legal_name,
        'ruc', v_settings.issuer_ruc,
        'fiscalAddress', v_settings.issuer_fiscal_address,
        'mode', 'sandbox',
        'legalValidity', false
      ),
      tax_snapshot = jsonb_build_object(
        'currency', v_settings.currency,
        'grossCents', v_order.total_cents,
        'netCents', v_tax_base,
        'igvCents', v_igv,
        'igvBps', v_settings.igv_bps,
        'iscCents', 0,
        'iscEnabled', v_settings.isc_enabled,
        'legalValidity', false
      ),
      issued_at = now(),
      error_message = null
  where id = v_document.id;

  update public.orders set fiscal_status = 'issued' where id = v_order.id;

  insert into public.activities(customer_id, order_id, kind, subject, body, metadata, created_by)
  values (
    v_order.customer_id, v_order.id, 'fiscal.sandbox_issued',
    'Comprobante de prueba emitido',
    'Documento de prueba sin validez tributaria; no fue enviado a SUNAT.',
    jsonb_build_object('fiscalDocumentId', v_document.id, 'series', v_series, 'number', v_number),
    coalesce(p_actor_id, auth.uid())
  );

  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, after_data)
  values (
    coalesce(p_actor_id, auth.uid()), 'admin', 'fiscal.sandbox_issued',
    'fiscal_document', v_document.id::text,
    jsonb_build_object('series', v_series, 'number', v_number, 'legalValidity', false)
  );

  return query select v_document.id, v_series, v_number;
end;
$$;

alter table public.fiscal_settings enable row level security;
alter table public.fiscal_test_sequences enable row level security;
revoke all on table public.fiscal_settings from public, anon, authenticated;
revoke all on table public.fiscal_test_sequences from public, anon, authenticated;
grant all on table public.fiscal_settings to service_role;
grant all on table public.fiscal_test_sequences to service_role;

revoke all on function public.admin_issue_sandbox_fiscal_document(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_issue_sandbox_fiscal_document(uuid, uuid)
  to service_role;

commit;
