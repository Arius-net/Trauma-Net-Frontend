/**
 * Componentes base del sistema visual (Figma, página «Componentes» 2:2):
 * Botón, Campo, Selector segmentado, Insignia de estado, Triage, Frescura, Alerta, Tarjeta, KPI, Tabla.
 * Sin sombras ni colores de estado: la estructura la dan bordes finos de 1 px.
 */
import Image from "next/image";
import { forwardRef, useId } from "react";
import { Loader2 } from "lucide-react";
import { AVISO_OFICIAL, TRIAGE_LABEL } from "@/lib/labels";
import type { NivelTriage } from "@/types/api";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Botón (4:90) ---------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  loading?: boolean;
  block?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  block = false,
  className,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-3 text-sm font-semibold leading-5 transition-colors max-sm:min-h-12",
        block && "w-full",
        variant === "primary"
          ? "bg-brand text-white hover:bg-[#13307a] disabled:bg-n-100 disabled:text-n-500"
          : "border border-n-300 bg-surface text-n-900 hover:bg-n-50 disabled:border-n-200 disabled:text-n-500",
        "disabled:cursor-not-allowed",
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------- Campo (4:114) ---------- */
interface FieldProps {
  label: string;
  help?: string;
  error?: string | null;
  className?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}

export function Field({ label, help, error, className, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  const msg = error || help;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-medium text-n-900">
        {label}
      </label>
      {children({ id, describedBy: msg ? msgId : undefined, invalid: !!error })}
      {msg && (
        <p id={msgId} className={cx("text-xs", error ? "text-error" : "text-n-600")}>
          {msg}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "w-full min-h-11 max-sm:min-h-12 rounded-md border bg-surface px-3 py-2.5 text-sm text-n-900 placeholder:text-n-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent read-only:bg-n-50 disabled:bg-n-50 disabled:text-n-600";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(inputBase, invalid ? "border-error" : "border-n-300", className)}
      {...rest}
    />
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cx(inputBase, "appearance-none bg-[length:10px] pr-8", invalid ? "border-error" : "border-n-300", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M0 0h10L5 6z' fill='%23353F57'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({
  invalid,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cx(inputBase, "min-h-20", invalid ? "border-error" : "border-n-300", className)}
      {...rest}
    />
  );
}

/* ---------- Selector segmentado ---------- */
interface SegmentedProps<T extends string | number | boolean> {
  label: string;
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  error?: string | null;
  help?: string;
  disabled?: boolean;
  /** Estilo de selección: «fill» = botón primario (control de vía), «soft» = selección del asistente. */
  tone?: "soft" | "fill";
  className?: string;
  hideLabel?: boolean;
}

export function Segmented<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
  error,
  help,
  disabled,
  tone = "soft",
  className,
  hideLabel,
}: SegmentedProps<T>) {
  const id = useId();
  const msg = error || help;
  return (
    <div
      role="radiogroup"
      aria-labelledby={`${id}-l`}
      aria-describedby={msg ? `${id}-m` : undefined}
      className={cx("flex min-w-0 flex-col gap-1", className)}
    >
      <span id={`${id}-l`} className={cx("text-xs font-medium text-n-900", hideLabel && "sr-only")}>
        {label}
      </span>
      <div className="flex gap-2">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={cx(
                "min-h-11 min-w-0 flex-1 rounded-md border px-2 py-2 text-sm transition-colors max-sm:min-h-12 disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? tone === "fill"
                    ? "border-brand bg-brand font-semibold text-white"
                    : "border-2 border-accent bg-selected font-semibold text-link"
                  : cx("bg-surface text-n-900 hover:bg-n-50", error ? "border-error" : "border-n-300")
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {msg && (
        <p id={`${id}-m`} className={cx("text-xs", error ? "text-error" : "text-n-600")}>
          {msg}
        </p>
      )}
    </div>
  );
}

/* ---------- Insignia de estado (4:152) y de vía (4:136): neutras ---------- */
export function StatusBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-sm border border-n-300 bg-surface px-2 py-0.5 text-xs font-medium leading-4 text-n-900",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Triage (4:126): texto en negrita coloreado ---------- */
const TRIAGE_CLASS: Record<NivelTriage, string> = {
  rojo: "text-triage-rojo",
  amarillo: "text-triage-amarillo",
  verde: "text-triage-verde",
  negro: "text-triage-negro",
};

export function TriageText({
  nivel,
  withPrefix = false,
  className,
}: {
  nivel: NivelTriage | string | null | undefined;
  withPrefix?: boolean;
  className?: string;
}) {
  if (!nivel || !(nivel in TRIAGE_LABEL)) return <span className="text-n-600">—</span>;
  const n = nivel as NivelTriage;
  const label = withPrefix ? `Triage ${n}` : TRIAGE_LABEL[n];
  return <span className={cx("font-semibold", TRIAGE_CLASS[n], className)}>{label}</span>;
}

/* ---------- Frescura (4:153) ---------- */
export function Freshness({ texto }: { texto: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] border border-n-300 bg-surface px-2 py-0.5 text-xs font-medium leading-4 text-n-900">
      <Image src="/reloj.svg" alt="" width={20} height={20} aria-hidden />
      {texto}
    </span>
  );
}

/* ---------- Alerta (6:48): neutra ---------- */
export function Alert({
  icon,
  title,
  children,
  className,
  role,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div role={role} className={cx("flex gap-3 rounded-md border border-n-300 bg-surface p-3", className)}>
      {icon && <span className="mt-0.5 shrink-0 text-n-800">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-n-900">{title}</p>
        {children && <div className="text-sm text-n-700">{children}</div>}
      </div>
    </div>
  );
}

/* ---------- Tarjeta (6:53) ---------- */
export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
  as: Tag = "section",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  as?: "section" | "div";
}) {
  return (
    <Tag className={cx("flex min-w-0 flex-col gap-4 rounded-lg border border-n-200 bg-surface p-5", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title && <h2 className="font-cond text-xl font-semibold leading-[26px] text-n-900">{title}</h2>}
            {subtitle && <p className="text-xs text-n-700">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-end gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/* ---------- KPI (6:56) ---------- */
export function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-l-[3px] border-accent px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-n-900">{label}</p>
      <p className="font-cond text-[32px] font-bold leading-10 text-n-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-n-700">{sub}</p>}
    </div>
  );
}

/* ---------- Tabla densa: encabezado 36 px, filas 40 px ---------- */
export function Table({ children, className, label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <div className={cx("w-full overflow-x-auto rounded-md border border-n-200 bg-surface", className)}>
      <table className="w-full border-collapse text-left text-sm" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className, numeric }: { children?: React.ReactNode; className?: string; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cx(
        "h-9 whitespace-nowrap border-b border-n-200 bg-subtle px-4 py-2 text-xs font-semibold text-n-700",
        numeric && "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  numeric,
  mono,
}: {
  children?: React.ReactNode;
  className?: string;
  numeric?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      className={cx(
        "h-10 border-b border-n-200 px-4 py-2 align-middle text-n-900",
        numeric && "text-right tabular-nums",
        mono && "font-mono text-[13px] font-medium",
        className
      )}
    >
      {children}
    </td>
  );
}

export function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-n-200 bg-surface" aria-busy="true" aria-label="Cargando datos">
      <div className="flex h-9 items-center gap-6 border-b border-n-200 bg-subtle px-4">
        {Array.from({ length: cols }).map((_, i) => (
          <span key={i} className="tn-skeleton h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex h-10 items-center gap-6 border-b border-n-200 px-4 last:border-0">
          {Array.from({ length: cols }).map((_, i) => (
            <span key={i} className="tn-skeleton h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- Pares etiqueta/valor (detalle) ---------- */
export function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-n-200 py-4 text-sm">
      <dt className="text-n-700">{label}</dt>
      <dd className="text-right font-semibold text-n-900">{children}</dd>
    </div>
  );
}

/* ---------- Encabezado de página y aviso oficial ---------- */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="border-b border-n-200 bg-surface px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="break-all font-cond text-2xl font-bold leading-[30px] text-n-900">{title}</h1>
          {subtitle && <p className="text-xs text-n-700">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

export function AvisoOficial({ className, children }: { className?: string; children?: string }) {
  return <p className={cx("text-xs text-n-600", className)}>{children || AVISO_OFICIAL}</p>;
}
