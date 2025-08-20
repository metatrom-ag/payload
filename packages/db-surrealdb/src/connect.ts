import type { Connect } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const connect: Connect = async function connect(this: SurrealDBAdapter) {
  const { payload } = this

  try {
    // Check if already connected
    const info = await this.client.info().catch(() => null)
    if (info) {
      payload.logger.info('SurrealDB already connected')
      if (this.resolveInitializing) {
        this.resolveInitializing()
      }
      return
    }

    // Get connection details from adapter
    const url = (this as unknown as { url?: string }).url || 'http://127.0.0.1:8000/rpc'

    // Connect to SurrealDB
    await this.client.connect(url)

    // Authenticate if credentials provided (must be done before USE)
    const auth = (this as unknown as { auth?: { password: string; username: string } }).auth
    if (auth && 'username' in auth && 'password' in auth) {
      await this.client.signin({
        password: auth.password,
        username: auth.username,
      })
    }

    // Use namespace and database
    await this.client.use({
      database: this.namespaceDb.database,
      namespace: this.namespaceDb.namespace,
    })

    payload.logger.info('Successfully connected to SurrealDB')

    // Resolve the initialization promise
    if (this.resolveInitializing) {
      this.resolveInitializing()
    }
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Failed to connect to SurrealDB' })

    // Reject the initialization promise
    if (this.rejectInitializing) {
      this.rejectInitializing(error as Error)
    }

    throw error
  }
}
