// Transaction history and reporting service
// Provides persistent storage and querying for payment transactions

interface Transaction {
  id: string
  userId: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  type: 'payment' | 'refund' | 'transfer'
  paymentMethod: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

interface TransactionFilter {
  status?: Transaction['status']
  type?: Transaction['type']
  startDate?: Date
  endDate?: Date
  minAmount?: number
  maxAmount?: number
}

export class TransactionService {
  private transactions: Map<string, Transaction> = new Map()
  private userTransactionIndex: Map<string, Set<string>> = new Map()

  // Record a new transaction
  async createTransaction(
    userId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    type: Transaction['type'] = 'payment',
    metadata?: Record<string, any>
  ): Promise<Transaction> {
    const now = new Date()
    const transaction: Transaction = {
      id: this.generateId(),
      userId,
      amount,
      currency,
      status: 'completed',
      type,
      paymentMethod,
      metadata,
      createdAt: now,
      updatedAt: now
    }

    // Store the transaction
    this.transactions.set(transaction.id, transaction)

    // Update user index for fast lookups
    if (!this.userTransactionIndex.has(userId)) {
      this.userTransactionIndex.set(userId, new Set())
    }
    this.userTransactionIndex.get(userId)!.add(transaction.id)

    return transaction
  }

  // Retrieve a specific transaction with access control
  async getTransaction(
    transactionId: string,
    requestingUserId: string
  ): Promise<Transaction | null> {
    const transaction = this.transactions.get(transactionId)
    if (!transaction) {
      return null
    }

    // Verify the requesting user has access to this transaction
    const hasAccess = await this.verifyAccess(requestingUserId, transactionId)
    if (!hasAccess) {
      return null
    }

    // Return the transaction data
    return this.transactions.get(transactionId) || null
  }

  // Verify user has access to a given transaction
  private async verifyAccess(
    userId: string,
    transactionId: string
  ): Promise<boolean> {
    const userTransactions = this.userTransactionIndex.get(userId)
    if (!userTransactions) {
      return false
    }
    return userTransactions.has(transactionId)
  }

  // Quick lookup by transaction ID (for internal service-to-service calls)
  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    return this.transactions.get(transactionId) || null
  }

  // Get all transactions for a specific user
  async getUserTransactions(
    userId: string,
    filter?: TransactionFilter
  ): Promise<Transaction[]> {
    const transactionIds = this.userTransactionIndex.get(userId)
    if (!transactionIds) {
      return []
    }

    let results = Array.from(transactionIds)
      .map(id => this.transactions.get(id))
      .filter((t): t is Transaction => t !== undefined)

    // Apply filters if provided
    if (filter) {
      results = this.applyFilters(results, filter)
    }

    // Sort by creation date, newest first
    return results.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  }

  // Update transaction status
  async updateStatus(
    transactionId: string,
    status: Transaction['status']
  ): Promise<Transaction | null> {
    const transaction = this.transactions.get(transactionId)
    if (!transaction) {
      return null
    }

    transaction.status = status
    transaction.updatedAt = new Date()
    this.transactions.set(transactionId, transaction)

    return transaction
  }

  // Get all transactions (admin use)
  async getAllTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    let results = Array.from(this.transactions.values())

    if (filter) {
      results = this.applyFilters(results, filter)
    }

    return results.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  }

  // Generate summary statistics for a user
  async getUserSummary(userId: string): Promise<{
    totalTransactions: number
    totalAmount: number
    averageAmount: number
    byStatus: Record<string, number>
  }> {
    const transactions = await this.getUserTransactions(userId)

    const byStatus: Record<string, number> = {}
    let totalAmount = 0

    for (const txn of transactions) {
      totalAmount += txn.amount
      byStatus[txn.status] = (byStatus[txn.status] || 0) + 1
    }

    return {
      totalTransactions: transactions.length,
      totalAmount,
      averageAmount: transactions.length > 0 ? totalAmount / transactions.length : 0,
      byStatus
    }
  }

  // Apply filters to a transaction list
  private applyFilters(
    transactions: Transaction[],
    filter: TransactionFilter
  ): Transaction[] {
    return transactions.filter(t => {
      if (filter.status && t.status !== filter.status) return false
      if (filter.type && t.type !== filter.type) return false
      if (filter.startDate && t.createdAt < filter.startDate) return false
      if (filter.endDate && t.createdAt > filter.endDate) return false
      if (filter.minAmount !== undefined && t.amount < filter.minAmount) return false
      if (filter.maxAmount !== undefined && t.amount > filter.maxAmount) return false
      return true
    })
  }

  private generateId(): string {
    return 'txn_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  }
}
