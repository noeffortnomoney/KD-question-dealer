import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { canAccessPath, homePathFor, toRole } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isLoginPage = pathname === "/login";

  if (!req.auth?.user) {
    if (isLoginPage) return;
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = toRole(req.auth.user.role);

  if (req.auth.user.mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  if (isLoginPage || pathname === "/") {
    return NextResponse.redirect(new URL(homePathFor(role), req.url));
  }

  if (!canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL(homePathFor(role), req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|images).*)"],
};
