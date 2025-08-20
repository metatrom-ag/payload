import type { DeleteOne } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import {} from './queries/buildQuery.js'
import { handleError } from './utilities/handleError.js'
import { escapeID, transformFromSurrealDB } from './utilities/transformID.js'

export const deleteOne: DeleteOne = async function deleteOne(
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
    // If where includes an ID, use it directly
    if (where?.id) {
      const id = where.id.equals || where.id
      const query = `DELETE ${tableName}:${escapeID(id)} RETURN BEFORE`
      const [result] = await this.client.query(query)
      const deleted = result?.[0]

      if (!deleted) {
        return null
      }

      return transformFromSurrealDB(deleted)
    }

    // Otherwise, find the document first then delete it
    const { params, query: whereClause } = buildQuery({
      adapter: this,
      fields: collection.config.fields,
      where,
    })

    // Find the document
    let findQuery = `SELECT * FROM ${tableName}`
    if (whereClause) {
      findQuery += ` WHERE ${whereClause}`
    }
    findQuery += ' LIMIT 1'

    const [findResult] = await this.client.query(findQuery, params)
    const doc = findResult?.[0]

    if (!doc) {
      return null
    }

    // Delete the document
    const deleteQuery = `DELETE ${doc.id} RETURN BEFORE`
    const [deleteResult] = await this.client.query(deleteQuery)
    const deleted = deleteResult?.[0]

    return transformFromSurrealDB(deleted)
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'deleteOne' })
    throw error
  }
}
