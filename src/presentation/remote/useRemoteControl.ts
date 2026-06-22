import { useCallback, useEffect, useReducer, useRef } from 'react'
import { joinRoom, type RoomConnection } from './channel'
import { controlReducer, initialControlState } from '../../domain/remote'
import type { RemoteCommand } from '../../domain/remote'

/**
 * Lado CONTROL (celu) del control remoto. Se une a la sala, pide el snapshot al
 * conectar (late join / reconexión) y mantiene el último estado recibido vía el
 * reducer puro. NO tiene lógica de juego: solo recibe estado y manda comandos.
 */
export function useRemoteControl(code: string | null) {
  const [state, dispatch] = useReducer(controlReducer, initialControlState)
  const connRef = useRef<RoomConnection | null>(null)

  useEffect(() => {
    if (!code) return
    const conn = joinRoom(
      code,
      (message) => dispatch({ type: 'message', message }),
      (connected) => {
        dispatch({ type: connected ? 'channel-connected' : 'channel-disconnected' })
        // Al (re)conectar, pedir el snapshot actual al Pantallón.
        if (connected) {
          conn.send({ kind: 'control:hello' })
        }
      }
    )
    connRef.current = conn
    return () => {
      conn.close()
      connRef.current = null
    }
  }, [code])

  const sendCommand = useCallback((command: RemoteCommand) => {
    connRef.current?.send({ kind: 'control:command', command })
  }, [])

  return {
    connected: state.connected,
    snapshot: state.snapshot,
    sendCommand,
  }
}
