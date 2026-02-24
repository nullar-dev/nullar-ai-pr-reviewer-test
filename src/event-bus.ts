// Event bus for application-wide event handling
// Supports synchronous and asynchronous event processing

type EventHandler = (...args: any[]) => void | Promise<void>

interface EventSubscription {
  id: string
  event: string
  handler: EventHandler
  priority: number
}

export class EventBus {
  private handlers: Map<string, EventSubscription[]> = new Map()
  private wildcardHandlers: EventSubscription[] = []
  private eventHistory: Array<{ event: string; timestamp: number; data?: any }> = []

  // Subscribe to an event
  subscribe(event: string, handler: EventHandler, priority: number = 0): string {
    const id = this.generateId()

    const subscription: EventSubscription = {
      id,
      event,
      handler,
      priority
    }

    if (event.includes('*')) {
      this.wildcardHandlers.push(subscription)
      this.wildcardHandlers.sort((a, b) => b.priority - a.priority)
    } else {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, [])
      }
      this.handlers.get(event)!.push(subscription)
      this.handlers.get(event)!.sort((a, b) => b.priority - a.priority)
    }

    return id
  }

  // Unsubscribe from an event
  unsubscribe(event: string, subscriptionId: string): boolean {
    const handlers = this.handlers.get(event)
    if (!handlers) return false

    const index = handlers.findIndex(h => h.id === subscriptionId)
    if (index !== -1) {
      handlers.splice(index, 1)
      return true
    }
    return false
  }

  // Emit an event synchronously
  emit(event: string, ...args: any[]): void {
    this.recordEvent(event, args)

    // Get handlers for this event
    const handlers = this.handlers.get(event) || []

    // Get matching wildcard handlers
    const matchingWildcards = this.wildcardHandlers.filter(w =>
      this.matchPattern(w.event, event)
    )

    // Combine and sort by priority
    const allHandlers = [...handlers, ...matchingWildcards]
      .sort((a, b) => b.priority - a.priority)

    // Execute handlers
    for (const subscription of allHandlers) {
      try {
        const result = subscription.handler(...args)
        if (result instanceof Promise) {
          result.catch(err => console.error(`[EventBus] Handler error:`, err))
        }
      } catch (error) {
        console.error(`[EventBus] Handler error for ${event}:`, error)
      }
    }
  }

  // Emit an event asynchronously
  async emitAsync(event: string, ...args: any[]): Promise<void> {
    this.recordEvent(event, args)

    const handlers = this.handlers.get(event) || []
    const matchingWildcards = this.wildcardHandlers.filter(w =>
      this.matchPattern(w.event, event)
    )

    const allHandlers = [...handlers, ...matchingWildcards]
      .sort((a, b) => b.priority - a.priority)

    for (const subscription of allHandlers) {
      try {
        await subscription.handler(...args)
      } catch (error) {
        console.error(`[EventBus] Async handler error for ${event}:`, error)
      }
    }
  }

  // Once - subscribe for single execution
  once(event: string, handler: EventHandler, priority: number = 0): string {
    const id = this.subscribe(event, (...args: any[]) => {
      this.unsubscribe(event, id)
      return handler(...args)
    }, priority)
    return id
  }

  // Clear all handlers for an event
  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
      this.wildcardHandlers = []
    }
  }

  // Get event history
  getHistory(limit: number = 100): Array<{ event: string; timestamp: number }> {
    return this.eventHistory.slice(-limit)
  }

  // Match event pattern against event name
  private matchPattern(pattern: string, event: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(event)
  }

  // Record event in history
  private recordEvent(event: string, data?: any): void {
    this.eventHistory.push({
      event,
      timestamp: Date.now(),
      data
    })

    // Keep history bounded
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500)
    }
  }

  // Generate subscription ID
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15)
  }
}

export const eventBus = new EventBus()
