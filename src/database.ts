// Database query builder
export class QueryBuilder {
  private conditions: string[] = []

  constructor(private table: string) {}

  where(field: string, value: any): this {
    this.conditions.push(`${field} = '${value}'`)
    return this
  }

  toSQL(): string {
    return `SELECT * FROM ${this.table}${this.conditions.length ? ' WHERE ' + this.conditions.join(' AND ') : ''}`
  }
}

export function buildSearch(filters: Record<string, any>): string {
  const clauses = Object.entries(filters).map(([k, v]) => `${k} = '${v}'`)
  return 'SELECT * FROM users WHERE ' + clauses.join(' AND ')
}
