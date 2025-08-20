import type { BeginTransaction } from 'payload'

import { v4 as uuidv4 } from 'uuid'

import type { SurrealDBAdapter } from '../types.js'

export const beginTransaction: BeginTransaction = function beginTransaction(
  this: SurrealDBAdapter,
  _options = {},
) {
  // Return a resolved Promise immediately since SurrealDB doesn't support transactions over WebSocket
   
  return Promise.resolve().then(() => {
    try {
      // Generate a unique transaction ID for tracking
      const transactionId = uuidv4()

      // Note: SurrealDB's JavaScript client doesn't support transaction commands over WebSocket
      // Each query is atomic by default in SurrealDB
      // We'll track the transaction ID for session management

      // Store the transaction ID
      this.transactionID = transactionId

      // Initialize session tracking
      if (!this.sessions) {
        this.sessions = {}
      }

      this.sessions[transactionId] = {
        db: this.client,
        reject: () => {
          // In SurrealDB, individual operations are atomic
          // We can't rollback multiple operations after they're committed
          // Cleanup session
          delete this.sessions![transactionId]
          this.transactionID = undefined
        },
        resolve: () => {
          // In SurrealDB, operations are already committed
          // Cleanup session
          delete this.sessions![transactionId]
          this.transactionID = undefined
        },
      }

      this.payload.logger.debug(`Started transaction session: ${transactionId}`)

      return transactionId
    } catch (error) {
      this.payload.logger.error({ err: error, msg: 'Error beginning transaction:' })
      return null
    }
  })
}
