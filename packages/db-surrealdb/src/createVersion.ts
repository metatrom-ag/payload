import type { CreateVersion } from 'payload'

import { v4 as uuidv4 } from 'uuid'

import type { SurrealDBAdapter } from './types.js'

export const createVersion: CreateVersion = async function createVersion(
  this: SurrealDBAdapter,
  {
    _parent,
    autosave,
    collection: collectionSlug,
    createdAt,
    publishedLocale,
    req,
    snapshot,
    updatedAt,
    versionData,
  },
) {
  const { payload } = this
  const versionTableName = this.versions[collectionSlug]

  if (!versionTableName) {
    throw new Error(`Version table for collection ${collectionSlug} not found`)
  }

  try {
    const id = uuidv4()
    const now = new Date().toISOString()

    const versionDoc = {
      autosave: autosave || false,
      createdAt: createdAt || now,
      parent: `${this.collections[collectionSlug].tableName}:${parent}`,
      publishedLocale,
      snapshot,
      updatedAt: updatedAt || now,
      version: versionData,
    }

    const query = `CREATE ${versionTableName}:${id} CONTENT $data RETURN *`
    const [result] = await this.client.query(query, { data: versionDoc })
    const created = result?.[0]

    if (!created) {
      throw new Error('Failed to create version')
    }

    return transformVersionFromSurrealDB(created)
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error creating version:' })
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
