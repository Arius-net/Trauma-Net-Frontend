/**
 * Cliente tipado único hacia la API FastAPI de TraumaNet (/api/v1, JWT Bearer).
 *
 * - Adjunta el JWT de la sesión vigente.
 * - Normaliza errores en ApiError.kind (401 → logout global, 403, 404, 409, 503, red caída).
 * - Nunca reintenta automáticamente; menos aún POST/PUT/PATCH.
 * - Con NEXT_PUBLIC_USE_MOCKS=true responde con datos de ejemplo (src/lib/mocks.ts).
 */
import type {
  CapacityUpdateRequest,
  CascadeDerivationResponse,
  DispatchEvaluateRequest,
  DispatchEvaluateResponse,
  EstadoVia,
  ExpedienteFiltros,
  ExpedienteFRAPResponse,
  ExpireReservationsResponse,
  FrapDocumento,
  HospitalCapacityResponse,
  NetworkOverviewResponse,
  ProtocoloCodigo,
  RecursoResumen,
  ReservaActionResponse,
  ReservaHospitalItem,
  TokenResponse,
  TramoUpdateResponse,
  UserProfile,
} from "@/types/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000/api/v1";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export type ApiErrorKind =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "unavailable"
  | "other";

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    this.kind =
      status === 0
        ? "network"
        : status === 401
          ? "unauthorized"
          : status === 403
            ? "forbidden"
            : status === 404
              ? "not_found"
              : status === 409
                ? "conflict"
                : status === 422
                  ? "validation"
                  : status === 503
                    ? "unavailable"
                    : "other";
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Mensaje legible a partir del cuerpo de error de FastAPI. */
function extractMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.mensaje === "string") return obj.mensaje;
    if (typeof obj.detail === "string") return obj.detail;
    if (Array.isArray(obj.detail)) {
      return obj.detail
        .map((item) => {
          if (item && typeof item === "object") {
            const d = item as Record<string, unknown>;
            const loc = Array.isArray(d.loc) ? d.loc.filter((x) => x !== "body").join(".") : "";
            return `${loc ? `${loc}: ` : ""}${String(d.msg ?? "Dato inválido")}`;
          }
          return String(item);
        })
        .join(" · ");
    }
  }
  if (status === 0) return "No hay conexión con el servidor de TraumaNet.";
  return `Error HTTP ${status}`;
}

/* ---------- Configuración de sesión (la inyecta SessionProvider) ---------- */
type Hooks = {
  getToken: () => string | null;
  onUnauthorized: () => void;
  onNetworkError: () => void;
};

let hooks: Hooks = {
  getToken: () => null,
  onUnauthorized: () => undefined,
  onNetworkError: () => undefined,
};

export function configureApi(next: Hooks): void {
  hooks = next;
}

export interface RawResponse {
  status: number;
  body: unknown;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = hooks.getToken();
  let raw: RawResponse;

  if (USE_MOCKS) {
    const { mockRequest } = await import("@/lib/mocks");
    raw = await mockRequest(method, path, body, token);
  } else {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
    } catch {
      hooks.onNetworkError();
      throw new ApiError(0, extractMessage(0, null), null);
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
    raw = { status: res.status, body: parsed };
  }

  if (raw.status >= 200 && raw.status < 300) return raw.body as T;

  const err = new ApiError(raw.status, extractMessage(raw.status, raw.body), raw.body);
  // 401 fuera del login = token vencido o inválido → cerrar sesión global.
  if (err.kind === "unauthorized" && path !== "/auth/login") hooks.onUnauthorized();
  throw err;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  /* Auth */
  login: (nombre_usuario: string, password: string) =>
    request<TokenResponse>("POST", "/auth/login", { nombre_usuario, password }),
  me: () => request<UserProfile>("GET", "/auth/me"),

  /* Despacho (Decisión 1) — crea un FRAP nuevo en cada llamada. */
  evaluateAndAssign: (payload: DispatchEvaluateRequest) =>
    request<DispatchEvaluateResponse>("POST", "/dispatch/evaluate-and-assign", payload),

  /* Red y vías */
  networkHospitals: () => request<NetworkOverviewResponse>("GET", "/network/hospitals"),
  cascade: (hospital_saturado_id: number, protocolo_codigo: ProtocoloCodigo) =>
    request<CascadeDerivationResponse>(
      "GET",
      `/network/cascade${qs({ hospital_saturado_id, protocolo_codigo })}`
    ),
  updateTramo: (tramoId: string, estado_via: EstadoVia) =>
    request<TramoUpdateResponse>("PATCH", `/network/tramos/${encodeURIComponent(tramoId)}`, {
      estado_via,
    }),

  /* Capacidad y reservas */
  capacity: (hospitalId: number) =>
    request<HospitalCapacityResponse>("GET", `/hospitals/${hospitalId}/capacity`),
  updateCapacity: (hospitalId: number, payload: CapacityUpdateRequest) =>
    request<RecursoResumen>("PUT", `/hospitals/${hospitalId}/capacity`, payload),
  reservas: (hospitalId: number) =>
    request<ReservaHospitalItem[]>("GET", `/hospitals/${hospitalId}/reservas`),
  confirmReserva: (reservaId: string) =>
    request<ReservaActionResponse>("POST", `/reservas/${encodeURIComponent(reservaId)}/confirm`),
  expireOverdue: () => request<ExpireReservationsResponse>("POST", "/reservas/expire-overdue"),

  /* Expedientes */
  expedientes: (f: ExpedienteFiltros = {}) =>
    request<FrapDocumento[]>(
      "GET",
      `/expedientes${qs({ estado_frap: f.estado_frap, tipo_incidente: f.tipo_incidente, limit: f.limit })}`
    ),
  expediente: (frapId: string) =>
    request<ExpedienteFRAPResponse>("GET", `/expedientes/${encodeURIComponent(frapId)}`),
};
