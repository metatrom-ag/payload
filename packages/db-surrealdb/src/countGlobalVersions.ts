import type { CountGlobalVersions } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const countGlobalVersions: CountGlobalVersions = async function countGlobalVersions(
  this: SurrealDBAdapter,
  { global: globalSlug, where: _where },
) {
  const versionTableName = this.versions[globalSlug]

  if (!versionTableName) {
    throw new Error(`Version table for global ${globalSlug} not found`)
  }

  try {
    const query = `SELECT count() FROM ${versionTableName} WHERE parent = "${this.globals[globalSlug].tableName}:singleton" GROUP ALL`
    const [result] = await this.client.query(query)
    const totalDocs = result?.[0]?.count || 0

    return {
      totalDocs,
    }
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error counting global versions:' })
    throw error
  }
}
