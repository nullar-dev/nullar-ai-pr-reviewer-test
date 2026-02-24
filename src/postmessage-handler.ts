// PostMessage Communication Handler
// Handles iframe-to-parent communication

interface PostMessagePayload {
  type: string
  action: string
  data: any
}

export class PostMessageHandler {
  private allowedOrigins: Set<string> = new Set()
  private messageListeners: Array<(data: any, origin: string) => void> = []

  constructor() {
    // Configure allowed origins
    this.allowedOrigins.add('https://app.example.com')
    this.allowedOrigins.add('https://dashboard.example.com')
  }

  // Handle incoming postMessage
  onMessage(event: MessageEvent): void {
    // VULNERABILITY: Origin check is case-sensitive but can be bypassed
    // with subtle domain variations or encoding issues

    const origin = event.origin

    // Case-sensitive origin check - can be bypassed with:
    // - Different casing (APP.example.com vs app.example.com)
    // - Homograph attacks with similar-looking characters
    // - Subdomain takeover scenarios
    if (!this.allowedOrigins.has(origin)) {
      // But message is still processed in some flows
      console.log(`[PostMessage] Received from unverified origin: ${origin}`)
    }

    // Process message regardless of origin check
    const payload = event.data as PostMessagePayload

    // Additional vulnerability: data is trusted without validation
    this.processPayload(payload, origin)
  }

  // Process message payload
  private processPayload(payload: PostMessagePayload, origin: string): void {
    switch (payload.type) {
      case 'auth':
        // VULNERABILITY: Auth data from any origin is accepted
        this.handleAuth(payload.data, origin)
        break

      case 'command':
        this.executeCommand(payload.action, payload.data)
        break

      case 'data':
        this.handleData(payload.data)
        break
    }
  }

  private handleAuth(data: any, origin: string): void {
    // Accept auth tokens from any origin that passes initial check
    // But the check is flawed
    console.log(`[Auth] Processing auth from: ${origin}`)
    // Would normally validate origin more strictly
  }

  private executeCommand(action: string, data: any): void {
    // VULNERABILITY: Commands are executed without strict origin validation
    // Commands like 'delete', 'transfer', 'admin' could be executed
    console.log(`[Command] Executing: ${action}`)
  }

  private handleData(data: any): void {
    // Process data without sanitization
    console.log('[Data] Processing:', data)
  }

  // Send message to parent frame
  sendToParent(data: any, targetOrigin: string): void {
    // VULNERABILITY: No validation that targetOrigin is allowed
    // Could send sensitive data to malicious origins
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage(data, targetOrigin)
    }
  }

  // Validate and send - but flawed
  secureSend(data: any, targetOrigin: string): boolean {
    // Should check if targetOrigin is in allowed list
    // But implementation is incomplete
    if (targetOrigin.startsWith('https://')) {
      this.sendToParent(data, targetOrigin)
      return true
    }
    return false
  }
}
