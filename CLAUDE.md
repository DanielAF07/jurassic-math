# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

**Jurassic Math** — una lotería (bingo) de salón para practicar cálculo mental. Genera tableros imprimibles y un "cantor" saca operaciones al azar sin repetir. El jugador no ve el número cantado: ve la **operación** y debe resolverla para tachar. Lee `README.md` para las reglas de juego completas (modos 3×3 sumas / 4×4 multiplicación, ganar por línea, etc.).

UI y comentarios están en **español**. La lógica que importa vive en `domain/`; la presentación es deliberadamente delgada.

## Comandos

Gestor de paquetes: **pnpm** (`pnpm@11.1.2`), Node ≥18. No hay ESLint — el chequeo estático es `typecheck`.

```bash
pnpm dev          # Vite dev server en http://localhost:5173
pnpm build        # build de producción a dist/
pnpm test         # corre todos los tests (vitest run)
pnpm typecheck    # tsc --noEmit (usar como "lint")
```

Tests (Vitest, `globals: true` → no hace falta importar `describe`/`it`; entorno `node`; solo matchea `src/**/*.test.ts`):

```bash
pnpm test src/domain/deck.test.ts   # un solo archivo
pnpm test -t "draw"                 # tests cuyo nombre matchea "draw"
```

## Arquitectura

Separación estricta **dominio puro ↔ presentación**, con patrón *container / presentational* en la UI.

```
src/
├── domain/          Lógica pura, sin React. Es la fuente de verdad y está cubierta por tests.
│   ├── types.ts         Board, Deck<T>, Factorization, Addition, RandomFn
│   ├── deck.ts          Mazo genérico inmutable: shuffle, createDeck, draw, isExhausted
│   ├── boards.ts        Genera tableros 3×3 / 4×4 ÚNICOS (con cota + error si pides imposibles)
│   ├── products.ts      Pool de productos de las tablas + filtro de triviales (×1)
│   ├── factorization.ts Descompone un producto en a × b
│   ├── addition.ts      Descompone un número en a + b
│   └── simulation.ts    Simula partidas reusando boards+deck; estadísticas del canto ganador
└── presentation/
    ├── Layout.tsx   Cascarón común: marca + nav (NavLink) + <Outlet/> donde se montan las vistas
    ├── generator/   Crear/imprimir tableros (Container + View + Form + BoardCard)
    ├── caller/      "El cantor": Container + useCaller (hook con la lógica) + View + CallHistory
    └── tv/          "Pantallón": modo TV a pantalla completa (Container + useTvScreen + View)
```

`App.tsx` define el árbol de rutas (`react-router-dom`): un layout route con `Layout` y tres rutas hijas. `/` redirige a `/cartones`; cualquier ruta desconocida cae también en `/cartones`. `BrowserRouter` se monta en `main.tsx`.

| Ruta | Vista |
|------|-------|
| `/cartones` | `GeneratorContainer` (Cartones) |
| `/cantor` | `CallerContainer` (El cantor) |
| `/pantallon` | `TvContainer` (Pantallón) |

Cambiar de ruta desmonta la vista anterior (igual que el viejo switch por tab), así que el cantor/TV reinician su estado al navegar — es el comportamiento esperado, no un bug. `vercel.json` reescribe todas las rutas a `/index.html` (fallback SPA): sin eso, recargar o compartir una ruta profunda como `/pantallon` devolvería 404 en Vercel.

### Decisiones de diseño (lo que NO es obvio)

- **Aleatoriedad inyectable.** Toda función de `domain/` recibe `random: RandomFn = Math.random`. Los tests inyectan un RNG determinístico → reproducibles, sin intermitencias. Si agregas lógica de dominio que use azar, **sigue este patrón** (no llames a `Math.random` directo dentro del dominio).

- **Mazo inmutable.** `draw` no muta: devuelve `{ deck, value }` con un mazo nuevo. El estado vive en React; el dominio solo transforma. No introduzcas mutación.

- **`useCaller` reconstruye el mazo de forma reactiva.** Cambiar de modo o el toggle de triviales recalcula `values` (`useMemo`) y un `useEffect` rebaraja vía `reset`. Esto existe a propósito para evitar el bug de capturar un `values` viejo en el closure y cantar números del modo anterior. No "optimices" sacando ese efecto.

- **El Pantallón (`useTvScreen`) reusa `useCaller` entero** (modos, triviales, sorteo) y le agrega fases setup/playing, animación de eclosión del huevo, pose del dino, pantalla completa y teclado (Espacio/Enter avanza, R reinicia). A diferencia del cantor, **NUNCA expone `current.result`**: la TV muestra solo la operación para que los chicos la resuelvan. Mantén esa invariante.

- **`excludeTrivial` debe coincidir** entre el generador y el cantor/TV para una misma partida. Es un acoplamiento de gameplay, no un bug.

- **Respaldos que nunca dejan al cantor sin operación.** `safePickAddition` / `safePickFactorization` cubren casos borde (el 1 no tiene suma de dos sumandos ≥1 → fallback `0 + 1`; productos sin factorización no trivial → fallback con factor 1). Si tocas el pool o el filtrado, no rompas estos fallbacks.

- **Impresión.** El generador imprime con el diálogo del navegador; la UI (header, controles) se oculta con la clase CSS `no-print`. Cualquier control nuevo que no deba imprimirse necesita esa clase.

- **Generación de tableros con cota.** `generate3x3Boards` / `generate4x4Boards` garantizan unicidad y, si pides más de lo matemáticamente posible, lanzan un error claro en vez de entrar en bucle infinito (límite de intentos).
