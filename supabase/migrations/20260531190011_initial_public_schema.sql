begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create type public."MediaType" as enum ('IMAGE', 'VIDEO');
create type public."PaymentMethod" as enum ('STRIPE', 'PAYPAL');
create type public."Role" as enum ('USER', 'ADMIN');
create type public."TransactionStatus" as enum ('PENDING', 'COMPLETED', 'FAILED');
create type public.activity_type as enum (
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'REGISTER',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'PROFILE_UPDATE',
  'OTP_SENT',
  'OTP_VERIFIED',
  'OTP_FAILED'
);

create table public.users (
  id text primary key,
  uid text not null,
  email text,
  phone text,
  name text not null,
  password text,
  "isVerified" boolean not null default false,
  role public."Role" not null default 'USER',
  "shippingAddress" text,
  "postalCode" text,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null,
  constraint users_uid_key unique (uid),
  constraint users_email_key unique (email),
  constraint users_phone_key unique (phone)
);

create table public.categories (
  id text primary key default extensions.gen_random_uuid()::text,
  name text not null,
  slug text not null,
  description text,
  image text,
  "parentId" text references public.categories(id) on delete set null,
  "isActive" boolean not null default true,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null default current_timestamp,
  constraint categories_slug_key unique (slug)
);

create table public.tags (
  id text primary key default extensions.gen_random_uuid()::text,
  name text not null,
  slug text not null,
  "createdAt" timestamp without time zone not null default now(),
  "updatedAt" timestamp without time zone not null default now(),
  constraint tags_name_key unique (name),
  constraint tags_slug_key unique (slug)
);

create table public.products (
  id text primary key,
  name text not null,
  description text not null,
  price numeric not null,
  stock integer not null default 0,
  images text[],
  "categoryId" text references public.categories(id) on delete set null,
  "isActive" boolean not null default true,
  "isFeatured" boolean not null default false,
  "discountPercent" integer,
  "displayOrder" integer not null default 0,
  "hasVariants" boolean not null default false,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null
);

create table public.product_variants (
  id text primary key,
  "productId" text not null references public.products(id) on delete cascade,
  name text not null,
  size text,
  color text,
  material text,
  sku text,
  stock integer not null default 0,
  "priceAdjust" numeric not null default 0,
  "isActive" boolean not null default true,
  "order" integer not null default 0,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null,
  constraint product_variants_sku_key unique (sku)
);

create table public.product_media (
  id text primary key,
  "productId" text not null references public.products(id) on delete cascade,
  "variantId" text references public.product_variants(id) on delete set null,
  type public."MediaType" not null,
  url text not null,
  alt text,
  "isDefault" boolean default false,
  "order" integer not null default 0,
  "createdAt" timestamp without time zone not null default current_timestamp
);

create table public."_ProductToTag" (
  "A" text not null references public.products(id) on delete cascade,
  "B" text not null references public.tags(id) on delete cascade,
  constraint "_ProductToTag_AB_unique" unique ("A", "B")
);

create table public.promo_codes (
  id text primary key,
  code text not null,
  "userId" text,
  "isUsed" boolean not null default false,
  "expiresAt" timestamp without time zone not null,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "discountType" text not null default 'PERCENT',
  "discountValue" numeric not null default 10,
  "maxUsageCount" integer,
  "currentUsageCount" integer default 0,
  "isActive" boolean default true,
  description text,
  "minOrderAmount" numeric,
  "maxDiscountAmount" numeric,
  constraint promo_codes_code_key unique (code),
  constraint promo_codes_userId_key unique ("userId"),
  constraint promo_codes_userId_fkey foreign key ("userId") references public.users(id) on delete cascade,
  constraint chk_discount_type check ("discountType" in ('PERCENT', 'FIXED'))
);

