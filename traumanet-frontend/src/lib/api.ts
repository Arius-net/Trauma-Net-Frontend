/** Cliente HTTP exclusivo hacia la API FastAPI de TraumaNet (con JWT Bearer). */

import type {
  CascadeDerivationResponse,
  DispatchEvaluateResponse,
  EstadoVia,
  ExpedienteFRAPResponse,
  FrapListItem,
  HealthResponse,
  HospitalCapacityResponse,
  NetworkOverviewResponse,
  ProtocoloCodigo,
  RecursoResumen,
  ReservaActionResponse,
  ReservaHospitalItem,
  TipoRecurso,
  TokenResponse,
  TramoUpdateResponse,
  UserProfile,
} from "@/types/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function extractErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.mensaje === "string") return obj.mensaje;
    if (typeof obj.detail === "string") return obj.detail;
    if (Array.isArray(obj.detail)) {
      return obj.detail
        .map((item) => {
          if (item && typeof item === "object") {
            const d = item as Record<string, unknown>;
            const loc = Array.isArray(d.loc) ? d.loc.join(".") : "";
            return `${loc ? `${loc}: ` : ""}${String(d.msg ?? "Error de validación")}`;
          }
          return String(item);
        })
        .join(" | ");
    }
  }
  return `Error HTTP ${status}`;
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      `No se pudo conectar con la API de TraumaNet (${API_BASE_URL}). Verifique que FastAPI esté corriendo.`,
      null
    );
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(res.status, parsed), parsed);
  }
  return parsed as T;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  login: (nombre_usuario: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: { nombre_usuario, password },
    }),

  me: (token: string) => request<UserProfile>("/auth/me", { token }),

  getNetworkHospitals: (token: string) =>
    request<NetworkOverviewResponse>("/network/hospitals", { token }),

  getCascade: (token: string, hospitalSaturadoId: number, protocolo: ProtocoloCodigo) =>
    request<CascadeDerivationResponse>(
      `/network/cascade?hospital_saturado_id=${hospitalSaturadoId}&protocolo_codigo=${encodeURIComponent(protocolo)}`,
      { token }
    ),

  updateTramo: (token: string, tramoId: string, estado_via: EstadoVia) =>
    request<TramoUpdateResponse>(`/network/tramos/${encodeURIComponent(tramoId)}`, {
      method: "PATCH",
      token,
      body: { estado_via },
    }),

  evaluateAndAssign: (token: string, payload: Record<string, unknown>) =>
    request<DispatchEvaluateResponse>("/dispatch/evaluate-and-assign", {
      method: "POST",
      token,
      body: payload,
    }),

  getHospitalCapacity: (token: string, hospitalId: number) =>
    request<HospitalCapacityResponse>(`/hospitals/${hospitalId}/capacity`, { token }),

  updateHospitalCapacity: (
    token: string,
    hospitalId: number,
    payload: { tipo_recurso: TipoRecurso; total: number; ocupados: number }
  ) =>
    request<RecursoResumen>(`/hospitals/${hospitalId}/capacity`, {
      method: "PUT",
      token,
      body: payload,
    }),

  getHospitalReservas: (token: string, hospitalId: number) =>
    request<ReservaHospitalItem[]>(`/hospitals/${hospitalId}/reservas`, { token }),

  confirmReserva: (token: string, reservaId: string) =>
    request<ReservaActionResponse>(`/reservas/${encodeURIComponent(reservaId)}/confirm`, {
      method: "POST",
      token,
    }),

  expireOverdueReservas: (token: string) =>
    request<{ reservas_expiradas: number }>("/reservas/expire-overdue", {
      method: "POST",
      token,
    }),

  listExpedientes: (
    token: string,
    filters: { estado_frap?: string; tipo_incidente?: string; limit?: number } = {}
  ) => {
    const params = new URLSearchParams();
    if (filters.estado_frap) params.set("estado_frap", filters.estado_frap);
    if (filters.tipo_incidente) params.set("tipo_incidente", filters.tipo_incidente);
    if (filters.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return request<FrapListItem[]>(`/expedientes${qs ? `?${qs}` : ""}`, { token });
  },

  getExpediente: (token: string, frapId: string) =>
    request<ExpedienteFRAPResponse>(`/expedientes/${encodeURIComponent(frapId)}`, { token }),
};

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export function formatVintageAge(iso: string | null | undefined): string {
  if (!iso) return "sin dato";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  return `hace ${hrs}h ${min % 60}m`;
}
