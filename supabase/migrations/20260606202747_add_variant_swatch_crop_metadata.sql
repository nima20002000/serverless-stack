alter table public.product_variants
  add column if not exists "swatchImageUrl" text,
  add column if not exists "swatchCrop" jsonb;

alter table public.product_variants
  add constraint product_variants_swatch_crop_shape
  check (
    "swatchCrop" is null
    or (
      jsonb_typeof("swatchCrop") = 'object'
      and ("swatchCrop" ? 'x')
      and ("swatchCrop" ? 'y')
      and ("swatchCrop" ? 'zoom')
      and jsonb_typeof("swatchCrop" -> 'x') = 'number'
      and jsonb_typeof("swatchCrop" -> 'y') = 'number'
      and jsonb_typeof("swatchCrop" -> 'zoom') = 'number'
      and (("swatchCrop" ->> 'x')::numeric between 0 and 100)
      and (("swatchCrop" ->> 'y')::numeric between 0 and 100)
      and (("swatchCrop" ->> 'zoom')::numeric between 1 and 4)
    )
  );
