# Implementation Plan — Control remoto del Pantallón desde el celular

Permitir manejar el **Pantallón** (modo TV a pantalla completa) desde el celular en la misma sesión de juego: la compu proyecta la TV y muestra un **código de sala**; el celu entra a `/control`, ingresa el código, se empareja y puede dar **Siguiente / Reiniciar**, **ver el resultado actual** y el **historial**. El transporte es un relay realtime en la nube emparejado por room code (decisión ya tomada); el deploy sigue siendo **Vercel estático**.

> **Tareas pensadas para devs jr.** Cada tarea es chica, secuencial y con criterios de aceptación claros. NO hagas la siguiente sin terminar la anterior. Copiá los snippets tal cual. UI y comentarios en **español**. Commits convencionales, SIN `Co-Authored-By` ni atribución de IA.

---

## Pre-requisitos

**Leé antes de empezar (rutas exactas):**

- `CLAUDE.md` (raíz) — invariantes del proyecto.
- `README.md` (raíz) — reglas de juego.
- `src/App.tsx` — árbol de rutas (`react-router-dom`, layout route + hijas).
- `src/presentation/Layout.tsx` — cascarón con nav + `<Outlet/>`.
- `src/presentation/tv/useTvScreen.ts` — orquesta el Pantallón, reusa `useCaller`.
- `src/presentation/tv/TvContainer.tsx` y `src/presentation/tv/TvView.tsx`.
- `src/presentation/caller/useCaller.ts` — lógica de mazo (modos, triviales, sorteo).
- `src/domain/types.ts` y `src/domain/deck.ts` — patrón de dominio puro + RNG inyectable.
- `src/domain/deck.test.ts` — patrón de tests (Vitest; RNG seeded determinista).

**Herramientas / comandos (gestor: pnpm; NUNCA buildear como verificación):**

```bash
pnpm install          # tras agregar dependencias
pnpm dev              # dev server en http://localhost:5173
pnpm test             # vitest run (solo matchea src/**/*.test.ts)
pnpm typecheck        # tsc --noEmit  (este es el "lint")
```

**Verificar estado base antes de tocar nada:**

- `pnpm typecheck` pasa sin errores.
- `pnpm test` pasa (los tests de dominio existentes están verdes).
- `pnpm dev` levanta y el Pantallón funciona end-to-end en `/pantallon` (setup → empezar → Espacio avanza → R reinicia).

---

## INVARIANTES QUE NO SE TOCAN (leer y respetar en TODAS las tareas)

1. **La TV (`/pantallon`) NUNCA muestra `current.result`.** Solo la operación. Esta invariante se mantiene intacta. El **celular SÍ puede mostrar el resultado** porque es otra superficie con otro rol (control del maestro). No mezcles ambas: el celu no comparte componentes de render con la TV.
2. **El Pantallón es la ÚNICA autoridad del estado de juego.** Tiene el mazo (`useTvScreen` → `useCaller`). El celu es un control delgado: envía comandos (`next`/`reset`) y **renderiza** el snapshot que la TV difunde. NO dupliques la lógica del mazo en el celu.
3. **Dominio puro ↔ presentación.** La lógica testeable (protocolo de mensajes + reducer/serialización del snapshot) vive en `src/domain/` con tests Vitest. El adaptador de red es fino y reemplazable (para cambiar de proveedor sin tocar la lógica de juego).
4. **Aleatoriedad inyectable.** Si algún módulo de dominio nuevo usa azar (ej. generar room code), recibe `random: RandomFn = Math.random`. NO llames `Math.random` directo dentro de `src/domain/`.
5. **`excludeTrivial` y `mode` los manda el Pantallón.** El celu NO los cambia (fuera de alcance, ver al final).

---

## DECISIÓN 0 (APROBADA) — Proveedor de relay: Ably Pub/Sub

**Decisión tomada y aprobada por el usuario.** Se eligió **Ably** sobre Supabase Realtime por el motivo de abajo. La tabla queda como contexto.

| Proveedor | Cómo encaja | Pros | Contras |
|-----------|-------------|------|---------|
| **Ably (Pub/Sub)** ✅ elegido | SDK cliente (`ably`) + `VITE_ABLY_KEY`. Canal por room code, evento `msg`. | Pub/sub puro = exactamente lo que necesitamos; **no se duerme** estando ocioso; deploy sigue 100% estático en Vercel; free tier holgado (200 conexiones, 6M msgs/mes — usamos ~2 conexiones y ~100 msgs por partida). | Dependencia comercial; la API key viaja en el bundle (mitigación abajo). |
| **Supabase Realtime (Broadcast)** | Solo cliente + `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. | Cero servidor; `anon key` pública por diseño; SDK maduro. | **Pausa el proyecto free tras 7 días de inactividad de base de datos**, y el broadcast NO cuenta como actividad de DB → para uso esporádico de salón te lo encontrás pausado justo el día del juego (hay que despausarlo a mano). |
| **PartyKit** | Worker de rooms desplegado aparte (ahora de Cloudflare). | Diseñado exacto para rooms; no se duerme; gratis en tu propia cuenta Cloudflare. | Requiere **desplegar y mantener un worker** fuera de Vercel: suma un artefacto de deploy. |

**Por qué Ably y no Supabase:** a esta escala (2 conexiones) el tamaño del free tier es irrelevante en los tres. Lo que decide es la **pausa por inactividad** de Supabase, que rompe el uso esporádico. Ably es pub/sub puro (justo lo que pedimos), no se duerme y se integra solo del lado cliente.

> **Seguridad de la API key (importante).** A diferencia de la `anon key` de Supabase, la API key de Ably **no está pensada para ser pública**. Como no tenemos backend, el camino pragmático es embeberla en el cliente, PERO mitigando: en el dashboard de Ably, crear una key con **capabilities limitadas a `publish` + `subscribe`** (sin `admin` ni `channel-metadata`). Peor caso: alguien usa tu cuota free. El camino production-grade (token auth con endpoint propio) queda **fuera de scope** porque exige un backend.

> **El plan de abajo asume Ably Pub/Sub.** Solo la **Task 4** (el adaptador de red) conoce el proveedor; las Tasks 1–3, 5–10 quedan igual porque la lógica de juego es agnóstica.

---

## Protocolo de mensajes (referencia para Tasks 1 y 4)

Dos roles en un mismo canal (`room:<CODE>`):

- **Pantallón (host)** → difunde estado. **Celu (control)** → envía comandos.

| Evento | Emisor | Payload | Cuándo |
|--------|--------|---------|--------|
| `control:hello` | celu | `{}` | al unirse el celu (pide snapshot — late join) |
| `host:snapshot` | TV | `GameSnapshot` (estado completo) | al recibir `control:hello` y tras CADA cambio de estado |
| `control:command` | celu | `{ type: 'next' } \| { type: 'reset' }` | al tocar botones del celu |

- **Late join**: cuando el celu entra, manda `control:hello`; la TV responde con `host:snapshot` completo. Si el celu entra antes que la TV, no recibe nada hasta que la TV difunda; el celu muestra "Esperando al Pantallón…".
- **Reconexión**: si el canal se cae y reconecta, el celu re-emite `control:hello` para re-sincronizar. La TV es idempotente (difunde el snapshot actual).
- **El snapshot es el estado COMPLETO** (no deltas): así late join y reconexión son triviales.

---

## Task 1 — Definir tipos y reducer puro del protocolo (dominio)

**Archivo nuevo**: `src/domain/remote.ts`

Módulo puro, sin React ni red. Define el snapshot que la TV difunde, los mensajes del canal y un **reducer puro** que aplica un mensaje entrante al estado local del control. Esto es lo testeable; el adaptador de red (Task 4) solo serializa/deserializa.

```ts
import type { RandomFn } from './types'

