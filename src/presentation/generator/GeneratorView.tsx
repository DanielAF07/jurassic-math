import { Board } from '../../domain/types'
import { BoardCard } from './BoardCard'
import { GeneratorForm, GeneratorFormValues } from './GeneratorForm'

interface GeneratorViewProps {
  formValues: GeneratorFormValues
  boards: Board[]
  onFormChange: (values: GeneratorFormValues) => void
  onGenerate: () => void
  onPrint: () => void
}

export function GeneratorView({
  formValues,
  boards,
  onFormChange,
  onGenerate,
  onPrint,
}: GeneratorViewProps) {
  return (
    <div className="generator-view">
      <h1>Generador de cartones</h1>

      <GeneratorForm
        values={formValues}
        onChange={onFormChange}
        onGenerate={onGenerate}
        onPrint={onPrint}
        hasBoards={boards.length > 0}
      />

      {boards.length === 0 ? (
        <p className="generator-empty">
          Configurá el formulario y hacé clic en <strong>Generar</strong> para crear los cartones.
        </p>
      ) : (
        <div className="boards-grid">
          {boards.map((board, i) => (
            <BoardCard key={i} board={board} />
          ))}
        </div>
      )}
    </div>
  )
}
