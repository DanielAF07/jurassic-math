# Implementation Plan — Lotería de Multiplicar

App web client-only (React + Vite + TypeScript) para un juego educativo de tablas de multiplicar. Tiene dos secciones: un **Generador de cartones** imprimibles y una **Pantalla de juego ("el cantor")** que canta números/operaciones sin reemplazo. Arquitectura limpia con dominio puro testeado (Vitest) separado de la presentación (container/presentational).

> **Tareas pensadas para devs jr.** Cada tarea es chica, secuencial y con criterios de aceptación claros. NO hagas la siguiente sin terminar la anterior. NO infieras: copia los snippets tal cual. Si algo no está en el plan, NO lo agregues (revisa "Fuera de scope").

---

## Pre-requisitos

- **Node.js >= 18** instalado (`node -v`). Vite 5 requiere Node 18+.
- **pnpm** instalado (`pnpm -v`). Si no está: `npm i -g pnpm`. (Usamos pnpm; si el equipo usa npm, reemplazá `pnpm` por `npm` en todos los comandos.)
- La ruta `/Users/daniel/workspace/loteria-multiplicar/` está vacía / no existe. Todo el proyecto vive dentro de esa carpeta.
- Verificación del estado base: NO hay código previo. La Task 1 crea el proyecto desde cero.

### Convenciones del repo (respetar SIEMPRE)
- **Commits**: conventional commits (`feat:`, `chore:`, `test:`, `style:`, `refactor:`, etc.). NUNCA agregar `Co-Authored-By` ni atribución de IA en commits ni en PRs.
- **Idioma**: nombres de dominio en inglés (`Card`, `Deck`, `pool`), textos visibles al usuario en español.
- **Sin backend, sin persistencia, sin red.** Todo en memoria/cliente.
- **Dominio puro**: las carpetas de dominio NO importan React ni nada de UI. Si un archivo de `domain/` importa algo de `react`, está mal.

### Estructura de carpetas objetivo (Screaming + Clean)
```
loteria-multiplicar/
├── src/
│   ├── domain/                  # PURO. Sin React. Testeable.
│   │   ├── cards/
│   │   │   ├── types.ts
│   │   │   ├── generateCards3x3.ts
│   │   │   ├── generateCards4x4.ts
│   │   │   └── generateCards.ts
│   │   ├── products/
│   │   │   ├── productPool.ts
│   │   │   └── factorizations.ts
│   │   ├── deck/
│   │   │   └── deck.ts
│   │   └── shared/
│   │       └── random.ts
│   ├── presentation/            # React. container/presentational.
│   │   ├── generator/
│   │   │   ├── GeneratorContainer.tsx
│   │   │   ├── GeneratorForm.tsx
│   │   │   ├── CardView.tsx
│   │   │   └── PrintableCards.tsx
│   │   ├── caller/
│   │   │   ├── CallerContainer.tsx
│   │   │   ├── CallerView.tsx
│   │   │   ├── CallHistory.tsx
│   │   │   └── useCaller.ts
│   │   └── app/
│   │       ├── App.tsx
│   │       └── App.css
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts (o config dentro de vite.config.ts)
```

---

## Task 1 — Scaffolding del proyecto Vite

**Carpeta**: `/Users/daniel/workspace/loteria-multiplicar/`

Crear el proyecto base con la plantilla oficial React + TypeScript de Vite.

Ejecutar desde `/Users/daniel/workspace/`:

```bash
pnpm create vite@latest loteria-multiplicar --template react-ts
cd loteria-multiplicar
pnpm install
```

**Notas**:
- La plantilla `react-ts` genera `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/App.css`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `package.json`, `.gitignore`.
- NO borres nada todavía; en tareas posteriores reorganizamos los archivos generados.
- Si la carpeta `loteria-multiplicar` ya existe vacía, `create vite` igual funciona apuntando a ella.

**Criterios de aceptación**:
- `pnpm dev` levanta el server en `http://localhost:5173` y muestra la pantalla default de Vite + React.
- Existe `package.json` con dependencias `react`, `react-dom` y devDependencies `vite`, `typescript`, `@vitejs/plugin-react`.
- `git init` ya está hecho por la plantilla; si no, correr `git init`.

---

## Task 2 — Instalar y configurar Vitest

**Archivos**: `package.json`, `vite.config.ts` (editar)

Agregar Vitest para testear el dominio. Vitest se integra con la config de Vite.

Ejecutar:
```bash
pnpm add -D vitest
```

Editar `vite.config.ts` para que quede exactamente así (ajustá el import de plugin-react si la plantilla usó otro nombre, normalmente es `@vitejs/plugin-react`):

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

Editar `package.json`, agregar al objeto `"scripts"` el script de test (dejá los demás scripts que ya existen):

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Notas**:
- `environment: 'node'` porque el dominio es puro (no necesita DOM).
- El comentario `/// <reference types="vitest/config" />` arriba habilita el typing de la clave `test` en `defineConfig`.

**Criterios de aceptación**:
- `pnpm test` corre Vitest y reporta "No test files found" (todavía no hay tests). No debe tirar error de config.
- TypeScript no marca error en `vite.config.ts` por la clave `test`.

---

## Task 3 — Crear estructura de carpetas y limpiar plantilla

**Carpetas/archivos**: crear `src/domain/`, `src/presentation/` y subcarpetas; mover `App.tsx`/`main.tsx`.

Crear las carpetas vacías de la estructura objetivo y reubicar los archivos React generados por la plantilla.

Ejecutar desde la raíz del proyecto:
```bash
mkdir -p src/domain/cards src/domain/products src/domain/deck src/domain/shared
mkdir -p src/presentation/generator src/presentation/caller src/presentation/app
```

Mover los archivos de la plantilla:
```bash
mv src/App.tsx src/presentation/app/App.tsx
mv src/App.css src/presentation/app/App.css
```

Editar `src/main.tsx` para que el import de `App` apunte a la nueva ruta. Reemplazar la línea de import (la plantilla suele tener `import App from './App.tsx'` o `import App from './App'`):

```tsx
import App from './presentation/app/App.tsx'
```

Editar `src/presentation/app/App.tsx`: si tiene `import './App.css'` déjalo igual (ahora `App.css` está en la misma carpeta, la ruta relativa `./App.css` sigue siendo válida). Si tenía `import reactLogo from './assets/react.svg'` o similar, puedes borrar esos imports y el JSX que los usa; en la Task 11 reescribimos `App.tsx` por completo, así que por ahora solo asegúrate de que compile.

**Notas**:
- NO muevas `main.tsx` ni `index.css` (quedan en `src/`).
- Si quedan imports rotos a `vite.svg` / `react.svg`, borralos. El objetivo de esta task es que `pnpm dev` siga levantando sin errores tras la reorganización.

**Criterios de aceptación**:
- Existen todas las carpetas de la estructura objetivo.
- `pnpm dev` levanta sin errores de import.
- `src/presentation/app/App.tsx` y `App.css` existen; ya no existen `src/App.tsx` ni `src/App.css`.

---

## Task 4 — Utilidades de aleatoriedad (dominio shared)

**Archivo**: `src/domain/shared/random.ts`

Funciones puras de barajado y elección aleatoria. Reciben opcionalmente una función `rng` (random number generator) para poder testear con valores deterministas.

