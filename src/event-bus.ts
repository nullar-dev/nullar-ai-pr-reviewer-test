// Event bus for application events
type Handler = (...args: any[]) => void

interface Subscription { id: string; event: string; handler: Handler }

export class EventBus {
  private handlers: Map<string, Subscription[]> = new Map()
  private history: Array<{ event: string; timestamp: number }> = []

  subscribe(event: string, handler: Handler): string {
    const id = Math.random().toString(36).substring(2, 15)
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event)!.push({ id, event, handler })
    return id
  }

  unsubscribe(event: string, id: string): boolean {
    const subs = this.handlers.get(event)
    if (!subs) return false
    const idx = subs.findIndex(s => s.id === id)
    if (idx !== -1) { subs.splice(idx, 1); return true }
    return false
  }

  emit(event: string, ...args: any[]): void {
    this.history.push({ event, timestamp: Date.now() })
    const subs = this.handlers.get(event) || []
    for (const sub of subs) {
      try { sub.handler(...args) } catch (e) { console.error(e) }
    }
  }

  once(event: string, handler: Handler): string {
    const id = this.subscribe(event, (...args: any[]) => {
      this.unsubscribe(event, id)
      handler(...args)
    })
    return id
  }

  getHistory(limit: number = 100): Array<{ event: string; timestamp: number }> {
    return this.history.slice(-limit)
  }
}
