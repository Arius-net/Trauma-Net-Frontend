/** Formatos de fecha/hora en America/Mexico_City y utilidades de ETA. */

const TZ = "America/Mexico_City";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function parts(iso: string): Record<string, string> | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** «25 nov, 08:41» */
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = parts(iso);
  if (!p) return "—";
  return `${Number(p.day)} ${MESES[Number(p.month) - 1]}, ${p.hour}:${p.minute}`;
}

/** «08:41» */
export function formatHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = parts(iso);
  if (!p) return "—";
  return `${p.hour}:${p.minute}`;
}

/** Hace cuánto: «hace 42 s», «hace 2 min», «hace 1 h 5 min». */
export function formatHace(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "sin dato";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "sin dato";
  return formatSegundos(Math.max(0, Math.floor((now - t) / 1000)));
}

export function formatSegundos(sec: number): string {
  if (sec < 60) return `hace ${sec} s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h ${min % 60} min`;
}

/** Tiempo restante hasta una fecha, en minutos redondeados: «en 14 min». */
export function formatRestante(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - now;
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "vencida";
  const min = Math.ceil(ms / 60000);
  return `en ${min} min`;
}

/** Cuenta regresiva mm:ss. */
export function formatCuentaRegresiva(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function n(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
}

/** ETA siempre con margen: «18 ± 5 min». */
export function formatEta(eta: number | null | undefined, margen: number | null | undefined): string {
  if (eta == null) return "—";
  return `${n(Math.round(eta))} ± ${n(Math.round(margen ?? 0))} min`;
}

export function formatNumero(v: number | null | undefined, sufijo = ""): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${n(v)}${sufijo}`;
}
