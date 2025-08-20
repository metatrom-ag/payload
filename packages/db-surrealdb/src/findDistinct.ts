import type { FindDistinct } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import {} from './queries/buildQuery.js'
import { handleError } from './utilities/handleError.js'

export const findDistinct: FindDistinct = async function findDistinct(
  this: SurrealDBAdapter,
  { collection: collectionSlug, field, where },
) {
  const { payload } = this
  const collection = payload.collections[collectionSlug]

  if (!collection) {
    throw new Error(`Collection ${collectionSlug} not found`)
  }

  const tableName = this.collections[collectionSlug].tableName

  try {
    const { params, query: whereClause } = buildQuery({
      adapter: this,
      fields: collection.config.fields,
      where,
    })

    let query = `SELECT array::distinct(${field}) as values FROM ${tableName}`
    if (whereClause) {
      query += ` WHERE ${whereClause}`
    }
    query += ' GROUP ALL'

    const [result] = await this.client.query(query, params)
    const values = result?.[0]?.values || []

    return values
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'findDistinct' })
    throw error
  }
}
