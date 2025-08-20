import type { CreateGlobalVersion } from 'payload'

import { v4 as uuidv4 } from 'uuid'

import type { SurrealDBAdapter } from './types.js'

export const createGlobalVersion: CreateGlobalVersion = async function createGlobalVersion(
  this: SurrealDBAdapter,
  {
    _parent,
    autosave,
    createdAt,
    globalSlug,
    publishedLocale,
    req,
    snapshot,
    updatedAt,
    versionData,
  },
) {
  const versionTableName = this.versions[globalSlug]

  if (!versionTableName) {
    throw new Error(`Version table for global ${globalSlug} not found`)
  }

  try {
    const id = uuidv4()
    const now = new Date().toISOString()

    const versionDoc = {
      autosave: autosave || false,
      createdAt: createdAt || now,
      parent: `${this.globals[globalSlug].tableName}:singleton`,
      publishedLocale,
      snapshot,
      updatedAt: updatedAt || now,
      version: versionData,
    }

    const query = `CREATE ${versionTableName}:${id} CONTENT $data RETURN *`
    const [result] = await this.client.query(query, { data: versionDoc })
    const created = result?.[0]

    if (!created) {
      throw new Error('Failed to create global version')
    }

    return transformVersionFromSurrealDB(created)
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error creating global version:' })
    throw error
  }
}

function transformVersionFromSurrealDB(doc: any): any {
  if (!doc) {
    return null
  }

  const id = typeof doc.id === 'string' && doc.id.includes(':') ? doc.id.split(':')[1] : doc.id

  const { id: _, parent: __, ...rest } = doc

  return {
    id,
    parent: 'singleton',
    ...rest,
  }
}
