"use client";

/** Pasos del asistente (Figma móvil 19:147 … 19:431). Mismo asistente en escritorio, columna de ~640 px. */
import { Clock, Plus, Trash2 } from "lucide-react";
import { Alert, Button, cx, Field, Input, Segmented, Select, Textarea, TriageText } from "@/components/ui";
import { formatHora } from "@/lib/format";
import {
  INCIDENTE_CORTO,
  INCIDENTE_LABEL,
  MECANISMO_LABEL,
  PROTOCOLO_POR_INCIDENTE,
  REGION_LABEL,
  TIPOS_INCIDENTE,
} from "@/lib/labels";
import type { Derivacion, HospitalRedItem, MecanismoLesion, RegionLesion, RitmoEcg, ViaMedicamento } from "@/types/api";
import { glasgowTotal, nuevaMedicion, type FormState, type SiNo } from "./form";

export interface StepProps {
  f: FormState;
  set: (fn: (f: FormState) => FormState) => void;
  err: (key: string) => string | undefined;
  touch: (key: string) => void;
}

const SI_NO = [
  { value: true, label: "Sí" },
  { value: false, label: "No" },
];

/* Campo de texto/número con su error asociado. */
function TextField({
  label,
  k,
  value,
  onChange,
  help,
  err,
  touch,
  inputMode,
  readOnly,
  placeholder,
  maxLength,
  className,
  autoCapitalize,
}: {
  label: string;
  k: string;
  value: string;
  onChange?: (v: string) => void;
  help?: string;
  err: StepProps["err"];
  touch: StepProps["touch"];
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  readOnly?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  autoCapitalize?: string;
}) {
  return (
    <Field label={label} help={help} error={err(k)} className={className}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          aria-describedby={describedBy}
          invalid={invalid}
          value={value}
          readOnly={readOnly}
          inputMode={inputMode}
          placeholder={placeholder}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoComplete="off"
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={() => touch(k)}
        />
      )}
    </Field>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-n-200 bg-surface p-4">
      {title && <h3 className="font-cond text-lg font-semibold text-n-900">{title}</h3>}
      {children}
    </div>
  );
}

/* ---------- Paso 1: paciente y escena ---------- */
export function Paso1({ f, set, err, touch }: StepProps) {
  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="id_sintetico"
        k="id_sintetico"
        value={f.id_sintetico}
        onChange={(v) => set((s) => ({ ...s, id_sintetico: v.toUpperCase().replace(/\s/g, "") }))}
        help="SYN- seguido de 6 a 12 caracteres (A–Z, 0–9)"
        placeholder="SYN-48KD2M"
        autoCapitalize="characters"
        maxLength={16}
        err={err}
        touch={touch}
      />
      <Segmented
        label="Sexo"
        value={f.sexo}
        onChange={(v) => set((s) => ({ ...s, sexo: v }))}
        options={[
          { value: "F", label: "F" },
          { value: "M", label: "M" },
          { value: "indeterminado", label: "indeterminado" },
        ]}
      />
      <Segmented
        label="Grupo de edad"
        value={f.grupo_edad}
        onChange={(v) => set((s) => ({ ...s, grupo_edad: v }))}
        options={[
          { value: "pediatrico", label: "pediátrico" },
          { value: "adulto", label: "adulto" },
          { value: "adulto_mayor", label: "adulto mayor" },
        ]}
      />
      <Segmented
        label="Triage"
        value={f.triage}
        onChange={(v) => set((s) => ({ ...s, triage: v }))}
        options={[
          { value: "rojo", label: "rojo" },
          { value: "amarillo", label: "amarillo" },
          { value: "verde", label: "verde" },
          { value: "negro", label: "negro" },
        ]}
      />
      <TextField
        label="Municipio"
        k="municipio"
        value={f.municipio}
        onChange={(v) => set((s) => ({ ...s, municipio: v }))}
        maxLength={80}
        err={err}
        touch={touch}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Latitud"
          k="latitud"
          value={f.latitud}
          onChange={(v) => set((s) => ({ ...s, latitud: v }))}
          help="−90 a 90"
          inputMode="decimal"
          err={err}
          touch={touch}
        />
        <TextField
          label="Longitud"
          k="longitud"
          value={f.longitud}
          onChange={(v) => set((s) => ({ ...s, longitud: v }))}
          help="−180 a 180"
          inputMode="decimal"
          err={err}
          touch={touch}
        />
      </div>
      <TextField
        label="Referencia (opcional)"
        k="referencia"
        value={f.referencia}
        onChange={(v) => set((s) => ({ ...s, referencia: v }))}
        maxLength={200}
        err={err}
        touch={touch}
      />
    </div>
  );
}