```ts
// src/domain/shared/random.ts

/** Tipo de un RNG: devuelve un número en [0, 1). Default: Math.random. */
export type Rng = () => number

/**
 * Devuelve una copia barajada de `items` usando Fisher-Yates.
 * NO muta el array original.
 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Elige un elemento al azar de `items`. Lanza si el array está vacío. */
export function pickRandom<T>(items: readonly T[], rng: Rng = Math.random): T {
  if (items.length === 0) {
    throw new Error('pickRandom: array vacío')
  }
  return items[Math.floor(rng() * items.length)]
}
```

**Notas**:
- `rng` por defecto es `Math.random`, pero en tests le pasamos un RNG fijo.
- `shuffle` NO debe mutar el input (devuelve copia).

**Criterios de aceptación**:
- El archivo compila sin errores de TypeScript.
- `shuffle([1,2,3])` con `Math.random` devuelve un array de largo 3 con los mismos elementos.
- No importa nada de React.

---

## Task 5 — Pool de productos 4x4 (dominio products)

**Archivo**: `src/domain/products/productPool.ts`

Define los pools de productos para el modo 4x4. Los valores son EXACTOS, no se calculan dinámicamente para evitar errores: se hardcodean y se documenta cómo salen.

```ts
// src/domain/products/productPool.ts

/**
 * Pool completo: productos DISTINTOS de a×b con a,b ∈ [1,9].
 * Son 36 valores exactos.
 */
export const FULL_PRODUCT_POOL: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 30,
  32, 35, 36, 40, 42, 45, 48, 49, 54, 56, 63, 64, 72, 81,
]

/**
 * Productos triviales del ×1: solo se obtienen multiplicando por 1.
 * Son 1, 2, 3, 5, 7.
 */
export const TRIVIAL_X1_PRODUCTS: readonly number[] = [1, 2, 3, 5, 7]

/**
 * Pool sin triviales del ×1. Son 31 valores.
 */
export const NON_TRIVIAL_PRODUCT_POOL: readonly number[] = [
  4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 30, 32, 35, 36,
  40, 42, 45, 48, 49, 54, 56, 63, 64, 72, 81,
]

/**
 * Devuelve el pool activo según el toggle.
 * @param excludeTrivialX1 si true (default del producto), excluye 1,2,3,5,7.
 */
export function getProductPool(excludeTrivialX1: boolean): readonly number[] {
  return excludeTrivialX1 ? NON_TRIVIAL_PRODUCT_POOL : FULL_PRODUCT_POOL
}
```

**Notas**:
- `FULL_PRODUCT_POOL` debe tener EXACTAMENTE 36 elementos. `NON_TRIVIAL_PRODUCT_POOL` EXACTAMENTE 31.
- `NON_TRIVIAL_PRODUCT_POOL` = `FULL_PRODUCT_POOL` menos `[1,2,3,5,7]`.
- NO recalcular ni reordenar estos arrays. Son la fuente de verdad del dominio.

**Criterios de aceptación**:
- `FULL_PRODUCT_POOL.length === 36`.
- `NON_TRIVIAL_PRODUCT_POOL.length === 31`.
- `getProductPool(true).length === 31` y `getProductPool(false).length === 36`.

---

## Task 6 — Tests del pool de productos

**Archivo**: `src/domain/products/productPool.test.ts`

Tests que verifican los tamaños y la relación entre pools.

```ts
// src/domain/products/productPool.test.ts
import { describe, it, expect } from 'vitest'
import {
  FULL_PRODUCT_POOL,
  NON_TRIVIAL_PRODUCT_POOL,
  TRIVIAL_X1_PRODUCTS,
  getProductPool,
} from './productPool'

describe('productPool', () => {
  it('full pool tiene 36 valores únicos', () => {
    expect(FULL_PRODUCT_POOL).toHaveLength(36)
    expect(new Set(FULL_PRODUCT_POOL).size).toBe(36)
  })

  it('full pool son exactamente los productos de a×b con a,b en [1,9]', () => {
    const computed = new Set<number>()
    for (let a = 1; a <= 9; a++) {
      for (let b = 1; b <= 9; b++) {
        computed.add(a * b)
      }
    }
    expect(new Set(FULL_PRODUCT_POOL)).toEqual(computed)
  })

  it('non-trivial pool tiene 31 valores', () => {
    expect(NON_TRIVIAL_PRODUCT_POOL).toHaveLength(31)
  })

  it('non-trivial pool = full pool menos triviales del ×1', () => {
    const expected = FULL_PRODUCT_POOL.filter(
      (n) => !TRIVIAL_X1_PRODUCTS.includes(n),
    )
    expect([...NON_TRIVIAL_PRODUCT_POOL].sort((a, b) => a - b)).toEqual(
      [...expected].sort((a, b) => a - b),
    )
  })

  it('getProductPool respeta el toggle', () => {
    expect(getProductPool(true)).toHaveLength(31)
    expect(getProductPool(false)).toHaveLength(36)
  })
})
```

**Criterios de aceptación**:
- `pnpm test` pasa con 5 tests en verde en este archivo.

---

## Task 7 — Factorizaciones de un producto (dominio products)

**Archivo**: `src/domain/products/factorizations.ts`

Dado un producto, devuelve todas las factorizaciones `a×b` con `a,b ∈ [1,9]`. Permite excluir factorizaciones que usen el factor 1 (cuando el toggle de triviales está activo). Sirve para que el cantor muestre una operación al azar.

```ts
// src/domain/products/factorizations.ts
import { pickRandom, type Rng } from '../shared/random'

export interface Factorization {
  a: number
  b: number
  product: number
}

/**
 * Devuelve TODAS las factorizaciones a×b = product con a,b ∈ [1,9].
 * Solo incluye pares con a <= b para no duplicar (3×6 y 6×3 cuentan como una).
 * @param allowFactorOne si false, descarta factorizaciones donde a===1 o b===1.
 */
export function getFactorizations(
  product: number,
  allowFactorOne: boolean,
): Factorization[] {
  const result: Factorization[] = []
  for (let a = 1; a <= 9; a++) {
    for (let b = a; b <= 9; b++) {
      if (a * b !== product) continue
      if (!allowFactorOne && (a === 1 || b === 1)) continue
      result.push({ a, b, product })
    }
  }
  return result
}

/**
 * Elige una factorización al azar para mostrar como operación.
 * Si no hay factorizaciones válidas con el filtro pedido, hace fallback a
 * permitir el factor 1 (garantiza que productos como 1,2,3,5,7 tengan operación).
 */
export function pickFactorization(
  product: number,
  allowFactorOne: boolean,
  rng: Rng = Math.random,
): Factorization {
  let options = getFactorizations(product, allowFactorOne)
  if (options.length === 0) {
    options = getFactorizations(product, true)
  }
  return pickRandom(options, rng)
}

/** Formatea una factorización como "a × b = product". */
export function formatFactorization(f: Factorization): string {
  return `${f.a} × ${f.b} = ${f.product}`
}
```

**Notas**:
- Usamos `×` (signo de multiplicación U+00D7), NO la letra `x`.
- El fallback en `pickFactorization` cubre el caso borde de que alguien pida una operación para un producto trivial con `allowFactorOne=false`. En el flujo normal del cantor 4x4 esos productos no están en el mazo, pero el fallback evita un crash.
- `a <= b` evita contar `3×6` y `6×3` como factorizaciones distintas.

