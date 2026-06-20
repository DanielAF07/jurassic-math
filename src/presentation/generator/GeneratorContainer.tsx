import { useState } from 'react'
import { Board } from '../../domain/types'
import { generate3x3Boards, generate4x4Boards } from '../../domain/boards'
import { getProductPool } from '../../domain/products'
import { GeneratorFormValues } from './GeneratorForm'
import { GeneratorView } from './GeneratorView'
import './generator.css'

const DEFAULT_FORM: GeneratorFormValues = {
  count: 5,
  boardType: '3x3',
  excludeTrivial: true,
}

export function GeneratorContainer() {
  const [formValues, setFormValues] = useState<GeneratorFormValues>(DEFAULT_FORM)
  const [boards, setBoards] = useState<Board[]>([])
  const [error, setError] = useState<string | null>(null)

  function handleGenerate() {
    setError(null)
    try {
      const { count, boardType, excludeTrivial } = formValues
      let result: Board[] = []

      if (boardType === '3x3') {
        result = generate3x3Boards(count)
      } else if (boardType === '4x4') {
        const pool = getProductPool(excludeTrivial)
        result = generate4x4Boards(count, pool)
      } else {
        // 'both'
        const pool = getProductPool(excludeTrivial)
        const boards3 = generate3x3Boards(count)
        const boards4 = generate4x4Boards(count, pool)
        // Interleave: 3x3 first then 4x4
        result = [...boards3, ...boards4]
      }

      setBoards(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al generar cartones.')
      setBoards([])
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <>
      {error && (
        <div style={{ color: '#dc2626', padding: '0.75rem 1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}
      <GeneratorView
        formValues={formValues}
        boards={boards}
        onFormChange={setFormValues}
        onGenerate={handleGenerate}
        onPrint={handlePrint}
      />
    </>
  )
}
