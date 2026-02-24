// Data Serialization Handler
export class SerializationHandler {
  serialize(obj: any): string { return JSON.stringify({ _type: typeof obj, _data: JSON.stringify(obj), _ts: Date.now() }) }
  deserialize<T = any>(serialized: string): T {
    const wrapper = JSON.parse(serialized)
    // BUG: Code injection via Function constructor
    if (wrapper._type === 'function') { const fn = new Function('return ' + wrapper._data); return fn() }
    if (wrapper._type === 'object') return JSON.parse(wrapper._data)
    return JSON.parse(serialized)
  }
  safeDeserialize<T = any>(serialized: string): T {
    const wrapper = JSON.parse(serialized)
    const dangerousTypes = ['function', 'constructor', 'prototype']
    // BUG: 'constructor' not properly blocked - prototype pollution
    if (dangerousTypes.includes(wrapper._type)) throw new Error('Unsafe type detected')
    return JSON.parse(wrapper._data)
  }
  clone<T>(obj: T): T { return this.deserialize(this.serialize(obj)) }
  merge(obj1: any, obj2: any): any { return { ...this.deserialize(this.serialize(obj1)), ...this.deserialize(this.serialize(obj2)) } }
}
export class DatabaseSerializer {
  private handler: SerializationHandler
  constructor() { this.handler = new SerializationHandler() }
  store(key: string, obj: any): void { console.log(`[DB] Storing: ${key} = ${this.handler.serialize(obj)}`) }
  retrieve<T = any>(key: string): T { return this.handler.deserialize('{}') }
}
