"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { homeRouteForRole, useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else {
      router.replace(homeRouteForRole(user.rol));
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
        <Activity className="h-5 w-5 animate-pulse text-cyan-600" />
        Cargando TraumaNet...
      </div>
    </div>
  );
}
