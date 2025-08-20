import type { CountVersions } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const countVersions: CountVersions = async function countVersions(
  this: SurrealDBAdapter,
  { collection: collectionSlug, where },
) {
  const versionTableName = this.versions[collectionSlug]

  if (!versionTableName) {
    throw new Error(`Version table for collection ${collectionSlug} not found`)
  }

  try {
    let query = `SELECT count() FROM ${versionTableName}`

    if (where && Object.keys(where).length > 0) {
      const conditions: string[] = []

      if (where.parent?.equals) {
        conditions.push(
          `parent = "${this.collections[collectionSlug].tableName}:${where.parent.equals}"`,
        )
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`
      }
    }

    query += ' GROUP ALL'

    const [result] = await this.client.query(query)
    const totalDocs = result?.[0]?.count || 0

    return {
      totalDocs,
    }
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error counting versions:' })
    throw error
  }
}
