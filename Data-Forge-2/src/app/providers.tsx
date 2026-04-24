"use client";

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { DataStoreProvider } from "@/contexts/DataStoreContext";
import SessionGuard from "@/components/SessionGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <SidebarProvider>
        <DataStoreProvider>
          <SessionGuard>
            {children}
          </SessionGuard>
        </DataStoreProvider>
      </SidebarProvider>
    </SessionProvider>
  );
}
