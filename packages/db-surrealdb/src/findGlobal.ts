import type { FindGlobal } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import { handleError } from './utilities/handleError.js'
import { transformFromSurrealDB } from './utilities/transformID.js'

export const findGlobal: FindGlobal = async function findGlobal(
  this: SurrealDBAdapter,
  { slug, joins, req, select },
) {
  const { payload } = this
  const global = payload.globals.config.find((g) => g.slug === slug)

  if (!global) {
    throw new Error(`Global ${slug} not found`)
  }

  const tableName = this.globals[slug].tableName

  try {
    // For globals, we use a fixed ID
    const globalId = 'singleton'

    const query = `SELECT * FROM ${tableName}:${globalId}`
    const [result] = await this.client.query(query)
    const doc = result?.[0]

    if (!doc) {
      // Return empty object for globals that don't exist yet
      return {}
    }

    // Transform back to Payload format
    const transformed = transformFromSurrealDB(doc)
    // For globals, override the ID with singleton
    return { ...transformed, id: 'singleton' }
  } catch (error) {
    handleError({ collection: slug, error, operation: 'findGlobal' })
    throw error
  }
}
