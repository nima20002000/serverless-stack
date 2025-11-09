import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

    // Protect admin routes
    if (isAdminRoute && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthRoute = req.nextUrl.pathname.startsWith("/login") ||
                           req.nextUrl.pathname.startsWith("/register");
        const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

        // Allow access to auth routes
        if (isAuthRoute) {
          return true;
        }

        // Require token for admin routes
        if (isAdminRoute) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};
