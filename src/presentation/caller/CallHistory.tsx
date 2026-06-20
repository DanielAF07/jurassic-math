import type { CurrentCall } from './useCaller'

interface CallHistoryProps {
  history: CurrentCall[]
}

export function CallHistory({ history }: CallHistoryProps) {
  if (history.length === 0) {
    return <p className="call-history__empty">Todavía no se cantó nada.</p>
  }
  // El último cantado va primero y se destaca.
  const reversed = [...history].slice().reverse()
  return (
    <div className="call-history">
      <h3>Ya cantados ({history.length})</h3>
      <ul className="call-history__list">
        {reversed.map((call, index) => (
          <li
            key={history.length - 1 - index}
            className={
              index === 0
                ? 'call-history__chip call-history__chip--latest'
                : 'call-history__chip'
            }
          >
            <span className="call-history__op">{call.operation}</span>
            <span className="call-history__eq">=</span>
            <span className="call-history__res">{call.result}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
