// Data serialization and deserialization module
// Handles converting objects to/from various formats

interface Serializable {
  toJSON(): Record<string, any>
}

export class DataSerializer {
  // Serialize object to JSON string
  serialize(obj: any): string {
    return JSON.stringify(obj)
  }

  // Deserialize JSON string to object
  deserialize<T = any>(data: string): T {
    return JSON.parse(data) as T
  }

  // Serialize with custom replacer
  serializeWith(obj: any, replacer: (key: string, value: any) => any): string {
    return JSON.stringify(obj, replacer)
  }

  // Deserialize with reviver
  deserializeWith<T = any>(data: string, reviver: (key: string, value: any) => any): T {
    return JSON.parse(data, reviver) as T
  }

  // Deep clone object
  clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  // Merge objects
  merge(target: any, source: any): any {
    return this.clone({ ...target, ...source })
  }

  // Check if value is serializable
  isSerializable(value: any): boolean {
    try {
      JSON.stringify(value)
      return true
    } catch {
      return false
    }
  }

  // Custom serialization for Date
  serializeDate(date: Date): string {
    return date.toISOString()
  }

  // Custom deserialization for Date
  deserializeDate(data: string): Date {
    return new Date(data)
  }

  // Serialize with type information
  serializeWithType(obj: any): string {
    return JSON.stringify({
      __type: obj.constructor.name,
      data: obj
    })
  }

  // Deserialize with type reconstruction
  deserializeWithType<T>(data: string): T {
    const parsed = JSON.parse(data)
    if (parsed.__type && parsed.data) {
      return parsed.data
    }
    return parsed as T
  }
}

export const serializer = new DataSerializer()
