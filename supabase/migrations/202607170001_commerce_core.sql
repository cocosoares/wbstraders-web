-- WBStraders transactional commerce core.
-- All customer/order data is private by default. Public order lookups go through
-- a server endpoint using a hashed bearer token; the browser never queries these
-- tables directly.

create extension if not exists pgcrypto;

create type public.order_status as enum (
  'pending_payment', 'paid', 'payment_failed', 'cancelled', 'fulfilled', 'refunded'
);
create type public.payment_status as enum (
  'pending', 'approved', 'rejected', 'cancelled', 'refunded', 'partially_refunded'
);
create type public.fulfillment_status as enum (
  'unfulfilled', 'reserved', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned'
);
create type public.fiscal_status as enum (
  'not_requested', 'pending', 'issued', 'rejected', 'cancelled'
);
create type public.reservation_status as enum ('active', 'converted', 'released', 'expired');
create type public.webhook_status as enum ('processing', 'processed', 'failed', 'ignored');

create sequence public.order_number_seq start 1001;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  email text,
  phone text not null,
  phone_normalized text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  tax_id text,
  kind text not null default 'horeca' check (kind in ('horeca', 'corporate', 'events', 'other')),
  billing_email text,
  phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  purpose text not null check (purpose in ('marketing', 'privacy', 'terms')),
  status text not null check (status in ('granted', 'denied', 'withdrawn')),
  policy_version text,
  source text not null default 'checkout',
  evidence jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);
create index consents_customer_purpose_idx on public.consents(customer_id, purpose, recorded_at desc);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'WBS-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0')
  ),
  public_access_token_hash text not null unique,
  customer_id uuid not null references public.customers(id),
  organization_id uuid references public.organizations(id),
  channel text not null default 'web' check (channel in ('web', 'whatsapp', 'admin', 'horeca')),
  status public.order_status not null default 'pending_payment',
  payment_status public.payment_status not null default 'pending',
  fulfillment_status public.fulfillment_status not null default 'unfulfilled',
  fiscal_status public.fiscal_status not null default 'not_requested',
  payment_provider text not null default 'manual' check (payment_provider in ('manual', 'mercadopago')),
  currency char(3) not null default 'PEN' check (currency = 'PEN'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_cents integer not null default 0 check (delivery_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  customer_snapshot jsonb not null,
  delivery_snapshot jsonb not null,
  fiscal_snapshot jsonb not null default '{}'::jsonb,
  pricing_snapshot jsonb not null,
  attribution jsonb not null default '{}'::jsonb,
  notes text,
  age_confirmed boolean not null check (age_confirmed),
  terms_accepted boolean not null check (terms_accepted),
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = subtotal_cents + delivery_cents - discount_cents)
);
create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  sku text not null,
  product_name text not null,
  product_snapshot jsonb not null,
  pricing_group text not null,
  quantity integer not null check (quantity > 0),
  regular_unit_cents integer not null check (regular_unit_cents >= 0),
  applied_unit_cents integer not null check (applied_unit_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  tier_min_qty integer not null check (tier_min_qty > 0),
  tier_pack_total_cents integer not null check (tier_pack_total_cents >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_product_idx on public.order_items(product_id);
create unique index order_items_order_product_uidx on public.order_items(order_id, product_id);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider in ('manual', 'mercadopago')),
  provider_reference text,
  preference_id text,
  idempotency_key uuid not null default gen_random_uuid(),
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'PEN' check (currency = 'PEN'),
  provider_status_detail text,
  checkout_url text,
  response_snapshot jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payment_attempt_provider_ref_uidx
  on public.payment_attempts(provider, provider_reference)
  where provider_reference is not null;
create index payment_attempt_order_idx on public.payment_attempts(order_id, created_at desc);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('mercadopago', 'ycloud')),
  provider_event_id text not null,
  event_type text,
  status public.webhook_status not null default 'processing',
  payload jsonb not null,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create table public.inventory_ledger (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  order_id uuid references public.orders(id),
  quantity_delta integer not null check (quantity_delta <> 0),
  event_type text not null check (event_type in (
    'opening_balance', 'purchase', 'adjustment', 'sale', 'return', 'damage', 'transfer'
  )),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_by uuid
);
create index inventory_ledger_product_idx on public.inventory_ledger(product_id, occurred_at);
create unique index inventory_order_event_uidx
  on public.inventory_ledger(order_id, product_id, event_type)
  where order_id is not null and event_type in ('sale', 'return');

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  quantity integer not null check (quantity > 0),
  status public.reservation_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, product_id)
);
create index active_stock_reservation_idx
  on public.stock_reservations(product_id, expires_at)
  where status = 'active';

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'pending' check (status in (
    'pending', 'scheduled', 'preparing', 'dispatched', 'delivered', 'failed', 'returned', 'cancelled'
  )),
  carrier text,
  tracking_code text,
  delivery_window jsonb,
  proof jsonb not null default '{}'::jsonb,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  document_type text not null check (document_type in ('boleta', 'factura', 'nota_credito', 'nota_debito')),
  provider text not null check (provider in ('sunat_sol', 'pse', 'manual')),
  recipient_snapshot jsonb not null default '{}'::jsonb,
  series text,
  number text,
  status public.fiscal_status not null default 'pending',
  xml_path text,
  cdr_path text,
  pdf_path text,
  provider_reference text,
  cancellation_reference text,
  cancellation_reason text,
  error_message text,
  issued_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_type, series, number)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  kind text not null,
  subject text not null,
  body text,
  status text not null default 'completed' check (status in ('planned', 'completed', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index activities_customer_idx on public.activities(customer_id, created_at desc);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('ycloud.payment_confirmed')),
  state text not null default 'pending' check (state in ('pending', 'processing', 'sent', 'failed')),
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
  unique(order_id, kind),
  check ((state = 'processing') = (worker_id is not null and lease_expires_at is not null))
);
create index notification_outbox_claim_idx
  on public.notification_outbox(next_attempt_at, created_at)
  where state in ('pending', 'failed', 'processing');

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  organization_id uuid references public.organizations(id),
  owner_id uuid,
  segment text not null check (segment in ('horeca', 'corporate_gifts', 'events', 'd2c')),
  stage text not null default 'lead' check (stage in (
    'lead', 'qualified', 'tasting', 'proposal', 'negotiation', 'won', 'lost'
  )),
  title text not null,
  value_cents integer check (value_cents is null or value_cents >= 0),
  currency char(3) not null default 'PEN',
  next_action text,
  next_action_at timestamptz,
  lost_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_type text not null default 'system' check (actor_type in ('system', 'admin', 'customer', 'provider')),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);