/** Modo de juego, alineado con CallerMode de la presentación. */
export type RemoteMode = '3x3' | '4x4'

/** Fase del Pantallón, alineada con useTvScreen. */
export type RemotePhase = 'setup' | 'playing'

/** Una operación cantada, tal como la ve el control (CON resultado: el celu sí lo muestra). */
export interface RemoteCall {
  /** Operación sin resultado. Ej "7 × 8". */
  operation: string
  /** Resultado de la operación (el número cantado). El celu SÍ lo muestra. */
  result: number
}

/**
 * Estado COMPLETO del juego que el Pantallón difunde al control.
 * No son deltas: cada snapshot es autosuficiente (sirve para late join y reconexión).
 */
export interface GameSnapshot {
  phase: RemotePhase
  mode: RemoteMode
  excludeTrivial: boolean
  /** Operación + resultado actuales, o null si todavía no se cantó nada. */
  current: RemoteCall | null
  /** Historial completo, del más viejo al más nuevo. */
  history: RemoteCall[]
  total: number
  drawn: number
  exhausted: boolean
}

/** Comandos que el control le manda al Pantallón. */
export type RemoteCommand = { type: 'next' } | { type: 'reset' }

/** Eventos que viajan por el canal. Discriminados por `kind`. */
export type RemoteMessage =
  | { kind: 'control:hello' }
  | { kind: 'host:snapshot'; snapshot: GameSnapshot }
  | { kind: 'control:command'; command: RemoteCommand }

/** Nombres de evento del canal (constantes, para no tipear strings sueltos). */
export const REMOTE_EVENTS = {
  hello: 'control:hello',
  snapshot: 'host:snapshot',
  command: 'control:command',
} as const

/**
 * Estado que mantiene el CONTROL (celu). Empieza desconectado/sin snapshot.
 * `connected` = el canal está suscrito; `snapshot` = último estado recibido de la TV.
 */
export interface ControlState {
  connected: boolean
  snapshot: GameSnapshot | null
}

export const initialControlState: ControlState = {
  connected: false,
  snapshot: null,
}

/** Acciones internas del reducer del control. */
export type ControlAction =
  | { type: 'channel-connected' }
  | { type: 'channel-disconnected' }
  | { type: 'message'; message: RemoteMessage }

/**
 * Reducer PURO del control: dado el estado actual y una acción, devuelve el
 * nuevo estado. El único mensaje entrante que le interesa al control es
 * `host:snapshot`; los demás los ignora (el adaptador no debería enviárselos,
 * pero el reducer es defensivo).
 */
export function controlReducer(
  state: ControlState,
  action: ControlAction
): ControlState {
  switch (action.type) {
    case 'channel-connected':
      return { ...state, connected: true }
    case 'channel-disconnected':
      return { ...state, connected: false }
    case 'message':
      if (action.message.kind === 'host:snapshot') {
        return { ...state, snapshot: action.message.snapshot }
      }
      return state
    default:
      return state
  }
}

/** Alfabeto sin caracteres ambiguos (sin 0/O/1/I) para el room code. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4

/**
 * Genera un room code corto y legible. Aleatoriedad INYECTABLE (patrón del dominio):
 * los tests pasan un RNG determinista. NO usa Math.random directo.
 */
export function generateRoomCode(random: RandomFn = Math.random): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(random() * CODE_ALPHABET.length)
    code += CODE_ALPHABET[idx]
  }
  return code
}

/** Normaliza lo que el usuario tipea en el celu: mayúsculas y sin espacios. */
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '')
}
```

**Notas**:
- `RemoteMode` y `RemotePhase` se mantienen **independientes** de `CallerMode`/fase de `useTvScreen` a propósito (el dominio no importa de presentación). Son estructuralmente idénticos; en Task 7 se mapea.
- `RemoteCall` incluye `result` porque el **celu** sí lo muestra. La TV nunca usa este módulo para renderizar.
- No agregues lógica de red acá. Este archivo NO importa nada de red (Ably) ni de React.

**Criterios de aceptación**:
- `pnpm typecheck` pasa.
- El archivo no importa React ni ningún SDK de red (solo `./types`).
- `generateRoomCode` con un RNG que siempre devuelve `0` retorna `'AAAA'` (primer char del alfabeto, 4 veces).

---

## Task 2 — Tests del reducer y del room code

**Archivo nuevo**: `src/domain/remote.test.ts`

Cubre el reducer puro y los helpers de room code, siguiendo el patrón de `src/domain/deck.test.ts` (RNG seeded determinista para lo aleatorio).

```ts
import { describe, it, expect } from 'vitest'
import {
  controlReducer,
  initialControlState,
  generateRoomCode,
  normalizeRoomCode,
  type GameSnapshot,
} from './remote'

