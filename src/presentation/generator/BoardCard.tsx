import { Board } from '../../domain/types'

interface BoardCardProps {
  board: Board
}

export function BoardCard({ board }: BoardCardProps) {
  const mode3x3 = board.type === '3x3'
  const cardClass = mode3x3 ? 'board-card board-card--3x3' : 'board-card'
  const gridClass = mode3x3
    ? 'board-card__grid--3x3'
    : 'board-card__grid--4x4'

  // El marco (título "Jurassic Math", cajas y decoración) es la imagen de
  // fondo, distinta por modo. Acá solo montamos los números, calzados en
  // las cajas del arte.
  return (
    <div className={cardClass}>
      <div className={`board-card__grid ${gridClass}`}>
        {board.cells.map((cell, i) => (
          <div key={i} className="board-card__cell">
            {cell}
          </div>
        ))}
      </div>
    </div>
  )
}
