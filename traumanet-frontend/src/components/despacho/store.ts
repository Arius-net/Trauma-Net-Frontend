/** Último resultado de despacho de esta pestaña (sessionStorage), para la vista de resultado. */
import type { DispatchEvaluateResponse, NivelTriage } from "@/types/api";

const KEY = "traumanet.ultimoDespacho";

export interface ResultadoGuardado {
  respuesta: DispatchEvaluateResponse;
  recibidoEn: number;
  paciente: string;
  triage: NivelTriage;
}

export function guardarResultado(r: ResultadoGuardado): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* sin almacenamiento: la vista mostrará el estado vacío */
  }
}

export function leerResultado(): ResultadoGuardado | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ResultadoGuardado) : null;
  } catch {
    return null;
  }
}
