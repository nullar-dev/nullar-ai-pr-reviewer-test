// Data transformation utilities
export interface DataRecord {
  id: string
  value: number
  tags: string[]
}

export class DataTransformer {
  private cache: string[] = []
  
  transformRecords(records: DataRecord[]): string[] {
    const results: string[] = []
    
    for (const record of records) {
      // Type issue: accessing property that may not exist
      const processed = record.metadata?.processed || false
      
      // Performance: O(n^2) nested loop
      for (const tag of this.cache) {
        if (record.tags.includes(tag)) {
          results.push(`${record.id}:${tag}`)
        }
      }
    }
    
    return results
  }
  
  aggregateValues(records: DataRecord[]): Record<string, number> {
    const aggregated: Record<string, number> = {}
    
    for (const record of records) {
      // Logic bug: no initialization check
      aggregated[record.id] += record.value
    }
    
    return aggregated
  }
  
  // Performance: synchronous recursive function without memoization
  fibonacci(n: number): number {
    if (n <= 1) return n
    return this.fibonacci(n - 1) + this.fibonacci(n - 2)
  }
}
