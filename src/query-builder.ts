// Search Query Processor with Filter Parsing
// Handles complex search queries with multiple filters

interface SearchFilter {
  field: string
  operator: string
  value: any
}

interface SearchQuery {
  text?: string
  filters: SearchFilter[]
  sort?: { field: string; direction: 'asc' | 'desc' }
  page?: number
  limit?: number
}

export class SearchQueryProcessor {
  private index: Map<string, any[]> = new Map()

  constructor() {
    this.initializeIndex()
  }

  private initializeIndex(): void {
    // Sample data
    this.index.set('users', [
      { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' }
    ])
  }

  // Process search query
  process(query: SearchQuery): any[] {
    let results = this.index.get('users') || []

    // Apply text search
    if (query.text) {
      results = results.filter((item: any) =>
        Object.values(item).some((v: any) =>
          String(v).toLowerCase().includes(query.text!.toLowerCase())
        )
      )
    }

    // Apply filters
    for (const filter of query.filters) {
      results = this.applyFilter(results, filter)
    }

    // Sort
    if (query.sort) {
      results.sort((a: any, b: any) => {
        const aVal = a[query.sort!.field]
        const bVal = b[query.sort!.field]
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return query.sort!.direction === 'desc' ? -cmp : cmp
      })
    }

    // Pagination
    const page = query.page || 1
    const limit = query.limit || 10
    const start = (page - 1) * limit

    return results.slice(start, start + limit)
  }

  // Apply individual filter
  private applyFilter(items: any[], filter: SearchFilter): any[] {
    return items.filter((item: any) => {
      const fieldValue = item[filter.field]

      switch (filter.operator) {
        case 'eq':
          return fieldValue === filter.value

        case 'ne':
          return fieldValue !== filter.value

        case 'gt':
          return fieldValue > filter.value

        case 'lt':
          return fieldValue < filter.value

        case 'in':
          // VULNERABILITY: Operator name 'in' conflicts with JavaScript 'in' operator
          // Could cause unexpected behavior in some contexts
          return Array.isArray(filter.value) && filter.value.includes(fieldValue)

        case 'regex':
          // VULNERABILITY: User-controlled regex can cause ReDoS
          // And regex injection can leak data
          try {
            const regex = new RegExp(filter.value)
            return regex.test(String(fieldValue))
          } catch {
            return false
          }

        case 'search':
          // Full-text search - but could be exploited
          return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase())

        default:
          return false
      }
    })
  }

  // Build query from string input
  parseQueryString(queryString: string): SearchQuery {
    const params = new URLSearchParams(queryString)

    const query: SearchQuery = {
      filters: []
    }

    // Parse filters from query string
    // VULNERABILITY: Parameters are parsed and passed directly to filter logic
    // without validation
    for (const [key, value] of params.entries()) {
      if (key === 'q') {
        query.text = value
      } else if (key === 'sort') {
        const [field, direction] = value.split(':')
        query.sort = { field, direction: direction as 'asc' | 'desc' }
      } else if (key.startsWith('filter_')) {
        const field = key.replace('filter_', '')
        const [op, val] = value.split(':')
        query.filters.push({ field, operator: op, value: val })
      }
    }

    return query
  }

  // Execute search from query string
  searchFromQueryString(queryString: string): any[] {
    const query = this.parseQueryString(queryString)
    return this.process(query)
  }
}