create view public.inventory_availability as
select
  products.product_id,
  products.on_hand,
  coalesce(reserved.reserved, 0)::bigint as reserved,
  (products.on_hand - coalesce(reserved.reserved, 0))::bigint as available
from (
  select product_id, sum(quantity_delta)::bigint as on_hand
  from public.inventory_ledger
  group by product_id
) products
left join (
  select product_id, sum(quantity)::bigint as reserved
  from public.stock_reservations
  where status = 'active' and expires_at > now()
  group by product_id
) reserved using (product_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger payment_attempts_set_updated_at before update on public.payment_attempts
for each row execute function public.set_updated_at();
create trigger reservations_set_updated_at before update on public.stock_reservations
for each row execute function public.set_updated_at();
create trigger shipments_set_updated_at before update on public.shipments
for each row execute function public.set_updated_at();
create trigger fiscal_documents_set_updated_at before update on public.fiscal_documents
for each row execute function public.set_updated_at();
create trigger opportunities_set_updated_at before update on public.opportunities
for each row execute function public.set_updated_at();
create trigger notification_outbox_set_updated_at before update on public.notification_outbox
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Creates the customer, immutable order snapshots and stock reservations in one
-- transaction. Inventory must be initialized explicitly with an opening_balance;
-- an absent ledger row is treated as unavailable, never as unlimited stock.
create or replace function public.create_order_transaction(
  p_order_id uuid,
  p_public_token_hash text,
  p_customer jsonb,
  p_delivery jsonb,
  p_fiscal jsonb,
  p_notes text,
  p_age_confirmed boolean,
  p_terms_accepted boolean,
  p_marketing_consent boolean,
  p_attribution jsonb,
  p_subtotal_cents integer,
  p_delivery_cents integer,
  p_discount_cents integer,
  p_total_cents integer,
  p_pricing_snapshot jsonb,
  p_items jsonb,
  p_payment_provider text,
  p_reservation_minutes integer default 30
)
returns table(created_order_id uuid, created_order_number text)
language plpgsql security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_order_number text;
  v_item jsonb;
  v_product_id text;
  v_qty integer;
  v_on_hand bigint;
  v_reserved bigint;
begin
  if p_age_confirmed is distinct from true then
    raise exception using errcode = '22023', message = 'age_confirmation_required';
  end if;
  if p_terms_accepted is distinct from true then
    raise exception using errcode = '22023', message = 'terms_acceptance_required';
  end if;
  if p_total_cents <> p_subtotal_cents + p_delivery_cents - p_discount_cents then
    raise exception using errcode = '22023', message = 'invalid_order_total';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'empty_order';
  end if;

  insert into public.customers(name, email, phone, phone_normalized)
  values (
    p_customer->>'name', nullif(p_customer->>'email', ''),
    p_customer->>'phone', p_customer->>'phoneNormalized'
  )
  on conflict (phone_normalized) do update set
    name = excluded.name,
    email = coalesce(excluded.email, public.customers.email),
    phone = excluded.phone
  returning id into v_customer_id;

  insert into public.orders(
    id, public_access_token_hash, customer_id, status, payment_status,
    fulfillment_status, fiscal_status, payment_provider, subtotal_cents, delivery_cents,
    discount_cents, total_cents, customer_snapshot, delivery_snapshot, fiscal_snapshot,
    pricing_snapshot, attribution, notes, age_confirmed, terms_accepted
  ) values (
    p_order_id, p_public_token_hash, v_customer_id, 'pending_payment', 'pending',
    'reserved', 'pending', p_payment_provider, p_subtotal_cents, p_delivery_cents,
    p_discount_cents, p_total_cents, p_customer, p_delivery, p_fiscal,
    p_pricing_snapshot, coalesce(p_attribution, '{}'::jsonb), p_notes, p_age_confirmed, p_terms_accepted
  ) returning order_number into v_order_number;

  -- Lock every product in a deterministic order before checking any balance.
  -- This prevents deadlocks between two mixed-product carts with inverse item order.
  for v_product_id in
    select distinct value->>'productId'
    from jsonb_array_elements(p_items)
    order by 1
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_product_id, 0));
  end loop;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'productId';
    v_qty := (v_item->>'quantity')::integer;

    select sum(quantity_delta) into v_on_hand
      from public.inventory_ledger where product_id = v_product_id;
    if v_on_hand is null then
      raise exception using errcode = 'P0001', message = 'stock_not_initialized:' || v_product_id;
    end if;
    select coalesce(sum(quantity), 0) into v_reserved
      from public.stock_reservations
      where product_id = v_product_id and status = 'active' and expires_at > now();
    if v_on_hand - v_reserved < v_qty then
      raise exception using errcode = 'P0001', message = 'insufficient_stock:' || v_product_id;
    end if;

    insert into public.order_items(
      order_id, product_id, sku, product_name, product_snapshot, pricing_group,
      quantity, regular_unit_cents, applied_unit_cents, line_total_cents,
      tier_min_qty, tier_pack_total_cents
    ) values (
      p_order_id, v_product_id, v_item->>'sku', v_item->>'productName',
      v_item->'productSnapshot', v_item->>'pricingGroup', v_qty,
      (v_item->>'regularUnitCents')::integer, (v_item->>'appliedUnitCents')::integer,
      (v_item->>'lineTotalCents')::integer, (v_item->>'tierMinQty')::integer,
      (v_item->>'tierPackTotalCents')::integer
    );
    insert into public.stock_reservations(order_id, product_id, quantity, expires_at)
    values (p_order_id, v_product_id, v_qty, now() + make_interval(mins => p_reservation_minutes));
  end loop;

  insert into public.consents(customer_id, purpose, status, source, evidence)
  values (
    v_customer_id, 'marketing',
    case when p_marketing_consent then 'granted' else 'denied' end,
    'checkout', jsonb_build_object('orderId', p_order_id)
  );
  insert into public.consents(customer_id, purpose, status, policy_version, source, evidence)
  values (
    v_customer_id, 'terms', 'granted', null, 'checkout',
    jsonb_build_object('orderId', p_order_id, 'acceptedAt', now())
  );
  insert into public.fiscal_documents(order_id, document_type, provider, status, recipient_snapshot)
  values (p_order_id, p_fiscal->>'receiptType', 'manual', 'pending', p_fiscal);
  insert into public.activities(customer_id, order_id, kind, subject, metadata)
  values (v_customer_id, p_order_id, 'order.created', 'Pedido creado', jsonb_build_object('channel', 'web'));
  insert into public.audit_log(actor_type, action, entity_type, entity_id, after_data)
  values ('customer', 'order.created', 'order', p_order_id::text, jsonb_build_object('status', 'pending_payment'));

  return query select p_order_id, v_order_number;
