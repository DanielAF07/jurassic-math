<p align="center">
  <img src="public/logo.png" alt="Jurassic Math" width="200" />
</p>

# 🦖 Jurassic Math — Lotería para practicar matemáticas

Lotería (bingo) de salón para practicar **cálculo mental** jugando. La app genera tableros imprimibles y trae un **cantor** que saca operaciones al azar, sin repetir, hasta agotar el mazo. Dos modos según lo que quieras ejercitar:

| Modo | Tablero | Qué practica | Qué canta el cantor |
|------|---------|--------------|---------------------|
| **3×3** | 9 dígitos del 1 al 9 | **Sumas** | `a + b = resultado` (el resultado está en el tablero) |
| **4×4** | 16 productos de las tablas | **Multiplicación** | `a × b = producto` (el producto está en el tablero) |

En ambos modos **se gana por línea**: fila, columna o diagonal completa.

> El truco didáctico: el jugador no ve el número cantado, ve la **operación**. Para tacharlo tiene que resolverla. La lotería se vuelve un pretexto para hacer cuentas.

---

## Cómo se juega

1. **Generas e imprimes** los tableros (uno por jugador).
2. El docente abre **El cantor** en su pantalla y elige el mismo modo de los tableros.
3. Cada vez que toca **Cantar**, aparece una operación al azar. La lee en voz alta.
4. Los jugadores **resuelven** y, si tienen el resultado, lo tachan.
5. El primero que completa una línea (fila, columna o diagonal) **gana**.

### Modo 3×3 — Sumas

- Cuadrícula de 3×3 con los dígitos del **1 al 9 sin repetir**.
- El cantor saca un número y lo presenta como una **suma** (ej. `3 + 4` para el 7).
- El número 1 no tiene suma de dos sumandos ≥ 1, así que en ese caso el cantor usa el 0 como respaldo (`0 + 1 = 1`) para que **siempre** haya una operación que resolver.

### Modo 4×4 — Tablas de multiplicar

- Cuadrícula de 4×4 con **16 productos distintos** de las tablas del 1 al 9.
- El cantor saca un producto y lo presenta como una **multiplicación** (ej. `3 × 7` para el 21).
- Opción **Excluir triviales (×1)**: quita los productos que solo salen multiplicando por 1 (`1, 2, 3, 5, 7`), dejando un conjunto más interesante y difícil. Hay que usar **el mismo ajuste** al generar los tableros y al cantar.

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
| `pnpm build` | Compilación de producción a `dist/`. |
| `pnpm test` | Tests del dominio con Vitest. |
| `pnpm typecheck` | Chequeo de tipos sin emitir (`tsc --noEmit`). |

---

## Generar e imprimir tableros

1. Entra a la pestaña **Cartones**.
2. Elige **cantidad** (1–50) y **tipo**: `3×3`, `4×4` o `Ambos`.
3. Para `4×4` (o `Ambos`) decide si **excluyes los triviales del ×1**.
4. **Generar**. Revisa los tableros en pantalla.
5. **Imprimir**: se abre el diálogo del navegador y la interfaz (encabezado, controles) se oculta sola gracias a las clases `no-print`. Se recomienda **A4 horizontal** para que entren varios por hoja.

La unicidad está garantizada: el generador no repite tableros. Si pides más de los matemáticamente posibles (p. ej. más de 9! = 362,880 tableros 3×3), falla con un error claro en vez de entrar en bucle.

## Usar El cantor

1. Entra a la pestaña **El cantor**.
2. Elige el **modo** (3×3 o 4×4) que coincida con los tableros impresos.
3. En 4×4, alinea el interruptor **Excluir triviales del ×1** con lo que usaste al generar.
4. **Cantar** saca una operación nueva sin repetir. El **historial** queda debajo para verificar.
5. Cuando el mazo se agota, el cantor lo avisa. **Reiniciar** baraja todo de nuevo y vacía el historial; úsalo al empezar cada partida o si cambias de modo a mitad de ronda.

---

## Arquitectura

Separación estricta entre **dominio puro** y **presentación**, con el patrón *container / presentational* en la interfaz.

```
src/
├── domain/                  Lógica pura, sin React. Cubierta al 100% por tests.
│   ├── types.ts             Board, Deck<T>, Factorization, Addition, RandomFn
│   ├── boards.ts            Generación de tableros 3×3 y 4×4 únicos
│   ├── deck.ts              Mazo genérico: shuffle, draw, isExhausted
│   ├── products.ts          Productos de las tablas + filtro de triviales
│   ├── factorization.ts     Descompone un producto en a × b
│   └── addition.ts          Descompone un número en a + b
└── presentation/
    ├── generator/           Container + View + Form para crear/imprimir tableros
    └── caller/              Container + hook (useCaller) + View para cantar
```

### Decisiones de diseño

- **Aleatoriedad inyectable.** Toda función de dominio acepta una `RandomFn` (`() => number`) que por defecto es `Math.random`. En los tests se inyecta un generador determinístico, así los 65 tests son **reproducibles** y no tienen intermitencias.
- **Mazo inmutable.** `draw` no muta: devuelve un mazo nuevo con `remaining`/`drawn` actualizados. El estado vive en React, el dominio solo transforma.
- **El mazo se reconstruye de forma reactiva.** En `useCaller`, cambiar de modo o activar/desactivar los triviales recalcula `values` y un `useEffect` rebaraja. Esto evita el error clásico de capturar un `values` viejo en el closure y cantar números del modo anterior.
- **Respaldos que nunca dejan al cantor sin operación.** `safePickAddition` y `safePickFactorization` cubren los casos límite (el 1 sin suma ≥ 1, productos sin factorización no trivial) para garantizar que siempre haya algo que cantar.

## Tests

```bash
pnpm test
```

65 tests sobre el dominio (`deck`, `addition`, `products`, `boards`, `factorization`). La capa de presentación es delgada por diseño: la lógica que importa vive en `domain/` y ahí está toda cubierta.

## Stack

React 18 · TypeScript 5 · Vite 5 · Vitest 2
