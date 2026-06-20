import { BoardType } from '../../domain/types'

export interface GeneratorFormValues {
  count: number
  boardType: BoardType | 'both'
  excludeTrivial: boolean
}

interface GeneratorFormProps {
  values: GeneratorFormValues
  onChange: (values: GeneratorFormValues) => void
  onGenerate: () => void
  onPrint: () => void
  hasBoards: boolean
}

export function GeneratorForm({
  values,
  onChange,
  onGenerate,
  onPrint,
  hasBoards,
}: GeneratorFormProps) {
  const show4x4Options = values.boardType === '4x4' || values.boardType === 'both'

  return (
    <div className="generator-form">
      <div className="generator-form__field">
        <label htmlFor="gen-count">Cantidad de cartones</label>
        <input
          id="gen-count"
          type="number"
          min={1}
          max={50}
          value={values.count}
          onChange={(e) =>
            onChange({ ...values, count: Math.max(1, Number(e.target.value)) })
          }
        />
      </div>

      <div className="generator-form__field">
        <label htmlFor="gen-type">Tipo de cartón</label>
        <select
          id="gen-type"
          value={values.boardType}
          onChange={(e) =>
            onChange({ ...values, boardType: e.target.value as GeneratorFormValues['boardType'] })
          }
        >
          <option value="3x3">3×3 (dígitos del 1 al 9)</option>
          <option value="4x4">4×4 (productos de tablas)</option>
          <option value="both">Ambos</option>
        </select>
      </div>

      {show4x4Options && (
        <div className="generator-form__field generator-form__field--checkbox">
          <input
            id="gen-exclude-trivial"
            type="checkbox"
            checked={values.excludeTrivial}
            onChange={(e) => onChange({ ...values, excludeTrivial: e.target.checked })}
          />
          <label htmlFor="gen-exclude-trivial">
            Excluir productos triviales (×1)
          </label>
        </div>
      )}

      <div className="generator-form__actions">
        <button className="btn btn--primary" onClick={onGenerate}>
          Generar
        </button>
        {hasBoards && (
          <button className="btn btn--secondary" onClick={onPrint}>
            Imprimir
          </button>
        )}
      </div>
    </div>
  )
}
