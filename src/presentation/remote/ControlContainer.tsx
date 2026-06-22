import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRemoteControl } from './useRemoteControl'
import { normalizeRoomCode } from '../../domain/remote'
import { ControlView } from './ControlView'
import './control.css'

export function ControlContainer() {
  const [params] = useSearchParams()
  // Code precargado desde el QR (?code=XXXX), si vino.
  const initialCode = normalizeRoomCode(params.get('code') ?? '')

  // `input` es lo que el usuario tipea; `code` es el code confirmado (con el que conectamos).
  const [input, setInput] = useState(initialCode)
  const [code, setCode] = useState<string | null>(initialCode || null)

  const { connected, snapshot, sendCommand } = useRemoteControl(code)

  return (
    <ControlView
      input={input}
      code={code}
      connected={connected}
      snapshot={snapshot}
      onInputChange={(v) => setInput(normalizeRoomCode(v))}
      onConnect={() => setCode(input || null)}
      onDisconnect={() => setCode(null)}
      onNext={() => sendCommand({ type: 'next' })}
      onReset={() => sendCommand({ type: 'reset' })}
    />
  )
}
