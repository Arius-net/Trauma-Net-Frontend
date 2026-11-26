"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/AppShell";
import { useNotify } from "@/components/Notifications";
import { AvisoOficial, Button, Field, Input } from "@/components/ui";
import { isApiError, USE_MOCKS } from "@/lib/api";
import { homeForRole, useSession } from "@/lib/session";

function validarUsuario(v: string): string | null {
  const t = v.trim();
  if (t.length < 3 || t.length > 50) return "Debe tener entre 3 y 50 caracteres";
  return null;
}
function validarPassword(v: string): string | null {
  if (v.length < 6) return "Mínimo 6 caracteres";
  if (v.length > 128) return "Máximo 128 caracteres";
  return null;
}

export default function LoginPage() {
  const { user, ready, login } = useSession();
  const router = useRouter();
  const notify = useNotify();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [tocado, setTocado] = useState({ usuario: false, password: false });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(homeForRole(user.rol));
  }, [ready, user, router]);

  const errUsuario = tocado.usuario ? validarUsuario(usuario) : null;
  const errPassword = tocado.password ? validarPassword(password) : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setTocado({ usuario: true, password: true });
    if (validarUsuario(usuario) || validarPassword(password)) return;
    setEnviando(true);
    try {
      const u = await login(usuario.trim(), password);
      router.replace(homeForRole(u.rol));
    } catch (err) {
      if (isApiError(err) && err.kind === "network") return; // ya se notificó la caída de red
      notify(
        "No se pudo iniciar sesión",
        isApiError(err) && err.kind === "unauthorized" ? "Usuario o contraseña incorrectos." : isApiError(err) ? err.message : undefined
      );
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-app md:flex-row">
      <aside className="flex flex-col justify-between gap-8 bg-brand px-6 py-6 text-white md:w-[44%] md:px-16 md:py-16">
        <div className="flex items-center gap-2">
          <Logo className="size-10 md:size-10" />
          <span className="font-cond text-2xl font-semibold">TraumaNet</span>
        </div>
        <div className="flex flex-col gap-3 max-md:hidden">
          <p className="font-cond text-[28px] font-bold leading-9">
            Apoyo a la decisión para despacho prehospitalario y referencia interhospitalaria.
          </p>
          <p className="text-sm text-on-nav">Corredor Tuxtla Gutiérrez – San Cristóbal de Las Casas – Comitán.</p>
        </div>
        <p className="text-xs text-on-nav max-md:hidden">
          TraumaNet apoya la decisión; no decide ni sustituye el criterio clínico del regulador médico del CRUM.
          Prototipo académico con datos sintéticos.
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex w-full max-w-[420px] flex-col gap-4 rounded-lg border border-n-200 bg-surface p-6"
        >
          <h1 className="font-cond text-2xl font-bold text-n-900">Iniciar sesión</h1>
          <Field label="Nombre de usuario" help="3 a 50 caracteres" error={errUsuario}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={usuario}
                maxLength={50}
                onChange={(e) => setUsuario(e.target.value)}
                onBlur={() => setTocado((t) => ({ ...t, usuario: true }))}
              />
            )}
          </Field>
          <Field label="Contraseña" help="Mínimo 6 caracteres" error={errPassword}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="current-password"
                value={password}
                maxLength={128}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTocado((t) => ({ ...t, password: true }))}
              />
            )}
          </Field>
          <Button type="submit" block loading={enviando}>
            Entrar
          </Button>
          <p className="text-xs text-n-700">
            Tu rol (CRUM, paramédico o jefe de urgencias) define las pantallas disponibles.
          </p>
          {USE_MOCKS && (
            <p className="rounded-md border border-n-200 bg-subtle p-2 text-xs text-n-700">
              Modo de datos de ejemplo: usa un usuario sintético del seed (p. ej. crum_sintetico_01) y cualquier
              contraseña de 6+ caracteres.
            </p>
          )}
        </form>
        <AvisoOficial className="max-w-[420px] text-center md:hidden" />
      </main>
    </div>
  );
}