end;
$$;

-- Applies a provider result and converts/releases stock exactly once.
create or replace function public.apply_payment_result(
  p_order_id uuid,
  p_provider_reference text,
  p_provider_status text,
  p_status_detail text,
  p_snapshot jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_previous public.payment_status;
  v_item record;
  v_on_hand bigint;
  v_reserved_by_others bigint;
  v_reservation_status public.reservation_status;
  v_reservation_expires_at timestamptz;
  v_inventory_available boolean := true;
  v_reservation_not_current boolean := false;
begin
  select payment_status into v_previous from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;

  update public.payment_attempts set
    provider_reference = coalesce(provider_reference, p_provider_reference),
    status = case
      when p_provider_status = 'approved' then 'approved'::public.payment_status
      when p_provider_status = 'rejected' then 'rejected'::public.payment_status
      when p_provider_status = 'cancelled' then 'cancelled'::public.payment_status
      when p_provider_status = 'refunded' then 'refunded'::public.payment_status
      when p_provider_status = 'partially_refunded' then 'partially_refunded'::public.payment_status
      else 'pending'::public.payment_status end,
    provider_status_detail = p_status_detail,
    response_snapshot = p_snapshot
  where order_id = p_order_id and provider = 'mercadopago';

  if p_provider_status = 'approved' and v_previous <> 'approved' then
    -- Acquire every SKU lock before reading availability. Order creation and
    -- inventory adjustments use the same advisory-lock namespace.
    for v_item in
      select distinct product_id
      from public.order_items
      where order_id = p_order_id
      order by product_id
    loop
      perform pg_advisory_xact_lock(hashtextextended(v_item.product_id, 0));
    end loop;

    -- Lock this order's reservation rows so cancellation/cleanup cannot change
    -- them between validation and conversion/release.
    perform sr.id
    from public.stock_reservations sr
    where sr.order_id = p_order_id
    order by sr.product_id
    for update;

    -- Validate the complete order first. The sale ledger is written only after
    -- every item passes, so mixed orders can never be partially decremented.
    for v_item in
      select product_id, quantity
      from public.order_items
      where order_id = p_order_id
      order by product_id
    loop
      v_reservation_status := null;
      v_reservation_expires_at := null;
      select sr.status, sr.expires_at
      into v_reservation_status, v_reservation_expires_at
      from public.stock_reservations sr
      where sr.order_id = p_order_id and sr.product_id = v_item.product_id;

      if not found
        or v_reservation_status <> 'active'
        or v_reservation_expires_at <= now()
      then
        v_reservation_not_current := true;
      end if;

      select sum(il.quantity_delta)
      into v_on_hand
      from public.inventory_ledger il
      where il.product_id = v_item.product_id;

      select coalesce(sum(sr.quantity), 0)
      into v_reserved_by_others
      from public.stock_reservations sr
      where sr.product_id = v_item.product_id
        and sr.order_id <> p_order_id
        and sr.status = 'active'
        and sr.expires_at > now();

      if v_on_hand is null or v_on_hand - v_reserved_by_others < v_item.quantity then
        v_inventory_available := false;
      end if;
    end loop;

    -- Payment truth is independent from fulfillment truth. Even when inventory
    -- is unavailable, the approved payment remains reconciled for refund/manual review.
    update public.orders set
      status = 'paid',
      payment_status = 'approved',
      fulfillment_status = case when v_inventory_available then 'reserved'::public.fulfillment_status else 'unfulfilled'::public.fulfillment_status end,
      paid_at = coalesce(paid_at, now())
    where id = p_order_id;

    if v_inventory_available then
      update public.stock_reservations set status = 'converted'
        where order_id = p_order_id and status = 'active';
      for v_item in
        select product_id, quantity
        from public.order_items
        where order_id = p_order_id
        order by product_id
      loop
        insert into public.inventory_ledger(product_id, order_id, quantity_delta, event_type, reason)
        values (v_item.product_id, p_order_id, -v_item.quantity, 'sale', 'mercadopago_approved')
        on conflict do nothing;
      end loop;
      insert into public.activities(customer_id, order_id, kind, subject, status, metadata)
      select customer_id, id, 'whatsapp.payment_confirmation.pending',
        'Notificar pago confirmado por WhatsApp', 'planned',
        jsonb_build_object(
          'outbox', true,
          'attempts', 0,
          'reservationWasCurrent', not v_reservation_not_current
        )
      from public.orders where id = p_order_id;
      insert into public.notification_outbox(order_id, kind)
      values (p_order_id, 'ycloud.payment_confirmed')
      on conflict (order_id, kind) do nothing;
    else
      update public.stock_reservations set status = 'released'
        where order_id = p_order_id and status = 'active';
      insert into public.activities(customer_id, order_id, kind, subject, status, metadata)
      select customer_id, id, 'inventory.exception',
        'Pago aprobado sin stock disponible: revisión manual', 'planned',
        jsonb_build_object(
          'reason', 'approved_payment_without_available_inventory',
          'reservationWasCurrent', not v_reservation_not_current,
          'providerReference', p_provider_reference
        )
      from public.orders where id = p_order_id;
      insert into public.audit_log(actor_type, action, entity_type, entity_id, after_data)
      values (
        'system', 'inventory.exception', 'order', p_order_id::text,
        jsonb_build_object(
          'reason', 'approved_payment_without_available_inventory',
          'paymentStatus', 'approved',
          'fulfillmentStatus', 'unfulfilled',
          'reservationWasCurrent', not v_reservation_not_current,
          'manualReviewRequired', true
        )
      );
    end if;
  elsif p_provider_status in ('rejected', 'cancelled') and v_previous = 'pending' then
    update public.orders set
      status = case when p_provider_status = 'rejected' then 'payment_failed'::public.order_status else 'cancelled'::public.order_status end,
      payment_status = case when p_provider_status = 'rejected' then 'rejected'::public.payment_status else 'cancelled'::public.payment_status end,
      fulfillment_status = 'cancelled',
      cancelled_at = case when p_provider_status = 'cancelled' then now() else cancelled_at end
      where id = p_order_id;
    update public.stock_reservations set status = 'released'
      where order_id = p_order_id and status = 'active';
  elsif p_provider_status = 'refunded' and v_previous <> 'refunded' then
    update public.orders set status = 'refunded', payment_status = 'refunded', fulfillment_status = 'returned'
      where id = p_order_id;
    for v_item in select product_id, quantity from public.order_items where order_id = p_order_id
    loop
      insert into public.inventory_ledger(product_id, order_id, quantity_delta, event_type, reason)
      values (v_item.product_id, p_order_id, v_item.quantity, 'return', 'mercadopago_refunded')
      on conflict do nothing;
    end loop;
  elsif p_provider_status = 'partially_refunded' then
    update public.orders set payment_status = 'partially_refunded' where id = p_order_id;
  end if;

  insert into public.audit_log(actor_type, action, entity_type, entity_id, after_data)
  values ('provider', 'payment.' || p_provider_status, 'order', p_order_id::text, p_snapshot);
end;
$$;

-- Atomically leases pending notifications. SKIP LOCKED allows multiple cron
-- workers without two workers sending the same row concurrently.
create or replace function public.claim_ycloud_outbox(
  p_worker_id uuid,
  p_limit integer default 10,
  p_lease_seconds integer default 120
)
returns table(
  outbox_id uuid,
  order_id uuid,
  phone text,
  order_number text,
  attempt integer
)
language plpgsql security definer
set search_path = public
as $$
begin
  if p_worker_id is null or p_limit not between 1 and 50 or p_lease_seconds not between 30 and 600 then
    raise exception using errcode = '22023', message = 'invalid_outbox_claim';
  end if;

  return query
  with candidates as (
    select no.id
    from public.notification_outbox no
    where no.attempts < no.max_attempts
      and (
        (no.state in ('pending', 'failed') and no.next_attempt_at <= now())
        or (no.state = 'processing' and no.lease_expires_at <= now())
      )
    order by no.next_attempt_at, no.created_at
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.notification_outbox no set
      state = 'processing',
      worker_id = p_worker_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      attempts = no.attempts + 1
    from candidates c
    where no.id = c.id
    returning no.id, no.order_id, no.attempts, no.created_at
  )
  select
    c.id,
    c.order_id,
    coalesce(o.customer_snapshot->>'phoneNormalized', regexp_replace(o.customer_snapshot->>'phone', '[^0-9]', '', 'g')),
    o.order_number,
    c.attempts
  from claimed c
  join public.orders o on o.id = c.order_id
  order by c.created_at;
end;
$$;

create or replace function public.complete_ycloud_outbox(
  p_outbox_id uuid,
  p_worker_id uuid,
  p_sent boolean,
  p_provider_reference text default null,
  p_error_code text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_outbox public.notification_outbox%rowtype;
begin
  select * into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'outbox_not_found'; end if;
  if v_outbox.state <> 'processing' or v_outbox.worker_id <> p_worker_id then
    raise exception using errcode = '40001', message = 'outbox_lease_lost';
  end if;

  if p_sent then
    update public.notification_outbox set
      state = 'sent', worker_id = null, lease_expires_at = null,
      provider_reference = nullif(left(p_provider_reference, 250), ''),
      last_error_code = null, sent_at = now()
    where id = p_outbox_id;
    update public.activities set
      status = 'completed', completed_at = now(),
      metadata = metadata || jsonb_build_object('outboxId', p_outbox_id, 'sent', true)
    where order_id = v_outbox.order_id and kind = 'whatsapp.payment_confirmation.pending';
  else
    update public.notification_outbox set
      state = 'failed', worker_id = null, lease_expires_at = null,
      last_error_code = coalesce(nullif(left(p_error_code, 100), ''), 'provider_error'),
      next_attempt_at = now() + make_interval(mins => least(60, power(2, greatest(attempts - 1, 0))::integer))
    where id = p_outbox_id;
    if v_outbox.attempts >= v_outbox.max_attempts then
      update public.activities set
        status = 'cancelled',
        metadata = metadata || jsonb_build_object('outboxId', p_outbox_id, 'sent', false, 'exhausted', true)
      where order_id = v_outbox.order_id and kind = 'whatsapp.payment_confirmation.pending';
    end if;
  end if;

  insert into public.audit_log(actor_type, action, entity_type, entity_id, after_data)
  values (
    'system', case when p_sent then 'notification.sent' else 'notification.failed' end,
    'notification_outbox', p_outbox_id::text,
    jsonb_build_object('kind', v_outbox.kind, 'attempt', v_outbox.attempts, 'sent', p_sent)
  );
end;
$$;

create or replace function public.admin_set_order_fulfillment(
  p_order_id uuid,
  p_fulfillment_status public.fulfillment_status,
  p_actor_id uuid default null
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_before public.orders%rowtype;
  v_current_rank integer;
  v_next_rank integer;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and not coalesce(public.is_admin(), false)
  then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  select * into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;

  if p_fulfillment_status = 'cancelled' then
    if v_before.payment_status in ('approved', 'partially_refunded') then
      raise exception using errcode = '22023', message = 'refund_required_before_cancellation';
    end if;
    update public.orders set fulfillment_status = 'cancelled', status = 'cancelled', cancelled_at = now()
      where id = p_order_id;
    update public.stock_reservations set status = 'released'
      where order_id = p_order_id and status = 'active';
  else
    v_current_rank := case v_before.fulfillment_status
      when 'unfulfilled' then 0 when 'reserved' then 1 when 'preparing' then 2
      when 'shipped' then 3 when 'delivered' then 4 else -1 end;
    v_next_rank := case p_fulfillment_status
      when 'unfulfilled' then 0 when 'reserved' then 1 when 'preparing' then 2
      when 'shipped' then 3 when 'delivered' then 4 else -1 end;
    if v_current_rank < 0 or v_next_rank < v_current_rank or v_next_rank > v_current_rank + 1 then
      raise exception using errcode = '22023', message = 'invalid_fulfillment_transition';
    end if;
    if p_fulfillment_status in ('preparing', 'shipped', 'delivered') and v_before.payment_status <> 'approved' then
      raise exception using errcode = '22023', message = 'payment_required';
    end if;
    update public.orders set
      fulfillment_status = p_fulfillment_status,
      status = case when p_fulfillment_status = 'delivered' then 'fulfilled'::public.order_status else status end
    where id = p_order_id;
  end if;

  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, before_data, after_data)
  values (
    case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end,
    'admin', 'order.fulfillment_updated', 'order', p_order_id::text,
    jsonb_build_object('fulfillmentStatus', v_before.fulfillment_status),
    jsonb_build_object('fulfillmentStatus', p_fulfillment_status)
  );
end;
$$;

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
declare v_before public.opportunities%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and not coalesce(public.is_admin(), false)
  then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if p_stage not in ('lead','qualified','tasting','proposal','negotiation','won','lost') then
    raise exception using errcode = '22023', message = 'invalid_opportunity_stage';
  end if;
  if p_stage = 'lost' and nullif(trim(p_lost_reason), '') is null then
    raise exception using errcode = '22023', message = 'lost_reason_required';
  end if;
  select * into v_before from public.opportunities where id = p_opportunity_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'opportunity_not_found'; end if;
  update public.opportunities set
    stage = p_stage,
    lost_reason = case when p_stage = 'lost' then trim(p_lost_reason) else null end
  where id = p_opportunity_id;
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, before_data, after_data)
  values (
    case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end,
    'admin', 'opportunity.stage_updated', 'opportunity', p_opportunity_id::text,
    jsonb_build_object('stage', v_before.stage, 'lostReason', v_before.lost_reason),
    jsonb_build_object('stage', p_stage, 'lostReason', p_lost_reason)
  );
end;
$$;

create or replace function public.admin_record_inventory(
  p_product_id text,
  p_quantity_delta integer,
  p_event_type text,
  p_reason text,
  p_actor_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_exists boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and not coalesce(public.is_admin(), false)
  then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if nullif(trim(p_product_id), '') is null or p_quantity_delta = 0 then
    raise exception using errcode = '22023', message = 'invalid_inventory_movement';
  end if;
  if p_event_type not in ('opening_balance', 'adjustment') then
    raise exception using errcode = '22023', message = 'invalid_inventory_event_type';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'inventory_reason_required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_product_id, 0));
  select exists(select 1 from public.inventory_ledger where product_id = p_product_id) into v_exists;
  if p_event_type = 'opening_balance' and v_exists then
    raise exception using errcode = '23505', message = 'opening_balance_already_exists';
  end if;
  insert into public.inventory_ledger(product_id, quantity_delta, event_type, reason, created_by)
  values (
    trim(p_product_id), p_quantity_delta, p_event_type, trim(p_reason),
    case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end
  )
  returning id into v_id;
  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, after_data)
  values (
    case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end,
    'admin', 'inventory.' || p_event_type, 'product', trim(p_product_id),
    jsonb_build_object('quantityDelta', p_quantity_delta, 'reason', trim(p_reason), 'ledgerId', v_id)
  );
  return v_id;
end;
$$;

-- Records the result of a manual SEE-SOL/back-office operation. This function
-- does not emit, sign or submit a CPE to SUNAT; it only reconciles a result that
-- an administrator has already obtained outside this application.
create or replace function public.admin_set_fiscal_document_status(
  p_fiscal_document_id uuid,
  p_status public.fiscal_status,
  p_series text default null,
  p_number text default null,
  p_external_reference text default null,
  p_reason text default null,
  p_actor_id uuid default null
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_before public.fiscal_documents%rowtype;
  v_series text := nullif(upper(trim(p_series)), '');
  v_number text := nullif(trim(p_number), '');
  v_external_reference text := nullif(trim(p_external_reference), '');
  v_reason text := nullif(trim(p_reason), '');
  v_has_document_number boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and not coalesce(public.is_admin(), false)
  then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;

  select * into v_before
  from public.fiscal_documents
  where id = p_fiscal_document_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'fiscal_document_not_found';
  end if;
  if v_before.provider not in ('manual', 'sunat_sol') or v_before.document_type not in ('boleta', 'factura') then
    raise exception using errcode = '22023', message = 'unsupported_manual_fiscal_document';
  end if;

  if v_series is not null and v_series !~ '^[A-Z0-9-]{1,20}$' then
    raise exception using errcode = '22023', message = 'invalid_fiscal_series';
  end if;
  if v_number is not null and v_number !~ '^[0-9]{1,20}$' then
    raise exception using errcode = '22023', message = 'invalid_fiscal_number';
  end if;
  if (v_series is null) <> (v_number is null) then
    raise exception using errcode = '22023', message = 'fiscal_series_and_number_required_together';
  end if;
  if v_external_reference is not null and char_length(v_external_reference) > 200 then
    raise exception using errcode = '22023', message = 'invalid_fiscal_external_reference';
  end if;
  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'invalid_fiscal_reason';
  end if;
  v_has_document_number := v_series is not null and v_number is not null;

  if v_before.status = 'pending' and p_status = 'issued' then
    if not v_has_document_number and v_external_reference is null then
      raise exception using errcode = '22023', message = 'fiscal_issuance_reference_required';
    end if;
    update public.fiscal_documents set
      status = 'issued',
      series = coalesce(v_series, series),
      number = coalesce(v_number, number),
      provider_reference = coalesce(v_external_reference, provider_reference),
      error_message = null,
      issued_at = now()
    where id = p_fiscal_document_id;
  elsif v_before.status = 'pending' and p_status = 'rejected' then
    if v_reason is null or char_length(v_reason) < 5 then
      raise exception using errcode = '22023', message = 'fiscal_rejection_reason_required';
    end if;
    update public.fiscal_documents set
      status = 'rejected',
      provider_reference = coalesce(v_external_reference, provider_reference),
      error_message = v_reason
    where id = p_fiscal_document_id;
  elsif v_before.status = 'issued' and p_status = 'cancelled' then
    if v_external_reference is null or v_reason is null or char_length(v_reason) < 5 then
      raise exception using errcode = '22023', message = 'fiscal_cancellation_reference_and_reason_required';
    end if;
    update public.fiscal_documents set
      status = 'cancelled',
      cancellation_reference = v_external_reference,
      cancellation_reason = v_reason,
      cancelled_at = now()
    where id = p_fiscal_document_id;
  else
    raise exception using errcode = '22023', message = 'invalid_fiscal_status_transition';
  end if;

  update public.orders
  set fiscal_status = p_status
  where id = v_before.order_id;

  insert into public.audit_log(actor_id, actor_type, action, entity_type, entity_id, before_data, after_data)
  values (
    case when coalesce(auth.role(), '') = 'service_role' then coalesce(p_actor_id, auth.uid()) else auth.uid() end,
    'admin', 'fiscal_document.status_updated',
    'fiscal_document', p_fiscal_document_id::text,
    jsonb_build_object(
      'status', v_before.status,
      'series', v_before.series,
      'number', v_before.number,
      'externalReference', v_before.provider_reference,
      'cancellationReference', v_before.cancellation_reference
    ),
    jsonb_build_object(
      'status', p_status,
      'series', coalesce(v_series, v_before.series),
      'number', coalesce(v_number, v_before.number),
      'externalReference', case when p_status = 'cancelled' then v_before.provider_reference else coalesce(v_external_reference, v_before.provider_reference) end,
      'cancellationReference', case when p_status = 'cancelled' then v_external_reference else v_before.cancellation_reference end,
      'reason', v_reason
    )
  );
end;
$$;

-- Row-level security: authenticated admins can operate from a future admin UI;
-- service_role is used by server routes and bypasses RLS. anon gets no policies.
alter table public.customers enable row level security;
alter table public.organizations enable row level security;
alter table public.consents enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.webhook_events enable row level security;
alter table public.inventory_ledger enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.shipments enable row level security;
alter table public.fiscal_documents enable row level security;
alter table public.activities enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.opportunities enable row level security;
alter table public.audit_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'customers','organizations','consents','shipments',
    'fiscal_documents','activities','opportunities'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      'admins_manage_' || t, t
    );
  end loop;
  foreach t in array array[
    'orders','order_items','payment_attempts','webhook_events',
    'inventory_ledger','stock_reservations','notification_outbox','audit_log'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_admin())',
      'admins_read_' || t, t
    );
  end loop;
