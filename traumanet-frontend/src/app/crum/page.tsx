"use client";

/**
 * Consola CRUM (Figma 16:627).
 * GET /network/hospitals · PATCH /network/tramos/{id} · GET /network/cascade
 * GET /hospitals/{id}/reservas · POST /reservas/{id}/confirm · POST /reservas/expire-overdue
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  CascadaCard,
  EstadoViaCard,
  ExpirarButton,
  hospitalLabel,
  oldestUpdate,
  ReservasTable,
  useNow,
} from "@/components/hospital";
import { QueryView } from "@/components/states";
import { AvisoOficial, Button, Card, Field, Freshness, PageHeader, Select, Table, Td, Th } from "@/components/ui";
import { api } from "@/lib/api";
import { formatHace } from "@/lib/format";
import { RECURSO_LABEL, zonaLabel } from "@/lib/labels";
import type { TipoRecurso } from "@/types/api";

const COLUMNAS: TipoRecurso[] = ["cama_uci", "quirofano", "sala_choque"];
import { useQuery } from "@/lib/useQuery";
import type { HospitalRedItem } from "@/types/api";

export default function CrumPage() {
  return (
    <AppShell roles={["CRUM"]}>
      <Consola />
    </AppShell>
  );
}

function Consola() {
  const router = useRouter();
  const red = useQuery("red", () => api.networkHospitals());
  const now = useNow(1000);

  return (
    <>
      <PageHeader title="Consola CRUM" subtitle="Red hospitalaria, estado de vía, derivación en cascada y reservas" />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <Card
          title={`Red hospitalaria${red.data ? ` (${red.data.total_hospitales} hospitales)` : ""}`}
          subtitle="Disponibles / total por recurso crítico. Disponibles = total − ocupados − reservados."
          actions={
            <>
              {red.data && (
                <Freshness
                  texto={`Dato más antiguo: ${formatHace(oldestUpdate(red.data.hospitales.flatMap((h) => h.recursos)), now)}`}
                />
              )}
              <Button onClick={() => router.push("/despacho")}>Nueva evaluación de despacho</Button>
            </>
          }
        >
          <QueryView query={red} skeletonCols={6} skeletonRows={8}>
            {(data) => <RedTable hospitales={data.hospitales} />}
          </QueryView>
        </Card>

        {red.data && (
          <>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <EstadoViaCard hospitales={red.data.hospitales} onChanged={red.reload} />
              <CascadaCard hospitales={red.data.hospitales} />
            </div>
            <ReservasCrum hospitales={red.data.hospitales} />
          </>
        )}

        <AvisoOficial />
      </div>
    </>
  );
}

function RedTable({ hospitales }: { hospitales: HospitalRedItem[] }) {
  return (
    <Table label="Red hospitalaria">
      <thead>
        <tr>
          <Th className="w-[34%]">Hospital</Th>
          <Th>Zona</Th>
          <Th numeric>Nivel</Th>
          {COLUMNAS.map((t) => (
            <Th key={t} numeric>
              {RECURSO_LABEL[t]}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hospitales.map((h) => (
          <tr key={h.hospital_id}>
            <Td>{hospitalLabel(h)}</Td>
            <Td>{zonaLabel(h.zona)}</Td>
            <Td numeric>{h.nivel_atencion}</Td>
            {COLUMNAS.map((t) => {
              const r = h.recursos.find((x) => x.tipo_recurso === t);
              return (
                <Td key={t} numeric>
                  {r ? (
                    <span title={`${r.ocupados} ocupados · ${r.reservados} reservados`}>
                      {r.disponibles}/{r.total}
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function ReservasCrum({ hospitales }: { hospitales: HospitalRedItem[] }) {
  const [hospitalId, setHospitalId] = useState<number>(hospitales[0]?.hospital_id ?? 1);
  const reservas = useQuery(`reservas:${hospitalId}`, () => api.reservas(hospitalId));

  return (
    <Card
      title="Reservas del hospital"
      subtitle="La reserva activa dura 15 min (TTL por defecto) y se libera sola si nadie la confirma."
      actions={
        <>
          <Field label="Hospital" className="w-full sm:w-[280px]">
            {({ id }) => (
              <Select id={id} value={hospitalId} onChange={(e) => setHospitalId(Number(e.target.value))}>
                {hospitales.map((h) => (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {hospitalLabel(h)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <ExpirarButton onDone={reservas.reload} />
        </>
      }
    >
      <QueryView query={reservas} skeletonCols={7} skeletonRows={3}>
        {(data) => (
          <ReservasTable
            reservas={data}
            onConfirmed={(r) =>
              reservas.setData((prev) => prev?.map((x) => (x.reserva_id === r.reserva_id ? r : x)))
            }
          />
        )}
      </QueryView>
    </Card>
  );
}
