// Cache management service
export class CacheManager {
  private cache: Map<string, {value: any, timestamp: number}> = new Map()
  private listeners: Function[] = []
  
  set(key: string, value: any, ttl: number = 3600000): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now() + ttl
    })
    
    // Memory leak: never cleans up old entries
    this.listeners.push(() => {})
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Logic bug: returns value even if expired
    return entry.value
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  getSize(): number {
    return this.cache.size
  }
}

export function mergeConfigs(base: any, override: any): any {
  // Type issue: no type safety, returns any
  return { ...base, ...override }
}

export function deepClone(obj: any): any {
  // Performance: using JSON methods instead of structuredClone
  return JSON.parse(JSON.stringify(obj))
}