**Criterios de aceptación**:
- `getFactorizations(18, true)` devuelve `[{a:2,b:9},{a:3,b:6}]` (en ese orden, con `product:18`).
- `getFactorizations(18, false)` devuelve lo mismo (18 no tiene factor 1).
- `getFactorizations(7, false)` devuelve `[]` (solo 1×7), y `getFactorizations(7, true)` devuelve `[{a:1,b:7}]`.
- `formatFactorization({a:3,b:6,product:18})` devuelve `"3 × 6 = 18"`.

---

## Task 8 — Tests de factorizaciones

**Archivo**: `src/domain/products/factorizations.test.ts`

```ts
// src/domain/products/factorizations.test.ts
import { describe, it, expect } from 'vitest'
import {
  getFactorizations,
  pickFactorization,
  formatFactorization,
} from './factorizations'

describe('getFactorizations', () => {
  it('18 tiene 2×9 y 3×6', () => {
    expect(getFactorizations(18, true)).toEqual([
      { a: 2, b: 9, product: 18 },
      { a: 3, b: 6, product: 18 },
    ])
  })

  it('no duplica pares simétricos (no incluye 6×3 además de 3×6)', () => {
    const f = getFactorizations(18, true)
    expect(f).toHaveLength(2)
  })

  it('todas las factorizaciones usan factores en [1,9]', () => {
    for (let p = 1; p <= 81; p++) {
      for (const f of getFactorizations(p, true)) {
        expect(f.a).toBeGreaterThanOrEqual(1)
        expect(f.a).toBeLessThanOrEqual(9)
        expect(f.b).toBeGreaterThanOrEqual(1)
        expect(f.b).toBeLessThanOrEqual(9)
        expect(f.a * f.b).toBe(p)
      }
    }
  })

  it('excluye factor 1 cuando allowFactorOne=false', () => {
    expect(getFactorizations(7, false)).toEqual([])
    expect(getFactorizations(7, true)).toEqual([{ a: 1, b: 7, product: 7 }])
  })
})

describe('pickFactorization', () => {
  it('elige una factorización válida (rng fijo en 0 → primera opción)', () => {
    const f = pickFactorization(18, true, () => 0)
    expect(f).toEqual({ a: 2, b: 9, product: 18 })
  })

  it('hace fallback a factor 1 si no hay otra opción', () => {
    const f = pickFactorization(7, false, () => 0)
    expect(f).toEqual({ a: 1, b: 7, product: 7 })
  })
})

describe('formatFactorization', () => {
  it('formatea con el signo ×', () => {
    expect(formatFactorization({ a: 3, b: 6, product: 18 })).toBe('3 × 6 = 18')
  })
})
```

**Criterios de aceptación**:
- `pnpm test` pasa todos los tests de este archivo en verde.

---

## Task 9 — Tipos de cartones (dominio cards)

**Archivo**: `src/domain/cards/types.ts`

Tipos compartidos para cartones 3x3 y 4x4.

```ts
// src/domain/cards/types.ts

export type CardType = '3x3' | '4x4'

export interface Card {
  /** Tipo de cartón. */
  type: CardType
  /** Tamaño del lado de la grilla: 3 para 3x3, 4 para 4x4. */
  size: number
  /**
   * Números en orden de lectura (fila por fila, izquierda a derecha).
   * Largo = size*size: 9 para 3x3, 16 para 4x4.
   */
  cells: number[]
}

/**
 * Serializa el layout de un cartón a un string único, para detectar duplicados.
 * El orden importa: dos cartones con los mismos números en distinto orden
 * producen serializaciones distintas (son cartones distintos).
 */
export function serializeCard(card: Card): string {
  return `${card.type}:${card.cells.join(',')}`
}
```

**Notas**:
- `cells` es el grid aplanado en orden de lectura. La UI lo renderiza en grilla usando CSS grid de `size` columnas.
- `serializeCard` considera tipo + arreglo exacto. Es la clave para garantizar unicidad.

**Criterios de aceptación**:
- Compila sin errores.
- `serializeCard({type:'3x3',size:3,cells:[1,2,3,4,5,6,7,8,9]})` devuelve `"3x3:1,2,3,4,5,6,7,8,9"`.

---

## Task 10 — Generador de cartones 3x3 (dominio cards)

**Archivo**: `src/domain/cards/generateCards3x3.ts`

Genera N cartones 3x3, cada uno una permutación única de {1..9}.

```ts
// src/domain/cards/generateCards3x3.ts
import { shuffle, type Rng } from '../shared/random'
import { serializeCard, type Card } from './types'

const BASE_3X3: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** Máximo de layouts únicos 3x3 = 9! = 362880. */
export const MAX_LAYOUTS_3X3 = 362880

export interface GenerateResult {
  cards: Card[]
  /** true si se pidió más de lo posible y se truncó al máximo. */
  truncated: boolean
  /** cantidad realmente generada. */
  generated: number
}

/**
 * Genera `count` cartones 3x3 con layouts garantizadamente únicos.
 * Si `count` excede MAX_LAYOUTS_3X3, genera el máximo posible y marca truncated.
 */
export function generateCards3x3(
  count: number,
  rng: Rng = Math.random,
): GenerateResult {
  const target = Math.min(count, MAX_LAYOUTS_3X3)
  const seen = new Set<string>()
  const cards: Card[] = []

  while (cards.length < target) {
    const cells = shuffle(BASE_3X3, rng)
    const card: Card = { type: '3x3', size: 3, cells }
    const key = serializeCard(card)
    if (seen.has(key)) continue
    seen.add(key)
    cards.push(card)
  }

  return {
    cards,
    truncated: count > MAX_LAYOUTS_3X3,
    generated: cards.length,
  }
}
```

**Notas**:
- Usa rechazo de duplicados con un `Set` de serializaciones. Para N chico (uso real: decenas de cartones) las colisiones son rarísimas, así que el `while` termina rápido.
- NO intentes generar los 362880 layouts en un test (lento). Los tests usan N chico.

**Criterios de aceptación**:
- `generateCards3x3(10)` devuelve 10 cartones, cada uno con `cells` de largo 9.
- Cada `cells` es una permutación de [1..9] (mismos 9 números, sin repetir).
- Las 10 serializaciones son únicas entre sí.

---

## Task 11 — Generador de cartones 4x4 (dominio cards)

**Archivo**: `src/domain/cards/generateCards4x4.ts`

Genera N cartones 4x4: cada uno elige 16 productos del pool activo y los acomoda en layout único.

