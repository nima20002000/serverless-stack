insert into public.categories (id, name, slug, description, image, "isActive", "updatedAt")
values
  (
    'seed-category-home',
    'Home Goods',
    'home-goods',
    'Neutral starter category for local demos.',
    '/images/seed/home-goods.svg',
    true,
    now()
  ),
  (
    'seed-category-accessories',
    'Accessories',
    'accessories',
    'Small catalog items for checkout testing.',
    '/images/seed/accessories.svg',
    true,
    now()
  )
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  image = excluded.image,
  "isActive" = excluded."isActive",
  "updatedAt" = excluded."updatedAt";

insert into public.tags (id, name, slug, "updatedAt")
values
  ('seed-tag-featured', 'Featured', 'featured', now()),
  ('seed-tag-new', 'New Arrival', 'new-arrival', now())
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  "updatedAt" = excluded."updatedAt";

insert into public.products (
  id,
  name,
  description,
  price,
  stock,
  images,
  "categoryId",
  "isActive",
  "isFeatured",
  "discountPercent",
  "displayOrder",
  "hasVariants",
  "updatedAt"
)
values
  (
    'seed-product-desk-lamp',
    'Desk Lamp',
    'A neutral demo product for catalog, cart, and checkout flows.',
    49.00,
    25,
    array['/images/seed/desk-lamp.svg'],
    'seed-category-home',
    true,
    true,
    null,
    10,
    false,
    now()
  ),
  (
    'seed-product-canvas-tote',
    'Canvas Tote',
    'A second demo product with simple inventory.',
    24.00,
    50,
    array['/images/seed/canvas-tote.svg'],
    'seed-category-accessories',
    true,
    false,
    10,
    20,
    false,
    now()
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  stock = excluded.stock,
  images = excluded.images,
  "categoryId" = excluded."categoryId",
  "isActive" = excluded."isActive",
  "isFeatured" = excluded."isFeatured",
  "discountPercent" = excluded."discountPercent",
  "displayOrder" = excluded."displayOrder",
  "hasVariants" = excluded."hasVariants",
  "updatedAt" = excluded."updatedAt";

insert into public."_ProductToTag" ("A", "B")
values
  ('seed-product-desk-lamp', 'seed-tag-featured'),
  ('seed-product-canvas-tote', 'seed-tag-new')
on conflict ("A", "B") do nothing;

insert into public.promo_codes (
  id,
  code,
  "expiresAt",
  "discountType",
  "discountValue",
  description,
  "isActive"
)
values (
  'seed-promo-welcome10',
  'WELCOME10',
  now() + interval '30 days',
  'PERCENT',
  10,
  'Demo promo code for local checkout testing.',
  true
)
on conflict (id) do update
set
  code = excluded.code,
  "expiresAt" = excluded."expiresAt",
  "discountType" = excluded."discountType",
  "discountValue" = excluded."discountValue",
  description = excluded.description,
  "isActive" = excluded."isActive";
