// Data serialization
export class Serializer {
  serialize(obj: any): string {
    return JSON.stringify(obj)
  }

  deserialize<T = any>(data: string): T {
    return JSON.parse(data) as T
  }

  clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  merge(target: any, source: any): any {
    return this.clone({ ...target, ...source })
  }
}
