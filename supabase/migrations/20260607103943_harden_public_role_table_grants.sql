begin;

revoke all privileges on all tables in schema public from anon, authenticated;

grant select on
  public.categories,
  public.tags,
  public.products,
  public.product_variants,
  public.product_media,
  public."_ProductToTag",
  public.site_settings
to anon, authenticated;

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

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;

alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;

do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on tables from anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on sequences from anon, authenticated';
  execute 'alter default privileges for role supabase_admin revoke execute on functions from public, anon, authenticated';
exception
  when insufficient_privilege then
    raise warning 'Could not harden supabase_admin-owned public default privileges. Run the manual hardening SQL in tests/docs/database-contract-checks.md from the Supabase dashboard or another role allowed to alter supabase_admin defaults.';
  when undefined_object then
    raise warning 'supabase_admin role is not present; skipped supabase_admin-owned public default privilege hardening.';
end $$;

revoke all on function public.get_total_revenue() from public, anon, authenticated;
revoke all on function public.get_monthly_revenue(timestamp with time zone) from public, anon, authenticated;
grant execute on function public.get_total_revenue() to service_role;
grant execute on function public.get_monthly_revenue(timestamp with time zone) to service_role;

notify pgrst, 'reload schema';

commit;
