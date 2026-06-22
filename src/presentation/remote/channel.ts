import * as Ably from 'ably'
import type { RemoteMessage } from '../../domain/remote'

const ABLY_KEY = import.meta.env.VITE_ABLY_KEY

/**
 * Un único cliente Realtime para toda la app.
 * `echoMessages: false` → el emisor NO recibe sus propios mensajes (la TV no
 * procesa su propio snapshot, ni el celu su propio comando).
 */
const client = new Ably.Realtime({ key: ABLY_KEY, echoMessages: false })

/** Nombre del canal a partir del room code. */
function channelName(code: string): string {
  return `room:${code}`
}

/** Conexión a una sala. Devuelve una API mínima e independiente del proveedor. */
export interface RoomConnection {
  /** Envía un mensaje tipado al resto de los participantes del canal. */
  send: (message: RemoteMessage) => void
  /** Cierra el canal y libera recursos. */
  close: () => void
}

/**
 * Se une al canal de la sala `code`.
 * - `onMessage`: callback con cada RemoteMessage recibido (no incluye los propios).
 * - `onStatus`: callback con true (canal adjunto) / false (caído).
 *
 * Usa un único nombre de evento ('msg') y mete el RemoteMessage en `data`;
 * así el adaptador no necesita conocer cada `kind`.
 */
export function joinRoom(
  code: string,
  onMessage: (message: RemoteMessage) => void,
  onStatus: (connected: boolean) => void
): RoomConnection {
  const name = channelName(code)
  const channel = client.channels.get(name)

  // Suscribirse al evento 'msg' auto-adjunta el canal.
  void channel.subscribe('msg', (msg) => {
    onMessage(msg.data as RemoteMessage)
  })

  // Estado del canal → connected. 'attached' = listo; el resto = caído.
  channel.on('attached', () => onStatus(true))
  channel.on('detached', () => onStatus(false))
  channel.on('suspended', () => onStatus(false))
  channel.on('failed', () => onStatus(false))

  return {
    send: (message) => {
      void channel.publish('msg', message)
    },
    close: () => {
      channel.unsubscribe()
      void channel.detach()
      client.channels.release(name)
    },
  }
}
