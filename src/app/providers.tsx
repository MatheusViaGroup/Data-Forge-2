"use client";

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { DataStoreProvider } from "@/contexts/DataStoreContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import SessionGuard from "@/components/SessionGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <ThemeProvider>
        <SidebarProvider>
          <DataStoreProvider>
            <SessionGuard>
              {children}
            </SessionGuard>
          </DataStoreProvider>
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

