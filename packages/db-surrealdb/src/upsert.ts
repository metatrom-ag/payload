import type { Upsert } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import { buildQuery } from './queries/buildQuery.js'
import { handleError } from './utilities/handleError.js'
import { sanitizeData } from './utilities/sanitizeData.js'
import { transformFromSurrealDB } from './utilities/transformID.js'

export const upsert: Upsert = async function upsert(
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
    // Set the current table for the adapter context
    this.currentTable = tableName

    // First, try to find existing document
    const { params: whereParams, query: whereClause } = buildQuery({
      adapter: this,
      fields: collection.config.fields,
      where,
    })

    let findQuery = `SELECT * FROM ${tableName}`
    if (whereClause) {
      findQuery += ` WHERE ${whereClause}`
    }
    findQuery += ' LIMIT 1'

    const [findResult] = await this.client.query(findQuery, whereParams)
    const existing = findResult?.[0]

    // Sanitize data
    const sanitized = sanitizeData({
      adapter: this,
      data,
      fields: collection.config.fields,
      operation: existing ? 'update' : 'create',
    })

    const now = new Date()

    if (existing) {
      // Update existing document
      sanitized.updatedAt = now

      const updateQuery = `UPDATE ${existing.id} MERGE $data RETURN *`
      const [updateResult] = await this.client.query(updateQuery, { data: sanitized })
      const updated = updateResult?.[0]

      return transformFromSurrealDB(updated)
    } else {
      // Create new document
      sanitized.createdAt = now
      sanitized.updatedAt = now

      const createQuery = `CREATE ${tableName} CONTENT $data RETURN *`
      const [createResult] = await this.client.query(createQuery, { data: sanitized })
      const created = createResult?.[0]

      return transformFromSurrealDB(created)
    }
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'upsert' })
    throw error
  }
}
