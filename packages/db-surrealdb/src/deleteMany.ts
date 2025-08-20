import type { DeleteMany } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import {} from './queries/buildQuery.js'
import { handleError } from './utilities/handleError.js'
import { transformFromSurrealDB } from './utilities/transformID.js'

export const deleteMany: DeleteMany = async function deleteMany(
  this: SurrealDBAdapter,
  { collection: collectionSlug, where },
) {
  const { payload } = this
  const collection = payload.collections[collectionSlug]

  if (!collection) {
    throw new Error(`Collection ${collectionSlug} not found`)
  }

  const tableName = this.collections[collectionSlug].tableName

  try {
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

    const [result] = await this.client.query(query, params)
    const deleted = result || []

    // Transform back to Payload format
    return deleted.map((doc: any) => transformFromSurrealDB(doc))
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'deleteMany' })
    throw error
  }
}
