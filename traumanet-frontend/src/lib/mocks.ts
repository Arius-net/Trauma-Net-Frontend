/**
 * Modo de datos de ejemplo (NEXT_PUBLIC_USE_MOCKS=true). Solo para probar la interfaz sin backend.
 * Reproduce el contrato de /api/v1 con los datos sintéticos del diseño y del seed:
 * 8 hospitales, 3 tramos y los expedientes 65f…001 y 65f…002.
 *
 * - Login: cualquier usuario sintético del seed con contraseña de ≥ 6 caracteres.
 * - Despacho: «intoxicacion_quemaduras» devuelve 409 (sin asignación) para probar esa vista;
 *   el resto asigna HOSP-01.
 */
import type { RawResponse } from "@/lib/api";
import type {
  ConexionResumen,
  DispatchEvaluateRequest,
  DispatchEvaluateResponse,
  EstadoVia,
  FrapDocumento,
  HospitalRedItem,
  RecursoResumen,
  ReservaHospitalItem,
  Rol,
  TipoRecurso,
  TrasladoExpediente,
  UserProfile,
} from "@/types/api";

const DELAY = 350;
const NOTICE =
  "TraumaNet apoya la decisión; no decide ni sustituye el criterio clínico del regulador médico del CRUM.";

const now = () => new Date();
const iso = (d: Date) => d.toISOString();
const minAgo = (m: number) => iso(new Date(Date.now() - m * 60000));
const minAhead = (m: number) => iso(new Date(Date.now() + m * 60000));

/* ---------- Hospitales ---------- */
type H = Omit<HospitalRedItem, "recursos" | "conexiones"> & {
  cap: Record<TipoRecurso, [number, number, number]>; // total, ocupados, reservados
};

const HOSP: H[] = [
  { hospital_id: 1, clave: "HOSP-01", nombre: "Hospital General «Dr. Rafael Pascacio Gamboa»", municipio: "Tuxtla Gutiérrez", zona: "tuxtla", nivel_atencion: 3, especialidades: ["NEUROCIRUGIA", "CIRUGIA_GENERAL", "CARDIOLOGIA"], equipos_operativos: ["TAC", "HEMODINAMIA"], cap: { cama_uci: [12, 9, 0], quirofano: [4, 2, 1], sala_choque: [3, 1, 0] } },
  { hospital_id: 2, clave: "HOSP-02", nombre: "Hospital de Especialidades «Vida Mejor»", municipio: "Tuxtla Gutiérrez", zona: "tuxtla", nivel_atencion: 3, especialidades: ["NEUROCIRUGIA", "CARDIOLOGIA"], equipos_operativos: ["TAC"], cap: { cama_uci: [8, 6, 1], quirofano: [3, 1, 0], sala_choque: [2, 1, 0] } },
  { hospital_id: 3, clave: "HOSP-03", nombre: "IMSS Hospital General de Zona, Tuxtla", municipio: "Tuxtla Gutiérrez", zona: "tuxtla", nivel_atencion: 2, especialidades: ["CIRUGIA_GENERAL"], equipos_operativos: ["TAC"], cap: { cama_uci: [6, 4, 0], quirofano: [2, 1, 0], sala_choque: [2, 0, 0] } },
  { hospital_id: 4, clave: "HOSP-04", nombre: "ISSSTE Hospital General, Tuxtla", municipio: "Tuxtla Gutiérrez", zona: "tuxtla", nivel_atencion: 2, especialidades: ["CIRUGIA_GENERAL"], equipos_operativos: [], cap: { cama_uci: [4, 4, 0], quirofano: [2, 2, 0], sala_choque: [1, 0, 0] } },
  { hospital_id: 5, clave: "HOSP-05", nombre: "Hospital General «Hospital de las Culturas»", municipio: "San Cristóbal de Las Casas", zona: "san_cristobal", nivel_atencion: 2, especialidades: ["CIRUGIA_GENERAL"], equipos_operativos: ["TAC"], cap: { cama_uci: [5, 3, 0], quirofano: [2, 0, 0], sala_choque: [2, 1, 0] } },
  { hospital_id: 6, clave: "HOSP-06", nombre: "IMSS Hospital General de Zona, San Cristóbal", municipio: "San Cristóbal de Las Casas", zona: "san_cristobal", nivel_atencion: 2, especialidades: ["CIRUGIA_GENERAL"], equipos_operativos: [], cap: { cama_uci: [2, 1, 0], quirofano: [1, 1, 0], sala_choque: [1, 0, 0] } },
  { hospital_id: 7, clave: "HOSP-07", nombre: "Hospital General «Dr. Belisario Domínguez»", municipio: "Comitán de Domínguez", zona: "comitan", nivel_atencion: 2, especialidades: ["CIRUGIA_GENERAL"], equipos_operativos: ["TAC"], cap: { cama_uci: [3, 2, 0], quirofano: [2, 0, 0], sala_choque: [1, 0, 0] } },
  { hospital_id: 8, clave: "HOSP-08", nombre: "IMSS Hospital General de Zona, Comitán", municipio: "Comitán de Domínguez", zona: "comitan", nivel_atencion: 2, especialidades: ["CIRUGIA_GENERAL"], equipos_operativos: [], cap: { cama_uci: [2, 0, 0], quirofano: [1, 0, 0], sala_choque: [1, 0, 0] } },
];

