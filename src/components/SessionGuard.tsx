"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/login", "/trocar-senha"];

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated" && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
      return;
    }

    if (
      status === "authenticated" &&
      session?.user?.mustChangePassword &&
      pathname !== "/trocar-senha"
    ) {
      router.replace("/trocar-senha");
    }
  }, [status, pathname, router, session?.user?.mustChangePassword]);

  // Enquanto verifica, não renderiza nada em rotas protegidas
  if (status === "loading" && !PUBLIC_PATHS.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