end $$;

revoke all on function public.create_order_transaction(
  uuid,text,jsonb,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer,integer,integer,integer,jsonb,jsonb,text,integer
) from public, anon, authenticated;
revoke all on function public.apply_payment_result(uuid,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.admin_set_order_fulfillment(uuid,public.fulfillment_status,uuid) from public, anon;
revoke all on function public.admin_set_opportunity_stage(uuid,text,text,uuid) from public, anon;
revoke all on function public.admin_record_inventory(text,integer,text,text,uuid) from public, anon;
revoke all on function public.admin_set_fiscal_document_status(uuid,public.fiscal_status,text,text,text,text,uuid) from public, anon;
revoke all on function public.claim_ycloud_outbox(uuid,integer,integer) from public, anon, authenticated;
revoke all on function public.complete_ycloud_outbox(uuid,uuid,boolean,text,text) from public, anon, authenticated;
grant execute on function public.create_order_transaction(
  uuid,text,jsonb,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer,integer,integer,integer,jsonb,jsonb,text,integer
) to service_role;
grant execute on function public.apply_payment_result(uuid,text,text,text,jsonb) to service_role;
grant execute on function public.admin_set_order_fulfillment(uuid,public.fulfillment_status,uuid) to authenticated, service_role;
grant execute on function public.admin_set_opportunity_stage(uuid,text,text,uuid) to authenticated, service_role;
grant execute on function public.admin_record_inventory(text,integer,text,text,uuid) to authenticated, service_role;
grant execute on function public.admin_set_fiscal_document_status(uuid,public.fiscal_status,text,text,text,text,uuid) to authenticated, service_role;
grant execute on function public.claim_ycloud_outbox(uuid,integer,integer) to service_role;
grant execute on function public.complete_ycloud_outbox(uuid,uuid,boolean,text,text) to service_role;
