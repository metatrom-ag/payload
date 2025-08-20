import type { UpdateGlobalVersion } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const updateGlobalVersion: UpdateGlobalVersion = async function updateGlobalVersion(
  this: SurrealDBAdapter,
  { id, global: globalSlug, req: _req, versionData },
) {
  const versionTableName = this.versions[globalSlug]

  if (!versionTableName) {
    throw new Error(`Version table for global ${globalSlug} not found`)
  }

  try {
    const now = new Date().toISOString()

    const updateData = {
      updatedAt: now,
      version: versionData,
    }

    const query = `UPDATE ${versionTableName}:${id} MERGE $data RETURN *`
    const [result] = await this.client.query(query, { data: updateData })
    const updated = result?.[0]

    if (!updated) {
      return null
    }

    return transformVersionFromSurrealDB(updated)
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error updating global version:' })
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
