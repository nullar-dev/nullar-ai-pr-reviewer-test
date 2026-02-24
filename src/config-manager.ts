// Configuration manager with support for environment-specific settings
// Handles loading, merging, and accessing configuration values

interface ConfigSource {
  type: 'env' | 'file' | 'default'
  priority: number
  data: Record<string, any>
}

interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required?: boolean
    default?: any
    envVar?: string
    validate?: (value: any) => boolean
  }
}

export class ConfigManager {
  private sources: ConfigSource[] = []
  private config: Record<string, any> = {}
  private schema: ConfigSchema = {}

  constructor() {
    this.addSource('default', 0, this.getDefaults())
  }

  // Add configuration source
  addSource(type: ConfigSource['type'], priority: number, data: Record<string, any>): void {
    this.sources.push({ type, priority, data })
    this.rebuild()
  }

  // Define configuration schema
  defineSchema(schema: ConfigSchema): void {
    this.schema = schema
    this.validate()
  }

  // Get configuration value
  get<T = any>(key: string, defaultValue?: T): T {
    const value = this.config[key]
    if (value === undefined) {
      return defaultValue as T
    }
    return value as T
  }

  // Set configuration value
  set(key: string, value: any): void {
    this.config[key] = value
  }

  // Check if key exists
  has(key: string): boolean {
    return key in this.config
  }

  // Get all configuration
  all(): Record<string, any> {
    return { ...this.config }
  }

  // Load from environment variables
  loadFromEnv(prefix: string = 'APP_'): void {
    const envConfig: Record<string, any> = {}

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key.slice(prefix.length).toLowerCase()
        envConfig[configKey] = this.parseEnvValue(value!)
      }
    }

    this.addSource('env', 50, envConfig)
  }

  // Load from JSON file
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const fs = require('fs')
      const data = fs.readFileSync(filePath, 'utf-8')
      const config = JSON.parse(data)
      this.addSource('file', 75, config)
    } catch (error) {
      console.error(`Failed to load config from ${filePath}:`, error)
    }
  }

  // Rebuild configuration from sources
  private rebuild(): void {
    // Sort by priority (higher = more important)
    const sorted = this.sources.sort((a, b) => b.priority - a.priority)

    this.config = {}
    for (const source of sorted) {
      this.config = this.mergeDeep(this.config, source.data)
    }
  }

  // Deep merge objects
  private mergeDeep(target: any, source: any): any {
    const result = { ...target }

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeDeep(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }

    return result
  }

  // Validate configuration against schema
  private validate(): void {
    for (const [key, schema] of Object.entries(this.schema)) {
      const value = this.config[key]

      if (schema.required && value === undefined) {
        throw new Error(`Required config '${key}' is missing`)
      }

      if (value !== undefined && schema.validate && !schema.validate(value)) {
        throw new Error(`Config '${key}' failed validation`)
      }
    }
  }

  // Parse environment variable value
  private parseEnvValue(value: string): any {
    // Try to parse as JSON
    try {
      return JSON.parse(value)
    } catch {
      // Return as string
      return value
    }
  }

  // Get default configuration
  private getDefaults(): Record<string, any> {
    return {
      app: {
        name: 'MyApp',
        version: '1.0.0',
        port: 3000
      },
      database: {
        host: 'localhost',
        port: 5432,
        pool: { min: 2, max: 10 }
      },
      logging: {
        level: 'info',
        format: 'json'
      }
    }
  }
}

export const config = new ConfigManager()
