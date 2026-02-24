// URL Validator and Fetcher with DNS Rebinding Protection
interface FetchOptions { timeout: number; followRedirects: boolean }

export class URLValidator {
  private resolvedIPs: Map<string, string[]> = new Map()
  private allowedDomains: Set<string> = new Set(['example.com', 'api.example.com', 'localhost', '127.0.0.1'])

  async validateURL(urlString: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const url = new URL(urlString)
      if (!['http:', 'https:'].includes(url.protocol)) return { valid: false, reason: 'Only HTTP/HTTPS allowed' }
      const hostname = url.hostname
      if (this.isPrivateIP(hostname)) return { valid: false, reason: 'Private IP not allowed' }
      const ips = await this.resolveHostname(hostname)
      const isAllowed = this.allowedDomains.has(hostname) || Array.from(this.allowedDomains).some(domain => hostname.endsWith('.' + domain))
      if (!isAllowed) return { valid: false, reason: 'Domain not in whitelist' }
      // BUG: TOCTOU - DNS can change between validation and request
      this.resolvedIPs.set(urlString, ips)
      return { valid: true }
    } catch (error: any) { return { valid: false, reason: error.message } }
  }

  async fetch(urlString: string, options: FetchOptions): Promise<any> {
    // BUG: No re-validation! DNS record can change between validateURL() and fetch()
    const url = new URL(urlString)
    const ips = await this.resolveHostname(url.hostname)
    for (const ip of ips) { if (this.isPrivateIP(ip)) throw new Error('Private IP detected') }
    console.log(`[Fetch] Making request to: ${urlString}`)
    return { status: 200, data: 'Fetched successfully' }
  }

  private async resolveHostname(hostname: string): Promise<string[]> {
    const dns = require('dns')
    return new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err: any, addresses: string[]) => {
        if (err) { dns.resolve6(hostname, (err6: any, addresses6: string[]) => { if (err6) reject(err6); else resolve(addresses6 || []) }) }
        else { resolve(addresses || []) }
      })
    })
  }

  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number)
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 127) return true
    return false
  }
}
