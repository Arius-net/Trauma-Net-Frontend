"use client";

/** Estados completos de vista: cargando, vacío, error de red con «Reintentar», sin permiso. */
import Link from "next/link";
import { Lock, WifiOff } from "lucide-react";
import type { ApiError } from "@/lib/api";
import type { Query } from "@/lib/useQuery";
import { Alert, Button, TableSkeleton } from "@/components/ui";

export function SinPermiso({ mensaje }: { mensaje?: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-3 rounded-lg border border-n-200 bg-surface p-6">
      <Lock className="size-6 text-n-700" aria-hidden />
      <h2 className="font-cond text-xl font-semibold text-n-900">Sin permiso</h2>
      <p className="text-sm text-n-700">
        {mensaje ?? "Tu rol no tiene acceso a esta información. Si crees que es un error, avisa al CRUM."}
      </p>
      <Link href="/" className="text-sm font-semibold text-link underline-offset-2 hover:underline">
        Ir a mi vista inicial
      </Link>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const titulo =
    error.kind === "network"
      ? "No se pudo conectar con TraumaNet"
      : error.kind === "not_found"
        ? "No encontrado"
        : error.kind === "unavailable"
          ? "Servicio no disponible"
          : "No se pudo cargar la información";
  return (
    <Alert icon={<WifiOff className="size-5" aria-hidden />} title={titulo} role="alert">
      <p>{error.message}</p>
      {onRetry && error.kind !== "not_found" && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </Alert>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-n-300 bg-surface px-4 py-8 text-center text-sm text-n-700">
      {children}
    </div>
  );
}

/** Renderiza los estados de una consulta y, si hay datos, delega en children. */
export function QueryView<T>({
  query,
  skeletonCols = 5,
  skeletonRows = 5,
  skeleton,
  children,
}: {
  query: Query<T>;
  skeletonCols?: number;
  skeletonRows?: number;
  skeleton?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (query.error) {
    if (query.error.kind === "forbidden") return <SinPermiso mensaje={query.error.message} />;
    if (query.error.kind === "unauthorized") return null;
    return <ErrorState error={query.error} onRetry={query.reload} />;
  }
  if (query.data === undefined) {
    return <>{skeleton ?? <TableSkeleton cols={skeletonCols} rows={skeletonRows} />}</>;
  }
  return <>{children(query.data)}</>;
}
