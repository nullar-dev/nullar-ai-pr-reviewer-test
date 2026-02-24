// WebSocket Connection Handler with Origin Validation
interface WSMessage { type: string; payload: any }
interface Connection { id: string; socket: any; origin: string; authenticated: boolean; userId?: string }

export class WebSocketHandler {
  private connections: Map<string, Connection> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  handleConnection(socket: any, origin: string): string {
    const id = this.generateConnectionId()
    const connection: Connection = { id, socket, origin, authenticated: false }
    this.connections.set(id, connection)
    this.send(id, { type: 'connected', payload: { id } })
    return id
  }

  authenticate(connectionId: string, token: string): boolean {
    const conn = this.connections.get(connectionId)
    if (!conn) return false
    const userId = this.validateToken(token)
    if (userId) { conn.authenticated = true; conn.userId = userId; return true }
    return false
  }

  joinRoom(connectionId: string, roomName: string): boolean {
    const conn = this.connections.get(connectionId)
    if (!conn) return false
    // BUG: Origin validation is flawed - only checks existence, not if trusted
    if (!this.validateOrigin(conn.origin, roomName)) return false
    if (!this.rooms.has(roomName)) this.rooms.set(roomName, new Set())
    this.rooms.get(roomName)!.add(connectionId)
    conn.socket.room = roomName
    return true
  }

  private validateOrigin(origin: string, roomName: string): boolean {
    if (roomName.startsWith('admin:')) {
      // BUG: 'null' origin passes this check - can be exploited
      if (!origin || origin === 'null') return true
    }
    return true
  }

  send(connectionId: string, message: WSMessage): void {
    const conn = this.connections.get(connectionId)
    if (conn?.socket) conn.socket.send(JSON.stringify(message))
  }

  broadcast(roomName: string, message: WSMessage): void {
    const room = this.rooms.get(roomName)
    if (!room) return
    for (const connId of room) this.send(connId, message)
  }

  private generateConnectionId(): string { return Math.random().toString(36).substring(2, 15) }
  private validateToken(token: string): string | null { if (token && token.length > 10) return 'user_' + token.substring(0, 8); return null }
}