const TRAMOS: Record<string, { estado: EstadoVia; zonas: [string, string]; tiempo: number; margen: number; km: number }> = {
  "T-TUX-SCLC": { estado: "normal", zonas: ["tuxtla", "san_cristobal"], tiempo: 75, margen: 12, km: 62 },
  "T-SCLC-COM": { estado: "demora", zonas: ["san_cristobal", "comitan"], tiempo: 80, margen: 15, km: 88 },
  "T-TUX-COM": { estado: "normal", zonas: ["tuxtla", "comitan"], tiempo: 150, margen: 25, km: 160 },
};

const recursoId = (h: number, t: TipoRecurso) => h * 10 + (t === "cama_uci" ? 1 : t === "quirofano" ? 2 : 3);

function recursos(h: H): RecursoResumen[] {
  return (Object.keys(h.cap) as TipoRecurso[]).map((t) => {
    const [total, ocupados, reservados] = h.cap[t];
    return {
      recurso_id: recursoId(h.hospital_id, t),
      tipo_recurso: t,
      total,
      ocupados,
      reservados,
      disponibles: total - ocupados - reservados,
      actualizado_en: minAgo(1),
    };
  });
}

function conexiones(h: H): ConexionResumen[] {
  const out: ConexionResumen[] = [];
  for (const o of HOSP) {
    if (o.hospital_id === h.hospital_id) continue;
    if (o.zona === h.zona) {
      out.push({ destino_hospital_id: o.hospital_id, destino_nombre: o.nombre, tramo_id: `T-LOCAL-${h.zona}`, distancia_km: 6, tiempo_min: 15, incertidumbre_min: 3, estado_via: "normal" });
      continue;
    }
    for (const [id, t] of Object.entries(TRAMOS)) {
      if (t.zonas.includes(h.zona) && t.zonas.includes(o.zona)) {
        out.push({ destino_hospital_id: o.hospital_id, destino_nombre: o.nombre, tramo_id: id, distancia_km: t.km, tiempo_min: t.tiempo, incertidumbre_min: t.margen, estado_via: t.estado });
      }
    }
  }
  return out;
}

/* ---------- Usuarios ---------- */
function userFor(nombre: string): UserProfile | null {
  if (nombre === "crum_sintetico_01") return { usuario_id: 1, nombre_usuario: nombre, rol: "CRUM", hospital_id: null, hospital_nombre: null };
  const p = /^paramedico_sint_0([12])$/.exec(nombre);
  if (p) return { usuario_id: 1 + Number(p[1]), nombre_usuario: nombre, rol: "PARAMEDICO", hospital_id: null, hospital_nombre: null };
  const j = /^jefe_urg_h([1-8])$/.exec(nombre);
  if (j) {
    const h = HOSP[Number(j[1]) - 1];
    return { usuario_id: 3 + Number(j[1]), nombre_usuario: nombre, rol: "JEFE_URGENCIAS", hospital_id: h.hospital_id, hospital_nombre: h.nombre };
  }
  return null;
}

function userFromToken(token: string | null): UserProfile | null {
  if (!token?.startsWith("mock.")) return null;
  return userFor(token.slice(5));
}

