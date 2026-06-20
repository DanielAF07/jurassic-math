# 🦖 Jurassic Math — Lotería para practicar matemáticas

Lotería (bingo) de aula para practicar **cálculo mental** jugando. La app genera cartones imprimibles y trae un **cantor** que saca operaciones al azar, sin repetir, hasta agotar el mazo. Dos modos según lo que quieras ejercitar:

| Modo | Cartón | Qué practica | Qué canta el cantor |
|------|--------|--------------|---------------------|
| **3×3** | 9 dígitos del 1 al 9 | **Sumas** | `a + b = resultado` (el resultado está en el cartón) |
| **4×4** | 16 productos de las tablas | **Multiplicación** | `a × b = producto` (el producto está en el cartón) |

En ambos modos **se gana por línea**: fila, columna o diagonal completa.

> El truco didáctico: el jugador no ve el número cantado, ve la **operación**. Para tachar tiene que resolverla. La lotería se vuelve una excusa para hacer cuentas.

---

## Cómo se juega

1. **Generás e imprimís** los cartones (uno por jugador).
2. El docente abre **El cantor** en su pantalla y elige el mismo modo de los cartones.
3. Cada vez que toca **Cantar**, aparece una operación al azar. La lee en voz alta.
4. Los jugadores **resuelven** y, si tienen el resultado, lo tachan.
5. El primero que completa una línea (fila, columna o diagonal) **gana**.

### Modo 3×3 — Sumas

- Grilla de 3×3 con los dígitos del **1 al 9 sin repetir**.
- El cantor saca un número y lo presenta como una **suma** (ej. `3 + 4` para el 7).
- El número 1 no tiene suma de dos sumandos ≥ 1, así que en ese caso el cantor usa el 0 como fallback (`0 + 1 = 1`) para que **siempre** haya una operación que resolver.

### Modo 4×4 — Tablas de multiplicar

- Grilla de 4×4 con **16 productos distintos** de las tablas del 1 al 9.
- El cantor saca un producto y lo presenta como una **multiplicación** (ej. `3 × 7` para el 21).
- Opción **Excluir triviales (×1)**: quita los productos que solo salen multiplicando por 1 (`1, 2, 3, 5, 7`), dejando un pool más interesante y difícil. Tenés que usar **el mismo ajuste** al generar los cartones y al cantar.

---

## Puesta en marcha

Requiere **Node 18+**. El repo usa **pnpm** (hay `pnpm-lock.yaml`), pero npm también funciona.

```bash
pnpm install
pnpm dev
```

La app queda en `http://localhost:5173`.

### Scripts

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | Servidor de desarrollo (Vite). |
| `pnpm build` | Build de producción a `dist/`. |
| `pnpm test` | Tests del dominio con Vitest. |
| `pnpm typecheck` | Chequeo de tipos sin emitir (`tsc --noEmit`). |

---

## Generar e imprimir cartones

1. Entrá a la pestaña **Cartones**.
2. Elegí **cantidad** (1–50) y **tipo**: `3×3`, `4×4` o `Ambos`.
3. Para `4×4` (o `Ambos`) decidí si **excluís los triviales del ×1**.
4. **Generar**. Revisá los cartones en pantalla.
5. **Imprimir**: se abre el diálogo del navegador y la UI (header, controles) se oculta sola gracias a las clases `no-print`. Recomendado **A4 horizontal** para que entren varios por hoja.

La unicidad está garantizada: el generador no repite cartones. Si pedís más de los matemáticamente posibles (p. ej. más de 9! = 362.880 cartones 3×3), falla con un error claro en vez de entrar en loop.

## Usar El cantor

1. Entrá a la pestaña **El cantor**.
2. Elegí el **modo** (3×3 o 4×4) que coincida con los cartones impresos.
3. En 4×4, alineá el toggle **Excluir triviales del ×1** con lo que usaste al generar.
4. **Cantar** saca una operación nueva sin repetir. El **historial** queda debajo para verificar.
5. Cuando el mazo se agota, el cantor lo avisa. **Reiniciar** baraja todo de nuevo y vacía el historial — usalo al empezar cada partida o si cambiás de modo a mitad de ronda.

---

## Arquitectura

Separación estricta entre **dominio puro** y **presentación**, con el patrón *container / presentational* en la UI.

```
src/
├── domain/                  Lógica pura, sin React. Testeada al 100%.
│   ├── types.ts             Board, Deck<T>, Factorization, Addition, RandomFn
│   ├── boards.ts            Generación de cartones 3×3 y 4×4 únicos
│   ├── deck.ts              Mazo genérico: shuffle, draw, isExhausted
│   ├── products.ts          Productos de las tablas + filtro de triviales
│   ├── factorization.ts     Descompone un producto en a × b
│   └── addition.ts          Descompone un número en a + b
└── presentation/
    ├── generator/           Container + View + Form para crear/imprimir cartones
    └── caller/              Container + hook (useCaller) + View para cantar
```

### Decisiones de diseño

- **Aleatoriedad inyectable.** Toda función de dominio acepta una `RandomFn` (`() => number`) que por defecto es `Math.random`. En los tests se inyecta un generador determinístico, así los 65 tests son **reproducibles** sin flakiness.
- **Mazo inmutable.** `draw` no muta: devuelve un mazo nuevo con `remaining`/`drawn` actualizados. El estado vive en React, el dominio solo transforma.
- **El mazo se reconstruye de forma reactiva.** En `useCaller`, cambiar de modo o togglear los triviales recalcula `values` y un `useEffect` rebaraja. Esto evita el bug clásico de capturar un `values` viejo en el closure y cantar números del modo anterior.
- **Fallbacks que nunca dejan al cantor sin operación.** `safePickAddition` y `safePickFactorization` cubren los bordes (el 1 sin suma ≥ 1, productos sin factorización no trivial) para garantizar que siempre haya algo que cantar.

## Tests

```bash
pnpm test
```

65 tests sobre el dominio (`deck`, `addition`, `products`, `boards`, `factorization`). La capa de presentación es fina por diseño: la lógica que importa vive en `domain/` y ahí está toda cubierta.

## Stack

React 18 · TypeScript 5 · Vite 5 · Vitest 2
