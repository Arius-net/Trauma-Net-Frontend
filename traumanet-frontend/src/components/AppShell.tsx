"use client";

/**
 * Layout con barra superior azul marino de 56 px y guard de rutas por rol.
 * CRUM: Consola CRUM, Panel de urgencias, Expedientes. Jefe: Panel de urgencias, Expedientes.
 * Paramédico: barra sin pestañas (logo + usuario) y el asistente.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { homeForRole, useSession } from "@/lib/session";
import { ROL_LABEL } from "@/lib/labels";
import { cx } from "@/components/ui";
import type { Rol } from "@/types/api";

const TABS: { href: string; label: string; roles: Rol[] }[] = [
  { href: "/crum", label: "Consola CRUM", roles: ["CRUM"] },
  { href: "/urgencias", label: "Panel de urgencias", roles: ["CRUM", "JEFE_URGENCIAS"] },
  { href: "/expedientes", label: "Expedientes", roles: ["CRUM", "JEFE_URGENCIAS"] },
];

export function Logo({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block size-6 shrink-0 rounded-sm bg-accent", className)} />;
}

export function AppShell({
  roles,
  children,
  narrow = false,
}: {
  roles: Rol[];
  children: React.ReactNode;
  /** Columna centrada (asistente y resultados del paramédico). */
  narrow?: boolean;
}) {
  const { user, ready, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = !!user && roles.includes(user.rol);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!roles.includes(user.rol)) router.replace(homeForRole(user.rol));
  }, [ready, user, roles, router]);

  if (!ready || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app text-sm text-n-700">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Cargando TraumaNet…
      </div>
    );
  }

  const tabs = TABS.filter((t) => t.roles.includes(user.rol));
  const isParamedico = user.rol === "PARAMEDICO";
  const userLabel = [user.nombre_usuario, ROL_LABEL[user.rol], user.hospital_nombre].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 bg-brand">
        <nav
          aria-label="Principal"
          className={cx("flex h-14 items-center gap-4 overflow-x-auto px-4 sm:px-6", !isParamedico && "lg:gap-8")}
        >
          <Link href="/" className="flex shrink-0 items-center gap-2 rounded-sm">
            <Logo className={isParamedico ? "max-sm:hidden" : undefined} />
            <span className="font-cond text-xl font-semibold leading-[26px] text-white">TraumaNet</span>
          </Link>

          {isParamedico ? (
            <span className="min-w-0 truncate text-sm text-on-nav max-sm:ml-auto max-sm:text-xs" title={userLabel}>
              {user.nombre_usuario}
              <span className="max-sm:hidden"> · {ROL_LABEL[user.rol]}</span>
            </span>
          ) : (
            <ul className="flex h-full shrink-0 items-stretch gap-1">
              {tabs.map((t) => {
                const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
                return (
                  <li key={t.href} className="flex">
                    <Link
                      href={t.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex items-center whitespace-nowrap border-b-[3px] px-4 text-sm",
                        active
                          ? "border-accent font-semibold text-white"
                          : "border-transparent text-on-nav hover:text-white"
                      )}
                    >
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex-1" />

          <div className="flex shrink-0 items-center gap-4">
            {!isParamedico && (
              <span className="max-w-[360px] truncate text-xs text-on-nav" title={userLabel}>
                {userLabel}
              </span>
            )}
            {isParamedico && pathname !== "/despacho" && (
              <Link href="/despacho" className="whitespace-nowrap text-sm text-on-nav hover:text-white max-sm:hidden">
                Nueva evaluación
              </Link>
            )}
            <button type="button" onClick={logout} className="rounded-sm text-sm font-semibold text-white hover:underline">
              Salir
            </button>
          </div>
        </nav>
      </header>
      <main id="contenido" className={cx("flex-1", narrow && "w-full")}>
        {children}
      </main>
    </div>
  );
}
