"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { homeForRole, useSession } from "@/lib/session";

export default function HomePage() {
  const { user, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(user ? homeForRole(user.rol) : "/login");
  }, [ready, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-app text-sm text-n-700">
      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Cargando TraumaNet…
    </div>
  );
}
