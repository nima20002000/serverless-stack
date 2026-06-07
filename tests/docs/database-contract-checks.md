# Database Contract Checks

`NIM-161` adds automated integration coverage for RLS, grants, constraints,
revenue RPC permissions, and schema invariants. The automated migration hardens
objects and default privileges owned by the normal migration role (`postgres`).

Hosted Supabase projects can also contain `public` default privileges owned by
`supabase_admin`. The repository migration attempts to revoke those defaults,
but some database connections are not allowed to alter that role. If the
migration emits a `supabase_admin-owned public default privileges` warning, run
this SQL from the Supabase dashboard SQL editor or another role allowed to alter
`supabase_admin` defaults:

```sql
alter default privileges for role supabase_admin in schema public
  revoke all privileges on tables from anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke all privileges on sequences from anon, authenticated;

alter default privileges for role supabase_admin
  revoke execute on functions from public, anon, authenticated;
```

Verify no unsafe `public` defaults remain for `anon` or `authenticated`:

```sql
select owner.rolname as owner,
       coalesce(namespace.nspname, '-') as schema,
       defaults.defaclobjtype,
       coalesce(grantee.rolname, 'PUBLIC') as grantee,
       acl.privilege_type
from pg_default_acl defaults
join pg_roles owner on owner.oid = defaults.defaclrole
left join pg_namespace namespace on namespace.oid = defaults.defaclnamespace
cross join lateral aclexplode(defaults.defaclacl) as acl
left join pg_roles grantee on grantee.oid = acl.grantee
where (namespace.nspname = 'public' or defaults.defaclnamespace = 0)
  and coalesce(grantee.rolname, 'PUBLIC') in ('PUBLIC', 'anon', 'authenticated')
order by owner.rolname, schema, defaults.defaclobjtype, grantee, acl.privilege_type;
```

Rows for `supabase_admin` in `storage` or `auth` schemas are platform-owned and
outside this repository's public Data API contract.
