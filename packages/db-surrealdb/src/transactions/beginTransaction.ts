import type { BeginTransaction } from 'payload'

import { v4 as uuidv4 } from 'uuid'

import type { SurrealDBAdapter } from '../types.js'

export const beginTransaction: BeginTransaction = function beginTransaction(
  this: SurrealDBAdapter,
  _options = {},
) {
  try {
    // Generate a unique transaction ID
    const transactionId = uuidv4()

    // SurrealDB doesn't have traditional transactions like SQL databases
    // Instead, we'll use a transaction ID to group operations
    // and potentially use SurrealDB's RELATE statements for consistency

    // Store the transaction ID
    this.transactionID = transactionId

    // Initialize session tracking
    if (!this.sessions) {
      this.sessions = {}
    }

    this.sessions[transactionId] = {
      db: this.client,
      reject: () => {
        // Cleanup on reject
        delete this.sessions![transactionId]
        this.transactionID = undefined
      },
      resolve: () => {
        // Cleanup on resolve
        delete this.sessions![transactionId]
        this.transactionID = undefined
      },
    }

    this.payload.logger.debug(`Started SurrealDB transaction: ${transactionId}`)

    return transactionId
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error beginning transaction:' })
    return null
  }
}
