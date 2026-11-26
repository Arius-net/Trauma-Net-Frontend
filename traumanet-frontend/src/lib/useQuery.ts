"use client";

/** Lectura simple de la API con estados de carga/error y «Reintentar» manual (sin reintentos automáticos). */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, isApiError } from "@/lib/api";

export interface Query<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

/**
 * @param key identifica la consulta; si cambia se vuelve a pedir. `null` = no consultar.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>): Query<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(key !== null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (key === null) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((d) => {
        if (alive) setDataState(d);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(isApiError(e) ? e : new ApiError(-1, "Error inesperado", null));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater: (prev: T | undefined) => T | undefined) => {
    setDataState((prev) => updater(prev));
  }, []);

  return { data, error, loading, reload, setData };
}