create table public.transactions (
  id text primary key,
  "userId" text references public.users(id) on delete set null,
  amount numeric not null,
  status public."TransactionStatus" not null default 'PENDING',
  "transactionCode" text not null,
  phone text default '',
  "fullName" text default '',
  "shippingAddress" text default '',
  "postalCode" text,
  email text,
  "createAccount" boolean default false,
  gateway_fee integer default 0,
  "paymentMethod" public."PaymentMethod" not null default 'STRIPE',
  "isGuest" boolean not null default true,
  "promoCodeId" text references public.promo_codes(id) on delete set null,
  "discountAmount" numeric default 0,
  subtotal numeric,
  "stripePaymentIntentId" text,
  "stripeCheckoutSessionId" text,
  "stripeChargeId" text,
  "paypalOrderId" text,
  "paypalCaptureId" text,
  "paymentProviderRef" text,
  "paymentMetadata" jsonb,
  ip_address varchar(45),
  user_agent text,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null,
  constraint "transactions_transactionCode_key" unique ("transactionCode")
);

create table public.transaction_items (
  id text primary key,
  "transactionId" text not null references public.transactions(id) on delete cascade,
  "productId" text not null references public.products(id) on delete restrict,
  "variantId" text references public.product_variants(id) on delete set null,
  quantity integer not null,
  price numeric not null
);

create table public.invoices (
  id text primary key,
  "transactionId" text not null references public.transactions(id) on delete cascade,
  "invoiceNumber" text not null,
  "pdfUrl" text,
  "generatedAt" timestamp without time zone not null default current_timestamp,
  constraint "invoices_transactionId_key" unique ("transactionId"),
  constraint "invoices_invoiceNumber_key" unique ("invoiceNumber")
);

create table public.promo_code_usages (
  id text primary key default extensions.gen_random_uuid()::text,
  "promoCodeId" text not null references public.promo_codes(id) on delete cascade,
  "userId" text references public.users(id) on delete set null,
  "transactionId" text references public.transactions(id) on delete set null,
  "usedAt" timestamp with time zone default now()
);

create table public.user_activity_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id text references public.users(id) on delete set null,
  activity_type public.activity_type not null,
  ip_address varchar(45),
  user_agent text,
  success boolean default true,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp without time zone default now()
);