```ts
// src/domain/cards/generateCards4x4.ts
import { shuffle, type Rng } from '../shared/random'
import { getProductPool } from '../products/productPool'
import { serializeCard, type Card } from './types'
import type { GenerateResult } from './generateCards3x3'

const CELLS_4X4 = 16

/**
 * Genera `count` cartones 4x4 con layouts garantizadamente únicos.
 * Cada cartón = 16 productos elegidos del pool activo, barajados en la grilla.
 * @param excludeTrivialX1 toggle que define el pool (31 vs 36 valores).
 */
export function generateCards4x4(
  count: number,
  excludeTrivialX1: boolean,
  rng: Rng = Math.random,
): GenerateResult {
  const pool = getProductPool(excludeTrivialX1)
  const seen = new Set<string>()
  const cards: Card[] = []

  // Tope teórico de seguridad para evitar loops infinitos si el pool fuera
  // demasiado chico. Con pool de 31 o 36 y 16 celdas hay muchísimas combinaciones,
  // así que en la práctica nunca se alcanza para N de uso real.
  const SAFETY_MAX_ATTEMPTS = Math.max(count * 50, 10000)
  let attempts = 0

  while (cards.length < count && attempts < SAFETY_MAX_ATTEMPTS) {
    attempts++
    const chosen = shuffle(pool, rng).slice(0, CELLS_4X4)
    const cells = shuffle(chosen, rng)
    const card: Card = { type: '4x4', size: 4, cells }
    const key = serializeCard(card)
    if (seen.has(key)) continue
    seen.add(key)
    cards.push(card)
  }

  return {
    cards,
    truncated: cards.length < count,
    generated: cards.length,
  }
}
```

**Notas**:
- `shuffle(pool).slice(0,16)` elige 16 productos distintos al azar; luego `shuffle(chosen)` da el layout. (El primer shuffle ya mezcla, pero hacemos un segundo shuffle sobre los 16 elegidos para que la unicidad considere también el arreglo de forma clara.)
- `truncated` queda en true si no se alcanzó `count` dentro del tope de seguridad. En uso real con N de decenas, nunca trunca.
- Reutiliza `GenerateResult` de `generateCards3x3.ts` para no duplicar el tipo.

**Criterios de aceptación**:
- `generateCards4x4(10, true)` devuelve 10 cartones, cada uno con `cells` de largo 16.
- Todos los valores de cada cartón pertenecen a `NON_TRIVIAL_PRODUCT_POOL` (cuando `excludeTrivialX1=true`).
- `generateCards4x4(10, false)` usa el pool de 36.
- Las 10 serializaciones son únicas entre sí.
- Dentro de un cartón los 16 productos son distintos (no se repiten valores).

---

## Task 12 — Generador unificado (dominio cards)

**Archivo**: `src/domain/cards/generateCards.ts`

Punto de entrada único que el container del Generador va a usar. Soporta 3x3, 4x4 o ambos.

```ts
// src/domain/cards/generateCards.ts
import { generateCards3x3, type GenerateResult } from './generateCards3x3'
import { generateCards4x4 } from './generateCards4x4'
import type { Card } from './types'

export type GeneratorMode = '3x3' | '4x4' | 'both'

export interface GenerateCardsInput {
  /** Cantidad de cartones a generar por tipo seleccionado. */
  count: number
  mode: GeneratorMode
  /** Solo afecta a los cartones 4x4. */
  excludeTrivialX1: boolean
}

export interface GenerateCardsOutput {
  cards: Card[]
  /** Mensajes de aviso para el usuario (ej. truncado). Vacío si todo ok. */
  warnings: string[]
}

/**
 * Genera cartones según el modo. Para 'both' genera `count` de cada tipo.
 * Acumula warnings legibles para el usuario cuando se trunca.
 */
export function generateCards(input: GenerateCardsInput): GenerateCardsOutput {
  const { count, mode, excludeTrivialX1 } = input
  const cards: Card[] = []
  const warnings: string[] = []

  if (count < 1) {
    return { cards: [], warnings: ['La cantidad debe ser al menos 1.'] }
  }

  const addResult = (label: string, r: GenerateResult) => {
    cards.push(...r.cards)
    if (r.truncated) {
      warnings.push(
        `No se pudieron generar ${count} cartones ${label} únicos; se generaron ${r.generated}.`,
      )
    }
  }

  if (mode === '3x3' || mode === 'both') {
    addResult('3x3', generateCards3x3(count))
  }
  if (mode === '4x4' || mode === 'both') {
    addResult('4x4', generateCards4x4(count, excludeTrivialX1))
  }

  return { cards, warnings }
}
```

**Notas**:
- En modo `'both'` genera `count` de CADA tipo (total `2*count`). Esto es intencional y la UI debe aclararlo.
- Los warnings son strings en español listos para mostrar.

**Criterios de aceptación**:
- `generateCards({count:5,mode:'3x3',excludeTrivialX1:true})` devuelve 5 cartones, todos `type:'3x3'`, `warnings` vacío.
- `generateCards({count:5,mode:'both',excludeTrivialX1:true})` devuelve 10 cartones (5 de cada tipo).
- `generateCards({count:0,mode:'3x3',excludeTrivialX1:true})` devuelve `cards:[]` y un warning.

---

## Task 13 — Tests del generador de cartones

**Archivo**: `src/domain/cards/generateCards.test.ts`

Cubre unicidad, contenido del pool, y modo both. Usa N chico.

```ts
// src/domain/cards/generateCards.test.ts
import { describe, it, expect } from 'vitest'
import { generateCards3x3 } from './generateCards3x3'
import { generateCards4x4 } from './generateCards4x4'
import { generateCards } from './generateCards'
import { serializeCard } from './types'
import {
  NON_TRIVIAL_PRODUCT_POOL,
  FULL_PRODUCT_POOL,
} from '../products/productPool'

describe('generateCards3x3', () => {
  it('genera N cartones, cada uno permutación de 1..9', () => {
    const { cards } = generateCards3x3(20)
    expect(cards).toHaveLength(20)
    for (const c of cards) {
      expect(c.cells).toHaveLength(9)
      expect([...c.cells].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    }
  })

  it('todos los layouts son únicos', () => {
    const { cards } = generateCards3x3(50)
    const keys = cards.map(serializeCard)
    expect(new Set(keys).size).toBe(50)
  })
})

describe('generateCards4x4', () => {
  it('genera N cartones de 16 productos del pool no-trivial', () => {
    const { cards } = generateCards4x4(20, true)
    expect(cards).toHaveLength(20)
    for (const c of cards) {
      expect(c.cells).toHaveLength(16)
      expect(new Set(c.cells).size).toBe(16) // sin repetidos dentro del cartón
      for (const v of c.cells) {
        expect(NON_TRIVIAL_PRODUCT_POOL).toContain(v)
      }
    }
  })

  it('con toggle off usa el pool completo de 36', () => {
    const { cards } = generateCards4x4(20, false)
    for (const c of cards) {
      for (const v of c.cells) {
        expect(FULL_PRODUCT_POOL).toContain(v)
      }
    }
  })

  it('todos los layouts son únicos', () => {
    const { cards } = generateCards4x4(50, true)
    const keys = cards.map(serializeCard)
    expect(new Set(keys).size).toBe(50)
  })
})

describe('generateCards (unificado)', () => {
  it('modo both genera N de cada tipo', () => {
    const { cards } = generateCards({ count: 5, mode: 'both', excludeTrivialX1: true })
    expect(cards).toHaveLength(10)
    expect(cards.filter((c) => c.type === '3x3')).toHaveLength(5)
    expect(cards.filter((c) => c.type === '4x4')).toHaveLength(5)
  })

  it('count 0 devuelve warning y sin cartones', () => {
    const { cards, warnings } = generateCards({ count: 0, mode: '3x3', excludeTrivialX1: true })
    expect(cards).toHaveLength(0)
    expect(warnings.length).toBeGreaterThan(0)
  })
})
```

**Criterios de aceptación**:
- `pnpm test` pasa todos los tests de este archivo en verde.

---

