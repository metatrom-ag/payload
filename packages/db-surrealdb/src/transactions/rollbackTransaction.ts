import type { RollbackTransaction } from 'payload'

import type { SurrealDBAdapter } from '../types.js'

export const rollbackTransaction: RollbackTransaction = async function rollbackTransaction(
  this: SurrealDBAdapter,
  id: number | Promise<null | number | string> | string,
) {
  try {
    const transactionId = await Promise.resolve(id)

    if (!transactionId) {
      return
    }

    const session = this.sessions?.[transactionId as string]

    if (!session) {
      this.payload.logger.warn(`No session found for transaction: ${transactionId}`)
      return
    }

    // SurrealDB doesn't have traditional rollback
    // We would need to implement compensating transactions
    // For now, just clean up the session
    await session.reject()

    this.payload.logger.debug(`Rolled back SurrealDB transaction: ${transactionId}`)
    this.payload.logger.warn(
      'Note: SurrealDB does not support traditional rollback. Changes may persist.',
    )
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error rolling back transaction:' })
    throw error
  }
}
