# TraumaNet Frontend (Next.js 15 + TypeScript + Tailwind CSS)

Repositorio independiente de la interfaz web unificada de **TraumaNet** (Despacho de Emergencias y Derivación Interhospitalaria en el corredor Tuxtla Gutiérrez – San Cristóbal – Comitán).

> **Principio rector:** TraumaNet apoya la decisión; no decide. Este frontend consume **exclusivamente** la API REST de FastAPI autenticada mediante **JWT Bearer** y no contiene drivers ni acceso directo a bases de datos.

## Arranque local

```powershell
copy .env.local.example .env.local    # opcional; por defecto apunta a http://127.0.0.1:8000/api/v1
npm install
npm run dev
```

Abrir **`http://localhost:3000/login`** con el backend corriendo en `http://127.0.0.1:8000`.

## Scripts de verificación
```powershell
npm run typecheck
npm run lint
npm run build
```

## Vistas integradas
- `/login`: inicio de sesión JWT con carga rápida de perfiles demo sintéticos (`CRUM`, `PARAMEDICO`, `JEFE_URGENCIAS`).
- `/crum`: consola del corredor de 8 hospitales, control en vivo de tramos viales y simulador de derivación en cascada.
- `/paramedico`: captura dinámica de FRAP (4 perfiles clínicos) y resultado unificado de la Decisión 1.
- `/urgencias`: gestión de capacidad hospitalaria (`CHECK disponibles >= 0`), confirmación de reservas entrantes y barrido TTL.
- `/expedientes` y `/expedientes/[frap_id]`: listado filtrable y expediente combinado MongoDB + PostgreSQL.
