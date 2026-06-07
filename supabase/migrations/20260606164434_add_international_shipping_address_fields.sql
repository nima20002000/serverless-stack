begin;

alter table public.users
  add column if not exists "shippingCountry" text,
  add column if not exists "shippingRegion" text,
  add column if not exists "shippingCity" text,
  add column if not exists "shippingAddressLine1" text,
  add column if not exists "shippingAddressLine2" text;

alter table public.transactions
  add column if not exists "shippingCountry" text,
  add column if not exists "shippingRegion" text,
  add column if not exists "shippingCity" text,
  add column if not exists "shippingAddressLine1" text,
  add column if not exists "shippingAddressLine2" text;

update public.users
set "shippingAddressLine1" = nullif(trim("shippingAddress"), '')
where "shippingAddressLine1" is null
  and nullif(trim("shippingAddress"), '') is not null;

update public.transactions
set "shippingAddressLine1" = nullif(trim("shippingAddress"), '')
where "shippingAddressLine1" is null
  and nullif(trim("shippingAddress"), '') is not null;

commit;