/** RNG determinista (mulberry32), igual patrón que deck.test.ts. */
function makeSeeded(seed: number): () => number {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SNAPSHOT: GameSnapshot = {
  phase: 'playing',
  mode: '4x4',
  excludeTrivial: true,
  current: { operation: '7 × 8', result: 56 },
  history: [{ operation: '7 × 8', result: 56 }],
  total: 30,
  drawn: 1,
  exhausted: false,
}

describe('controlReducer', () => {
  it('arranca desconectado y sin snapshot', () => {
    expect(initialControlState).toEqual({ connected: false, snapshot: null })
  })

  it('channel-connected marca connected en true sin tocar snapshot', () => {
    const next = controlReducer(initialControlState, { type: 'channel-connected' })
    expect(next.connected).toBe(true)
    expect(next.snapshot).toBeNull()
  })

  it('channel-disconnected marca connected en false y conserva el snapshot', () => {
    const withSnap = controlReducer(
      { connected: true, snapshot: null },
      { type: 'message', message: { kind: 'host:snapshot', snapshot: SNAPSHOT } }
    )
    const next = controlReducer(withSnap, { type: 'channel-disconnected' })
    expect(next.connected).toBe(false)
    expect(next.snapshot).toEqual(SNAPSHOT)
  })

  it('host:snapshot guarda el snapshot completo', () => {
    const next = controlReducer(initialControlState, {
      type: 'message',
      message: { kind: 'host:snapshot', snapshot: SNAPSHOT },
    })
    expect(next.snapshot).toEqual(SNAPSHOT)
  })

  it('ignora mensajes que no son host:snapshot', () => {
    const next = controlReducer(initialControlState, {
      type: 'message',
      message: { kind: 'control:hello' },
    })
    expect(next).toEqual(initialControlState)
  })
})

describe('generateRoomCode', () => {
  it('genera 4 caracteres del alfabeto seguro (sin 0/O/1/I)', () => {
    const code = generateRoomCode(makeSeeded(42))
    expect(code).toHaveLength(4)
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
  })

  it('es reproducible con la misma semilla', () => {
    expect(generateRoomCode(makeSeeded(7))).toBe(generateRoomCode(makeSeeded(7)))
  })

  it('con RNG que devuelve 0 retorna AAAA', () => {
    expect(generateRoomCode(() => 0)).toBe('AAAA')
  })
})

describe('normalizeRoomCode', () => {
  it('pasa a mayúsculas y saca espacios', () => {
    expect(normalizeRoomCode('  ab c2 ')).toBe('ABC2')
  })
})
```

**Notas**:
- `deck.test.ts` importa `describe/it/expect` explícitamente de `vitest`, así que acá también se importan (consistencia con el repo). No quites ese import.

**Criterios de aceptación**:
- `pnpm test src/domain/remote.test.ts` pasa todos los casos.
- `pnpm test` completo sigue verde (no rompiste tests existentes).

---

## Task 3 — Instalar y configurar Ably client + variables de entorno

**Archivos**: `package.json` (vía pnpm), `src/vite-env.d.ts` (nuevo), `.env.example` (nuevo), `.env.local` (nuevo, NO commitear), `.gitignore` (verificar/editar).

Instalá el SDK y tipá las variables de entorno de Vite. Sin esto, `import.meta.env.VITE_...` no tiene tipos.

```bash
pnpm add ably
```

Crear `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ABLY_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Crear `.env.example` (SÍ se commitea, sin valores reales):

```
# Ably: app gratuita en https://ably.com → API Keys.
# IMPORTANTE: esta key viaja en el bundle del cliente. Creá en el dashboard una key
# con capabilities SOLO `publish` + `subscribe` (sin `admin` ni `channel-metadata`).
VITE_ABLY_KEY=TU_APP.TU_KEY:TU_SECRET
```

Crear `.env.local` con la API key real de la app de Ably (este NO se commitea).

**Notas**:
- Verificá que `.gitignore` incluya `.env.local` y `.env*.local`. Si no, agregá esas líneas. NO commitees `.env.local`.
- **Ops Vercel** (documentar en el PR, no en código): en el dashboard de Vercel → Project → Settings → Environment Variables, agregar `VITE_ABLY_KEY` (Production + Preview). Las `VITE_*` se inyectan en build; redeploy tras agregarla.
- En Ably no hace falta configurar nada extra: el pub/sub funciona con la app recién creada. Lo único obligatorio: **restringir las capabilities de la key a `publish` + `subscribe`** (la key es visible en el cliente, ver Seguridad en Decisión 0).

**Criterios de aceptación**:
- `ably` aparece en `dependencies` de `package.json` tras `pnpm add`.
- `pnpm typecheck` pasa (los tipos de `import.meta.env` resuelven).
- `.env.local` existe localmente con la key real y NO está trackeado por git (`git status` no lo muestra).

---

## Task 4 — Adaptador de red (canal Ably Pub/Sub)

**Archivo nuevo**: `src/presentation/remote/channel.ts`

Adaptador FINO y reemplazable: crea/conecta un canal por room code y expone enviar/recibir mensajes tipados (`RemoteMessage` de Task 1). NO contiene lógica de juego. Es lo único que conoce Ably; cambiar de proveedor = reescribir solo este archivo.

```ts
import * as Ably from 'ably'
import type { RemoteMessage } from '../../domain/remote'

const ABLY_KEY = import.meta.env.VITE_ABLY_KEY

/**
 * Un único cliente Realtime para toda la app.
 * `echoMessages: false` → el emisor NO recibe sus propios mensajes (la TV no
 * procesa su propio snapshot, ni el celu su propio comando).
 */
const client = new Ably.Realtime({ key: ABLY_KEY, echoMessages: false })

/** Nombre del canal a partir del room code. */
function channelName(code: string): string {
  return `room:${code}`
}

/** Conexión a una sala. Devuelve una API mínima e independiente del proveedor. */
export interface RoomConnection {
  /** Envía un mensaje tipado al resto de los participantes del canal. */
  send: (message: RemoteMessage) => void
  /** Cierra el canal y libera recursos. */
  close: () => void
}

/**
 * Se une al canal de la sala `code`.
 * - `onMessage`: callback con cada RemoteMessage recibido (no incluye los propios).
 * - `onStatus`: callback con true (canal adjunto) / false (caído).
 *
 * Usa un único nombre de evento ('msg') y mete el RemoteMessage en `data`;
 * así el adaptador no necesita conocer cada `kind`.
 */
export function joinRoom(
  code: string,
  onMessage: (message: RemoteMessage) => void,
  onStatus: (connected: boolean) => void
): RoomConnection {
  const name = channelName(code)
  const channel = client.channels.get(name)

  // Suscribirse al evento 'msg' auto-adjunta el canal.
  channel.subscribe('msg', (msg) => {
    onMessage(msg.data as RemoteMessage)
  })

  // Estado del canal → connected. 'attached' = listo; el resto = caído.
  channel.on('attached', () => onStatus(true))
  channel.on('detached', () => onStatus(false))
  channel.on('suspended', () => onStatus(false))
  channel.on('failed', () => onStatus(false))

  return {
    send: (message) => {
      void channel.publish('msg', message)
    },
    close: () => {
      channel.unsubscribe()
      channel.detach()
      client.channels.release(name)
    },
  }
}
```

**Notas**:
- `echoMessages: false` (a nivel cliente) evita que el emisor reciba sus propios mensajes. Como hay UN solo cliente para toda la app y ni la TV ni el celu quieren su propio eco, ponerlo a nivel cliente es correcto.
- Un solo evento (`'msg'`) transporta cualquier `RemoteMessage`; el discriminador es `message.kind`. Esto mantiene el adaptador agnóstico del contenido.
- `channel.on('attached', …)` es el equivalente a "suscrito y listo": ahí el celu pide el snapshot (`control:hello`). El resto de estados (`detached`/`suspended`/`failed`) reportan caída.
- `publish` devuelve una promesa; la ignoramos con `void` (fire-and-forget, igual que el broadcast anterior).
- Carpeta `src/presentation/remote/` es nueva: contiene el adaptador y los hooks de las dos superficies. Es presentación (toca red/efectos), por eso NO va en `domain/`.
- Si `VITE_ABLY_KEY` falta en runtime, `new Ably.Realtime` falla al conectar; eso es esperado en dev sin `.env.local`. El manejo amigable de "config faltante" queda fuera de alcance (ver al final).

**Criterios de aceptación**:
- `pnpm typecheck` pasa.
- El archivo importa de `ably` y de `../../domain/remote`, y de NADA más de presentación.
- No hay referencias a `mode`/`deck`/`draw` ni lógica de juego acá.

---

## Task 5 — Hook host: difundir snapshot desde el Pantallón

**Archivo nuevo**: `src/presentation/remote/useRemoteHost.ts`

Hook que vive en el Pantallón. Recibe el estado actual del juego (desde `useTvScreen`) + un room code, se une al canal y **difunde un `host:snapshot` cada vez que el estado cambia**. También responde a `control:hello` (late join) reenviando el snapshot, y traduce los `control:command` entrantes en callbacks (`onNext`/`onReset`).

```ts
import { useEffect, useRef } from 'react'
import { joinRoom, type RoomConnection } from './channel'
import type { GameSnapshot, RemoteMessage } from '../../domain/remote'

interface UseRemoteHostArgs {
  /** Room code de la sala. Si es null/'' no se conecta. */
  code: string | null
  /** Snapshot actual del juego (lo arma el container del Pantallón). */
  snapshot: GameSnapshot
  /** Qué hacer cuando el control pide "siguiente". */
  onNext: () => void
  /** Qué hacer cuando el control pide "reiniciar". */
  onReset: () => void
}

/**
 * Lado HOST del control remoto: difunde el snapshot del juego al canal y
 * ejecuta los comandos que llegan del celu. El Pantallón sigue siendo la
 * autoridad del estado; esto es solo un transporte.
 */
export function useRemoteHost({ code, snapshot, onNext, onReset }: UseRemoteHostArgs) {
  const connRef = useRef<RoomConnection | null>(null)

  // Refs para que el listener (suscrito una sola vez por code) siempre vea el
  // último snapshot y los últimos callbacks sin re-suscribir el canal.
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext
  const onResetRef = useRef(onReset)
  onResetRef.current = onReset

  // Conexión al canal: se rehace solo si cambia el code.
  useEffect(() => {
    if (!code) return
    const handleMessage = (message: RemoteMessage) => {
      if (message.kind === 'control:hello') {
        // Late join: el celu pide el estado actual → se lo mandamos.
        connRef.current?.send({ kind: 'host:snapshot', snapshot: snapshotRef.current })
      } else if (message.kind === 'control:command') {
        if (message.command.type === 'next') onNextRef.current()
        else if (message.command.type === 'reset') onResetRef.current()
      }
    }
    const conn = joinRoom(code, handleMessage, () => {})
    connRef.current = conn
    return () => {
      conn.close()
      connRef.current = null
    }
  }, [code])

  // Difundir el snapshot cada vez que cambia (incluye late "ya estaba conectado").
  useEffect(() => {
    connRef.current?.send({ kind: 'host:snapshot', snapshot })
  }, [snapshot])
}
```

**Notas**:
- El `snapshot` debe ser **estable por valor**: el container lo arma con `useMemo` (Task 7) para que el `useEffect` de difusión no dispare en cada render.
- Las comparaciones contra los literales (`'control:hello'`, `'control:command'`, `'host:snapshot'`) hacen que TypeScript estreche el tipo del mensaje por el discriminador `kind`. Usá los literales (no `REMOTE_EVENTS.x`) acá para que el narrowing funcione.
- NO importás `useTvScreen` acá: el hook recibe `snapshot`/callbacks como args (inversión de dependencias, testeable y desacoplado).

**Criterios de aceptación**:
- `pnpm typecheck` pasa.
- El hook no contiene lógica de mazo ni de operaciones; solo transporte.
- Cambiar `code` cierra el canal anterior y abre uno nuevo (la función de cleanup llama `conn.close()`).

---

## Task 6 — Hook control: estado del celu desde el canal

**Archivo nuevo**: `src/presentation/remote/useRemoteControl.ts`

Hook del celu. Dado un room code, se une al canal, manda `control:hello` al conectar (late join + reconexión), mantiene el `ControlState` con el `controlReducer` puro (Task 1) y expone `sendCommand`.

```ts
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { joinRoom, type RoomConnection } from './channel'
import { controlReducer, initialControlState } from '../../domain/remote'
import type { RemoteCommand } from '../../domain/remote'

/**
 * Lado CONTROL (celu) del control remoto. Se une a la sala, pide el snapshot al
 * conectar (late join / reconexión) y mantiene el último estado recibido vía el
 * reducer puro. NO tiene lógica de juego: solo recibe estado y manda comandos.
 */
export function useRemoteControl(code: string | null) {
  const [state, dispatch] = useReducer(controlReducer, initialControlState)
  const connRef = useRef<RoomConnection | null>(null)

  useEffect(() => {
    if (!code) return
    const conn = joinRoom(
      code,
      (message) => dispatch({ type: 'message', message }),
      (connected) => {
        dispatch({ type: connected ? 'channel-connected' : 'channel-disconnected' })
        // Al (re)conectar, pedir el snapshot actual al Pantallón.
        if (connected) {
          conn.send({ kind: 'control:hello' })
        }
      }
    )
    connRef.current = conn
    return () => {
      conn.close()
      connRef.current = null
    }
  }, [code])

  const sendCommand = useCallback((command: RemoteCommand) => {
    connRef.current?.send({ kind: 'control:command', command })
  }, [])

  return {
    connected: state.connected,
    snapshot: state.snapshot,
    sendCommand,
  }
}
```

**Notas**:
- `dispatch` es estable (lo garantiza `useReducer`), por eso el `useEffect` solo depende de `code`.
- `conn.send({ kind: 'control:hello' })` dentro del callback de status usa el `conn` recién creado, no `connRef` (que aún no se asignó cuando llega el primer status). Dejalo así.

**Criterios de aceptación**:
- `pnpm typecheck` pasa.
- Al conectar el canal, el hook envía `control:hello`.
- `snapshot` arranca `null` y se actualiza al recibir `host:snapshot`.

---

## Task 7 — Cablear el host en el Pantallón (room code + difusión)

**Archivos**: `src/presentation/tv/useTvScreen.ts`, `src/presentation/tv/TvContainer.tsx`.

El Pantallón genera un room code al entrar a `playing` y arma el `GameSnapshot` para difundirlo vía `useRemoteHost`. Necesitamos exponer `history` desde `useTvScreen` (hoy `useCaller` lo tiene pero `useTvScreen` no lo reexpone).

**7a — Exponer `history` y un `roomCode` en `useTvScreen.ts`.**

Importá el generador arriba del archivo, junto al import de `useCaller`:

```ts
import { generateRoomCode } from '../../domain/remote'
```

En el destructuring de `useCaller` (líneas ~22-33), agregá `history`:

```ts
  const {
    mode,
    setMode,
    excludeTrivial,
    setExcludeTrivial,
    current,
    history,
    total,
    drawn,
    exhausted,
    callNext,
    reset,
  } = useCaller()
```

Declará el estado del room code junto a los otros `useState` (después de `const [isFullscreen, setIsFullscreen] = useState(false)`):

```ts
  const [roomCode, setRoomCode] = useState<string | null>(null)
```

En `start`, genera el code al entrar a jugar. El bloque queda así:

```ts
  const start = useCallback(() => {
    clearTimers()
    locked.current = false
    reset()
    setReveal('egg')
    setPose('idle')
    setRoomCode(generateRoomCode())
    setPhase('playing')
    enterFullscreen()
  }, [clearTimers, reset, enterFullscreen])
```

En `backToSetup`, limpiá el code (al salir se cierra la sala):

```ts
  const backToSetup = useCallback(() => {
    clearTimers()
    locked.current = false
    exitFullscreen()
    reset()
    setReveal('egg')
    setPose('idle')
    setRoomCode(null)
    setPhase('setup')
  }, [clearTimers, exitFullscreen, reset])
```

Agregá `history` y `roomCode` al objeto que retorna el hook (cerca de `isFullscreen`):

```ts
  return {
    rootRef,
    phase,
    mode,
    setMode,
    excludeTrivial,
    setExcludeTrivial,
    current,
    history,
    reveal,
    mascotPose,
    total,
    drawn,
    exhausted,
    isFullscreen,
    roomCode,
    start,
    advance,
    restart,
    backToSetup,
    toggleFullscreen,
  }
```

**7b — Armar el snapshot y conectar el host en `TvContainer.tsx`.** Reemplazá el contenido completo del archivo por:

```tsx
import { useMemo } from 'react'
import { useTvScreen } from './useTvScreen'
import { TvView } from './TvView'
import { useRemoteHost } from '../remote/useRemoteHost'
import type { GameSnapshot, RemoteCall } from '../../domain/remote'

export function TvContainer() {
  const tv = useTvScreen()

  // Mapear el historial del cantor (CurrentCall) al historial remoto (RemoteCall).
  const remoteHistory: RemoteCall[] = useMemo(
    () => tv.history.map((c) => ({ operation: c.operation, result: c.result })),
    [tv.history]
  )

  // Snapshot completo que se difunde al control. useMemo para no difundir en cada render.
  const snapshot: GameSnapshot = useMemo(
    () => ({
      phase: tv.phase,
      mode: tv.mode,
      excludeTrivial: tv.excludeTrivial,
      current: tv.current
        ? { operation: tv.current.operation, result: tv.current.result }
        : null,
      history: remoteHistory,
      total: tv.total,
      drawn: tv.drawn,
      exhausted: tv.exhausted,
    }),
    [
      tv.phase,
      tv.mode,
      tv.excludeTrivial,
      tv.current,
      remoteHistory,
      tv.total,
      tv.drawn,
      tv.exhausted,
    ]
  )

  useRemoteHost({
    code: tv.roomCode,
    snapshot,
    onNext: tv.advance,
    onReset: tv.restart,
  })

  return (
    <TvView
      rootRef={tv.rootRef}
      phase={tv.phase}
      mode={tv.mode}
      excludeTrivial={tv.excludeTrivial}
      current={tv.current}
      reveal={tv.reveal}
      mascotPose={tv.mascotPose}
      total={tv.total}
      drawn={tv.drawn}
      exhausted={tv.exhausted}
      isFullscreen={tv.isFullscreen}
      roomCode={tv.roomCode}
      onModeChange={(m) => tv.setMode(m)}
      onExcludeTrivialChange={(v) => tv.setExcludeTrivial(v)}
      onStart={tv.start}
      onAdvance={tv.advance}
      onRestart={tv.restart}
      onBackToSetup={tv.backToSetup}
      onToggleFullscreen={tv.toggleFullscreen}
    />
  )
}
```

**Notas**:
- `onNext: tv.advance` y `onReset: tv.restart` reusan EXACTAMENTE las mismas acciones que el teclado/botones de la TV. La animación de eclosión, el lock anti-doble-canto y la invariante de no mostrar el resultado en la TV se mantienen porque el comando del celu pasa por `advance`, no por un atajo nuevo.
- `roomCode` se pasa a `TvView` (se consume en Task 8). Si ejecutás 7 y 8 en commits separados, `pnpm typecheck` fallará entre medio por el prop `roomCode` que `TvView` aún no declara — por eso conviene mergear 7 y 8 juntas (ver orden de merge).
- La invariante crítica sigue intacta: `TvView` NO recibe `result` ni `history`; el celu sí los recibe vía el snapshot.

**Criterios de aceptación**:
- Con Task 8 aplicada, `pnpm typecheck` pasa.
- `pnpm dev`: entrar a `/pantallon`, Empezar, abrir consola → no hay errores; al avanzar con Espacio el estado del juego sigue funcionando igual que antes.

---

## Task 8 — Mostrar room code + QR/URL en el Pantallón

**Archivos**: `src/presentation/tv/TvView.tsx`, `src/presentation/tv/tv.css`. Dependencia opcional para QR.

Mostrar el room code en la pantalla de juego (esquina, junto al progreso) y, opcional, un QR con la URL `/control?code=XXXX` para escanear con el celu.

**8a — Agregar el prop `roomCode` a `TvView` y mostrarlo.**

En la interfaz `TvViewProps` agregá (junto a `isFullscreen: boolean`):

```ts
  roomCode: string | null
```

Agregá `roomCode` al destructuring de props de `TvView` (junto a `isFullscreen`). Luego, dentro del bloque `phase === 'playing'`, justo después de `<div className="tv__progress">{drawn} / {total}</div>`, agregá:

```tsx
          {roomCode && (
            <div className="tv__room">
              <span className="tv__room-label">Control:</span>
              <span className="tv__room-code">{roomCode}</span>
            </div>
          )}
```

**8b — CSS del room code** en `src/presentation/tv/tv.css` (al final del archivo):

```css
/* Código de sala para el control remoto del celu. */
.tv__room {
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.85);
  z-index: 5;
}
.tv__room-label {
  opacity: 0.7;
}
.tv__room-code {
  font-weight: 800;
  letter-spacing: 0.18em;
  font-size: 1.5rem;
}
```

**8c — (Opcional, recomendado) QR escaneable.** Si querés el QR, instalá:

```bash
pnpm add qrcode.react
```

Importá en `TvView.tsx`:

```tsx
import { QRCodeSVG } from 'qrcode.react'
```

Y reemplazá el bloque `{roomCode && (…)}` de 8a por esta versión con QR:

```tsx
          {roomCode && (
            <div className="tv__room">
              <div className="tv__room-text">
                <span className="tv__room-label">Control en el celu:</span>
                <span className="tv__room-code">{roomCode}</span>
              </div>
              <QRCodeSVG
                value={`${window.location.origin}/control?code=${roomCode}`}
                size={96}
                bgColor="transparent"
                fgColor="#ffffff"
              />
            </div>
          )}
```

**Notas**:
- La URL del QR usa `window.location.origin` → funciona en local (`http://localhost:5173`) y en prod sin hardcodear dominio. **Ojo en local**: el celu debe estar en la misma red y usar la IP de la compu, no `localhost`; para una prueba real conviene probar en el deploy de Vercel. Documentalo en el PR.
- Si NO querés agregar dependencia de QR ahora, omití 8c: el código de 4 chars se tipea a mano fácil. El QR queda como mejora.
- El bloque `.tv__room` queda fuera de `.tv__bar`, así que no lo afecta el auto-hide de controles: el code está siempre visible mientras se juega. Correcto.

**Criterios de aceptación**:
- `pnpm typecheck` pasa.
- `pnpm dev` → `/pantallon` → Empezar: se ve el room code (4 chars) en la esquina superior izquierda.
- Si hiciste 8c: el QR aparece y al escanearlo abre `/control?code=XXXX`.

---

## Task 9 — Vista del control remoto (celu) + ruta `/control`

**Archivos nuevos**: `src/presentation/remote/ControlContainer.tsx`, `src/presentation/remote/ControlView.tsx`, `src/presentation/remote/control.css`. Modificar `src/App.tsx`.

Pantalla mobile-first donde el usuario ingresa el code (o lo recibe por `?code=`), se empareja y controla el juego. Mostrar resultado actual + historial. **Sin nav del Layout** (vista limpia para el celu).

**9a — `ControlContainer.tsx`** (container: lee el code del input/URL, usa `useRemoteControl`):

```tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRemoteControl } from './useRemoteControl'
import { normalizeRoomCode } from '../../domain/remote'
import { ControlView } from './ControlView'
import './control.css'

export function ControlContainer() {
  const [params] = useSearchParams()
  // Code precargado desde el QR (?code=XXXX), si vino.
  const initialCode = normalizeRoomCode(params.get('code') ?? '')

  // `input` es lo que el usuario tipea; `code` es el code confirmado (con el que conectamos).
  const [input, setInput] = useState(initialCode)
  const [code, setCode] = useState<string | null>(initialCode || null)

  const { connected, snapshot, sendCommand } = useRemoteControl(code)

  return (
    <ControlView
      input={input}
      code={code}
      connected={connected}
      snapshot={snapshot}
      onInputChange={(v) => setInput(normalizeRoomCode(v))}
      onConnect={() => setCode(input || null)}
      onDisconnect={() => setCode(null)}
      onNext={() => sendCommand({ type: 'next' })}
      onReset={() => sendCommand({ type: 'reset' })}
    />
  )
}
```

**9b — `ControlView.tsx`** (presentational puro):

```tsx
import type { GameSnapshot } from '../../domain/remote'

interface ControlViewProps {
  input: string
  code: string | null
  connected: boolean
  snapshot: GameSnapshot | null
  onInputChange: (value: string) => void
  onConnect: () => void
  onDisconnect: () => void
  onNext: () => void
  onReset: () => void
}

export function ControlView({
  input,
  code,
  connected,
  snapshot,
  onInputChange,
  onConnect,
  onDisconnect,
  onNext,
  onReset,
}: ControlViewProps) {
  // Sin code confirmado: pantalla de emparejamiento.
  if (!code) {
    return (
      <div className="control">
        <h1 className="control__title">Control del Pantallón</h1>
        <p className="control__hint">Ingresá el código que aparece en la TV.</p>
        <form
          className="control__join"
          onSubmit={(e) => {
            e.preventDefault()
            onConnect()
          }}
        >
          <input
            className="control__input"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="CÓDIGO"
            maxLength={4}
            autoCapitalize="characters"
            autoCorrect="off"
            inputMode="text"
            aria-label="Código de sala"
          />
          <button className="control__connect" type="submit" disabled={input.length < 4}>
            Conectar
          </button>
        </form>
      </div>
    )
  }

  // Con code: panel de control.
  const exhausted = snapshot?.exhausted ?? false
  return (
    <div className="control">
      <header className="control__bar">
        <span className={connected ? 'control__dot control__dot--on' : 'control__dot'} />
        <span className="control__room">Sala {code}</span>
        <button className="control__leave" type="button" onClick={onDisconnect}>
          Salir
        </button>
      </header>

      {!snapshot ? (
        <p className="control__waiting">Esperando al Pantallón…</p>
      ) : (
        <>
          <section className="control__current">
            <span className="control__current-label">Operación actual</span>
            {snapshot.current ? (
              <>
                <span className="control__current-op">{snapshot.current.operation}</span>
                <span className="control__current-res">= {snapshot.current.result}</span>
              </>
            ) : (
              <span className="control__current-empty">Todavía no se cantó nada.</span>
            )}
          </section>

          <div className="control__actions">
            <button
              className="control__next"
              type="button"
              onClick={onNext}
              disabled={exhausted}
            >
              ▶ Siguiente
            </button>
            <button className="control__reset" type="button" onClick={onReset}>
              ↻ Reiniciar
            </button>
          </div>

          <section className="control__history">
            <h2>Ya cantados ({snapshot.history.length})</h2>
            {snapshot.history.length === 0 ? (
              <p className="control__history-empty">Todavía no se cantó nada.</p>
            ) : (
              <ul className="control__history-list">
                {[...snapshot.history].reverse().map((call, index) => (
                  <li
                    key={snapshot.history.length - 1 - index}
                    className={
                      index === 0
                        ? 'control__chip control__chip--latest'
                        : 'control__chip'
                    }
                  >
                    <span className="control__chip-op">{call.operation}</span>
                    <span className="control__chip-eq">=</span>
                    <span className="control__chip-res">{call.result}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
```

**9c — `control.css`** (mobile-first, mínimo y legible). Crear el archivo:

```css
.control {
  max-width: 28rem;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100dvh;
}
.control__title { font-size: 1.4rem; margin: 0; }
.control__hint { opacity: 0.7; margin: 0; }
.control__join { display: flex; gap: 0.5rem; }
.control__input {
  flex: 1;
  font-size: 2rem;
  text-align: center;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  padding: 0.5rem;
}
.control__connect, .control__next, .control__reset, .control__leave {
  font-size: 1.1rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
}
.control__bar { display: flex; align-items: center; gap: 0.5rem; }
.control__dot {
  width: 0.75rem; height: 0.75rem; border-radius: 50%;
  background: #888;
}
.control__dot--on { background: #34d399; }
.control__room { font-weight: 700; letter-spacing: 0.1em; }
.control__leave { margin-left: auto; }
.control__waiting { opacity: 0.7; }
.control__current {
  display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
  padding: 1.5rem; border: 2px solid currentColor; border-radius: 0.75rem;
}
.control__current-label { opacity: 0.6; font-size: 0.9rem; }
.control__current-op { font-size: 2.5rem; font-weight: 800; }
.control__current-res { font-size: 1.5rem; opacity: 0.85; }
.control__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.control__next { font-size: 1.4rem; }
.control__history-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-wrap: wrap; gap: 0.4rem;
}
.control__chip {
  display: inline-flex; gap: 0.25rem; align-items: baseline;
  padding: 0.3rem 0.5rem; border-radius: 0.5rem;
  background: rgba(127,127,127,0.15);
}
.control__chip--latest { background: rgba(52,211,153,0.25); font-weight: 700; }
```

**9d — Agregar la ruta `/control` en `src/App.tsx`.** Va FUERA del layout route (vista limpia, sin nav). Reemplazá el contenido completo del archivo por:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './presentation/Layout'
import { GeneratorContainer } from './presentation/generator/GeneratorContainer'
import { CallerContainer } from './presentation/caller/CallerContainer'
import { TvContainer } from './presentation/tv/TvContainer'
import { ControlContainer } from './presentation/remote/ControlContainer'
import './app.css'

export default function App() {
  return (
    <Routes>
      {/* Control remoto del celu: vista limpia, fuera del Layout con nav. */}
      <Route path="/control" element={<ControlContainer />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/cartones" replace />} />
        <Route path="cartones" element={<GeneratorContainer />} />
        <Route path="cantor" element={<CallerContainer />} />
        <Route path="pantallon" element={<TvContainer />} />
        <Route path="*" element={<Navigate to="/cartones" replace />} />
      </Route>
    </Routes>
  )
}
```

**Notas**:
- `/control` queda fuera del `Layout` → no muestra el nav (Cartones / El cantor / Pantallón). Es lo deseado: el celu es una superficie dedicada.
- `vercel.json` ya hace fallback SPA (`/(.*) → /index.html`), así que recargar `/control?code=XXXX` en el celu funciona sin 404. No hay que tocar `vercel.json`.
- El celu **muestra `result`** (`snapshot.current.result` y los `result` del historial). Esto NO viola la invariante de la TV: es otra superficie con otro rol.
- El celu NO ofrece cambiar modo ni triviales (fuera de alcance).

**Criterios de aceptación**:
- `pnpm typecheck` pasa.
- `pnpm dev` → abrir `/control` en otra pestaña: aparece la pantalla de emparejamiento; al ingresar un code y conectar, muestra "Esperando al Pantallón…" hasta recibir snapshot.
- Navegar a `/control` NO muestra el header/nav de la app.

---

## Task 10 — Prueba end-to-end del flujo completo (manual)

**Archivos**: ninguno (verificación). Documentar el resultado en el PR.

Validar el flujo objetivo con dos pestañas/dispositivos contra la misma app de Ably. Requiere `.env.local` configurado (Task 3).

**Pasos:**

1. `pnpm dev`. Abrir pestaña A en `/pantallon`, elegir modo, **Empezar**. Anotar el room code que aparece.
2. Abrir pestaña B en `/control` (o escanear el QR con el celu si probás en Vercel). Ingresar el code, **Conectar**.
3. En el celu (B): debe aparecer la operación actual con su resultado y el historial.
4. En el celu (B) tocar **Siguiente** → la TV (A) avanza (animación de eclosión + nueva operación) y el celu muestra la nueva operación + resultado y la suma al historial.
5. Avanzar varias veces desde el celu y desde la TV (Espacio): ambos lados quedan sincronizados.
6. **Late join**: con la partida ya empezada y varios cantos hechos, abrir un control NUEVO (recargar pestaña B). Debe recibir el snapshot completo (operación actual + historial entero), no arrancar vacío.
7. **Reiniciar desde el celu**: tocar **Reiniciar** → la TV reinicia (vuelve al huevo, historial vacío) y el celu refleja historial vacío.
8. **Mazo agotado**: avanzar hasta agotar → el botón **Siguiente** del celu queda deshabilitado (`exhausted`).
9. **Salir del Pantallón** (✕ en la TV): el room code desaparece; el celu deja de recibir actualizaciones (queda con el último snapshot).

**Criterios de aceptación**:
- Los 9 pasos se cumplen.
- `pnpm typecheck` y `pnpm test` pasan.
- La TV en ningún momento muestra el resultado (solo la operación); el celu sí lo muestra. Invariante verificada visualmente.

---

## Orden de merge sugerido

```
1 → 2            (dominio: protocolo + tests)            ← mergeable solo
3                (deps + env)                            ← mergeable solo
4 → 5 → 6        (adaptador de red + hooks)
7 + 8            (host: difusión + UI del code; juntas)
9                (vista del control + ruta)
10               (verificación E2E; no es código)
```

> Tasks 1–2 y 3 son independientes entre sí; 4 depende de 3 (SDK + tipos de env) y de 1 (tipos). 7 depende de 5; 8 debe ir junto con 7 (el prop `roomCode` de `TvView`). 9 depende de 6.

---

## Fuera de scope (para otra iteración — NO hacer ahora aunque tiente)

- **Cambiar modo / triviales desde el celu.** El Pantallón es el dueño de `mode`/`excludeTrivial`. El celu solo da `next`/`reset`.
- **Múltiples controladores simultáneos** coordinados (presence, "quién manda"). Hoy cualquier celu con el code puede mandar comandos; no hay locking de un único controlador.
- **Reconexión avanzada / colas de comandos offline.** Si el canal se cae, al reconectar se re-pide el snapshot; no se encolan comandos perdidos.
- **Validación de room code contra colisiones** (que dos partidas usen el mismo code). Con 4 chars del alfabeto seguro la colisión es baja para uso de salón; no se valida unicidad global.
- **Manejo amigable de config faltante** (mensaje si falta `VITE_ABLY_KEY`). Si falta, falla en runtime; aceptable para esta iteración.
- **Tests de los hooks de presentación** (`useRemoteHost`/`useRemoteControl`) y del adaptador. La lógica testeable ya está en `remote.ts` (Tasks 1–2); los hooks son transporte fino. Mockear Supabase queda para después.
- **Persistir la partida si se recarga el Pantallón.** Recargar la TV pierde el estado (igual que hoy: navegar desmonta y reinicia). No se cambia ese comportamiento.
