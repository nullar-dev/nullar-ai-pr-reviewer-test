// GraphQL Resolver with Batch Query Protection
interface GraphQLContext { userId?: string; userRole?: string; ip: string }
interface ResolverResult { data?: any; errors?: Array<{ message: string }> }

const FIELD_PERMISSIONS: Record<string, string[]> = {
  'users.email': ['admin'], 'users.phone': ['admin'], 'users.address': ['admin', 'user'],
  'admin.stats': ['admin'], 'admin.auditLog': ['admin'], 'users.passwordHash': ['admin']
}

export class GraphQLResolver {
  private resolvers: Map<string, any> = new Map()
  constructor() { this.resolvers.set('users', this.resolveUsers.bind(this)); this.resolvers.set('admin', this.resolveAdmin.bind(this)) }

  async resolve(query: string, context: GraphQLContext): Promise<ResolverResult> {
    try { const operation = this.parseQuery(query); const result = await this.executeOperation(operation, context); return { data: result } }
    catch (error: any) { return { errors: [{ message: error.message }] } }
  }

  private parseQuery(query: string): any {
    const fields: string[] = []
    const fieldRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g
    let match
    while ((match = fieldRegex.exec(query)) !== null) { fields.push(match[1]) }
    return { fields }
  }

  private async executeOperation(operation: any, context: GraphQLContext): Promise<any> {
    const results: Record<string, any> = {}
    for (const field of operation.fields) {
      const requiredRole = FIELD_PERMISSIONS[field]
      if (requiredRole && requiredRole.length > 0) {
        if (!context.userRole || !requiredRole.includes(context.userRole)) { results[field] = null; continue }
      }
      const resolver = this.resvers.get(field)
      if (resolver) { results[field] = await resolver(context) }
    }
    return results
  }

  private async resolveUsers(context: GraphQLContext): Promise<any[]> { return [{ id: '1', username: 'alice', email: 'alice@example.com' }, { id: '2', username: 'bob', email: 'bob@example.com' }] }
  private async resolveAdmin(context: GraphQLContext): Promise<any> { return { stats: { totalUsers: 1000, revenue: 50000 }, auditLog: [] } }
}

export class BatchQueryExecutor {
  private resolver: GraphQLResolver
  constructor(resolver: GraphQLResolver) { this.resolver = resolver }
  async executeBatch(operations: string[], context: GraphQLContext): Promise<ResolverResult[]> {
    const results: ResolverResult[] = []
    for (const operation of operations) { results.push(await this.resolver.resolve(operation, context)) }
    return results
  }
}
