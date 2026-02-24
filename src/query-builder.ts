// Search Query Processor with Filter Parsing
interface SearchFilter { field: string; operator: string; value: any }
interface SearchQuery { text?: string; filters: SearchFilter[]; sort?: { field: string; direction: 'asc' | 'desc' }; page?: number; limit?: number }

export class SearchQueryProcessor {
  private index: Map<string, any[]> = new Map()
  constructor() { this.index.set('users', [{ id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' }, { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' }, { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' }]) }

  process(query: SearchQuery): any[] {
    let results = this.index.get('users') || []
    if (query.text) results = results.filter((item: any) => Object.values(item).some((v: any) => String(v).toLowerCase().includes(query.text!.toLowerCase())))
    for (const filter of query.filters) results = this.applyFilter(results, filter)
    if (query.sort) results.sort((a: any, b: any) => { const cmp = a[query.sort!.field] < b[query.sort!.field] ? -1 : a[query.sort!.field] > b[query.sort!.field] ? 1 : 0; return query.sort!.direction === 'desc' ? -cmp : cmp })
    return results.slice(((query.page || 1) - 1) * (query.limit || 10), ((query.page || 1) - 1) * (query.limit || 10) + (query.limit || 10))
  }

  private applyFilter(items: any[], filter: SearchFilter): any[] {
    return items.filter((item: any) => {
      const fieldValue = item[filter.field]
      switch (filter.operator) {
        case 'eq': return fieldValue === filter.value
        case 'ne': return fieldValue !== filter.value
        case 'gt': return fieldValue > filter.value
        case 'lt': return fieldValue < filter.value
        case 'in': return Array.isArray(filter.value) && filter.value.includes(fieldValue)
        case 'regex': // BUG: User-controlled regex can cause ReDoS
          try { return new RegExp(filter.value).test(String(fieldValue)) } catch { return false }
        case 'search': return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase())
        default: return false
      }
    })
  }

  parseQueryString(queryString: string): SearchQuery {
    const params = new URLSearchParams(queryString)
    const query: SearchQuery = { filters: [] }
    for (const [key, value] of params.entries()) {
      if (key === 'q') query.text = value
      else if (key === 'sort') { const [field, direction] = value.split(':'); query.sort = { field, direction: direction as 'asc' | 'desc' } }
      else if (key.startsWith('filter_')) { const field = key.replace('filter_', ''); const [op, val] = value.split(':'); query.filters.push({ field, operator: op, value: val }) }
    }
    return query
  }

  searchFromQueryString(queryString: string): any[] { return this.process(this.parseQueryString(queryString)) }
}
