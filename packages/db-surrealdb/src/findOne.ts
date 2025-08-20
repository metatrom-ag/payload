import type { FindOne } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import {} from './queries/buildQuery.js'
import { handleError } from './utilities/handleError.js'
import { transformFromSurrealDB } from './utilities/transformID.js'

export const findOne: FindOne = async function findOne(
  this: SurrealDBAdapter,
  { collection: collectionSlug, joins: _joins, req: _req, select: _select, where },
) {
  const { payload } = this
  const collection = payload.collections[collectionSlug]

  if (!collection) {
    throw new Error(`Collection ${collectionSlug} not found`)
  }

  const tableName = this.collections[collectionSlug].tableName

  // Uncomment for debugging
  // if (collectionSlug === 'users') {
  //   console.log(`[SURREALDB] FindOne for users - where:`, JSON.stringify(where, null, 2), 'select:', select)
  // }

  try {
    // Log for debugging auth issues
    if (collectionSlug === 'users') {
      payload.logger.debug(
        `FindOne for users - where: ${JSON.stringify(where)}, select: ${JSON.stringify(select)}`,
      )
    }

    // Unwrap single-element 'and' arrays
    let actualWhere = where
    if (where?.and && Array.isArray(where.and) && where.and.length === 1) {
      actualWhere = where.and[0]
    }

    // Special handling for ID-based queries in SurrealDB
    if (actualWhere?.id?.equals) {
      const id = actualWhere.id.equals
      // Use the table:id format for direct ID lookup
      const escapedId = id.includes('-') ? `\`${id}\`` : id
      const query = `SELECT * FROM ${tableName}:${escapedId}`

      const [result] = await this.client.query(query)
      const doc = result?.[0]

      if (!doc) {
        if (collectionSlug === 'users' && select?.lockUntil) {
          payload.logger.error(`FindOne by ID returned null - query: ${query}`)
        }
        return null
      }

      // Transform document
      const transformed = transformFromSurrealDB(doc)

      if (collectionSlug === 'users' && select?.lockUntil) {
        payload.logger.debug(`FindOne returning user:`, transformed)
      }

      return transformed
    }

    // Build the query for non-ID queries
    const { params, query: whereClause } = buildQuery({
      adapter: this,
      fields: collection.config.fields,
      where: actualWhere,
    })

    // Build the full query
    let query = `SELECT * FROM ${tableName}`
    if (whereClause) {
      query += ` WHERE ${whereClause}`
    }
    query += ' LIMIT 1'

    // Execute the query
    const [result] = await this.client.query(query, params)
    const doc = result?.[0]

    if (!doc) {
      if (collectionSlug === 'users' && select?.lockUntil) {
        payload.logger.error(`FindOne returned null for user - query: ${query}, params:`, params)
      }
      return null
    }

    // Transform document
    const transformed = transformFromSurrealDB(doc)

    if (collectionSlug === 'users' && select?.lockUntil) {
      payload.logger.debug(`FindOne returning user:`, transformed)
    }

    return transformed
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'findOne' })
    throw error
  }
}
