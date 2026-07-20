-- Consumer complaint records are deliberately private. Public submissions go
-- through the rate-limited server route; only admins and service_role can read.
create table public.consumer_claims (
  id uuid primary key default gen_random_uuid(),
  claim_number text not null unique,
  customer_name text not null,
  document_type text not null check (document_type in ('dni', 'ce', 'passport', 'ruc')),
  document_number text not null,
  address text not null,
  phone text not null,
  phone_normalized text not null,
  email text not null,
  item_type text not null check (item_type in ('product', 'service')),
  item_description text not null,
  order_number text,
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  claim_type text not null check (claim_type in ('reclamo', 'queja')),
  detail text not null,
  consumer_request text not null,
  status text not null default 'received'
    check (status in ('received', 'in_review', 'responded', 'closed')),
  provider_response text,
  privacy_accepted_at timestamptz not null,
  privacy_notice_path text not null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index consumer_claims_created_idx
  on public.consumer_claims(created_at desc);
create index consumer_claims_status_idx
  on public.consumer_claims(status, created_at);

create trigger consumer_claims_set_updated_at
before update on public.consumer_claims
for each row execute function public.set_updated_at();

alter table public.consumer_claims enable row level security;

create policy admins_read_consumer_claims
  on public.consumer_claims
  for select to authenticated
  using (public.is_admin());

create policy admins_update_consumer_claims
  on public.consumer_claims
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.consumer_claims from public, anon, authenticated;
grant select, update on table public.consumer_claims to authenticated;
grant all on table public.consumer_claims to service_role;
