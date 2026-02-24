// WebSocket server
import * as crypto from 'crypto'

interface Connection {
  id: string
  userId?: string
  rooms: Set<string>
  socket: any
}

export class WebSocketServer {
  private connections: Map<string, Connection> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  handleConnection(socket: any): string {
    const id = crypto.randomBytes(16).toString('hex')
    this.connections.set(id, { id, rooms: new Set(), socket })
    return id
  }

  joinRoom(connId: string, roomName: string): void {
    const conn = this.connections.get(connId)
    if (!conn) return
    if (!this.rooms.has(roomName)) this.rooms.set(roomName, new Set())
    this.rooms.get(roomName)!.add(connId)
    conn.rooms.add(roomName)
  }

  leaveRoom(connId: string, roomName: string): void {
    const conn = this.connections.get(connId)
    const room = this.rooms.get(roomName)
    if (conn && room) { room.delete(connId); conn.rooms.delete(roomName) }
  }

  broadcast(roomName: string, message: any): void {
    const room = this.rooms.get(roomName)
    if (!room) return
    for (const connId of room) {
      const conn = this.connections.get(connId)
      if (conn?.socket) conn.socket.send(JSON.stringify(message))
    }
  }
}
