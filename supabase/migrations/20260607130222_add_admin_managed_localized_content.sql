begin;

create table public.supported_languages (
  code text primary key,
  label text not null,
  "nativeLabel" text not null,
  direction text not null default 'ltr',
  "isEnabled" boolean not null default false,
  "isDefault" boolean not null default false,
  "sortOrder" integer not null default 0,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null default current_timestamp,
  constraint supported_languages_code_format check (code ~ '^[a-z]{2}(-[a-z]{2})?$'),
  constraint supported_languages_code_lowercase check (code = lower(code)),
  constraint supported_languages_direction_check check (direction in ('ltr', 'rtl')),
  constraint supported_languages_default_enabled_check check (not "isDefault" or "isEnabled")
);

create unique index supported_languages_single_default
  on public.supported_languages ("isDefault")
  where "isDefault" = true;

create index idx_supported_languages_enabled_order
  on public.supported_languages ("isEnabled", "sortOrder", code);

create table public.product_translations (
  "productId" text not null references public.products(id) on delete cascade,
  locale text not null references public.supported_languages(code) on delete restrict,
  name text,
  description text,
  "seoTitle" text,
  "seoDescription" text,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null default current_timestamp,
  primary key ("productId", locale),
  constraint product_translations_has_content check (
    name is not null
    or description is not null
    or "seoTitle" is not null
    or "seoDescription" is not null
  )
);

create index idx_product_translations_locale_product
  on public.product_translations (locale, "productId");

create table public.product_media_translations (
  "mediaId" text not null references public.product_media(id) on delete cascade,
  locale text not null references public.supported_languages(code) on delete restrict,
  alt text,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null default current_timestamp,
  primary key ("mediaId", locale),
  constraint product_media_translations_has_content check (alt is not null)
);

create index idx_product_media_translations_locale_media
  on public.product_media_translations (locale, "mediaId");

create table public.category_translations (
  "categoryId" text not null references public.categories(id) on delete cascade,
  locale text not null references public.supported_languages(code) on delete restrict,
  name text,
  description text,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null default current_timestamp,
  primary key ("categoryId", locale),
  constraint category_translations_has_content check (
    name is not null
    or description is not null
  )
);

create index idx_category_translations_locale_category
  on public.category_translations (locale, "categoryId");

create table public.tag_translations (
  "tagId" text not null references public.tags(id) on delete cascade,
  locale text not null references public.supported_languages(code) on delete restrict,
  name text,
  description text,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null default current_timestamp,
  primary key ("tagId", locale),
  constraint tag_translations_has_content check (
    name is not null
    or description is not null
  )
);

create index idx_tag_translations_locale_tag
  on public.tag_translations (locale, "tagId");

create table public.site_setting_translations (
  key text not null references public.site_settings(key) on delete cascade,
  locale text not null references public.supported_languages(code) on delete restrict,
  value text not null,
  "createdAt" timestamp without time zone not null default current_timestamp,
  "updatedAt" timestamp without time zone not null default current_timestamp,
  primary key (key, locale)
);

create index idx_site_setting_translations_locale_key
  on public.site_setting_translations (locale, key);

insert into public.supported_languages (
  code,
  label,
  "nativeLabel",
  direction,
  "isEnabled",
  "isDefault",
  "sortOrder"
)
values
  ('en', 'English', 'English', 'ltr', true, true, 0),
  ('de', 'German', 'Deutsch', 'ltr', true, false, 10)
on conflict (code) do update
set
  label = excluded.label,
  "nativeLabel" = excluded."nativeLabel",
  direction = excluded.direction,
  "isEnabled" = excluded."isEnabled",
  "isDefault" = excluded."isDefault",
  "sortOrder" = excluded."sortOrder",
  "updatedAt" = current_timestamp;

create or replace function public.update_supported_languages(payload jsonb)
returns setof public.supported_languages
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(payload) <> 'array' then
    raise exception 'supported language payload must be a JSON array';
  end if;

  update public.supported_languages
  set "isDefault" = false,
      "updatedAt" = current_timestamp
  where code is not null;

  insert into public.supported_languages (
    code,
    label,
    "nativeLabel",
    direction,
    "isEnabled",
    "isDefault",
    "sortOrder",
    "updatedAt"
  )
  select
    code,
    label,
    "nativeLabel",
    direction,
    "isEnabled",
    "isDefault",
    "sortOrder",
    current_timestamp
  from jsonb_to_recordset(payload) as language_payload(
    code text,
    label text,
    "nativeLabel" text,
    direction text,
    "isEnabled" boolean,
    "isDefault" boolean,
    "sortOrder" integer
  )
  on conflict (code) do update
  set
    label = excluded.label,
    "nativeLabel" = excluded."nativeLabel",
    direction = excluded.direction,
    "isEnabled" = excluded."isEnabled",
    "isDefault" = excluded."isDefault",
    "sortOrder" = excluded."sortOrder",
    "updatedAt" = current_timestamp;

  return query
  select *
  from public.supported_languages
  order by "sortOrder", code;
end;
$$;

alter table public.supported_languages enable row level security;
alter table public.product_translations enable row level security;
alter table public.product_media_translations enable row level security;
alter table public.category_translations enable row level security;
alter table public.tag_translations enable row level security;
alter table public.site_setting_translations enable row level security;

create policy "Public can read enabled languages"
  on public.supported_languages for select
  to anon, authenticated
  using ("isEnabled" = true);

create policy "Public can read enabled active product translations"
  on public.product_translations for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.supported_languages
      where supported_languages.code = product_translations.locale
        and supported_languages."isEnabled" = true
    )
    and exists (
      select 1
      from public.products
      where products.id = product_translations."productId"
        and products."isActive" = true
    )
  );

create policy "Public can read enabled active product media translations"
  on public.product_media_translations for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.supported_languages
      where supported_languages.code = product_media_translations.locale
        and supported_languages."isEnabled" = true
    )
    and exists (
      select 1
      from public.product_media
      join public.products on products.id = product_media."productId"
      left join public.product_variants
        on product_variants.id = product_media."variantId"
      where product_media.id = product_media_translations."mediaId"
        and products."isActive" = true
        and (
          product_media."variantId" is null
          or product_variants."isActive" = true
        )
    )
  );

create policy "Public can read enabled active category translations"
  on public.category_translations for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.supported_languages
      where supported_languages.code = category_translations.locale
        and supported_languages."isEnabled" = true
    )
    and exists (
      select 1
      from public.categories
      where categories.id = category_translations."categoryId"
        and categories."isActive" = true
    )
  );

create policy "Public can read enabled tag translations"
  on public.tag_translations for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.supported_languages
      where supported_languages.code = tag_translations.locale
        and supported_languages."isEnabled" = true
    )
  );

create policy "Public can read enabled site setting translations"
  on public.site_setting_translations for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.supported_languages
      where supported_languages.code = site_setting_translations.locale
        and supported_languages."isEnabled" = true
    )
  );

grant select on
  public.supported_languages,
  public.product_translations,
  public.product_media_translations,
  public.category_translations,
  public.tag_translations,
  public.site_setting_translations
to anon, authenticated;

grant select, insert, update, delete on
  public.supported_languages,
  public.product_translations,
  public.product_media_translations,
  public.category_translations,
  public.tag_translations,
  public.site_setting_translations
to service_role;

revoke all on function public.update_supported_languages(jsonb)
from public, anon, authenticated;

grant execute on function public.update_supported_languages(jsonb)
to service_role;

notify pgrst, 'reload schema';

commit;
