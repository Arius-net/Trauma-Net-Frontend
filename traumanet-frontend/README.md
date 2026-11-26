# TraumaNet Frontend (Next.js 15 + TypeScript + Tailwind CSS)

Interfaz web de **TraumaNet**, sistema de apoyo a la decisión para despacho prehospitalario y referencia
interhospitalaria en el corredor Tuxtla Gutiérrez – San Cristóbal de Las Casas – Comitán.

> TraumaNet apoya la decisión; no decide ni sustituye el criterio clínico del regulador médico del CRUM.
> Este frontend consume **exclusivamente** la API REST de FastAPI (`/api/v1`, JWT Bearer). Solo existe en la
> interfaz lo que el backend puede hacer.

## Arranque

```powershell
copy .env.local.example .env.local    # opcional: por defecto la API es http://127.0.0.1:8000/api/v1
npm install
npm run dev                           # http://127.0.0.1:3000
```

### Modo con datos de ejemplo (sin backend)

```powershell
$env:NEXT_PUBLIC_USE_MOCKS = "true"; npm run dev
```

o `NEXT_PUBLIC_USE_MOCKS=true` en `.env.local`. Inicia sesión con cualquier usuario sintético del seed
(`crum_sintetico_01`, `paramedico_sint_01`, `jefe_urg_h1`…`jefe_urg_h8`) y una contraseña de 6+ caracteres.
En mocks, el despacho de «Intoxicación / quemaduras» responde 409 para probar la vista «Sin asignación».

## Verificación

```powershell
npm run typecheck
npm run lint
npm run build
```

## Vistas

| Ruta | Rol | Endpoints |
|---|---|---|
| `/login` | todos | `POST /auth/login` |
| `/crum` | CRUM | `GET /network/hospitals`, `PATCH /network/tramos/{id}`, `GET /network/cascade`, `GET /hospitals/{id}/reservas`, `POST /reservas/{id}/confirm`, `POST /reservas/expire-overdue` |
| `/urgencias` | Jefe de Urgencias (su hospital), CRUM | `GET/PUT /hospitals/{id}/capacity`, `GET /hospitals/{id}/reservas`, `POST /reservas/{id}/confirm`, `POST /reservas/expire-overdue`, `GET /network/cascade`, `GET /network/hospitals` |
| `/expedientes` | todos | `GET /expedientes?estado_frap&tipo_incidente&limit` |
| `/expedientes/[frap_id]` | todos | `GET /expedientes/{frap_id}`, `GET /network/hospitals` |
| `/despacho` | Paramédico, CRUM | `POST /dispatch/evaluate-and-assign` (+ `GET /network/hospitals` para el CRUM) |
| `/despacho/resultado` | Paramédico, CRUM | respuesta del despacho (201 asignado / 409 sin asignación), `GET /network/hospitals` |

## Estructura

- `src/lib/api.ts` — cliente tipado único (JWT, normalización de errores, sin reintentos automáticos).
- `src/lib/mocks.ts` — modo de datos de ejemplo.
- `src/lib/session.tsx` — sesión en memoria + `sessionStorage`, cierre al vencer `expires_at` o ante 401.
- `src/types/api.ts` — tipos derivados de los schemas Pydantic del backend.
- `src/components/ui.tsx` — componentes base del sistema visual (Figma «Componentes»).
- `src/components/despacho/` — asistente de 5 pasos (estado, validación y payload).
- `tailwind.config.ts` + `src/app/globals.css` — tokens de color, radios y tipografía (IBM Plex vía `next/font`).
