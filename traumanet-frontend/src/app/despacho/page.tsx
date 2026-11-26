"use client";

/**
 * Asistente de evaluación de despacho (5 pasos). Paramédico y CRUM («Nueva evaluación de despacho»).
 * POST /dispatch/evaluate-and-assign (crea un FRAP nuevo en cada envío; sin reintentos automáticos).
 * GET /network/hospitals solo para el CRUM (hospital preferido).
 */
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { initialForm, validarPaso, buildRequest, type FormState } from "@/components/despacho/form";
import { Paso1, Paso2, Paso3, Paso4, Paso5 } from "@/components/despacho/steps";
import { guardarResultado } from "@/components/despacho/store";
import { useNotify } from "@/components/Notifications";
import { AvisoOficial, Button, cx } from "@/components/ui";
import { api, isApiError } from "@/lib/api";
import { INCIDENTE_CORTO } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { useQuery } from "@/lib/useQuery";
import type { DispatchEvaluateResponse, NivelTriage } from "@/types/api";

const TITULOS = ["Paciente y escena", "Signos vitales", "Tipo de incidente", "Detalle clínico", "Revisar y enviar"];

export default function DespachoPage() {
  return (
    <AppShell roles={["PARAMEDICO", "CRUM"]} narrow>
      <Asistente />
    </AppShell>
  );
}

function esRespuestaDespacho(b: unknown): b is DispatchEvaluateResponse {
  return !!b && typeof b === "object" && "estado_despacho" in b && "frap_id" in b;
}

function Asistente() {
  const { user } = useSession();
  const esCrum = user?.rol === "CRUM";
  const router = useRouter();
  const notify = useNotify();
  const [paso, setPaso] = useState(1);
  const [f, setF] = useState<FormState>(initialForm);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const enviado = useRef(false);
  const red = useQuery(esCrum ? "red" : null, () => api.networkHospitals());

  const errores = useMemo(() => validarPaso(paso, f, esCrum), [paso, f, esCrum]);
  const valido = Object.keys(errores).length === 0;

  // El error de un campo se muestra en cuanto el usuario sale de él (blur).
  const err = (k: string) => (touched.has(k) ? errores[k] : undefined);
  const touch = (k: string) => setTouched((t) => (t.has(k) ? t : new Set(t).add(k)));
  const set = (fn: (s: FormState) => FormState) => setF((s) => fn(s));

  function irA(n: number) {
    setPaso(n);
    window.scrollTo({ top: 0 });
  }

  async function enviar() {
    // Guardas contra doble envío: estado + ref síncrona.
    if (enviando || enviado.current || !valido) return;
    enviado.current = true;
    setEnviando(true);
    const payload = buildRequest(f, esCrum);
    const meta = { paciente: f.id_sintetico, triage: f.triage as NivelTriage };
    try {
      const respuesta = await api.evaluateAndAssign(payload);
      guardarResultado({ respuesta, recibidoEn: Date.now(), ...meta });
      router.replace("/despacho/resultado");
    } catch (e) {
      if (isApiError(e) && e.kind === "conflict" && esRespuestaDespacho(e.body)) {
        // 409 = sin asignación con el mismo payload.
        guardarResultado({ respuesta: e.body, recibidoEn: Date.now(), ...meta });
        router.replace("/despacho/resultado");
        return;
      }
      if (isApiError(e) && e.kind === "unavailable") {
        // 503 PartialWriteError: el FRAP quedó guardado como sin_asignacion.
        const frapId = esRespuestaDespacho(e.body) ? e.body.frap_id : null;
        notify(
          "No se pudo guardar",
          "El FRAP quedó registrado como sin asignación. Revisa Expedientes antes de volver a enviar."
        );
        router.replace(frapId ? `/expedientes/${frapId}` : "/expedientes");
        return;
      }
      if (isApiError(e) && e.kind === "unauthorized") return;
      if (isApiError(e) && e.kind === "network") {
        notify(
          "No se confirmó el envío",
          "Se perdió la conexión. El FRAP pudo haberse registrado: revisa Expedientes antes de volver a enviar."
        );
      } else {
        notify("No se pudo enviar la evaluación", isApiError(e) ? e.message : undefined);
      }
      // Sin reintento automático: el usuario decide tras revisar.
      enviado.current = false;
      setEnviando(false);
    }
  }

  const titulo =
    paso === 4 && f.tipo ? `${TITULOS[3]} · ${INCIDENTE_CORTO[f.tipo]}` : TITULOS[paso - 1];
  const props = { f, set, err, touch };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[640px] flex-col">
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-link">
            Paso {paso} de 5{esCrum && paso === 1 ? " · Nueva evaluación de despacho" : ""}
          </p>
          <div className="flex gap-1" aria-hidden>
            {TITULOS.map((_, i) => (
              <span key={i} className={cx("h-1 flex-1 rounded-sm", i < paso ? "bg-accent" : "bg-n-200")} />
            ))}
          </div>
        </div>
        <h1 className="font-cond text-[26px] font-bold leading-8 text-n-900">{titulo}</h1>

        {paso === 1 && <Paso1 {...props} />}
        {paso === 2 && <Paso2 {...props} />}
        {paso === 3 && <Paso3 {...props} />}
        {paso === 4 && <Paso4 {...props} />}
        {paso === 5 && <Paso5 {...props} esCrum={esCrum} hospitales={red.data?.hospitales} />}

        <AvisoOficial className="mt-2" />
      </div>

      <div className="sticky bottom-0 border-t border-n-200 bg-surface px-4 py-3">
        {!valido && (
          <p className="mb-2 text-xs text-n-700" aria-live="polite">
            Completa o corrige los campos de este paso para continuar.
          </p>
        )}
        <div className="flex gap-3">
          {paso > 1 && (
            <Button variant="secondary" className="flex-1" disabled={enviando} onClick={() => irA(paso - 1)}>
              Atrás
            </Button>
          )}
          {paso < 5 ? (
            <Button className="flex-1" disabled={!valido} onClick={() => irA(paso + 1)}>
              Siguiente
            </Button>
          ) : (
            <Button className="flex-1" disabled={!valido} loading={enviando} onClick={enviar}>
              {enviando ? "Evaluando…" : "Evaluar y asignar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
