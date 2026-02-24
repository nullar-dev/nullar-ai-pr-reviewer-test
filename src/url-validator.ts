// URL Validator and Fetcher with DNS Rebinding Protection
// Validates URLs before making requests to prevent SSRF

interface FetchOptions {
  timeout: number
  followRedirects: boolean
}

export class URLValidator {
  private resolvedIPs: Map<string, string[]> = new Map()
  private allowedDomains: Set<string> = new Set(['example.com', 'api.example.com'])

  constructor() {
    this.allowedDomains.add('localhost')
    this.allowedDomains.add('127.0.0.1')
  }

  // Validate URL before fetching
  async validateURL(urlString: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const url = new URL(urlString)

      // Check protocol
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, reason: 'Only HTTP/HTTPS allowed' }
      }

      // Check hostname
      const hostname = url.hostname

      // Block private IPs
      if (this.isPrivateIP(hostname)) {
        return { valid: false, reason: 'Private IP not allowed' }
      }

      // DNS resolution check - first pass
      const ips = await this.resolveHostname(hostname)

      // Check against allowed domains - FIRST CHECK
      const isAllowed = this.allowedDomains.has(hostname) ||
        Array.from(this.allowedDomains).some(domain => hostname.endsWith('.' + domain))

      if (!isAllowed) {
        return { valid: false, reason: 'Domain not in whitelist' }
      }

      // VULNERABILITY: DNS Rebinding Attack
      // Time gap between validation and actual request allows attacker to
      // change DNS record between validation and request
      // Attackers use short TTL DNS records to rebind domain to internal IP
      // after validation passes but before request is made

      // Store resolved IPs for reference (but NOT used in actual request)
      this.resolvedIPs.set(urlString, ips)

      return { valid: true }
    } catch (error: any) {
      return { valid: false, reason: error.message }
    }
  }

  // Fetch URL after validation
  async fetch(urlString: string, options: FetchOptions): Promise<any> {
    // VULNERABILITY: No re-validation before fetch!
    // DNS record can change between validateURL() and fetch()
    // This is a classic Time-of-Check to Time-of-Use (TOCTOU) vulnerability

    const url = new URL(urlString)

    // Re-resolve hostname - but might get different IP now
    const ips = await this.resolveHostname(url.hostname)

    // Check if ANY resolved IP is private (but still not atomic with request)
    for (const ip of ips) {
      if (this.isPrivateIP(ip)) {
        throw new Error('Private IP detected')
      }
    }

    // Make actual request
    console.log(`[Fetch] Making request to: ${urlString}`)

    return { status: 200, data: 'Fetched successfully' }
  }

  // Resolve hostname to IPs
  private async resolveHostname(hostname: string): Promise<string[]> {
    const dns = require('dns')
    return new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err: any, addresses: string[]) => {
        if (err) {
          // Try IPv6
          dns.resolve6(hostname, (err6: any, addresses6: string[]) => {
            if (err6) reject(err6)
            else resolve(addresses6)
          })
        } else {
          resolve(addresses || [])
        }
      })
    })
  }

  // Check if IP is private
  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number)

    // 10.x.x.x
    if (parts[0] === 10) return true

    // 172.16.x.x - 172.31.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true

    // 192.168.x.x
    if (parts[0] === 192 && parts[1] === 168) return true

    // 127.x.x.x
    if (parts[0] === 127) return true

    return false
  }
}
