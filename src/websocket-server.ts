// WebSocket server for real-time bidirectional communication
// Supports event-based messaging, rooms, and connection management

import * as crypto from 'crypto'

interface WebSocketMessage {
  type: string
  payload: any
  timestamp: number
}

interface Connection {
  id: string
  userId?: string
  rooms: Set<string>
  socket: any
  connectedAt: number
}

interface Room {
  name: string
  members: Set<string>
  createdAt: number
}

export class WebSocketServer {
  private connections: Map<string, Connection> = new Map()
  private rooms: Map<string, Room> = new Map()
  private messageHandlers: Map<string, (conn: Connection, payload: any) => void> = new Map()

  constructor() {
    this.registerDefaultHandlers()
  }

  // Handle new connection
  handleConnection(socket: any): string {
    const connId = crypto.randomBytes(16).toString('hex')

    const connection: Connection = {
      id: connId,
      rooms: new Set(),
      socket,
      connectedAt: Date.now()
    }

    this.connections.set(connId, connection)
    console.log(`[WS] New connection: ${connId}`)

    return connId
  }

  // Handle incoming message
  handleMessage(connId: string, data: string): void {
    const conn = this.connections.get(connId)
    if (!conn) return

    try {
      const message: WebSocketMessage = JSON.parse(data)
      const handler = this.messageHandlers.get(message.type)

      if (handler) {
        handler(conn, message.payload)
      }
    } catch (error) {
      console.error('[WS] Failed to parse message:', error)
    }
  }

  // Handle disconnection
  handleDisconnect(connId: string): void {
    const conn = this.connections.get(connId)
    if (!conn) return

    // Remove from all rooms
    for (const roomName of conn.rooms) {
      this.leaveRoom(connId, roomName)
    }

    this.connections.delete(connId)
    console.log(`[WS] Disconnected: ${connId}`)
  }

  // Join a room
  joinRoom(connId: string, roomName: string): void {
    const conn = this.connections.get(connId)
    if (!conn) return

    // Create room if not exists
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, {
        name: roomName,
        members: new Set(),
        createdAt: Date.now()
      })
    }

    const room = this.rooms.get(roomName)!
    room.members.add(connId)
    conn.rooms.add(roomName)

    this.broadcastToRoom(roomName, {
      type: 'user_joined',
      payload: { connId, room: roomName }
    }, connId)
  }

  // Leave a room
  leaveRoom(connId: string, roomName: string): void {
    const conn = this.connections.get(connId)
    const room = this.rooms.get(roomName)

    if (conn && room) {
      room.members.delete(connId)
      conn.rooms.delete(roomName)

      this.broadcastToRoom(roomName, {
        type: 'user_left',
        payload: { connId, room: roomName }
      }, connId)
    }
  }

  // Send message to specific connection
  sendTo(connId: string, message: WebSocketMessage): void {
    const conn = this.connections.get(connId)
    if (conn && conn.socket) {
      conn.socket.send(JSON.stringify(message))
    }
  }

  // Broadcast to all connections in a room
  broadcastToRoom(roomName: string, message: WebSocketMessage, excludeId?: string): void {
    const room = this.rooms.get(roomName)
    if (!room) return

    const data = JSON.stringify(message)
    for (const connId of room.members) {
      if (connId !== excludeId) {
        this.sendTo(connId, message)
      }
    }
  }

  // Broadcast to all connections
  broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message)
    for (const conn of this.connections.values()) {
      if (conn.socket) {
        conn.socket.send(data)
      }
    }
  }

  // Register message handler
  on(type: string, handler: (conn: Connection, payload: any) => void): void {
    this.messageHandlers.set(type, handler)
  }

  // Register default handlers
  private registerDefaultHandlers(): void {
    this.on('join_room', (conn, payload) => {
      if (payload.room) {
        this.joinRoom(conn.id, payload.room)
      }
    })

    this.on('leave_room', (conn, payload) => {
      if (payload.room) {
        this.leaveRoom(conn.id, payload.room)
      }
    })

    this.on('message', (conn, payload) => {
      const room = payload.room
      if (room) {
        this.broadcastToRoom(room, {
          type: 'chat_message',
          payload: {
            userId: conn.userId,
            message: payload.message,
            timestamp: Date.now()
          }
        }, conn.id)
      }
    })

    this.on('auth', (conn, payload) => {
      conn.userId = payload.userId
    })
  }

  // Get connection count
  getConnectionCount(): number {
    return this.connections.size
  }

  // Get room count
  getRoomCount(): number {
    return this.rooms.size
  }
}

export const wsServer = new WebSocketServer()