/* ---------- Expedientes y reservas ---------- */
const FRAPS: FrapDocumento[] = [
  {
    frap_id: "65f000000000000000000001", schema_version: "1.0", tipo_incidente: "politrauma", protocolo_codigo: "PT-POLITRAUMA", estado_frap: "asignado",
    paciente_sintetico: { id_sintetico: "SYN-48KD2M", sexo: "M", grupo_edad: "adulto" },
    ubicacion_escena: { municipio: "Tuxtla Gutiérrez", latitud: 16.753, longitud: -93.115, referencia: "Libramiento Norte, altura del km 12" },
    triage: { nivel: "rojo", evaluado_en: minAgo(8) },
    signos_vitales: [
      { medido_en: minAgo(10), fc: 118, fr: 24, ta_sistolica: 90, ta_diastolica: 60, spo2: 93, temperatura_c: 36.4 },
      { medido_en: minAgo(4), fc: 110, fr: 22, ta_sistolica: 100, ta_diastolica: 65, spo2: 95 },
    ],
    ambulancia_id: 1,
    perfil: { tipo: "politrauma", mecanismo_lesion: "colision_vehicular", hemorragia_activa: true, torniquete_aplicado: false, requiere_quirofano_sospechado: true, iss_estimado: 25, lesiones: [{ region: "abdomen", tipo_lesion: "hemoperitoneo", ais: 4 }, { region: "pelvis", tipo_lesion: "fractura", ais: 3 }] },
    creado_en: minAgo(7), actualizado_en: minAgo(7), hospital_destino_id: 1, traslado_id: "a1b2c3d4-0000-4000-8000-000000000001",
  },
  {
    frap_id: "65f000000000000000000002", schema_version: "1.0", tipo_incidente: "infarto_agudo", protocolo_codigo: "PT-IAM", estado_frap: "sin_asignacion",
    paciente_sintetico: { id_sintetico: "SYN-91QX7A", sexo: "F", grupo_edad: "adulto_mayor" },
    ubicacion_escena: { municipio: "San Cristóbal de Las Casas", latitud: 16.737, longitud: -92.638 },
    triage: { nivel: "rojo", evaluado_en: minAgo(13) },
    signos_vitales: [{ medido_en: minAgo(14), fc: 104, fr: 20, ta_sistolica: 150, ta_diastolica: 92, spo2: 94, glucosa_mgdl: 160 }],
    perfil: { tipo: "infarto_agudo", ecg: { elevacion_st: true, derivaciones_afectadas: ["II", "III", "aVF"], ritmo: "sinusal" }, killip: 2, inicio_dolor_min: 45, trombolisis_aplicada: false, troponina_rapida_positiva: true },
    creado_en: minAgo(12), actualizado_en: minAgo(12),
    motivo_sin_asignacion: "sin_disponibilidad: ningún hospital compatible con guardia activa cuenta con cama_uci disponible",
  },
  {
    frap_id: "65f0000000000000000000c4", schema_version: "1.0", tipo_incidente: "trauma_craneoencefalico", protocolo_codigo: "PT-TCE", estado_frap: "evaluando",
    paciente_sintetico: { id_sintetico: "SYN-K3M8P1", sexo: "M", grupo_edad: "adulto" },
    ubicacion_escena: { municipio: "Tuxtla Gutiérrez", latitud: 16.75, longitud: -93.12 },
    triage: { nivel: "amarillo", evaluado_en: minAgo(19) },
    signos_vitales: [{ medido_en: minAgo(19), fc: 92, fr: 18, ta_sistolica: 130, ta_diastolica: 80, spo2: 97 }],
    perfil: { tipo: "trauma_craneoencefalico", glasgow: { ocular: 3, verbal: 4, motor: 6, total: 13 }, pupilas: { izquierda_mm: 3, derecha_mm: 3, reactivas: true } },
    creado_en: minAgo(18), actualizado_en: minAgo(18),
  },
  {
    frap_id: "65f0000000000000000000c3", schema_version: "1.0", tipo_incidente: "intoxicacion_quemaduras", protocolo_codigo: "PT-INTOX-QUEM", estado_frap: "sin_asignacion",
    paciente_sintetico: { id_sintetico: "SYN-Z7T2R9", sexo: "F", grupo_edad: "adulto" },
    ubicacion_escena: { municipio: "Comitán de Domínguez", latitud: 16.25, longitud: -92.13 },
    triage: { nivel: "amarillo", evaluado_en: minAgo(37) },
    signos_vitales: [{ medido_en: minAgo(37), fc: 100, fr: 22, ta_sistolica: 120, ta_diastolica: 75, spo2: 95 }],
    perfil: { tipo: "intoxicacion_quemaduras", subtipo: "quemadura", sct_quemada_pct: 18, grado_quemadura: "2", via_aerea_comprometida: false },
    creado_en: minAgo(36), actualizado_en: minAgo(36),
    motivo_sin_asignacion: "sin_disponibilidad: ningún hospital compatible con guardia activa cuenta con cama_uci disponible",
  },
  {
    frap_id: "65f0000000000000000000c2", schema_version: "1.0", tipo_incidente: "politrauma", protocolo_codigo: "PT-POLITRAUMA", estado_frap: "reportado",
    paciente_sintetico: { id_sintetico: "SYN-B5N4C6", sexo: "M", grupo_edad: "pediatrico" },
    ubicacion_escena: { municipio: "Tuxtla Gutiérrez", latitud: 16.76, longitud: -93.1 },
    triage: { nivel: "verde", evaluado_en: minAgo(53) },
    signos_vitales: [{ medido_en: minAgo(53), fc: 96, fr: 20, ta_sistolica: 110, ta_diastolica: 70, spo2: 98 }],
    perfil: { tipo: "politrauma", mecanismo_lesion: "caida_altura", hemorragia_activa: false, lesiones: [{ region: "extremidad_sup", tipo_lesion: "fractura cerrada", ais: 2 }] },
    creado_en: minAgo(53), actualizado_en: minAgo(53),
  },
  {
    frap_id: "65f0000000000000000000c1", schema_version: "1.0", tipo_incidente: "infarto_agudo", protocolo_codigo: "PT-IAM", estado_frap: "cerrado",
    paciente_sintetico: { id_sintetico: "SYN-Q8W1E3", sexo: "M", grupo_edad: "adulto_mayor" },
    ubicacion_escena: { municipio: "Tuxtla Gutiérrez", latitud: 16.75, longitud: -93.11 },
    triage: { nivel: "negro", evaluado_en: minAgo(580) },
    signos_vitales: [{ medido_en: minAgo(580), fc: 0, fr: 0, ta_sistolica: 0, ta_diastolica: 0, spo2: 0 }],
    perfil: { tipo: "infarto_agudo", ecg: { elevacion_st: false, derivaciones_afectadas: [] }, killip: 4, inicio_dolor_min: 120 },
    creado_en: minAgo(580), actualizado_en: minAgo(500),
  },
];

