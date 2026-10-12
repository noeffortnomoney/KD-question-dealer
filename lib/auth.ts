import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { toRole } from "@/lib/roles";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            status: true,
            dealerId: true,
            mustChangePassword: true,
            failedLoginCount: true,
            lockedUntil: true,
            dealer: { select: { status: true } },
          },
        });

        if (!user || !user.passwordHash) return null;
        if (user.status !== "active") return null;
        if (user.dealer && user.dealer.status !== "active") return null;

        const now = new Date();
        if (user.lockedUntil && user.lockedUntil > now) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          const failed = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data:
              failed >= MAX_FAILED_LOGINS
                ? { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) }
                : { failedLoginCount: failed },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: toRole(user.role),
          dealerId: user.dealerId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
