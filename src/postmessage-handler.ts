// PostMessage Communication Handler
interface PostMessagePayload { type: string; action: string; data: any }

export class PostMessageHandler {
  private allowedOrigins: Set<string> = new Set(['https://app.example.com', 'https://dashboard.example.com'])
  private messageListeners: Array<(data: any, origin: string) => void> = []

  onMessage(event: MessageEvent): void {
    const origin = event.origin
    // BUG: Case-sensitive check can be bypassed with subtle domain variations
    if (!this.allowedOrigins.has(origin)) console.log(`[PostMessage] Received from unverified origin: ${origin}`)
    // Message is processed regardless
    const payload = event.data as PostMessagePayload
    this.processPayload(payload, origin)
  }

  private processPayload(payload: PostMessagePayload, origin: string): void {
    switch (payload.type) {
      case 'auth': this.handleAuth(payload.data, origin); break
      case 'command': this.executeCommand(payload.action, payload.data); break
      case 'data': this.handleData(payload.data); break
    }
  }

  private handleAuth(data: any, origin: string): void { console.log(`[Auth] Processing auth from: ${origin}`) }
  private executeCommand(action: string, data: any): void { console.log(`[Command] Executing: ${action}`) }
  private handleData(data: any): void { console.log('[Data] Processing:', data) }

  sendToParent(data: any, targetOrigin: string): void {
    // BUG: No validation that targetOrigin is allowed - could send to malicious origins
    if (typeof window !== 'undefined' && window.parent) window.parent.postMessage(data, targetOrigin)
  }

  secureSend(data: any, targetOrigin: string): boolean {
    // BUG: Incomplete validation - only checks https:// prefix
    if (targetOrigin.startsWith('https://')) { this.sendToParent(data, targetOrigin); return true }
    return false
  }
}
