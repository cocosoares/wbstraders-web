begin;

alter table public.webhook_events
  drop constraint if exists webhook_events_provider_check;

alter table public.webhook_events
  add constraint webhook_events_provider_check
  check (provider in ('mercadopago', 'ycloud', 'greenapi'));

alter table public.whatsapp_events
  drop constraint if exists whatsapp_events_provider_check;

alter table public.whatsapp_events
  add constraint whatsapp_events_provider_check
  check (provider in ('ycloud', 'greenapi'));

commit;
