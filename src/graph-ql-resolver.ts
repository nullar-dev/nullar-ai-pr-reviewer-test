// GraphQL Resolver with Batch Query Protection
// Handles query execution with field-level authorization

interface GraphQLContext {
  userId?: string
  userRole?: string
  ip: string
}

interface ResolverResult {
  data?: any
  errors?: Array<{ message: string }>
}

// Field-level authorization map
const FIELD_PERMISSIONS: Record<string, string[]> = {
  'users.email': ['admin'],
  'users.phone': ['admin'],
  'users.address': ['admin', 'user'],
  'admin.stats': ['admin'],
  'admin.auditLog': ['admin'],
  'users.passwordHash': ['admin']
}

export class GraphQLResolver {
  private resolvers: Map<string, any> = new Map()

  constructor() {
    this.initializeResolvers()
  }

  private initializeResolvers(): void {
    this.resolvers.set('users', this.resolveUsers.bind(this))
    this.resolvers.set('admin', this.resolveAdmin.bind(this))
  }

  // Resolve GraphQL query
  async resolve(query: string, context: GraphQLContext): Promise<ResolverResult> {
    try {
      const operation = this.parseQuery(query)
      const result = await this.executeOperation(operation, context)
      return { data: result }
    } catch (error: any) {
      return { errors: [{ message: error.message }] }
    }
  }

  // Parse simplified GraphQL query
  private parseQuery(query: string): any {
    // Simplified parser for demo
    const fields: string[] = []
    const fieldRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g
    let match
    while ((match = fieldRegex.exec(query)) !== null) {
      fields.push(match[1])
    }
    return { fields }
  }

  // Execute resolved operation
  private async executeOperation(operation: any, context: GraphQLContext): Promise<any> {
    const results: Record<string, any> = {}

    // Check field-level permissions
    for (const field of operation.fields) {
      // Check if field requires permission
      const requiredRole = FIELD_PERMISSIONS[field]

      if (requiredRole && requiredRole.length > 0) {
        // Permission check - but has subtle flaw
        if (!context.userRole || !requiredRole.includes(context.userRole)) {
          // Deny access to protected field
          results[field] = null
          continue
        }
      }

      // Execute resolver if authorized
      const resolver = this.resolvers.get(field)
      if (resolver) {
        results[field] = await resolver(context)
      }
    }

    return results
  }

  private async resolveUsers(context: GraphQLContext): Promise<any[]> {
    // Returns user data
    return [
      { id: '1', username: 'alice', email: 'alice@example.com' },
      { id: '2', username: 'bob', email: 'bob@example.com' }
    ]
  }

  private async resolveAdmin(context: GraphQLContext): Promise<any> {
    return {
      stats: { totalUsers: 1000, revenue: 50000 },
      auditLog: []
    }
  }
}

// Batch query execution - handles multiple operations
export class BatchQueryExecutor {
  private resolver: GraphQLResolver

  constructor(resolver: GraphQLResolver) {
    this.resolver = resolver
  }

  // Execute batch GraphQL operations
  async executeBatch(operations: string[], context: GraphQLContext): Promise<ResolverResult[]> {
    // VULNERABILITY: Each operation is checked individually, but batch allows
    // inferring protected field names through timing and error messages

    const results: ResolverResult[] = []

    for (const operation of operations) {
      const result = await this.resolver.resolve(operation, context)
      results.push(result)
    }

    // Side channel: error messages reveal field names
    // An attacker can iterate through possible protected field names
    return results
  }
}