## Task 14 — Mazo del cantor (dominio deck)

**Archivo**: `src/domain/deck/deck.ts`

El mazo del cantor: barajar, extraer sin reemplazo, reiniciar. Es lógica pura; los hooks de React la envuelven después.

```ts
// src/domain/deck/deck.ts
import { shuffle, type Rng } from '../shared/random'

export interface DeckState {
  /** Valores aún por cantar, en el orden en que se cantarán (tope = índice 0). */
  remaining: number[]
  /** Valores ya cantados, en orden cronológico (el último cantado al final). */
  drawn: number[]
}

/** Crea un mazo barajado a partir de los valores dados. */
export function createDeck(values: readonly number[], rng: Rng = Math.random): DeckState {
  return {
    remaining: shuffle(values, rng),
    drawn: [],
  }
}

/** true si no quedan valores por cantar. */
export function isExhausted(state: DeckState): boolean {
  return state.remaining.length === 0
}

export interface DrawResult {
  /** Nuevo estado del mazo tras extraer. */
  state: DeckState
  /** Valor extraído, o null si el mazo estaba agotado. */
  value: number | null
}

/**
 * Extrae el siguiente valor SIN REEMPLAZO.
 * NO muta el estado: devuelve uno nuevo.
 * Si el mazo está agotado, devuelve value null y el mismo estado.
 */
export function draw(state: DeckState): DrawResult {
  if (isExhausted(state)) {
    return { state, value: null }
  }
  const [value, ...rest] = state.remaining
  return {
    state: { remaining: rest, drawn: [...state.drawn, value] },
    value,
  }
}
```

**Notas**:
- Inmutable: `draw` devuelve estado nuevo, no muta. Esto encaja con `useState` de React.
- "Reiniciar" en la UI = volver a llamar `createDeck` con los mismos valores.
- `drawn` mantiene el historial cronológico que el maestro usa para verificar al ganador.

**Criterios de aceptación**:
- `createDeck([1,2,3])` devuelve `remaining` con los 3 valores (barajados) y `drawn` vacío.
- `draw` mueve un valor de `remaining` a `drawn` y NO muta el estado original.
- Tras extraer todos, `isExhausted` es true y `draw` devuelve `value:null`.

---

## Task 15 — Tests del mazo

**Archivo**: `src/domain/deck/deck.test.ts`

```ts
// src/domain/deck/deck.test.ts
import { describe, it, expect } from 'vitest'
import { createDeck, draw, isExhausted } from './deck'

describe('deck', () => {
  it('createDeck baraja y deja drawn vacío', () => {
    const d = createDeck([1, 2, 3, 4, 5], () => 0)
    expect(d.remaining).toHaveLength(5)
    expect([...d.remaining].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    expect(d.drawn).toEqual([])
  })

  it('draw extrae sin reemplazo y no muta el estado original', () => {
    const d0 = createDeck([1, 2, 3], () => 0)
    const before = JSON.stringify(d0)
    const { state: d1, value } = draw(d0)
    expect(JSON.stringify(d0)).toBe(before) // no mutó
    expect(d1.remaining).toHaveLength(2)
    expect(d1.drawn).toEqual([value])
  })

  it('cada valor se canta exactamente una vez (sin reemplazo)', () => {
    let state = createDeck([1, 2, 3, 4, 5])
    const got: number[] = []
    while (!isExhausted(state)) {
      const r = draw(state)
      state = r.state
      if (r.value !== null) got.push(r.value)
    }
    expect([...got].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    expect(new Set(got).size).toBe(5)
  })

  it('draw sobre mazo agotado devuelve value null', () => {
    let state = createDeck([1])
    state = draw(state).state
    expect(isExhausted(state)).toBe(true)
    expect(draw(state).value).toBeNull()
  })
})
```

**Criterios de aceptación**:
- `pnpm test` pasa todos los tests de este archivo. El total de la suite (Tasks 6, 8, 13, 15) está en verde.

---

## Task 16 — Componente presentational CardView

**Archivo**: `src/presentation/generator/CardView.tsx`

Componente puro de UI que renderiza un cartón en grilla. Recibe el `Card` por props, sin lógica de estado.

```tsx
// src/presentation/generator/CardView.tsx
import type { Card } from '../../domain/cards/types'

interface CardViewProps {
  card: Card
}

export function CardView({ card }: CardViewProps) {
  return (
    <div className="card">
      <div
        className="card__grid"
        style={{ gridTemplateColumns: `repeat(${card.size}, 1fr)` }}
      >
        {card.cells.map((value, index) => (
          <div className="card__cell" key={index}>
            {value}
          </div>
        ))}
      </div>
      <p className="card__rule">
        Gana quien complete una LÍNEA (fila, columna o diagonal).
      </p>
    </div>
  )
}
```

**Notas**:
- Es presentational puro: sin `useState`, sin fetch, solo props → JSX.
- La leyenda de la regla va en CADA cartón (requisito).
- Las clases CSS (`card`, `card__grid`, `card__cell`, `card__rule`) se estilan en la Task 20.

**Criterios de aceptación**:
- Compila. Recibe un `Card` y renderiza `size*size` celdas en grilla.
- Muestra el texto de la regla.

---

## Task 17 — Componente presentational PrintableCards

**Archivo**: `src/presentation/generator/PrintableCards.tsx`

Contenedor visual que lista todos los cartones generados para imprimir. Presentational puro.

```tsx
// src/presentation/generator/PrintableCards.tsx
import type { Card } from '../../domain/cards/types'
import { CardView } from './CardView'

interface PrintableCardsProps {
  cards: Card[]
}

export function PrintableCards({ cards }: PrintableCardsProps) {
  if (cards.length === 0) {
    return <p className="printable__empty">Todavía no generaste cartones.</p>
  }
  return (
    <div className="printable">
      {cards.map((card, index) => (
        <CardView card={card} key={index} />
      ))}
    </div>
  )
}
```

**Notas**:
- `.printable` será el contenedor que en print se reorganiza (Task 20).
- Sin estado; solo recibe `cards`.

**Criterios de aceptación**:
- Compila. Con `cards=[]` muestra el mensaje vacío. Con cartones renderiza un `CardView` por cada uno.

---

## Task 18 — Formulario del generador (presentational)

**Archivo**: `src/presentation/generator/GeneratorForm.tsx`

Form controlado para los inputs del generador. Recibe valores y callbacks por props; NO maneja la generación.

```tsx
// src/presentation/generator/GeneratorForm.tsx
import type { GeneratorMode } from '../../domain/cards/generateCards'

interface GeneratorFormProps {
  count: number
  mode: GeneratorMode
  excludeTrivialX1: boolean
  onCountChange: (count: number) => void
  onModeChange: (mode: GeneratorMode) => void
  onExcludeTrivialChange: (value: boolean) => void
  onGenerate: () => void
  onPrint: () => void
}

export function GeneratorForm({
  count,
  mode,
  excludeTrivialX1,
  onCountChange,
  onModeChange,
  onExcludeTrivialChange,
  onGenerate,
  onPrint,
}: GeneratorFormProps) {
  return (
    <form className="generator-form no-print" onSubmit={(e) => e.preventDefault()}>
      <label className="generator-form__field">
        Cantidad de cartones
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => onCountChange(Number(e.target.value))}
        />
      </label>

      <label className="generator-form__field">
        Tipo
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as GeneratorMode)}
        >
          <option value="3x3">3x3</option>
          <option value="4x4">4x4</option>
          <option value="both">Ambos</option>
        </select>
      </label>

      <label className="generator-form__checkbox">
        <input
          type="checkbox"
          checked={excludeTrivialX1}
          onChange={(e) => onExcludeTrivialChange(e.target.checked)}
        />
        Excluir triviales del ×1 (solo afecta 4x4)
      </label>

      <div className="generator-form__actions">
        <button type="button" onClick={onGenerate}>
          Generar
        </button>
        <button type="button" onClick={onPrint}>
          Imprimir / Exportar PDF
        </button>
      </div>
    </form>
  )
}
```

