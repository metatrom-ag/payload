import type { FindVersions } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import {} from './queries/buildQuery.js'

export const findVersions: FindVersions = async function findVersions(
  this: SurrealDBAdapter,
  {
    collection: collectionSlug,
    limit = 10,
    page = 1,
    pagination = true,
    req: _req,
    select: _select,
    sort,
    where: _where,
  },
) {
  const versionTableName = this.versions[collectionSlug]

  if (!versionTableName) {
    throw new Error(`Version table for collection ${collectionSlug} not found`)
  }

  try {
    // Build sort clause
    let sortClause = ''
    if (sort) {
      const sortParts = Object.entries(sort).map(([field, order]) => {
        const direction = order === 'desc' ? 'DESC' : 'ASC'
        return `${field} ${direction}`
      })
      if (sortParts.length > 0) {
        sortClause = `ORDER BY ${sortParts.join(', ')}`
      }
    } else {
      sortClause = 'ORDER BY createdAt DESC'
    }

    // Calculate pagination
    const skip = pagination ? (page - 1) * limit : 0
    const limitClause = pagination ? `LIMIT ${limit} START ${skip}` : ''

    // Build the query
    let query = `SELECT * FROM ${versionTableName}`
    if (where && Object.keys(where).length > 0) {
      // Simple where implementation for versions
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
    query += ` ${sortClause} ${limitClause}`

    const [docs] = await this.client.query(query)

    // Count total if pagination enabled
    let totalDocs = 0
    if (pagination) {
      const [countResult] = await this.client.query(
        `SELECT count() FROM ${versionTableName} GROUP ALL`,
      )
      totalDocs = countResult?.[0]?.count || 0
    }

    const transformedDocs = (docs || []).map((doc: any) => transformVersionFromSurrealDB(doc))

    if (!pagination) {
      return {
        docs: transformedDocs,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 0,
        nextPage: null,
        page: 0,
        pagingCounter: 1,
        prevPage: null,
        totalDocs: transformedDocs.length,
        totalPages: 1,
      }
    }

    const totalPages = Math.ceil(totalDocs / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return {
      docs: transformedDocs,
      hasNextPage,
      hasPrevPage,
      limit,
      nextPage: hasNextPage ? page + 1 : null,
      page,
      pagingCounter: skip + 1,
      prevPage: hasPrevPage ? page - 1 : null,
      totalDocs,
      totalPages,
    }
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error finding versions:' })
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
