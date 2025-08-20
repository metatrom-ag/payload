import type { CreateGlobal } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import { handleError } from './utilities/handleError.js'
import { sanitizeData } from './utilities/sanitizeData.js'
import { transformFromSurrealDB } from './utilities/transformID.js'

export const createGlobal: CreateGlobal = async function createGlobal(
  this: SurrealDBAdapter,
  { slug, data },
) {
  const { payload } = this
  const global = payload.globals.config.find((g) => g.slug === slug)

  if (!global) {
    throw new Error(`Global ${slug} not found`)
  }

  const tableName = this.globals[slug].tableName

  try {
    // Sanitize data for SurrealDB
    const sanitized = sanitizeData({
      adapter: this,
      data,
      fields: global.fields,
      operation: 'create',
    })

    // Add timestamps
    const now = new Date().toISOString()
    sanitized.createdAt = now
    sanitized.updatedAt = now

    // For globals, we use a fixed ID
    const globalId = 'singleton'

    // Upsert the global document (there should only be one)
    const query = `UPDATE ${tableName}:${globalId} CONTENT $data RETURN *`
    const params = { data: sanitized }

    const [result] = await this.client.query(query, params)
    const created = result?.[0]

    if (!created) {
      throw new Error('Failed to create global')
    }

    // Transform back to Payload format
    const transformed = transformFromSurrealDB(created)
    // For globals, override the ID with singleton
    return { ...transformed, id: 'singleton' }
  } catch (error) {
    handleError({ collection: slug, error, operation: 'createGlobal' })
    throw error
  }
}