type ReservaMock = ReservaHospitalItem & { hospital_id: number };

const RESERVAS: ReservaMock[] = [
  { hospital_id: 1, reserva_id: "r-0001", traslado_id: "a1b2c3d4-0000-4000-8000-000000000001", frap_id: "65f000000000000000000001", recurso_id: 12, tipo_recurso: "quirofano", cantidad: 1, estado_reserva: "activa", estado_traslado: "reservado", protocolo_codigo: "PT-POLITRAUMA", eta_min: 18, eta_margen_min: 5, creada_en: minAgo(1), expira_en: minAhead(14), cerrada_en: null },
  { hospital_id: 1, reserva_id: "r-00b2", traslado_id: "a1b2c3d4-0000-4000-8000-0000000000b2", frap_id: "65f0000000000000000000b2", recurso_id: 11, tipo_recurso: "cama_uci", cantidad: 1, estado_reserva: "confirmada", estado_traslado: "confirmado", protocolo_codigo: "PT-IAM", eta_min: 12, eta_margen_min: 4, creada_en: minAgo(40), expira_en: minAgo(25), cerrada_en: null },
  { hospital_id: 1, reserva_id: "r-00b1", traslado_id: "a1b2c3d4-0000-4000-8000-0000000000b1", frap_id: "65f0000000000000000000b1", recurso_id: 12, tipo_recurso: "quirofano", cantidad: 1, estado_reserva: "expirada", estado_traslado: "cancelado", protocolo_codigo: "PT-POLITRAUMA", eta_min: 20, eta_margen_min: 5, creada_en: minAgo(90), expira_en: minAgo(75), cerrada_en: minAgo(75) },
];

