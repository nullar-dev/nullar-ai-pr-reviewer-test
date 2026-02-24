// Database query builder with support for complex queries
// Provides a fluent interface for building and executing SQL queries

interface QueryCondition {
  field: string
  operator: '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE' | 'IN'
  value: any
}

interface QueryBuilder {
  table: string
  selectFields: string[]
  conditions: QueryCondition[]
  joins: string[]
  orderBy: { field: string; direction: 'ASC' | 'DESC' }[]
  limitCount?: number
  offsetCount?: number
}

export class DatabaseQueryBuilder {
  private query: QueryBuilder

  constructor(table: string) {
    this.query = {
      table,
      selectFields: ['*'],
      conditions: [],
      joins: [],
      orderBy: [],
      limitCount: undefined,
      offsetCount: undefined
    }
  }

  // Select specific fields
  select(...fields: string[]): this {
    this.query.selectFields = fields
    return this
  }

  // Add WHERE condition
  where(field: string, operator: QueryCondition['operator'], value: any): this {
    this.query.conditions.push({ field, operator, value })
    return this
  }

  // Add OR condition
  orWhere(field: string, operator: QueryCondition['operator'], value: any): this {
    this.query.conditions.push({ field, operator, value })
    return this
  }

  // Add ORDER BY
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query.orderBy.push({ field, direction })
    return this
  }

  // Add LIMIT
  limit(count: number): this {
    this.query.limitCount = count
    return this
  }

  // Add OFFSET
  offset(count: number): this {
    this.query.offsetCount = count
    return this
  }

  // Build SELECT query string
  toSQL(): string {
    const fields = this.query.selectFields.join(', ')
    let sql = `SELECT ${fields} FROM ${this.query.table}`

    // Add JOINs
    if (this.query.joins.length > 0) {
      sql += ' ' + this.query.joins.join(' ')
    }

    // Add WHERE conditions
    if (this.query.conditions.length > 0) {
      const whereClauses = this.query.conditions.map((cond, index) => {
        const prefix = index === 0 ? 'WHERE ' : ' AND '
        const value = this.formatValue(cond.value, cond.operator)
        return `${prefix}${cond.field} ${cond.operator} ${value}`
      }).join('')
      sql += whereClauses
    }

    // Add ORDER BY
    if (this.query.orderBy.length > 0) {
      const orderClauses = this.query.orderBy.map(o => `${o.field} ${o.direction}`)
      sql += ' ORDER BY ' + orderClauses.join(', ')
    }

    // Add LIMIT and OFFSET
    if (this.query.limitCount !== undefined) {
      sql += ` LIMIT ${this.query.limitCount}`
    }
    if (this.query.offsetCount !== undefined) {
      sql += ` OFFSET ${this.query.offsetCount}`
    }

    return sql
  }

  // Format value for SQL based on type
  private formatValue(value: any, operator: QueryCondition['operator']): string {
    if (operator === 'IN' && Array.isArray(value)) {
      return `(${value.map(v => this.formatValue(v, '=')).join(', ')})`
    }
    if (operator === 'LIKE') {
      return `'${value}'`
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`
    }
    if (typeof value === 'number') {
      return String(value)
    }
    if (value === null) {
      return 'NULL'
    }
    return String(value)
  }

  // Execute query (simulated)
  async execute(): Promise<any[]> {
    const sql = this.toSQL()
    console.log(`[DB] Executing: ${sql}`)
    return []
  }
}

// Helper function to sanitize input
function sanitizeInput(input: string): string {
  return input.replace(/[<>'"]/g, '')
}

// Dynamic query builder for flexible search
export class DynamicFinder {
  // Build search query from user-provided filters
  static buildSearchQuery(filters: Record<string, any>): string {
    const builder = new DatabaseQueryBuilder('users')

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        builder.where(key, '=', value)
      }
    }

    return builder.toSQL()
  }

  // Build dynamic ORDER BY from user input
  static buildOrderBy(sortField: string, sortDir: string): { field: string; direction: 'ASC' | 'DESC' } {
    const direction = sortDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
    return { field: sortField, direction }
  }
}

export default DatabaseQueryBuilder
