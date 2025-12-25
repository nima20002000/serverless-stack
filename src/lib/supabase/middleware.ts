import { type NextRequest, NextResponse } from 'next/server';

/**
 * Supabase session middleware
 *
 * NOTE: This is currently not used because we're using NextAuth.js instead of Supabase Auth.
 * Keeping this file for reference in case we migrate to Supabase Auth in the future.
 *
 * If you need to enable this, uncomment the code below and import createServerClient from @supabase/ssr
 */

export const updateSession = async (request: NextRequest) => {
  // For now, just pass through the request without Supabase session management
  // since we're using NextAuth.js for authentication
  const supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  return supabaseResponse;

  /* Uncomment this when migrating to Supabase Auth:

  import { createServerClient } from "@supabase/ssr";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseSecretKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if expired
  await supabase.auth.getUser();

  return supabaseResponse;
  */
};
