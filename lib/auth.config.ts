import type { NextAuthConfig } from "next-auth";
import { toRole } from "@/lib/roles";

export const authConfig = {
  providers: [],
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = toRole(user.role);
        token.dealerId = user.dealerId ?? null;
        token.mustChangePassword = Boolean(user.mustChangePassword);
      }
      if (trigger === "update" && session) {
        if (session.mustChangePassword === false) token.mustChangePassword = false;
        if (typeof session.name === "string") token.name = session.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      session.user.role = toRole(token.role);
      session.user.dealerId = (token.dealerId as string | null | undefined) ?? null;
      session.user.mustChangePassword = Boolean(token.mustChangePassword);
      return session;
    },
  },
} satisfies NextAuthConfig;