**Notas**:
- Componente controlado: todo el estado vive en el container (Task 19).
- La clase `no-print` oculta el form al imprimir (Task 20).
- "Imprimir / Exportar PDF" dispara `window.print()` desde el container.

**Criterios de aceptación**:
- Compila. Cambiar inputs dispara los callbacks correspondientes.
- El default del checkbox lo fija el container (debe iniciar marcado).

---

## Task 19 — Container del Generador

**Archivo**: `src/presentation/generator/GeneratorContainer.tsx`

Container: maneja el estado del form, llama al dominio `generateCards`, guarda los cartones y dispara la impresión. Conecta `GeneratorForm` + `PrintableCards`.

```tsx
// src/presentation/generator/GeneratorContainer.tsx
import { useState } from 'react'
import {
  generateCards,
  type GeneratorMode,
} from '../../domain/cards/generateCards'
import type { Card } from '../../domain/cards/types'
import { GeneratorForm } from './GeneratorForm'
import { PrintableCards } from './PrintableCards'

export function GeneratorContainer() {
  const [count, setCount] = useState(6)
  const [mode, setMode] = useState<GeneratorMode>('3x3')
  const [excludeTrivialX1, setExcludeTrivialX1] = useState(true) // default ON
  const [cards, setCards] = useState<Card[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  const handleGenerate = () => {
    const result = generateCards({ count, mode, excludeTrivialX1 })
    setCards(result.cards)
    setWarnings(result.warnings)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <section className="generator">
      <h2 className="no-print">Generador de cartones</h2>

      <GeneratorForm
        count={count}
        mode={mode}
        excludeTrivialX1={excludeTrivialX1}
        onCountChange={setCount}
        onModeChange={setMode}
        onExcludeTrivialChange={setExcludeTrivialX1}
        onGenerate={handleGenerate}
        onPrint={handlePrint}
      />

      {warnings.length > 0 && (
        <ul className="generator__warnings no-print">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <PrintableCards cards={cards} />
    </section>
  )
}
```

**Notas**:
- `excludeTrivialX1` inicia en `true` (default del producto: ACTIVADO).
- `count` inicia en 6 (valor de arranque razonable; el usuario lo cambia).
- `window.print()` abre el diálogo de impresión del navegador; "Guardar como PDF" es el export.
- Separación estricta: este es el ÚNICO componente del generador con `useState`. Los demás son presentational.

**Criterios de aceptación**:
- Al hacer "Generar" aparecen los cartones en pantalla.
- Cambiar tipo a "Ambos" y generar muestra `2*count` cartones.
- "Imprimir / Exportar PDF" abre el diálogo de impresión.
- Si `count` excede el máximo posible, se muestran los warnings.

---

## Task 20 — Estilos del generador + impresión (@media print)

**Archivo**: `src/presentation/app/App.css` (editar; agregar al final)

Estilos para la grilla de cartones y reglas de impresión: ocultar UI no imprimible, varios cartones por hoja, celdas grandes y legibles.

Agregar al final de `src/presentation/app/App.css`:

```css
/* ===== Generador: layout en pantalla ===== */
.generator {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.generator-form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.generator-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.generator__warnings {
  color: #b00020;
}

.printable {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.card {
  border: 2px solid #222;
  border-radius: 8px;
  padding: 0.75rem;
  break-inside: avoid;
}

.card__grid {
  display: grid;
  gap: 4px;
}

.card__cell {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #222;
  font-size: 2rem;
  font-weight: 700;
}

.card__rule {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  text-align: center;
}

/* ===== Impresión ===== */
@media print {
  .no-print {
    display: none !important;
  }

  .printable {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5cm;
  }

  .card {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .card__cell {
    font-size: 1.8rem;
  }
}
```

**Notas**:
- `.no-print` se aplica al form, al título, y a los warnings → no salen en papel.
- `break-inside: avoid` evita que un cartón se corte entre páginas.
- 2 columnas por hoja es un punto de partida razonable; el usuario ajusta escala desde el diálogo de impresión.

**Criterios de aceptación**:
- En pantalla los cartones se ven en grilla de 2 columnas, celdas grandes y cuadradas.
- En la vista previa de impresión (Ctrl/Cmd+P) NO aparecen el form ni el título; solo los cartones.
- Ningún cartón se corta a la mitad entre páginas.

---

## Task 21 — Hook useCaller (presentación caller)

**Archivo**: `src/presentation/caller/useCaller.ts`

Hook que encapsula el estado del cantor usando el dominio `deck`. Maneja modo (3x3/4x4), toggle de triviales, la operación a mostrar, y reiniciar.

```ts
// src/presentation/caller/useCaller.ts
import { useCallback, useMemo, useState } from 'react'
import { createDeck, draw, isExhausted, type DeckState } from '../../domain/deck/deck'
import { getProductPool } from '../../domain/products/productPool'
import {
  pickFactorization,
  formatFactorization,
} from '../../domain/products/factorizations'

export type CallerMode = '3x3' | '4x4'

export interface CurrentCall {
  /** Valor que el niño marca (número en 3x3, resultado del producto en 4x4). */
  value: number
  /** Texto grande a mostrar. En 4x4 es "a × b = producto"; en 3x3 es el número. */
  display: string
}

const NUMBERS_3X3 = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function useCaller() {
  const [mode, setMode] = useState<CallerMode>('3x3')
  const [excludeTrivialX1, setExcludeTrivialX1] = useState(true)

  const values = useMemo(() => {
    return mode === '3x3' ? NUMBERS_3X3 : [...getProductPool(excludeTrivialX1)]
  }, [mode, excludeTrivialX1])

  const [deck, setDeck] = useState<DeckState>(() => createDeck(values))
  const [current, setCurrent] = useState<CurrentCall | null>(null)
  // Historial de displays ya cantados (para la lista visible).
  const [history, setHistory] = useState<CurrentCall[]>([])

  const reset = useCallback(() => {
    setDeck(createDeck(values))
    setCurrent(null)
    setHistory([])
  }, [values])

  const callNext = useCallback(() => {
    const { state, value } = draw(deck)
    if (value === null) return // mazo agotado
    setDeck(state)
    const call: CurrentCall =
      mode === '3x3'
        ? { value, display: String(value) }
        : {
            value,
            display: formatFactorization(
              pickFactorization(value, !excludeTrivialX1),
            ),
          }
    setCurrent(call)
    setHistory((h) => [...h, call])
  }, [deck, mode, excludeTrivialX1])

  const exhausted = isExhausted(deck)

  return {
    mode,
    setMode,
    excludeTrivialX1,
    setExcludeTrivialX1,
    current,
    history,
    exhausted,
    callNext,
    reset,
  }
}
```

