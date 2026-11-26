"use client";

/**
 * Notificación flotante tipo sistema operativo (Figma 29:55).
 * Abajo a la derecha en escritorio, arriba en móvil; no empuja el contenido; se cierra sola (~6 s) o con ✕.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

export interface Notificacion {
  id: number;
  titulo: string;
  descripcion?: string;
}

interface Ctx {
  notify: (titulo: string, descripcion?: string) => void;
}

const NotificationContext = createContext<Ctx | null>(null);

const DURACION_MS = 6000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Notificacion[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((titulo: string, descripcion?: string) => {
    const id = ++seq.current;
    setItems((prev) => {
      // Evita duplicar exactamente la misma notificación visible.
      if (prev.some((n) => n.titulo === titulo && n.descripcion === descripcion)) return prev;
      return [...prev.slice(-2), { id, titulo, descripcion }];
    });
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:items-end sm:px-0"
      >
        {items.map((n) => (
          <Toast key={n.id} n={n} onClose={() => dismiss(n.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

function Toast({ n, onClose }: { n: Notificacion; onClose: () => void }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const t = window.setTimeout(() => closeRef.current(), DURACION_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-[360px] flex-col gap-2 rounded-md border border-n-200 bg-surface p-4 shadow-toast"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-4 shrink-0 rounded-sm bg-brand" />
        <span className="flex-1 text-xs text-n-700">TraumaNet</span>
        <span className="text-xs text-n-600">ahora</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="-m-2 flex size-8 items-center justify-center rounded-sm text-n-600 hover:text-n-900"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      <p className="text-sm font-semibold text-n-900">{n.titulo}</p>
      {n.descripcion && <p className="text-sm text-n-700">{n.descripcion}</p>}
    </div>
  );
}

export function useNotify(): Ctx["notify"] {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotify debe usarse dentro de NotificationProvider");
  return ctx.notify;
}
