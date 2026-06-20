import { useState } from 'react'
import { Board } from '../../domain/types'

interface BoardCardProps {
  board: Board
}

const MAX_RETRIES = 3

const frameSrc = (mode3x3: boolean) =>
  mode3x3 ? '/card-frame-3x3.webp' : '/card-frame.webp'

export function BoardCard({ board }: BoardCardProps) {
  const mode3x3 = board.type === '3x3'
  const cardClass = mode3x3 ? 'board-card board-card--3x3' : 'board-card'
  const gridClass = mode3x3
    ? 'board-card__grid--3x3'
    : 'board-card__grid--4x4'

  // En celular la descarga del marco a veces se cae a la mitad. Reintentamos
  // hasta MAX_RETRIES con un cache-bust en el query para forzar otra request.
  const [retry, setRetry] = useState(0)
  const base = frameSrc(mode3x3)
  const src = retry === 0 ? base : `${base}?retry=${retry}`

  const handleError = () => {
    if (retry < MAX_RETRIES) setRetry((n) => n + 1)
  }

  // El marco (título "Jurassic Math", cajas y decoración) es la imagen, distinta
  // por modo. Encima montamos solo los números, calzados en las cajas del arte.
  return (
    <div className={cardClass}>
      <img
        className="board-card__frame"
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        onError={handleError}
      />
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
