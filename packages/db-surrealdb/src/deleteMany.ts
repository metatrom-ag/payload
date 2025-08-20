import type { DeleteMany } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import { buildQuery } from './queries/buildQuery.js'
import { handleError } from './utilities/handleError.js'
import { transformFromSurrealDB } from './utilities/transformID.js'

export const deleteMany: DeleteMany = async function deleteMany(
  this: SurrealDBAdapter,
  { collection: collectionSlug, where },
) {
  const { payload } = this
  const collection = payload.collections[collectionSlug]

  // Debug logging
  if (this.debug) {
    // eslint-disable-next-line no-console
    console.log('[SurrealDB deleteMany] Called for collection:', collectionSlug)
    // eslint-disable-next-line no-console
    console.log('[SurrealDB deleteMany] Where condition:', JSON.stringify(where))
  }

  if (!collection) {
    throw new Error(`Collection ${collectionSlug} not found`)
  }

  const tableName = this.collections[collectionSlug].tableName

  try {
    // Set the current table for the adapter context
    this.currentTable = tableName

    // Build the query
    const { params, query: whereClause } = buildQuery({
      adapter: this,
      fields: collection.config.fields,
      where,
    })

    let query = `DELETE FROM ${tableName}`
    if (whereClause) {
      query += ` WHERE ${whereClause}`
    }
    query += ' RETURN BEFORE'

    // Log the query and params for debugging
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[SurrealDB deleteMany] Query:', query)
      // eslint-disable-next-line no-console
      console.log('[SurrealDB deleteMany] Params:', params)
      payload.logger.info(`[deleteMany] Executing query: ${query}`)
      payload.logger.info(`[deleteMany] With params:`, params)
    }

    // Execute the DELETE query
    const [result] = await this.client.query(query, params)
    const deleted = result || []

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[SurrealDB deleteMany] Result:', deleted.length, 'documents deleted')
    }

    // Always log actual deletions for important operations
    if (deleted.length > 0 || this.debug) {
      payload.logger.info(`[deleteMany] Deleted ${deleted.length} documents from ${tableName}`)
    }

    // Transform back to Payload format
    return deleted.map((doc: unknown) => transformFromSurrealDB(doc as Record<string, unknown>))
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'deleteMany' })
    throw error
  }
}
