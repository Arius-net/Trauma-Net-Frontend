"use client";

/**
 * Expedientes — lista (Figma 17:268). GET /expedientes?estado_frap&tipo_incidente&limit
 * Sin búsqueda por texto ni paginación: la API solo filtra por estado, tipo y límite.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, QueryView } from "@/components/states";
import { AvisoOficial, Field, PageHeader, Select, StatusBadge, Table, Td, Th, TriageText } from "@/components/ui";
import { api } from "@/lib/api";
import { formatFecha } from "@/lib/format";
import { ESTADOS_FRAP, INCIDENTE_LABEL, TIPOS_INCIDENTE } from "@/lib/labels";
import { useQuery } from "@/lib/useQuery";
import type { EstadoFrap, TipoIncidente } from "@/types/api";

const LIMITES = [10, 25, 50, 100, 200];

export default function ExpedientesPage() {
  return (
    <AppShell roles={["CRUM", "JEFE_URGENCIAS", "PARAMEDICO"]}>
      <Lista />
    </AppShell>
  );
}

function Lista() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoFrap | "">("");
  const [tipo, setTipo] = useState<TipoIncidente | "">("");
  const [limit, setLimit] = useState(50);

  const q = useQuery(`exp:${estado}:${tipo}:${limit}`, () =>
    api.expedientes({ estado_frap: estado || undefined, tipo_incidente: tipo || undefined, limit })
  );

  return (
    <>
      <PageHeader title="Expedientes" subtitle="FRAP registrados (MongoDB)" />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Estado del FRAP" help="reportado · evaluando · asignado · sin_asignacion · cerrado">
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoFrap | "")}
              >
                <option value="">Todos</option>
                {ESTADOS_FRAP.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Tipo de incidente" help="politrauma · infarto_agudo · trauma_craneoencefalico · intoxicacion_quemaduras">
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoIncidente | "")}
              >
                <option value="">Todos</option>
                {TIPOS_INCIDENTE.map((t) => (
                  <option key={t} value={t}>
                    {INCIDENTE_LABEL[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Límite" help="1 a 200 registros">
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                {LIMITES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <QueryView query={q} skeletonCols={6} skeletonRows={6}>
          {(data) =>
            data.length === 0 ? (
              <EmptyState>Sin expedientes con estos filtros.</EmptyState>
            ) : (
              <Table label="Expedientes FRAP">
                <thead>
                  <tr>
                    <Th>FRAP</Th>
                    <Th>Paciente sintético</Th>
                    <Th>Tipo de incidente</Th>
                    <Th>Triage</Th>
                    <Th>Estado FRAP</Th>
                    <Th>Creado</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((f) => (
                    <tr
                      key={f.frap_id}
                      className="cursor-pointer hover:bg-selected"
                      onClick={() => router.push(`/expedientes/${f.frap_id}`)}
                    >
                      <Td mono>
                        <Link
                          href={`/expedientes/${f.frap_id}`}
                          className="text-n-900 underline-offset-2 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {f.frap_id}
                        </Link>
                      </Td>
                      <Td mono>{f.paciente_sintetico?.id_sintetico ?? "—"}</Td>
                      <Td>{f.tipo_incidente ? INCIDENTE_LABEL[f.tipo_incidente] ?? f.tipo_incidente : "—"}</Td>
                      <Td>
                        <TriageText nivel={f.triage?.nivel} />
                      </Td>
                      <Td>{f.estado_frap ? <StatusBadge>{f.estado_frap}</StatusBadge> : "—"}</Td>
                      <Td className="whitespace-nowrap">{formatFecha(f.creado_en)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          }
        </QueryView>

        <p className="text-xs text-n-700">
          La API devuelve hasta el límite elegido y filtra solo por estado y tipo de incidente; no hay búsqueda por texto
          ni paginación. El hospital destino y el ETA se ven al abrir el expediente.
        </p>
        <AvisoOficial />
      </div>
    </>
  );
}
