"use client";

import { NotificationProvider } from "@/components/Notifications";
import { SessionProvider } from "@/lib/session";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <SessionProvider>{children}</SessionProvider>
    </NotificationProvider>
  );
}