**Notas IMPORTANTES**:
- `pickFactorization(value, !excludeTrivialX1)`: el segundo argumento es `allowFactorOne`. Si el usuario EXCLUYE triviales (`excludeTrivialX1=true`), entonces NO permitimos factor 1 → `allowFactorOne=false`. Por eso va negado. NO lo cambies.
- Cuando cambia `mode` o `excludeTrivialX1`, `values` se recalcula, pero el `deck` NO se rebaraja solo. El container debe llamar `reset` cuando el usuario cambia modo/toggle (Task 22).
- El hook NO renderiza nada; solo expone estado y acciones (separación de responsabilidades).

**Criterios de aceptación**:
- Compila sin errores de tipos.
- `callNext` en modo 3x3 setea `current.display` al número como string.
- `callNext` en modo 4x4 setea `current.display` a un string tipo `"a × b = N"`.
- `reset` limpia historial y rebaraja.

---

## Task 22 — Vista presentational del cantor

**Archivo**: `src/presentation/caller/CallerView.tsx`

UI pura del cantor: muestra la llamada actual EN GRANDE, controles (modo, toggle, cantar, reiniciar) y el estado de agotado. Recibe todo por props.

```tsx
// src/presentation/caller/CallerView.tsx
import type { CallerMode, CurrentCall } from './useCaller'

interface CallerViewProps {
  mode: CallerMode
  excludeTrivialX1: boolean
  current: CurrentCall | null
  exhausted: boolean
  onModeChange: (mode: CallerMode) => void
  onExcludeTrivialChange: (value: boolean) => void
  onCallNext: () => void
  onReset: () => void
  children?: React.ReactNode // para el historial
}

export function CallerView({
  mode,
  excludeTrivialX1,
  current,
  exhausted,
  onModeChange,
  onExcludeTrivialChange,
  onCallNext,
  onReset,
  children,
}: CallerViewProps) {
  return (
    <section className="caller">
      <h2>El cantor</h2>

      <div className="caller__controls">
        <label>
          Modo
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as CallerMode)}
          >
            <option value="3x3">3x3 (números 1–9)</option>
            <option value="4x4">4x4 (productos)</option>
          </select>
        </label>

        {mode === '4x4' && (
          <label className="caller__checkbox">
            <input
              type="checkbox"
              checked={excludeTrivialX1}
              onChange={(e) => onExcludeTrivialChange(e.target.checked)}
            />
            Excluir triviales del ×1
          </label>
        )}
      </div>

      <div className="caller__current">
        {current ? current.display : 'Toca "Cantar" para empezar'}
      </div>

      <div className="caller__actions">
        <button type="button" onClick={onCallNext} disabled={exhausted}>
          Cantar
        </button>
        <button type="button" onClick={onReset}>
          Reiniciar
        </button>
      </div>

      {exhausted && <p className="caller__exhausted">¡El mazo se agotó!</p>}

      {children}
    </section>
  )
}
```

**Notas**:
- Presentational puro: sin estado propio.
- El toggle de triviales solo aparece en modo 4x4.
- El historial entra como `children` (lo arma el container con `CallHistory`).
- El botón "Cantar" se deshabilita cuando el mazo está agotado.

**Criterios de aceptación**:
- Compila. Muestra `current.display` grande o el placeholder.
- En modo 3x3 el checkbox de triviales no se muestra.
- Botón "Cantar" deshabilitado si `exhausted`.

---

## Task 23 — Lista de historial (presentational)

**Archivo**: `src/presentation/caller/CallHistory.tsx`

Lista de lo ya cantado, para que el maestro verifique al ganador. Presentational puro.

```tsx
// src/presentation/caller/CallHistory.tsx
import type { CurrentCall } from './useCaller'

interface CallHistoryProps {
  history: CurrentCall[]
}

export function CallHistory({ history }: CallHistoryProps) {
  if (history.length === 0) {
    return <p className="call-history__empty">Todavía no se cantó nada.</p>
  }
  return (
    <div className="call-history">
      <h3>Ya cantados ({history.length})</h3>
      <ol className="call-history__list">
        {history.map((call, index) => (
          <li key={index}>{call.display}</li>
        ))}
      </ol>
    </div>
  )
}
```

**Notas**:
- Muestra el `display` completo (en 4x4 muestra la operación con su resultado, útil para verificar).
- El contador en el título ayuda al maestro.

**Criterios de aceptación**:
- Compila. Con historial vacío muestra el mensaje. Con datos lista cada llamada en orden cronológico.

---

## Task 24 — Container del cantor

**Archivo**: `src/presentation/caller/CallerContainer.tsx`

Conecta `useCaller` con `CallerView` y `CallHistory`. Maneja el reset automático al cambiar modo/toggle.

```tsx
// src/presentation/caller/CallerContainer.tsx
import { useCaller, type CallerMode } from './useCaller'
import { CallerView } from './CallerView'
import { CallHistory } from './CallHistory'

export function CallerContainer() {
  const {
    mode,
    setMode,
    excludeTrivialX1,
    setExcludeTrivialX1,
    current,
    history,
    exhausted,
    callNext,
    reset,
  } = useCaller()

  const handleModeChange = (next: CallerMode) => {
    setMode(next)
    // El cambio de modo es asíncrono respecto a `values`; reseteamos en el
    // próximo tick para que el mazo use el nuevo set de valores.
    queueMicrotask(reset)
  }

  const handleExcludeTrivialChange = (value: boolean) => {
    setExcludeTrivialX1(value)
    queueMicrotask(reset)
  }

  return (
    <CallerView
      mode={mode}
      excludeTrivialX1={excludeTrivialX1}
      current={current}
      exhausted={exhausted}
      onModeChange={handleModeChange}
      onExcludeTrivialChange={handleExcludeTrivialChange}
      onCallNext={callNext}
      onReset={reset}
    >
      <CallHistory history={history} />
    </CallerView>
  )
}
```

**Notas IMPORTANTES sobre el reset al cambiar modo/toggle**:
- `reset` usa `values`, que se recalcula con `mode`/`excludeTrivialX1`. Como los setters de estado de React son asíncronos, llamar `reset()` inmediatamente usaría los `values` viejos. `queueMicrotask(reset)` lo difiere un tick para que `useCaller` ya tenga el `values` nuevo.
- Si en QA el reset no toma el nuevo modo, la alternativa robusta es mover este efecto a un `useEffect` en `useCaller` que dependa de `[values]` y llame `reset()`. Documentado como fallback; implementá primero la versión con `queueMicrotask`.

**Criterios de aceptación**:
- Cambiar de 3x3 a 4x4 rebaraja con el pool correcto y limpia el historial.
- "Cantar" en 4x4 muestra una operación tipo "3 × 6 = 18" y la agrega al historial.
- "Cantar" repetido nunca repite un valor (sin reemplazo); al agotarse aparece "¡El mazo se agotó!".
- "Reiniciar" limpia historial y permite cantar de nuevo.

---

## Task 25 — Estilos del cantor

**Archivo**: `src/presentation/app/App.css` (editar; agregar al final)

Estilos para que la llamada actual se vea ENORME y legible desde lejos.

Agregar al final de `src/presentation/app/App.css`:

