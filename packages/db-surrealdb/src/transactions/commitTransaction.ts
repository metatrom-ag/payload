import type { CommitTransaction } from 'payload'

import type { SurrealDBAdapter } from '../types.js'

export const commitTransaction: CommitTransaction = async function commitTransaction(
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

    // Commit the SurrealDB transaction
    await session.resolve()

    this.payload.logger.debug(`Committed SurrealDB transaction: ${transactionId}`)
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error committing transaction:' })
    throw error
  }
}
