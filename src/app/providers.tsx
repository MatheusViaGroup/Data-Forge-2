"use client";

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { DataStoreProvider } from "@/contexts/DataStoreContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <DataStoreProvider>
          {children}
        </DataStoreProvider>
      </SidebarProvider>
    </SessionProvider>
  );
}
