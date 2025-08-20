import type { Create } from 'payload'

import { v4 as uuidv4 } from 'uuid'

import type { SurrealDBAdapter } from './types.js'

import { clearUserCountCache } from './utilities/cacheUtils.js'
import { handleError } from './utilities/handleError.js'
import { sanitizeData } from './utilities/sanitizeData.js'
import { escapeID, transformFromSurrealDB } from './utilities/transformID.js'

export const create: Create = async function create(
  this: SurrealDBAdapter,
  { collection: collectionSlug, data, req: _req, returning = true },
) {
  const { payload } = this
  const collection = payload.collections[collectionSlug]

  if (!collection) {
    throw new Error(`Collection ${collectionSlug} not found`)
  }

  const tableName = this.collections[collectionSlug].tableName

  try {
    // Generate ID if not provided
    let id = data.id
    if (!id && !this.allowIDOnCreate) {
      if (this.idType === 'uuid') {
        id = uuidv4()
      } else if (this.idType === 'ulid') {
        // Use SurrealDB's built-in ULID
        const result = await this.client.query('RETURN rand::ulid()')
        id = result[0]
      }
    }

    // Sanitize data for SurrealDB
    const sanitized = sanitizeData({
      adapter: this,
      data,
      fields: collection.config.fields,
      operation: 'create',
    })

    // Add timestamps - Pass as Date objects for SurrealDB
    const now = new Date()
    sanitized.createdAt = now
    sanitized.updatedAt = now

    // Create the record
    let query: string
    let params: any

    if (id) {
      // Create with specific ID - escape it for SurrealDB
      query = `CREATE ${tableName}:${escapeID(id)} CONTENT $data RETURN *`
      params = { data: sanitized }
    } else {
      // Let SurrealDB generate the ID
      query = `CREATE ${tableName} CONTENT $data RETURN *`
      params = { data: sanitized }
    }

    const result = await this.client.query(query, params)
    const created = result[0]?.[0]

    if (!created) {
      throw new Error('Failed to create document')
    }

    // Log for debugging auth issues
    if (collectionSlug === 'users' || collectionSlug === 'payload-sessions') {
      payload.logger.debug(`Created ${collectionSlug} document:`, created?.id)
    }

    // Transform back to Payload format
    const transformed = transformFromSurrealDB(created)

    // Clear user count cache when a user is created
    if (collectionSlug === 'users') {
      clearUserCountCache()
    }

    if (returning === false) {
      return null
    }

    return transformed
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'create' })
    throw error
  }
}
