import type { Find } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import {} from './queries/buildQuery.js'
import { handleError } from './utilities/handleError.js'
import { transformFromSurrealDB } from './utilities/transformID.js'

export const find: Find = async function find(
  this: SurrealDBAdapter,
  {
    collection: collectionSlug,
    joins: _joins,
    limit = 10,
    page = 1,
    pagination = true,
    req: _req,
    select: _select,
    sort,
    where,
  },
) {
  const { payload } = this
  const collection = payload.collections[collectionSlug]

  if (!collection) {
    throw new Error(`Collection ${collectionSlug} not found`)
  }

  const tableName = this.collections[collectionSlug].tableName

  // Uncomment for debugging
  // if (collectionSlug === 'users') {
  //   console.log(`[SURREALDB] Find for users - where:`, where, 'limit:', limit)
  // }

  try {
    // Log for debugging login issues
    if (collectionSlug === 'users') {
      payload.logger.debug(`Find users where: ${JSON.stringify(where)}`)
    }

    // Build the query
    const { params, query: whereClause } = buildQuery({
      adapter: this,
      fields: collection.config.fields,
      where,
    })

    // Build sort clause
    let sortClause = ''
    if (sort) {
      const sortParts = Object.entries(sort)
        .filter(([field]) => {
          // Filter out numeric field references (0, 1, 2, etc)
          return isNaN(Number(field))
        })
        .map(([field, order]) => {
          const direction = order === 'desc' ? 'DESC' : 'ASC'
          return `${field} ${direction}`
        })
      if (sortParts.length > 0) {
        sortClause = `ORDER BY ${sortParts.join(', ')}`
      }
    }

    // Calculate pagination
    const skip = pagination ? (page - 1) * limit : 0
    const limitClause = pagination ? `LIMIT ${limit} START ${skip}` : ''

    // Build the full query
    let query = `SELECT * FROM ${tableName}`
    if (whereClause) {
      query += ` WHERE ${whereClause}`
    }
    if (sortClause) {
      query += ` ${sortClause}`
    }
    if (limitClause) {
      query += ` ${limitClause}`
    }

    // Execute the query
    const [docs] = await this.client.query(query, params)

    // Log results for debugging
    if (collectionSlug === 'users') {
      payload.logger.debug(`Find users query: ${query}, params:`, params)
      payload.logger.debug(`Found ${docs?.length || 0} users`)
      if (docs?.length > 0) {
        payload.logger.debug(`First user data (raw):`, JSON.stringify(docs[0]))
      }
    }

    // Count total documents if pagination is enabled
    let totalDocs = 0
    let totalPages = 1
    let hasNextPage = false
    let hasPrevPage = false

    if (pagination) {
      let countQuery = `SELECT count() FROM ${tableName}`
      if (whereClause) {
        countQuery += ` WHERE ${whereClause}`
      }
      countQuery += ' GROUP ALL'

      const [countResult] = await this.client.query(countQuery, params)
      totalDocs = countResult?.[0]?.count || 0
      totalPages = Math.ceil(totalDocs / limit)
      hasNextPage = page < totalPages
      hasPrevPage = page > 1
    }

    // Transform documents
    const transformedDocs = (docs || []).map((doc: any) => transformFromSurrealDB(doc))

    return {
      docs: transformedDocs,
      ...(pagination && {
        hasNextPage,
        hasPrevPage,
        limit,
        nextPage: hasNextPage ? page + 1 : null,
        page,
        pagingCounter: skip + 1,
        prevPage: hasPrevPage ? page - 1 : null,
        totalDocs,
        totalPages,
      }),
    }
  } catch (error) {
    handleError({ collection: collectionSlug, error, operation: 'find' })
    throw error
  }
}
