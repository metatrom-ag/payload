import type { QueryDrafts } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const queryDrafts: QueryDrafts = async function queryDrafts(
  this: SurrealDBAdapter,
  {
    collection,
    limit = 10,
    page = 1,
    pagination = true,
    req: _req,
    select: _select,
    sort,
    where: _where,
  },
) {
  // For drafts, we query the version table for autosave versions
  const versionTableName = this.versions[collection]

  if (!versionTableName) {
    return {
      docs: [],
      hasNextPage: false,
      hasPrevPage: false,
      limit,
      nextPage: null,
      page: 1,
      pagingCounter: 1,
      prevPage: null,
      totalDocs: 0,
      totalPages: 0,
    }
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
      sortClause = 'ORDER BY updatedAt DESC'
    }

    // Calculate pagination
    const skip = pagination ? (page - 1) * limit : 0
    const limitClause = pagination ? `LIMIT ${limit} START ${skip}` : ''

    // Query for autosave versions (drafts)
    let query = `SELECT * FROM ${versionTableName} WHERE autosave = true`
    query += ` ${sortClause} ${limitClause}`

    const [docs] = await this.client.query(query)

    // Count total if pagination enabled
    let totalDocs = 0
    if (pagination) {
      const [countResult] = await this.client.query(
        `SELECT count() FROM ${versionTableName} WHERE autosave = true GROUP ALL`,
      )
      totalDocs = countResult?.[0]?.count || 0
    }

    const transformedDocs = (docs || []).map((doc: any) => {
      const id = typeof doc.id === 'string' && doc.id.includes(':') ? doc.id.split(':')[1] : doc.id

      const parent =
        typeof doc.parent === 'string' && doc.parent.includes(':')
          ? doc.parent.split(':')[1]
          : doc.parent

      return {
        id,
        parent,
        ...doc.version, // Unwrap the version data
        _status: 'draft',
      }
    })

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
    this.payload.logger.error({ err: error, msg: 'Error querying drafts:' })
    throw error
  }
}