```css
/* ===== Cantor ===== */
.caller {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  text-align: center;
}

.caller__controls {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.caller__current {
  font-size: clamp(3rem, 12vw, 8rem);
  font-weight: 800;
  min-height: 1.2em;
  margin: 1rem 0;
  line-height: 1.1;
}

.caller__actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.caller__actions button {
  font-size: 1.25rem;
  padding: 0.75rem 1.5rem;
}

.caller__exhausted {
  color: #b00020;
  font-weight: 700;
}

.call-history {
  margin-top: 1.5rem;
  text-align: left;
}

.call-history__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: decimal inside;
  padding: 0;
}

.call-history__list li {
  background: #f0f0f0;
  border-radius: 6px;
  padding: 0.25rem 0.75rem;
}
```

**Notas**:
- `clamp(3rem, 12vw, 8rem)` hace que el número actual escale con el ancho de pantalla, gigante en proyector.

**Criterios de aceptación**:
- La llamada actual se ve muy grande y centrada.
- El historial se ve como chips en una lista numerada.

---

## Task 26 — App con navegación entre secciones

**Archivo**: `src/presentation/app/App.tsx` (reescribir completo)

Wiring final: un toggle simple entre "Generador" y "Cantor". Sin router (no hace falta para 2 vistas).

Reemplazar TODO el contenido de `src/presentation/app/App.tsx` por:

```tsx
// src/presentation/app/App.tsx
import { useState } from 'react'
import './App.css'
import { GeneratorContainer } from '../generator/GeneratorContainer'
import { CallerContainer } from '../caller/CallerContainer'

type Section = 'generator' | 'caller'

function App() {
  const [section, setSection] = useState<Section>('generator')

  return (
    <div className="app">
      <header className="app__nav no-print">
        <h1>Lotería de Multiplicar</h1>
        <nav>
          <button
            type="button"
            className={section === 'generator' ? 'active' : ''}
            onClick={() => setSection('generator')}
          >
            Generador
          </button>
          <button
            type="button"
            className={section === 'caller' ? 'active' : ''}
            onClick={() => setSection('caller')}
          >
            El cantor
          </button>
        </nav>
      </header>

      <main>
        {section === 'generator' ? <GeneratorContainer /> : <CallerContainer />}
      </main>
    </div>
  )
}

export default App
```

**Notas**:
- Sin react-router: es una SPA de 2 vistas, un `useState` alcanza.
- El header lleva `no-print` para no ensuciar la impresión de cartones.

**Criterios de aceptación**:
- La app arranca en "Generador".
- Los botones de nav cambian entre las dos secciones.
- `pnpm dev` muestra ambas secciones funcionando.

---

## Task 27 — Estilos de App/nav y limpieza de index.css

**Archivos**: `src/presentation/app/App.css` (agregar al final), `src/index.css` (editar)

Estilos del header/nav y limpieza de estilos default de Vite que puedan estorbar (ej. `display:flex` centrado en `body` que rompe el layout).

Agregar al final de `src/presentation/app/App.css`:

```css
/* ===== App / Nav ===== */
.app__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
}

.app__nav h1 {
  margin: 0;
  font-size: 1.5rem;
}

.app__nav nav {
  display: flex;
  gap: 0.5rem;
}

.app__nav nav button.active {
  font-weight: 700;
  text-decoration: underline;
}
```

Editar `src/index.css`: la plantilla de Vite suele poner en `body` un `display: flex; place-items: center;` y un ancho máximo en `#root` que centra todo y rompe el layout de pantalla completa. Buscá el bloque `body { ... }` y QUITÁ las líneas `display: flex;` y `place-items: center;` si existen. Si hay un bloque `#root { max-width: 1280px; margin: 0 auto; padding: 2rem; text-align: center; }`, reemplazalo por:

```css
#root {
  width: 100%;
  margin: 0;
  padding: 0;
}
```

**Notas**:
- El objetivo es que el contenido ocupe el ancho completo, no quede centrado en una columna angosta.
- Si tu `index.css` no tiene esos bloques (versión distinta de la plantilla), no pasa nada: solo asegúrate de que el layout no quede centrado/angosto.

**Criterios de aceptación**:
- El header se ve arriba, ancho completo, con título a la izquierda y nav a la derecha.
- El botón de la sección activa se ve resaltado.
- El generador y el cantor ocupan el ancho disponible (no una columna angosta centrada).

---

## Task 28 — Verificación final + README mínimo

**Archivos**: `README.md` (crear), correr suite completa.

Crear un README breve y correr todo para confirmar que el proyecto está sano.

Crear `/Users/daniel/workspace/loteria-multiplicar/README.md`:

```markdown
# Lotería de Multiplicar

Juego educativo de tablas de multiplicar. App web client-only (sin backend).

## Secciones
- **Generador**: crea cartones imprimibles (3x3, 4x4 o ambos). Imprimir / Exportar PDF desde el navegador.
- **El cantor**: canta números (3x3) u operaciones con su resultado (4x4) sin repetir, con historial y botón de reiniciar.

## Reglas
- 3x3: números 1–9, permutación única por cartón.
- 4x4: 16 productos del pool (36 valores, o 31 si se excluyen los triviales del ×1).
- Gana quien complete una línea (fila, columna o diagonal). La verificación es manual (cartones de papel).

## Scripts
- `pnpm dev` — desarrollo
- `pnpm build` — build de producción
- `pnpm test` — tests del dominio (Vitest)
```

Correr la verificación completa:
```bash
pnpm test
pnpm build
```

**Notas**:
- `pnpm build` corre `tsc -b && vite build`: valida tipos de TODO el proyecto y compila. Si algún componente tiene un error de tipos, acá salta.

**Criterios de aceptación**:
- `pnpm test` pasa toda la suite de dominio en verde (pools, factorizaciones, cartones, mazo).
- `pnpm build` termina sin errores de TypeScript ni de build.
- `pnpm dev` muestra ambas secciones funcionando end-to-end: generar e imprimir cartones; cantar sin repetir y reiniciar.

---

## Orden de merge sugerido

```
1 → 2 → 3                         (scaffolding + estructura)
4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15   (dominio puro + tests)
16 → 17 → 18 → 19 → 20            (sección Generador + impresión)
21 → 22 → 23 → 24 → 25            (sección Cantor)
26 → 27                           (wiring + navegación + estilos globales)
28                                (verificación final + README)
```

Sugerencia de commits (conventional, SIN atribución de IA):
- `chore: scaffold vite react-ts project` (Tasks 1–3)
- `feat: add card and deck domain with tests` (Tasks 4–15)
- `feat: add printable card generator` (Tasks 16–20)
- `feat: add caller screen` (Tasks 21–25)
- `feat: wire app navigation and global styles` (Tasks 26–27)
- `chore: final verification and readme` (Task 28)

---

## Fuera de scope (para otra iteración) — NO hacer ahora

- Autodetección de ganador (los cartones son de papel; el maestro verifica a mano).
- Cartones digitales interactivos.
- Backend, base de datos, persistencia, cuentas de usuario, guardado de partidas.
- Operaciones distintas de la multiplicación (suma/resta/división). SOLO multiplicación 1–9.
- React Router u otra librería de routing (alcanza con un `useState` de sección).
- Audio/voz para "cantar" (es visual; mostrar en grande, no reproducir sonido).
- Internacionalización / multi-idioma.
```
