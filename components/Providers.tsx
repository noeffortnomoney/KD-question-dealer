"use client";

import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Toaster = dynamic(() => import("sonner").then((m) => ({ default: m.Toaster })), { ssr: false });

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SessionProvider>
      {children}
      {mounted && <Toaster richColors position="top-right" />}
    </SessionProvider>
  );
}
