import type { UpdateVersion } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const updateVersion: UpdateVersion = async function updateVersion(
  this: SurrealDBAdapter,
  { id, collection: collectionSlug, req: _req, versionData, where: _where },
) {
  const versionTableName = this.versions[collectionSlug]

  if (!versionTableName) {
    throw new Error(`Version table for collection ${collectionSlug} not found`)
  }

  try {
    const now = new Date().toISOString()

    const updateData = {
      updatedAt: now,
      version: versionData,
    }

    let query: string
    const params: any = { data: updateData }

    if (id) {
      query = `UPDATE ${versionTableName}:${id} MERGE $data RETURN *`
    } else if (where) {
      // Simple where implementation for versions
      const conditions: string[] = []
      if (where.parent?.equals) {
        conditions.push(
          `parent = "${this.collections[collectionSlug].tableName}:${where.parent.equals}"`,
        )
      }
      if (where.id?.equals) {
        conditions.push(`id = "${versionTableName}:${where.id.equals}"`)
      }

      query = `UPDATE ${versionTableName} MERGE $data WHERE ${conditions.join(' AND ')} RETURN *`
    } else {
      throw new Error('Either id or where must be provided')
    }

    const [result] = await this.client.query(query, params)
    const updated = result?.[0]

    if (!updated) {
      return null
    }

    return transformVersionFromSurrealDB(updated)
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error updating version:' })
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
