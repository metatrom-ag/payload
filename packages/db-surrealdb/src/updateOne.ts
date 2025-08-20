import type { UpdateOne } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import {} from './queries/buildQuery.js'
import { handleError } from './utilities/handleError.js'
import { sanitizeData } from './utilities/sanitizeData.js'
import { escapeID, extractID, transformFromSurrealDB } from './utilities/transformID.js'

export const updateOne: UpdateOne = async function updateOne(
  this: SurrealDBAdapter,
  { id, collection: collectionSlug, data, req: _req, returning = true, where },
) {
  const { payload } = this
  const collection = payload.collections[collectionSlug]

  if (!collection) {
    throw new Error(`Collection ${collectionSlug} not found`)
  }

  const tableName = this.collections[collectionSlug].tableName

  try {
    // Log for debugging auth issues
    if (
      collectionSlug === 'users' &&
      (data.lockUntil !== undefined || data.loginAttempts !== undefined)
    ) {
      payload.logger.debug(
        `Updating user auth fields - id: ${id}, where: ${JSON.stringify(where)}, data: ${JSON.stringify(data)}`,
      )
    }

    // Sanitize data for SurrealDB
    const sanitized = sanitizeData({
      adapter: this,
      data,
      fields: collection.config.fields,
      operation: 'update',
    })

    // Add updated timestamp - Pass as Date object for SurrealDB
    sanitized.updatedAt = new Date()

    let query: string
    let params: any = { data: sanitized }

    if (id) {
      // Update by ID - escape it properly
      query = `UPDATE ${tableName}:${escapeID(id)} MERGE $data RETURN *`
    } else if (where) {
      // Update by where clause
      const { params: whereParams, query: whereClause } = buildQuery({
        adapter: this,
        fields: collection.config.fields,
        where,
      })

      query = `UPDATE ${tableName} MERGE $data WHERE ${whereClause} RETURN *`
      params = { ...params, ...whereParams }
    } else {
      throw new Error('Either id or where must be provided')
    }

    const [result] = await this.client.query(query, params)
    let updated = result?.[0]

    // Log the raw result for debugging
    if (collectionSlug === 'users' && !updated) {
      payload.logger.warn(`UpdateOne returned empty for users - query: ${query}, params:`, params)
    }

    // If no document was updated and we have an ID, try to fetch it
    if (!updated && id && returning !== false) {
      // Try to fetch the document by ID to return it
      const fetchQuery = `SELECT * FROM ${tableName}:${escapeID(id)}`
      const [fetchResult] = await this.client.query(fetchQuery)
      updated = fetchResult?.[0]

      if (updated) {
        payload.logger.debug(`Fetched user after update: ${id}`)
      }
    }

    // If still no document and we have a where clause, try to find it
    if (!updated && where && returning !== false) {
      const { params: whereParams, query: whereClause } = buildQuery({
        adapter: this,
        fields: collection.config.fields,
        where,
      })

      const findQuery = `SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`
      const [findResult] = await this.client.query(findQuery, whereParams)
      updated = findResult?.[0]

      if (updated) {
        payload.logger.debug(`Found user after update with where clause`)
      }
    }

    if (!updated) {
      // If still no document found
      if (returning === false) {
        return null
      }
      payload.logger.error(
        `UpdateOne failed to find document - collection: ${collectionSlug}, id: ${id}, where:`,
        where,
      )
      return null
    }

    if (returning === false) {
      return { id: extractID(updated.id) }
    }

    // Transform back to Payload format
    return transformFromSurrealDB(updated)
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'updateOne' })
    throw error
  }
}
