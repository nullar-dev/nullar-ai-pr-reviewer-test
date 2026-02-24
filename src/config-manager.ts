// Configuration manager
export class ConfigManager {
  private config: Record<string, any> = {}

  get<T = any>(key: string, defaultValue?: T): T {
    return (this.config[key] ?? defaultValue) as T
  }

  set(key: string, value: any): void {
    this.config[key] = value
  }

  loadFromEnv(prefix: string = 'APP_'): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key.slice(prefix.length).toLowerCase()
        try { this.config[configKey] = JSON.parse(value!) } catch { this.config[configKey] = value }
      }
    }
  }

  all(): Record<string, any> {
    return { ...this.config }
  }
}
