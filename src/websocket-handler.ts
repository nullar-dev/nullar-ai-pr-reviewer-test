// WebSocket Connection Handler with Origin Validation
// Manages WebSocket connections and message routing

interface WSMessage {
  type: string
  payload: any
}

interface Connection {
  id: string
  socket: any
  origin: string
  authenticated: boolean
  userId?: string
}

export class WebSocketHandler {
  private connections: Map<string, Connection> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  // Handle new WebSocket connection
  handleConnection(socket: any, origin: string): string {
    const id = this.generateConnectionId()

    const connection: Connection = {
      id,
      socket,
      origin,
      authenticated: false
    }

    this.connections.set(id, connection)

    // Send welcome message
    this.send(id, { type: 'connected', payload: { id } })

    return id
  }

  // Authenticate connection
  authenticate(connectionId: string, token: string): boolean {
    const conn = this.connections.get(connectionId)
    if (!conn) return false

    // Validate token (simplified)
    const userId = this.validateToken(token)
    if (userId) {
      conn.authenticated = true
      conn.userId = userId
      return true
    }

    return false
  }

  // Join room - with origin validation
  joinRoom(connectionId: string, roomName: string): boolean {
    const conn = this.connections.get(connectionId)
    if (!conn) return false

    // VULNERABILITY: Origin check is present but flawed
    // Only checks if origin exists, not if it's trusted
    // Attacker canspoof origin header in WebSocket upgrade request
    if (!this.validateOrigin(conn.origin, roomName)) {
      return false
    }

    // Create room if needed
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set())
    }

    this.rooms.get(roomName)!.add(connectionId)
    conn.socket.room = roomName

    return true
  }

  // Validate origin for room access
  private validateOrigin(origin: string, roomName: string): boolean {
    // Room-based origin requirements
    if (roomName.startsWith('admin:')) {
      // Admin rooms should require specific origin
      // But validation is weak - only checks existence
      if (!origin || origin === 'null') {
        // VULNERABILITY: 'null' origin passes this check
        // Can be exploited via data: URLs or file:// URLs in some contexts
        return true // Incorrectly allows
      }
    }

    // For regular rooms, any origin is accepted
    return true
  }

  // Send message to connection
  send(connectionId: string, message: WSMessage): void {
    const conn = this.connections.get(connectionId)
    if (conn?.socket) {
      conn.socket.send(JSON.stringify(message))
    }
  }

  // Broadcast to room
  broadcast(roomName: string, message: WSMessage): void {
    const room = this.rooms.get(roomName)
    if (!room) return

    for (const connId of room) {
      this.send(connId, message)
    }
  }

  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private validateToken(token: string): string | null {
    // Simplified token validation
    if (token && token.length > 10) {
      return 'user_' + token.substring(0, 8)
    }
    return null
  }
}