create table public.wishlists (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  variant_id text references public.product_variants(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table public.site_settings (
  id text primary key default extensions.gen_random_uuid()::text,
  key text not null,
  value text not null,
  "updatedAt" timestamp without time zone not null default current_timestamp,
  constraint site_settings_key_key unique (key)
);

create index "_ProductToTag_B_index" on public."_ProductToTag" using btree ("B");
create index idx_product_to_tag_a on public."_ProductToTag" using btree ("A");
create index idx_categories_active_name on public.categories using btree ("isActive", name);
create index idx_categories_parent_active_name on public.categories using btree ("parentId", "isActive", name);
create index idx_product_media_product_default_order on public.product_media using btree ("productId", "isDefault" desc, "order");
create index idx_product_media_variant_default_order on public.product_media using btree ("variantId", "isDefault" desc, "order");
create index idx_product_variants_product_active_order on public.product_variants using btree ("productId", "isActive", "order");
create index idx_product_variants_product_order on public.product_variants using btree ("productId", "order");
create index idx_products_displayorder on public.products using btree ("displayOrder");
create index "products_isActive_idx" on public.products using btree ("isActive");
create index "products_isFeatured_idx" on public.products using btree ("isFeatured");
create unique index unique_wishlist_item_variant on public.wishlists using btree (user_id, product_id, variant_id) where variant_id is not null;
create unique index unique_wishlist_item_no_variant on public.wishlists using btree (user_id, product_id) where variant_id is null;
create index idx_promo_usage_code on public.promo_code_usages using btree ("promoCodeId");
create index idx_promo_usage_transaction on public.promo_code_usages using btree ("transactionId");
create index idx_promo_usage_user on public.promo_code_usages using btree ("userId");
create index idx_promo_codes_active on public.promo_codes using btree ("isActive", "expiresAt");
create index idx_promo_codes_code on public.promo_codes using btree (code);
create unique index unique_promo_code on public.promo_codes using btree (code);
create index "promo_codes_userId_isUsed_idx" on public.promo_codes using btree ("userId", "isUsed");
create index transactions_isguest_idx on public.transactions using btree ("isGuest");
create index transactions_paymentmethod_idx on public.transactions using btree ("paymentMethod");
create index transactions_stripe_paymentintent_idx on public.transactions using btree ("stripePaymentIntentId") where ("stripePaymentIntentId" is not null);
create index transactions_stripe_checkout_idx on public.transactions using btree ("stripeCheckoutSessionId") where ("stripeCheckoutSessionId" is not null);
create index transactions_paypal_order_idx on public.transactions using btree ("paypalOrderId") where ("paypalOrderId" is not null);
create index "transactions_userId_createdAt_idx" on public.transactions using btree ("userId", "createdAt" desc);
create index idx_transactions_promo on public.transactions using btree ("promoCodeId");
create index idx_user_activity_user_id on public.user_activity_logs using btree (user_id);
create index idx_user_activity_type on public.user_activity_logs using btree (activity_type);
create index idx_user_activity_created_at on public.user_activity_logs using btree (created_at desc);
create index users_email_idx on public.users using btree (email);
create index users_phone_idx on public.users using btree (phone);
create index users_uid_idx on public.users using btree (uid);
create index idx_wishlists_user_id on public.wishlists using btree (user_id);
create index idx_wishlists_product_id on public.wishlists using btree (product_id);
create index idx_wishlists_created_at on public.wishlists using btree (created_at desc);
create index idx_wishlists_user_created on public.wishlists using btree (user_id, created_at desc);

create or replace function public.get_total_revenue()
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.transactions
  where status = 'COMPLETED';
$$;

create or replace function public.get_monthly_revenue(month_start timestamp with time zone)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.transactions
  where status = 'COMPLETED'
    and "createdAt" >= month_start;
$$;

comment on function public.get_total_revenue() is 'Returns total revenue from completed transactions';
comment on function public.get_monthly_revenue(timestamp with time zone) is 'Returns revenue from completed transactions since the specified date';

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public."_ProductToTag" enable row level security;
alter table public.promo_codes enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.invoices enable row level security;
alter table public.promo_code_usages enable row level security;
alter table public.user_activity_logs enable row level security;
alter table public.wishlists enable row level security;
alter table public.site_settings enable row level security;

create policy "Public can read active categories"
  on public.categories for select
  to anon, authenticated
  using ("isActive" = true);

create policy "Public can read tags"
  on public.tags for select
  to anon, authenticated
  using (true);

create policy "Public can read active products"
  on public.products for select
  to anon, authenticated
  using ("isActive" = true);

create policy "Public can read active variants"
  on public.product_variants for select
  to anon, authenticated
  using (
    "isActive" = true
    and exists (
      select 1
      from public.products
      where products.id = product_variants."productId"
        and products."isActive" = true
    )
  );

create policy "Public can read product media"
  on public.product_media for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products
      where products.id = product_media."productId"
        and products."isActive" = true
    )
  );

create policy "Public can read product tags"
  on public."_ProductToTag" for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products
      where products.id = "_ProductToTag"."A"
        and products."isActive" = true
    )
  );

create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.categories, public.tags, public.products, public.product_variants, public.product_media, public."_ProductToTag", public.site_settings to anon, authenticated;
grant select, insert, update, delete on
  public.users,
  public.categories,
  public.tags,
  public.products,
  public.product_variants,
  public.product_media,
  public."_ProductToTag",
  public.promo_codes,
  public.transactions,
  public.transaction_items,
  public.invoices,
  public.promo_code_usages,
  public.user_activity_logs,
  public.wishlists,
  public.site_settings
to service_role;
revoke all on function public.get_total_revenue() from public, anon, authenticated;
revoke all on function public.get_monthly_revenue(timestamp with time zone) from public, anon, authenticated;
grant execute on function public.get_total_revenue() to service_role;
grant execute on function public.get_monthly_revenue(timestamp with time zone) to service_role;

commit;
