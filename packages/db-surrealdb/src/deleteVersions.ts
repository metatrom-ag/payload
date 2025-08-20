import type { DeleteVersions } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const deleteVersions: DeleteVersions = async function deleteVersions(
  this: SurrealDBAdapter,
  { collection: collectionSlug, where },
) {
  const versionTableName = this.versions[collectionSlug]

  if (!versionTableName) {
    throw new Error(`Version table for collection ${collectionSlug} not found`)
  }

  try {
    let query = `DELETE FROM ${versionTableName}`

    if (where && Object.keys(where).length > 0) {
      const conditions: string[] = []

      if (where.parent?.equals) {
        conditions.push(
          `parent = "${this.collections[collectionSlug].tableName}:${where.parent.equals}"`,
        )
      }

      if (where.id?.equals) {
        conditions.push(`id = "${versionTableName}:${where.id.equals}"`)
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`
      }
    }

    query += ' RETURN BEFORE'

    const [result] = await this.client.query(query)
    const deleted = result || []

    return deleted.map((doc: any) => transformVersionFromSurrealDB(doc))
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error deleting versions:' })
    throw error
  }
}

function transformVersionFromSurrealDB(doc: any): any {
  if (!doc) {
    return null
  }

  const id = typeof doc.id === 'string' && doc.id.includes(':') ? doc.id.split(':')[1] : doc.id

  const parent =
    typeof doc.parent === 'string' && doc.parent.includes(':')
      ? doc.parent.split(':')[1]
      : doc.parent

  const { id: _, parent: __, ...rest } = doc

  return {
    id,
    parent,
    ...rest,
  }
}
