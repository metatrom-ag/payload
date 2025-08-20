import type { UpdateMany } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import { buildQuery } from './queries/buildQuery.js'
import { handleError } from './utilities/handleError.js'
import { sanitizeData } from './utilities/sanitizeData.js'
import { transformFromSurrealDB } from './utilities/transformID.js'

export const updateMany: UpdateMany = async function updateMany(
  this: SurrealDBAdapter,
  { collection: collectionSlug, data, where },
) {
  const { payload } = this
  const collection = payload.collections[collectionSlug]

  if (!collection) {
    throw new Error(`Collection ${collectionSlug} not found`)
  }

  const tableName = this.collections[collectionSlug].tableName

  try {
    // Sanitize data for SurrealDB
    const sanitized = sanitizeData({
      adapter: this,
      data,
      fields: collection.config.fields,
      operation: 'update',
    })

    // Add updated timestamp
    sanitized.updatedAt = new Date().toISOString()

    // Set the current table for the adapter context
    this.currentTable = tableName

    // Build the query
    const { params: whereParams, query: whereClause } = buildQuery({
      adapter: this,
      fields: collection.config.fields,
      where,
    })

    let query = `UPDATE ${tableName} MERGE $data`
    if (whereClause) {
      query += ` WHERE ${whereClause}`
    }
    query += ' RETURN *'

    const params = {
      data: sanitized,
      ...whereParams,
    }

    const [result] = await this.client.query(query, params)
    const updated = result || []

    // Transform back to Payload format
    return updated.map((doc: unknown) => transformFromSurrealDB(doc as Record<string, unknown>))
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'updateMany' })
    throw error
  }
}