let seq = 0xd0;

/* ---------- Router ---------- */
function ok(body: unknown, status = 200): RawResponse {
  return { status, body };
}
function fail(status: number, detail: string): RawResponse {
  return { status, body: { detail } };
}

function requireRole(user: UserProfile | null, roles: Rol[]): RawResponse | null {
  if (!user) return fail(401, "Token ausente o inválido.");
  if (!roles.includes(user.rol)) return fail(403, "Rol sin permiso para esta operación.");
  return null;
}

export async function mockRequest(
  method: string,
  fullPath: string,
  body: unknown,
  token: string | null
): Promise<RawResponse> {
  await new Promise((r) => setTimeout(r, DELAY));
  const [path, query = ""] = fullPath.split("?");
  const q = new URLSearchParams(query);
  const user = userFromToken(token);
  const all: Rol[] = ["CRUM", "PARAMEDICO", "JEFE_URGENCIAS"];
  let m: RegExpExecArray | null;

  if (method === "POST" && path === "/auth/login") {
    const b = body as { nombre_usuario: string; password: string };
    const u = userFor(b.nombre_usuario);
    if (!u || b.password.length < 6) return fail(401, "Usuario o contraseña incorrectos.");
    return ok({ access_token: `mock.${u.nombre_usuario}`, token_type: "bearer", expires_at: minAhead(60), user: u });
  }

  if (method === "GET" && path === "/auth/me") {
    return user ? ok(user) : fail(401, "Token ausente o inválido.");
  }

  if (method === "GET" && path === "/network/hospitals") {
    const e = requireRole(user, all);
    if (e) return e;
    return ok({
      decision_support_notice: NOTICE,
      total_hospitales: HOSP.length,
      hospitales: HOSP.map(({ cap: _cap, ...h }) => ({ ...h, recursos: recursos(HOSP[h.hospital_id - 1]), conexiones: conexiones(HOSP[h.hospital_id - 1]) })),
    });
  }

  if (method === "GET" && path === "/network/cascade") {
    const e = requireRole(user, ["CRUM", "JEFE_URGENCIAS"]);
    if (e) return e;
    const sat = HOSP.find((h) => h.hospital_id === Number(q.get("hospital_saturado_id")));
    if (!sat) return fail(404, "Hospital saturado no existe.");
    const proto = q.get("protocolo_codigo") ?? "PT-TCE";
    const recurso: TipoRecurso = proto === "PT-POLITRAUMA" ? "quirofano" : proto === "PT-IAM" ? "cama_uci" : proto === "PT-TCE" ? "cama_uci" : "sala_choque";
    const opciones = conexiones(sat)
      .map((c) => {
        const h = HOSP[c.destino_hospital_id - 1];
        const [t, o, r] = h.cap[recurso];
        const disp = t - o - r;
        const guardia = !(h.hospital_id === 2 && proto === "PT-TCE");
        const bloqueado = c.estado_via === "bloqueo";
        const viable = disp > 0 && guardia && !bloqueado;
        const eta = c.estado_via === "demora" ? c.tiempo_min * 1.5 : c.tiempo_min;
        return {
          hospital_id: h.hospital_id, nombre: h.nombre, zona: h.zona, nivel_atencion: h.nivel_atencion, tramo_id: c.tramo_id,
          distancia_km: c.distancia_km, eta_min: eta + 2, eta_margen_min: c.incertidumbre_min, estado_via: c.estado_via,
          tipo_recurso: recurso, recurso_disponibles: disp, data_vintage: minAgo(1), guardia_presente: guardia, viable,
          motivo_no_viable: viable ? null : !guardia ? "Guardia ausente: NEUROCIRUGIA" : bloqueado ? "Vía en bloqueo" : `Sin ${recurso} disponible`,
        };
      })
      .sort((a, b) => Number(b.viable) - Number(a.viable) || a.eta_min - b.eta_min);
    return ok({ decision_support_notice: NOTICE, hospital_saturado_id: sat.hospital_id, protocolo_codigo: proto, recurso_critico: recurso, opciones_derivacion: opciones, data_vintage: minAgo(1) });
  }

  if (method === "PATCH" && (m = /^\/network\/tramos\/(.+)$/.exec(path))) {
    const e = requireRole(user, ["CRUM"]);
    if (e) return e;
    const id = decodeURIComponent(m[1]);
    const t = TRAMOS[id];
    if (!t) return fail(404, `No se encontraron aristas para el tramo '${id}'.`);
    t.estado = (body as { estado_via: EstadoVia }).estado_via;
    return ok({ tramo_id: id, estado_via: t.estado, aristas_actualizadas: 8 });
  }

  if ((m = /^\/hospitals\/(\d+)\/capacity$/.exec(path))) {
    const h = HOSP.find((x) => x.hospital_id === Number(m![1]));
    if (method === "GET") {
      const e = requireRole(user, all);
      if (e) return e;
      if (!h) return fail(404, "Hospital no encontrado.");
      return ok({ hospital_id: h.hospital_id, nombre: h.nombre, recursos: recursos(h) });
    }
    if (method === "PUT") {
      const e = requireRole(user, ["CRUM", "JEFE_URGENCIAS"]);
      if (e) return e;
      if (!h) return fail(404, "Hospital no encontrado.");
      if (user!.rol === "JEFE_URGENCIAS" && user!.hospital_id !== h.hospital_id)
        return fail(409, `El Jefe de Urgencias del hospital ${user!.hospital_id} no puede modificar el hospital ${h.hospital_id}.`);
      const b = body as { tipo_recurso: TipoRecurso; total: number; ocupados: number };
      const reservados = h.cap[b.tipo_recurso][2];
      if (b.total - b.ocupados - reservados < 0)
        return fail(409, "Total − ocupados − reservados no puede ser menor que 0.");
      h.cap[b.tipo_recurso] = [b.total, b.ocupados, reservados];
      return ok(recursos(h).find((r) => r.tipo_recurso === b.tipo_recurso));
    }
  }

  if (method === "GET" && (m = /^\/hospitals\/(\d+)\/reservas$/.exec(path))) {
    const e = requireRole(user, ["CRUM", "JEFE_URGENCIAS"]);
    if (e) return e;
    const hid = Number(m[1]);
    if (user!.rol === "JEFE_URGENCIAS" && user!.hospital_id !== hid)
      return fail(409, `El Jefe de Urgencias del hospital ${user!.hospital_id} no puede consultar reservas del hospital ${hid}.`);
    return ok(RESERVAS.filter((r) => r.hospital_id === hid).map(({ hospital_id: _h, ...r }) => r));
  }

  if (method === "POST" && path === "/reservas/expire-overdue") {
    const e = requireRole(user, ["CRUM", "JEFE_URGENCIAS"]);
    if (e) return e;
    let n = 0;
    for (const r of RESERVAS) {
      if (r.estado_reserva === "activa" && new Date(r.expira_en).getTime() < Date.now()) {
        r.estado_reserva = "expirada";
        r.cerrada_en = iso(now());
        HOSP[r.hospital_id - 1].cap[r.tipo_recurso][2] -= r.cantidad;
        n++;
      }
    }
    return ok({ reservas_expiradas: n });
  }

  if (method === "POST" && (m = /^\/reservas\/(.+)\/confirm$/.exec(path))) {
    const e = requireRole(user, ["CRUM", "JEFE_URGENCIAS"]);
    if (e) return e;
    const r = RESERVAS.find((x) => x.reserva_id === decodeURIComponent(m![1]));
    if (!r) return fail(404, "Reserva no encontrada.");
    if (r.estado_reserva !== "activa") return fail(409, `La reserva está en estado ${r.estado_reserva}; solo se confirman reservas activas.`);
    r.estado_reserva = "confirmada";
    r.estado_traslado = "confirmado";
    return ok({ reserva_id: r.reserva_id, traslado_id: r.traslado_id, estado_reserva: r.estado_reserva, estado_traslado: r.estado_traslado, cerrada_en: null });
  }

  if (method === "GET" && path === "/expedientes") {
    const e = requireRole(user, all);
    if (e) return e;
    const est = q.get("estado_frap");
    const tipo = q.get("tipo_incidente");
    const limit = Number(q.get("limit") ?? 50);
    const list = FRAPS.filter((f) => (!est || f.estado_frap === est) && (!tipo || f.tipo_incidente === tipo))
      .sort((a, b) => (b.creado_en ?? "").localeCompare(a.creado_en ?? ""))
      .slice(0, limit);
    return ok(list);
  }

  if (method === "GET" && (m = /^\/expedientes\/(.+)$/.exec(path))) {
    const e = requireRole(user, all);
    if (e) return e;
    const f = FRAPS.find((x) => x.frap_id === decodeURIComponent(m![1]));
    if (!f) return fail(404, `FRAP '${m[1]}' no encontrado en la base documental.`);
    let traslado: TrasladoExpediente | null = null;
    if (f.traslado_id && f.hospital_destino_id) {
      const h = HOSP[f.hospital_destino_id - 1];
      const rs = RESERVAS.filter((r) => r.traslado_id === f.traslado_id);
      traslado = {
        traslado_id: f.traslado_id, hospital_destino_id: h.hospital_id, hospital_destino_nombre: h.nombre, ambulancia_id: f.ambulancia_id ?? null,
        protocolo_codigo: f.protocolo_codigo ?? "", estado: rs[0]?.estado_traslado ?? "reservado", eta_min: rs[0]?.eta_min ?? 18, eta_margen_min: rs[0]?.eta_margen_min ?? 5,
        estado_via: "normal", data_vintage: minAgo(2), creado_en: f.creado_en ?? minAgo(5), actualizado_en: f.actualizado_en ?? minAgo(5),
        reservas: rs.map((r) => ({ reserva_id: r.reserva_id, recurso_id: r.recurso_id, tipo_recurso: r.tipo_recurso, cantidad: r.cantidad, estado: r.estado_reserva, creada_en: r.creada_en, expira_en: r.expira_en, cerrada_en: r.cerrada_en })),
      };
    }
    return ok({ frap_id: f.frap_id, frap: f, traslado });
  }

  if (method === "POST" && path === "/dispatch/evaluate-and-assign") {
    const e = requireRole(user, ["CRUM", "PARAMEDICO"]);
    if (e) return e;
    return dispatch(body as DispatchEvaluateRequest);
  }

  return fail(404, "Not Found");
}

