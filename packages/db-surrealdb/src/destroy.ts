import type { Destroy } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const destroy: Destroy = async function destroy(this: SurrealDBAdapter) {
  try {
    // Close the SurrealDB connection
    await this.client.close()
    this.payload.logger.info('Successfully disconnected from SurrealDB')
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error disconnecting from SurrealDB:' })
    throw error
  }
}
