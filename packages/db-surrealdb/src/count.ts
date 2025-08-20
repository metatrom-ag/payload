import type { Count } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import { buildQuery } from './queries/buildQuery.js'
import { getUserCountCache, setUserCountCache } from './utilities/cacheUtils.js'
import { debounceOperation } from './utilities/debounce.js'
import { handleError } from './utilities/handleError.js'

export const count: Count = async function count(
  this: SurrealDBAdapter,
  { collection: collectionSlug, where },
) {
  const { payload } = this
  const collection = payload.collections[collectionSlug]

  // Use cache for user count with no where clause
  if (collectionSlug === 'users' && !where) {
    const cached = getUserCountCache()
    if (cached) {
      return { totalDocs: cached.value }
    }

    // Debounce user count queries to prevent rapid repeated calls
    return debounceOperation(
      'user-count',
      async () => {
        const tableName = this.collections[collectionSlug].tableName
        const query = `SELECT count() FROM ${tableName} GROUP ALL`
        const [result] = await this.client.query(query)
        const totalDocs = result?.[0]?.count || 0
        setUserCountCache(totalDocs)
        return { totalDocs }
      },
      200, // 200ms debounce
    )
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

    let query = `SELECT count() FROM ${tableName}`
    if (whereClause) {
      query += ` WHERE ${whereClause}`
    }
    query += ' GROUP ALL'

    const [result] = await this.client.query(query, params)
    const totalDocs = result?.[0]?.count || 0

    // Update cache for user count with no where clause
    if (collectionSlug === 'users' && !where) {
      setUserCountCache(totalDocs)
    }

    return {
      totalDocs,
    }
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'count' })
    throw error
  }
}