function dispatch(req: DispatchEvaluateRequest): RawResponse {
  const frap_id = `65f0000000000000000000${(seq++).toString(16).padStart(2, "0")}`;
  const f = req.frap;
  const recurso: TipoRecurso = f.tipo_incidente === "politrauma" ? "quirofano" : f.tipo_incidente === "intoxicacion_quemaduras" ? "sala_choque" : "cama_uci";
  const descartados = [
    { hospital_id: 4, nombre: HOSP[3].nombre, zona: "tuxtla", motivos_descarte: [`Sin disponibilidad en vivo de ${recurso} (0 disponibles)`] },
    { hospital_id: 6, nombre: HOSP[5].nombre, zona: "san_cristobal", motivos_descarte: [`Sin disponibilidad en vivo de ${recurso} (0 disponibles)`] },
  ];
  const doc: FrapDocumento = { ...f, frap_id, estado_frap: "asignado", creado_en: iso(now()), actualizado_en: iso(now()) };

  if (f.tipo_incidente === "intoxicacion_quemaduras") {
    doc.estado_frap = "sin_asignacion";
    doc.motivo_sin_asignacion = `sin_disponibilidad: ningún hospital compatible con guardia activa cuenta con ${recurso} disponible.`;
    FRAPS.unshift(doc);
    const payload: DispatchEvaluateResponse = {
      decision_support_notice: NOTICE, estado_despacho: "sin_asignacion", frap_id, protocolo_codigo: f.protocolo_codigo, recurso_critico: recurso,
      hospital_asignado: null, reserva: null, alternativas_rankeadas: [],
      hospitales_descartados: [
        { hospital_id: 1, nombre: HOSP[0].nombre, zona: "tuxtla", motivos_descarte: [`Sin disponibilidad al intentar reserva atómica de ${recurso} (concurrencia detectada)`] },
        { hospital_id: 2, nombre: HOSP[1].nombre, zona: "tuxtla", motivos_descarte: [`Sin disponibilidad en vivo de ${recurso} (0 disponibles)`] },
      ],
      data_vintage: minAgo(1), data_vintage_segundos: 42,
      incertidumbre_ruta: { eta_base_min: null, margen_min: null, eta_minimo_min: null, eta_maximo_min: null, estado_via: null, supuestos: "Sin ruta calculada." },
      alerta_concurrencia: true, motivo_sin_asignacion: doc.motivo_sin_asignacion,
      mensaje: "No se concretó reserva atómica. El FRAP quedó en estado sin_asignacion para evaluación manual o estabilización coordinada por el CRUM.",
    };
    return { status: 409, body: payload };
  }

  const preferido = req.preferred_hospital_id ? HOSP[req.preferred_hospital_id - 1] : undefined;
  const h = preferido ?? HOSP[0];
  const [t, o, r] = h.cap[recurso];
  const antes = t - o - r;
  h.cap[recurso][2] += 1;
  const ttl = req.ttl_minutos ?? 15;
  const traslado_id = `a1b2c3d4-0000-4000-8000-0000000000${frap_id.slice(-2)}`;
  const reserva_id = `r-${frap_id.slice(-4)}`;
  doc.hospital_destino_id = h.hospital_id;
  doc.traslado_id = traslado_id;
  FRAPS.unshift(doc);
  RESERVAS.unshift({
    hospital_id: h.hospital_id, reserva_id, traslado_id, frap_id, recurso_id: recursoId(h.hospital_id, recurso), tipo_recurso: recurso, cantidad: 1,
    estado_reserva: "activa", estado_traslado: "reservado", protocolo_codigo: f.protocolo_codigo, eta_min: 18, eta_margen_min: 5,
    creada_en: iso(now()), expira_en: minAhead(ttl), cerrada_en: null,
  });
  const payload: DispatchEvaluateResponse = {
    decision_support_notice: NOTICE, estado_despacho: "asignado", frap_id, protocolo_codigo: f.protocolo_codigo, recurso_critico: recurso,
    hospital_asignado: { hospital_id: h.hospital_id, nombre: h.nombre, municipio: h.municipio, zona: h.zona, nivel_atencion: h.nivel_atencion, eta_min: 18, eta_margen_min: 5, estado_via: "demora", tramo_id: "T-LOCAL-tuxtla", recurso_disponible_antes: antes, recurso_disponible_despues: antes - 1, data_vintage: minAgo(1) },
    reserva: { reserva_id, traslado_id, recurso_id: recursoId(h.hospital_id, recurso), tipo_recurso: recurso, cantidad: 1, estado: "activa", creada_en: iso(now()), expira_en: minAhead(ttl), ttl_minutos: ttl },
    alternativas_rankeadas: [
      { hospital_id: 2, nombre: HOSP[1].nombre, zona: "tuxtla", municipio: "Tuxtla Gutiérrez", nivel_atencion: 3, eta_min: 19, eta_margen_min: 5, estado_via: "normal", tramo_id: "T-LOCAL-tuxtla", tipo_recurso: recurso, recurso_disponibles: 2, data_vintage: minAgo(1), guardia_especialista_presente: true, compatible_grafo: true, compatible_operativo: true },
      { hospital_id: 3, nombre: HOSP[2].nombre, zona: "tuxtla", municipio: "Tuxtla Gutiérrez", nivel_atencion: 2, eta_min: 24, eta_margen_min: 6, estado_via: "normal", tramo_id: "T-LOCAL-tuxtla", tipo_recurso: recurso, recurso_disponibles: 1, data_vintage: minAgo(1), guardia_especialista_presente: true, compatible_grafo: true, compatible_operativo: true },
    ],
    hospitales_descartados: descartados,
    data_vintage: minAgo(1), data_vintage_segundos: 42,
    incertidumbre_ruta: { eta_base_min: 18, margen_min: 5, eta_minimo_min: 13, eta_maximo_min: 23, estado_via: "demora", supuestos: "Tiempos de referencia entre tramos con margen de incertidumbre; en demora se aplica un factor de penalización y los tramos en bloqueo se excluyen." },
    alerta_concurrencia: false, motivo_sin_asignacion: null,
    mensaje: "Reserva temporal creada. El CRUM o la Jefatura de Urgencias deben confirmarla antes de que expire.",
  };
  return { status: 201, body: payload };
}
