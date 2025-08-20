import type { UpdateGlobal } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import { handleError } from './utilities/handleError.js'
import { sanitizeData } from './utilities/sanitizeData.js'
import { transformFromSurrealDB } from './utilities/transformID.js'

export const updateGlobal: UpdateGlobal = async function updateGlobal(
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
      operation: 'update',
    })

    // Add updated timestamp
    sanitized.updatedAt = new Date().toISOString()

    // For globals, we use a fixed ID
    const globalId = 'singleton'

    // Update the global document
    const query = `UPDATE ${tableName}:${globalId} MERGE $data RETURN *`
    const params = { data: sanitized }

    const [result] = await this.client.query(query, params)
    const updated = result?.[0]

    if (!updated) {
      // If it doesn't exist, create it
      return this.createGlobal({ slug, data })
    }

    // Transform back to Payload format
    const transformed = transformFromSurrealDB(updated)
    // For globals, override the ID with singleton
    return { ...transformed, id: 'singleton' }
  } catch (error) {
    handleError({ collection: slug, error, operation: 'updateGlobal' })
    throw error
  }
}
