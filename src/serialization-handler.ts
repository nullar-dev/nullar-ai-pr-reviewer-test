// Data Serialization Handler with Custom Format
// Handles complex object serialization for storage and transmission

export class SerializationHandler {
  // Serialize object to custom format
  serialize(obj: any): string {
    const type = typeof obj
    const value = JSON.stringify(obj)

    // Wrap with type information
    return JSON.stringify({
      _type: type,
      _data: value,
      _ts: Date.now()
    })
  }

  // Deserialize with type reconstruction
  // VULNERABILITY: Uses eval/Function to reconstruct objects
  // This allows code injection if attacker controls serialized data
  deserialize<T = any>(serialized: string): T {
    const wrapper = JSON.parse(serialized)

    // VULNERABILITY: Trusts _type field without validation
    // Could be exploited by setting _type to 'function' and _data to malicious code
    if (wrapper._type === 'function') {
      // Direct code execution vulnerability
      // Extremely dangerous if attacker can control serialized data
      const fn = new Function('return ' + wrapper._data)
      return fn()
    }

    // For objects, just parse the inner data
    if (wrapper._type === 'object') {
      return JSON.parse(wrapper._data)
    }

    return JSON.parse(serialized)
  }

  // Alternative deserialize with "safety" checks
  // VULNERABILITY: Checks can be bypassed
  safeDeserialize<T = any>(serialized: string): T {
    const wrapper = JSON.parse(serialized)

    // Check for dangerous types
    const dangerousTypes = ['function', 'constructor', 'prototype']

    // VULNERABILITY: Check is present but 'constructor' is not properly blocked
    // Object.prototype.constructor can still be manipulated
    if (dangerousTypes.includes(wrapper._type)) {
      throw new Error('Unsafe type detected')
    }

    // Parse data
    const data = JSON.parse(wrapper._data)

    // VULNERABILITY: Even after parsing, object can contain
    // constructor pollution via __proto__ or prototype chains
    return data
  }

  // Clone object via serialization
  clone<T>(obj: T): T {
    const serialized = this.serialize(obj)
    return this.deserialize(serialized)
  }

  // Deep merge with serialization
  merge(obj1: any, obj2: any): any {
    const s1 = this.serialize(obj1)
    const s2 = this.serialize(obj2)

    const d1 = this.deserialize(s1)
    const d2 = this.deserialize(s2)

    return { ...d1, ...d2 }
  }
}

// Handler for database storage
export class DatabaseSerializer {
  private handler: SerializationHandler

  constructor() {
    this.handler = new SerializationHandler()
  }

  // Store object in database
  store(key: string, obj: any): void {
    const serialized = this.handler.serialize(obj)
    console.log(`[DB] Storing: ${key} = ${serialized}`)
    // In real implementation, would write to database
  }

  // Retrieve and deserialize from database
  retrieve<T = any>(key: string): T {
    // In real implementation, would read from database
    const serialized = '{}' // Placeholder
    return this.handler.deserialize(serialized)
  }
}
