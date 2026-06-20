import { useCallback, useEffect, useMemo, useState } from 'react'
import { createDeck, draw, isExhausted } from '../../domain/deck'
import { getProductPool } from '../../domain/products'
import { pickFactorization, getFactorizations } from '../../domain/factorization'
import { pickAddition, getAdditions } from '../../domain/addition'
import type { Deck } from '../../domain/types'

export type CallerMode = '3x3' | '4x4'

export interface CurrentCall {
  /** Valor numérico cantado (el número en 3x3; el producto en 4x4). */
  value: number
  /** Operación sin el resultado. En 3x3: "a + b". En 4x4: "a × b". */
  operation: string
  /** Resultado de la operación (el número cantado). */
  result: number
  /** Texto completo para el historial. Ej "a × b = producto". */
  display: string
}

const NUMBERS_3X3 = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function buildCall(
  a: number,
  b: number,
  symbol: '+' | '×',
  result: number
): CurrentCall {
  const operation = `${a} ${symbol} ${b}`
  return {
    value: result,
    operation,
    result,
    display: `${operation} = ${result}`,
  }
}

/**
 * Elige una suma al azar para el número cantado (3x3).
 * Usa sumandos >= 1; si no hay opciones (solo pasa con el 1), hace fallback
 * permitiendo el 0 para que SIEMPRE se muestre una suma.
 */
function safePickAddition(target: number): [number, number] {
  const options = getAdditions(target, false)
  if (options.length > 0) {
    return options[Math.floor(Math.random() * options.length)]
  }
  // Fallback: permitir el 0 (cubre el caso del 1 => "0 + 1 = 1")
  return pickAddition(target, true)
}

/**
 * Elige una factorización al azar para el producto dado.
 * Si no hay opciones con el filtro pedido, hace fallback a allowFactorOne=true
 * para garantizar que siempre haya algo (cubre casos borde).
 */
function safePickFactorization(
  product: number,
  allowFactorOne: boolean
): [number, number] {
  const options = getFactorizations(product, allowFactorOne)
  if (options.length > 0) {
    return options[Math.floor(Math.random() * options.length)]
  }
  // Fallback: permitir factor 1
  return pickFactorization(product, true)
}

export function useCaller() {
  const [mode, setMode] = useState<CallerMode>('3x3')
  const [excludeTrivial, setExcludeTrivial] = useState(true)

  const values = useMemo((): number[] => {
    return mode === '3x3' ? NUMBERS_3X3 : getProductPool(excludeTrivial)
  }, [mode, excludeTrivial])

  const [deck, setDeck] = useState<Deck<number>>(() => createDeck(values))
  const [current, setCurrent] = useState<CurrentCall | null>(null)
  const [history, setHistory] = useState<CurrentCall[]>([])

  const reset = useCallback(() => {
    setDeck(createDeck(values))
    setCurrent(null)
    setHistory([])
  }, [values])

  // Cuando cambia el modo o el toggle de triviales, `values` cambia y el mazo
  // DEBE reconstruirse con los valores correctos. Hacerlo de forma reactiva acá
  // evita el bug de cerrar sobre un `values` viejo al cambiar de modo: así el
  // 4x4 siempre saca del pool de productos (no de los números 1-9 del 3x3).
  useEffect(() => {
    reset()
  }, [reset])

  const callNext = useCallback(() => {
    const result = draw(deck)
    if (result.value === null) return
    setDeck(result.deck)

    let call: CurrentCall
    if (mode === '3x3') {
      const [a, b] = safePickAddition(result.value)
      call = buildCall(a, b, '+', result.value)
    } else {
      // En 4x4: allowFactorOne es lo opuesto de excludeTrivial
      const [a, b] = safePickFactorization(result.value, !excludeTrivial)
      call = buildCall(a, b, '×', result.value)
    }

    setCurrent(call)
    setHistory((h) => [...h, call])
  }, [deck, mode, excludeTrivial])

  const exhausted = isExhausted(deck)

  return {
    mode,
    setMode,
    excludeTrivial,
    setExcludeTrivial,
    current,
    history,
    exhausted,
    callNext,
    reset,
  }
}