/* ---------- Paso 2: signos vitales ---------- */
export function Paso2({ f, set, err, touch }: StepProps) {
  const upd = (i: number, k: keyof FormState["mediciones"][number], v: string) =>
    set((s) => ({ ...s, mediciones: s.mediciones.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));

  return (
    <div className="flex flex-col gap-4">
      {f.mediciones.map((m, i) => {
        const p = (k: keyof typeof m) => ({
          k: `sv${i}.${k}`,
          value: m[k],
          onChange: (v: string) => upd(i, k, v),
          inputMode: "numeric" as const,
          err,
          touch,
        });
        return (
          <Section key={m.medido_en + i}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-cond text-lg font-semibold text-n-900">
                Medición {i + 1} · {formatHora(m.medido_en)}
              </h3>
              {f.mediciones.length > 1 && (
                <button
                  type="button"
                  onClick={() => set((s) => ({ ...s, mediciones: s.mediciones.filter((_, j) => j !== i) }))}
                  className="flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-n-700 hover:text-n-900"
                >
                  <Trash2 className="size-4" aria-hidden /> Quitar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="FC (lpm)" {...p("fc")} />
              <TextField label="FR (rpm)" {...p("fr")} />
              <TextField label="TA sistólica" help="mmHg" {...p("ta_sistolica")} />
              <TextField label="TA diastólica" help="mmHg" {...p("ta_diastolica")} />
              <TextField label="SpO₂ (%)" help="0 a 100" className="col-span-2" {...p("spo2")} />
              <TextField label="Temp. °C (opc.)" {...p("temperatura_c")} inputMode="decimal" />
              <TextField label="Glucosa mg/dL (opc.)" {...p("glucosa_mgdl")} />
            </div>
          </Section>
        );
      })}
      <Button
        variant="secondary"
        block
        onClick={() => set((s) => ({ ...s, mediciones: [...s.mediciones, nuevaMedicion()] }))}
      >
        <Plus className="size-4" aria-hidden /> Agregar otra medición
      </Button>
      <p className="text-xs text-n-700">Se requiere al menos una medición completa (FC, FR, TA y SpO₂).</p>
    </div>
  );
}

/* ---------- Paso 3: tipo de incidente ---------- */
export function Paso3({ f, set }: StepProps) {
  return (
    <div className="flex flex-col gap-3" role="radiogroup" aria-label="Tipo de incidente">
      <p className="text-sm text-n-700">El protocolo clínico se asigna según el tipo.</p>
      {TIPOS_INCIDENTE.map((t) => {
        const sel = f.tipo === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={sel}
            onClick={() => set((s) => ({ ...s, tipo: t }))}
            className={cx(
              "flex flex-col items-start gap-1 rounded-lg border bg-surface px-4 py-4 text-left transition-colors",
              sel ? "border-2 border-accent bg-selected" : "border-n-300 hover:bg-n-50"
            )}
          >
            <span className={cx("text-base font-semibold", sel ? "text-link" : "text-n-900")}>{INCIDENTE_LABEL[t]}</span>
            <span className="font-mono text-[13px] text-n-700">{PROTOCOLO_POR_INCIDENTE[t]}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Paso 4: detalle clínico según perfil ---------- */
export function Paso4(props: StepProps) {
  switch (props.f.tipo) {
    case "politrauma":
      return <PerfilPolitrauma {...props} />;
    case "infarto_agudo":
      return <PerfilInfarto {...props} />;
    case "trauma_craneoencefalico":
      return <PerfilTCE {...props} />;
    case "intoxicacion_quemaduras":
      return <PerfilIntox {...props} />;
    default:
      return <p className="text-sm text-n-700">Selecciona el tipo de incidente en el paso 3.</p>;
  }
}

function Opcional({ label, value, onChange }: { label: string; value: SiNo; onChange: (v: boolean) => void }) {
  return <Segmented label={label} value={value} onChange={onChange} options={SI_NO} />;
}

function PerfilTCE({ f, set, err, touch }: StepProps) {
  const u = (k: keyof FormState["tce"], v: unknown) => set((s) => ({ ...s, tce: { ...s.tce, [k]: v } }));
  const total = glasgowTotal(f);
  return (
    <div className="flex flex-col gap-4">
      <Section title="Escala de Glasgow">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Ocular (1–4)" k="tce.ocular" value={f.tce.ocular} onChange={(v) => u("ocular", v)} inputMode="numeric" err={err} touch={touch} />
          <TextField label="Verbal (1–5)" k="tce.verbal" value={f.tce.verbal} onChange={(v) => u("verbal", v)} inputMode="numeric" err={err} touch={touch} />
          <TextField label="Motor (1–6)" k="tce.motor" value={f.tce.motor} onChange={(v) => u("motor", v)} inputMode="numeric" err={err} touch={touch} />
          <TextField label="Total (auto)" k="tce.total" value={total === null ? "" : String(total)} readOnly help="Suma de los tres" err={err} touch={touch} />
        </div>
      </Section>
      <Section title="Pupilas">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Izquierda (mm)" k="tce.izquierda_mm" value={f.tce.izquierda_mm} onChange={(v) => u("izquierda_mm", v)} inputMode="decimal" help="1 a 9" err={err} touch={touch} />
          <TextField label="Derecha (mm)" k="tce.derecha_mm" value={f.tce.derecha_mm} onChange={(v) => u("derecha_mm", v)} inputMode="decimal" help="1 a 9" err={err} touch={touch} />
        </div>
        <Segmented label="Reactivas" value={f.tce.reactivas} onChange={(v) => u("reactivas", v)} options={SI_NO} />
      </Section>
      <Section title="Opcionales">
        <Opcional label="Signos de herniación" value={f.tce.herniacion} onChange={(v) => u("herniacion", v)} />
        <Opcional label="Vía aérea asegurada" value={f.tce.via_aerea} onChange={(v) => u("via_aerea", v)} />
        <Opcional label="Anticoagulado" value={f.tce.anticoagulado} onChange={(v) => u("anticoagulado", v)} />
        <Opcional label="Convulsiones" value={f.tce.convulsiones} onChange={(v) => u("convulsiones", v)} />
      </Section>
    </div>
  );
}

function PerfilPolitrauma({ f, set, err, touch }: StepProps) {
  const u = (k: keyof FormState["pt"], v: unknown) => set((s) => ({ ...s, pt: { ...s.pt, [k]: v } }));
  const ul = (i: number, k: string, v: string) =>
    set((s) => ({ ...s, pt: { ...s.pt, lesiones: s.pt.lesiones.map((l, j) => (j === i ? { ...l, [k]: v } : l)) } }));
  return (
    <div className="flex flex-col gap-4">
      <Section title="Mecanismo">
        <Field label="Mecanismo de lesión" error={err("pt.mecanismo")}>
          {({ id, invalid, describedBy }) => (
            <Select id={id} invalid={invalid} aria-describedby={describedBy} value={f.pt.mecanismo} onChange={(e) => u("mecanismo", e.target.value as MecanismoLesion)} onBlur={() => touch("pt.mecanismo")}>
              <option value="">Selecciona…</option>
              {(Object.keys(MECANISMO_LABEL) as MecanismoLesion[]).map((m) => (
                <option key={m} value={m}>
                  {MECANISMO_LABEL[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Segmented label="Hemorragia activa" value={f.pt.hemorragia} onChange={(v) => u("hemorragia", v)} options={SI_NO} />
      </Section>
      <Section title="Lesiones">
        {f.pt.lesiones.map((l, i) => (
          <div key={i} className="flex flex-col gap-3 border-b border-n-200 pb-4 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-n-900">Lesión {i + 1}</span>
              {f.pt.lesiones.length > 1 && (
                <button type="button" onClick={() => u("lesiones", f.pt.lesiones.filter((_, j) => j !== i))} className="flex min-h-11 items-center gap-1 px-2 text-sm text-n-700 hover:text-n-900">
                  <Trash2 className="size-4" aria-hidden /> Quitar
                </button>
              )}
            </div>
            <Field label="Región" error={err(`pt.l${i}.region`)}>
              {({ id, invalid }) => (
                <Select id={id} invalid={invalid} value={l.region} onChange={(e) => ul(i, "region", e.target.value as RegionLesion)} onBlur={() => touch(`pt.l${i}.region`)}>
                  <option value="">Selecciona…</option>
                  {(Object.keys(REGION_LABEL) as RegionLesion[]).map((r) => (
                    <option key={r} value={r}>
                      {REGION_LABEL[r]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="grid grid-cols-[1fr_96px] gap-3">
              <TextField label="Tipo de lesión" k={`pt.l${i}.tipo_lesion`} value={l.tipo_lesion} onChange={(v) => ul(i, "tipo_lesion", v)} maxLength={80} err={err} touch={touch} />
              <TextField label="AIS (1–6)" k={`pt.l${i}.ais`} value={l.ais} onChange={(v) => ul(i, "ais", v)} inputMode="numeric" err={err} touch={touch} />
            </div>
          </div>
        ))}
        <Button variant="secondary" block onClick={() => u("lesiones", [...f.pt.lesiones, { region: "", tipo_lesion: "", ais: "" }])}>
          <Plus className="size-4" aria-hidden /> Agregar lesión
        </Button>
      </Section>
      <Section title="Opcionales">
        <Opcional label="Torniquete aplicado" value={f.pt.torniquete} onChange={(v) => u("torniquete", v)} />
        <Opcional label="Quirófano sospechado" value={f.pt.quirofano} onChange={(v) => u("quirofano", v)} />
        <TextField label="ISS estimado (0–75)" k="pt.iss" value={f.pt.iss} onChange={(v) => u("iss", v)} inputMode="numeric" err={err} touch={touch} />
      </Section>
    </div>
  );
}

const DERIVACIONES: Derivacion[] = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
const RITMOS: { value: RitmoEcg; label: string }[] = [
  { value: "sinusal", label: "Sinusal" },
  { value: "fibrilacion_auricular", label: "Fibrilación auricular" },
  { value: "taquicardia_ventricular", label: "Taquicardia ventricular" },
  { value: "fibrilacion_ventricular", label: "Fibrilación ventricular" },
  { value: "bloqueo_av", label: "Bloqueo AV" },
  { value: "otro", label: "Otro" },
];

function PerfilInfarto({ f, set, err, touch }: StepProps) {
  const u = (k: keyof FormState["iam"], v: unknown) => set((s) => ({ ...s, iam: { ...s.iam, [k]: v } }));
  const toggle = (d: Derivacion) =>
    u("derivaciones", f.iam.derivaciones.includes(d) ? f.iam.derivaciones.filter((x) => x !== d) : [...f.iam.derivaciones, d]);
  return (
    <div className="flex flex-col gap-4">
      <Section title="ECG">
        <Segmented label="Elevación del ST" value={f.iam.elevacion_st} onChange={(v) => u("elevacion_st", v)} options={SI_NO} />
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-xs font-medium text-n-900">Derivaciones afectadas</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {DERIVACIONES.map((d) => {
              const sel = f.iam.derivaciones.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => toggle(d)}
                  className={cx(
                    "min-h-11 rounded-md border font-mono text-sm",
                    sel ? "border-2 border-accent bg-selected font-semibold text-link" : "border-n-300 bg-surface text-n-900"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field label="Ritmo (opcional)">
          {({ id }) => (
            <Select id={id} value={f.iam.ritmo} onChange={(e) => u("ritmo", e.target.value)}>
              <option value="">Sin registrar</option>
              {RITMOS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Section>
      <Section title="Clasificación">
        <Segmented
          label="Killip"
          value={f.iam.killip}
          onChange={(v) => u("killip", v)}
          options={[1, 2, 3, 4].map((k) => ({ value: k, label: ["I", "II", "III", "IV"][k - 1] }))}
        />
        <TextField label="Inicio del dolor (min)" k="iam.inicio_dolor_min" value={f.iam.inicio_dolor_min} onChange={(v) => u("inicio_dolor_min", v)} help="0 a 4320 minutos" inputMode="numeric" err={err} touch={touch} />
      </Section>
      <Section title="Opcionales">
        <Opcional label="Trombólisis aplicada" value={f.iam.trombolisis} onChange={(v) => u("trombolisis", v)} />
        <Opcional label="Troponina rápida positiva" value={f.iam.troponina} onChange={(v) => u("troponina", v)} />
      </Section>
    </div>
  );
}

function PerfilIntox({ f, set, err, touch }: StepProps) {
  const u = (k: keyof FormState["iq"], v: unknown) => set((s) => ({ ...s, iq: { ...s.iq, [k]: v } }));
  const s = f.iq.subtipo;
  const agenteReq = s === "intoxicacion" || s === "mixto";
  const sctReq = s === "quemadura" || s === "mixto";
  return (
    <div className="flex flex-col gap-4">
      <Section title="Tipo">
        <Segmented
          label="Subtipo"
          value={f.iq.subtipo}
          onChange={(v) => u("subtipo", v)}
          options={[
            { value: "intoxicacion", label: "intoxicación" },
            { value: "quemadura", label: "quemadura" },
            { value: "mixto", label: "mixto" },
          ]}
        />
        <TextField label={agenteReq ? "Agente" : "Agente (opcional)"} k="iq.agente" value={f.iq.agente} onChange={(v) => u("agente", v)} maxLength={100} err={err} touch={touch} />
        <TextField label={sctReq ? "SCT quemada (%)" : "SCT quemada (%) (opcional)"} k="iq.sct" value={f.iq.sct} onChange={(v) => u("sct", v)} help="0 a 100" inputMode="decimal" err={err} touch={touch} />
        <Segmented label="Vía aérea comprometida" value={f.iq.via_aerea_comprometida} onChange={(v) => u("via_aerea_comprometida", v)} options={SI_NO} />
      </Section>
      <Section title="Opcionales">
        <Field label="Vía de exposición">
          {({ id }) => (
            <Select id={id} value={f.iq.via_exposicion} onChange={(e) => u("via_exposicion", e.target.value)}>
              <option value="">Sin registrar</option>
              <option value="oral">Oral</option>
              <option value="inhalada">Inhalada</option>
              <option value="dermica">Dérmica</option>
              <option value="parenteral">Parenteral</option>
              <option value="ocular">Ocular</option>
            </Select>
          )}
        </Field>
        <Segmented
          label="Grado de quemadura"
          value={f.iq.grado || null}
          onChange={(v) => u("grado", v)}
          options={[
            { value: "1", label: "1.º" },
            { value: "2", label: "2.º" },
            { value: "3", label: "3.º" },
          ]}
        />
        <Opcional label="Lesión inhalatoria" value={f.iq.lesion_inhalatoria} onChange={(v) => u("lesion_inhalatoria", v)} />
        <Opcional label="Descontaminación realizada" value={f.iq.descontaminacion} onChange={(v) => u("descontaminacion", v)} />
        <TextField label="Antídoto aplicado" k="iq.antidoto" value={f.iq.antidoto} onChange={(v) => u("antidoto", v)} maxLength={80} err={err} touch={touch} />
      </Section>
    </div>
  );
}

/* ---------- Paso 5: revisar y enviar ---------- */
function resumenClinico(f: FormState): [string, string] | null {
  switch (f.tipo) {
    case "trauma_craneoencefalico":
      return ["Glasgow", `${glasgowTotal(f) ?? "—"} (O${f.tce.ocular} V${f.tce.verbal} M${f.tce.motor})`];
    case "politrauma":
      return ["Lesiones", `${f.pt.lesiones.length} · hemorragia ${f.pt.hemorragia ? "sí" : "no"}`];
    case "infarto_agudo":
      return ["ECG", `ST ${f.iam.elevacion_st ? "elevado" : "sin elevación"} · Killip ${f.iam.killip ?? "—"}`];
    case "intoxicacion_quemaduras":
      return ["Subtipo", f.iq.subtipo ?? "—"];
    default:
      return null;
  }
}

const VIAS_MED: { value: ViaMedicamento; label: string }[] = [
  { value: "iv", label: "IV" },
  { value: "io", label: "IO" },
  { value: "im", label: "IM" },
  { value: "vo", label: "VO" },
  { value: "sl", label: "SL" },
  { value: "inhalada", label: "Inhalada" },
  { value: "topica", label: "Tópica" },
];

export function Paso5({
  f,
  set,
  err,
  touch,
  esCrum,
  hospitales,
}: StepProps & { esCrum: boolean; hospitales: HospitalRedItem[] | undefined }) {
  const clin = resumenClinico(f);
  const um = (i: number, k: string, v: string) =>
    set((s) => ({ ...s, medicamentos: s.medicamentos.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));
  const filas: [string, React.ReactNode][] = [
    ["Paciente", `${f.id_sintetico} · ${f.sexo ?? "—"} · ${f.grupo_edad?.replace("_", " ") ?? "—"}`],
    ["Triage", <TriageText key="t" nivel={f.triage} />],
    ["Incidente", f.tipo ? `${INCIDENTE_CORTO[f.tipo]} · ${PROTOCOLO_POR_INCIDENTE[f.tipo]}` : "—"],
    ...(clin ? [clin] : []),
    ["Signos vitales", `${f.mediciones.length} medición${f.mediciones.length === 1 ? "" : "es"}`],
    ["Escena", f.municipio || "—"],
  ];
  return (
    <div className="flex flex-col gap-4">
      <dl className="rounded-lg border border-n-200 bg-surface px-4 py-1">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-n-200 py-3 text-sm last:border-0">
            <dt className="text-n-700">{k}</dt>
            <dd className="text-right font-semibold text-n-900">{v}</dd>
          </div>
        ))}
      </dl>

      <TextField
        label="ambulancia_id (opcional)"
        k="ambulancia_id"
        value={f.ambulancia_id}
        onChange={(v) => set((s) => ({ ...s, ambulancia_id: v }))}
        help="Número entero"
        inputMode="numeric"
        err={err}
        touch={touch}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-xs font-medium text-n-900">Medicamentos aplicados (opcional)</legend>
        {f.medicamentos.length === 0 && <p className="text-sm text-n-700">Ninguno registrado.</p>}
        {f.medicamentos.map((m, i) => (
          <div key={m.aplicado_en + i} className="flex flex-col gap-3 rounded-lg border border-n-200 bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-n-900">
                Medicamento {i + 1} · {formatHora(m.aplicado_en)}
              </span>
              <button type="button" onClick={() => set((s) => ({ ...s, medicamentos: s.medicamentos.filter((_, j) => j !== i) }))} className="flex min-h-11 items-center gap-1 px-2 text-sm text-n-700 hover:text-n-900">
                <Trash2 className="size-4" aria-hidden /> Quitar
              </button>
            </div>
            <TextField label="Nombre" k={`med${i}.nombre`} value={m.nombre} onChange={(v) => um(i, "nombre", v)} maxLength={80} err={err} touch={touch} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Dosis" k={`med${i}.dosis`} value={m.dosis} onChange={(v) => um(i, "dosis", v)} maxLength={40} err={err} touch={touch} />
              <Field label="Vía" error={err(`med${i}.via`)}>
                {({ id, invalid }) => (
                  <Select id={id} invalid={invalid} value={m.via} onChange={(e) => um(i, "via", e.target.value)} onBlur={() => touch(`med${i}.via`)}>
                    <option value="">Selecciona…</option>
                    {VIAS_MED.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          block
          onClick={() =>
            set((s) => ({ ...s, medicamentos: [...s.medicamentos, { nombre: "", dosis: "", via: "", aplicado_en: new Date().toISOString() }] }))
          }
        >
          <Plus className="size-4" aria-hidden /> Agregar medicamento
        </Button>
      </fieldset>

      <Field label="Notas (opcional)" help={`Máximo 2000 caracteres · ${f.notas.length}/2000`} error={err("notas")}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} aria-describedby={describedBy} invalid={invalid} value={f.notas} maxLength={2000} onChange={(e) => set((s) => ({ ...s, notas: e.target.value }))} onBlur={() => touch("notas")} />
        )}
      </Field>

      {esCrum && (
        <fieldset className="flex flex-col gap-4 rounded-lg border border-n-200 bg-surface p-4">
          <legend className="px-1 font-cond text-lg font-semibold text-n-900">Opciones del regulador</legend>
          <Field label="Hospital preferido (opcional)" help="El sistema intenta reservar primero en este hospital.">
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={f.preferred_hospital_id}
                onChange={(e) =>
                  set((s) => ({ ...s, preferred_hospital_id: e.target.value, strict_preferred_hospital: e.target.value ? s.strict_preferred_hospital : false }))
                }
              >
                <option value="">Sin preferencia</option>
                {(hospitales ?? []).map((h) => (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {h.clave} · {h.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <label className={cx("flex min-h-11 items-center gap-3 text-sm", !f.preferred_hospital_id && "text-n-500")}>
            <input
              type="checkbox"
              className="size-5 accent-[#0A2463]"
              disabled={!f.preferred_hospital_id}
              checked={f.strict_preferred_hospital}
              onChange={(e) => set((s) => ({ ...s, strict_preferred_hospital: e.target.checked }))}
            />
            Solo el hospital preferido (no derivar a otros si falla)
          </label>
          <TextField
            label="TTL de la reserva (min)"
            k="ttl_minutos"
            value={f.ttl_minutos}
            onChange={(v) => set((s) => ({ ...s, ttl_minutos: v }))}
            help="1 a 120 minutos (por defecto 15)"
            inputMode="numeric"
            err={err}
            touch={touch}
          />
        </fieldset>
      )}

      <Alert icon={<Clock className="size-5" aria-hidden />} title="Se envía una sola vez">
        Cada envío crea un FRAP nuevo y reserva un recurso. El botón se bloquea mientras se procesa; no vuelvas a enviar.
      </Alert>
    </div>
  );
}
