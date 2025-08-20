import type { Field, Where } from 'payload'

import type { SurrealDBAdapter } from '../types.js'

interface BuildQueryArgs {
  adapter: SurrealDBAdapter
  fields: Field[]
  where?: Where
}

interface BuildQueryResult {
  params: Record<string, any>
  query: string
}

export const buildQuery = ({ adapter, fields, where }: BuildQueryArgs): BuildQueryResult => {
  if (!where || Object.keys(where).length === 0) {
    return { params: {}, query: '' }
  }

  const params: Record<string, any> = {}
  const conditions = buildWhereConditions(where, fields, params)

  // Don't return empty parentheses
  if (!conditions || conditions === '()') {
    return { params: {}, query: '' }
  }

  return {
    params,
    query: conditions,
  }
}

function buildWhereConditions(
  where: Where,
  fields: Field[],
  params: Record<string, any>,
  paramPrefix = '',
): string {
  const conditions: string[] = []

  for (const [key, value] of Object.entries(where)) {
    // Handle logical operators
    if (key === 'and' || key === 'AND') {
      const andConditions = (value as Where[]).map((condition, index) =>
        buildWhereConditions(condition, fields, params, `${paramPrefix}and${index}_`),
      )
      if (andConditions.length > 0) {
        conditions.push(`(${andConditions.join(' AND ')})`)
      }
      continue
    }

    if (key === 'or' || key === 'OR') {
      const orConditions = (value as Where[]).map((condition, index) =>
        buildWhereConditions(condition, fields, params, `${paramPrefix}or${index}_`),
      )
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`)
      }
      continue
    }

    // Handle field conditions
    const field = fields.find((f: any) => f.name === key)
    const fieldCondition = buildFieldCondition(key, value, field, params, paramPrefix)
    if (fieldCondition) {
      conditions.push(fieldCondition)
    }
  }

  return conditions.join(' AND ')
}

function buildFieldCondition(
  fieldName: string,
  condition: any,
  field: any,
  params: Record<string, any>,
  paramPrefix: string,
): string {
  // Special handling for nested array queries (e.g., sessions.id)
  if (fieldName.includes('.')) {
    const [arrayField, nestedField] = fieldName.split('.')

    // For array contains queries in SurrealDB
    if (typeof condition === 'object' && condition !== null) {
      for (const [operator, value] of Object.entries(condition)) {
        if (operator === 'equals') {
          const paramName = `${paramPrefix}${arrayField}_${nestedField}_${operator}`
          params[paramName] = value
          // SurrealDB syntax for checking if array contains object with field
          return `${arrayField}[WHERE ${nestedField} = $${paramName}]`
        }
      }
    }
  }

  // Handle simple equality
  if (typeof condition !== 'object' || condition === null) {
    const paramName = `${paramPrefix}${fieldName}`
    params[paramName] = condition
    return `${fieldName} = $${paramName}`
  }

  const conditions: string[] = []

  // Handle operators
  for (const [operator, value] of Object.entries(condition)) {
    const paramName = `${paramPrefix}${fieldName}_${operator}`

    switch (operator) {
      case 'contains':
        params[paramName] = `%${value}%`
        conditions.push(`${fieldName} ~ $${paramName}`)
        break

      case 'equals':
        // For ID field in SurrealDB, we need special handling
        if (fieldName === 'id' && value) {
          // Use parameter for the ID value
          params[paramName] = value
          // In SurrealDB, when filtering by record ID, we still use the parameter
          conditions.push(`id = $${paramName}`)
        } else {
          params[paramName] = value
          conditions.push(`${fieldName} = $${paramName}`)
        }
        break

      case 'exists':
        if (value === true) {
          conditions.push(`${fieldName} IS NOT NULL`)
        } else {
          conditions.push(`${fieldName} IS NULL`)
        }
        break

      case 'greater_than':
        params[paramName] = value
        conditions.push(`${fieldName} > $${paramName}`)
        break

      case 'greater_than_equal':
        params[paramName] = value
        conditions.push(`${fieldName} >= $${paramName}`)
        break

      case 'in':
        if (Array.isArray(value)) {
          params[paramName] = value
          conditions.push(`${fieldName} IN $${paramName}`)
        }
        break

      case 'less_than':
        params[paramName] = value
        conditions.push(`${fieldName} < $${paramName}`)
        break

      case 'less_than_equal':
        params[paramName] = value
        conditions.push(`${fieldName} <= $${paramName}`)
        break

      case 'like':
        params[paramName] = value
        conditions.push(`${fieldName} ~ $${paramName}`)
        break

      case 'near':
        // For geo queries
        if (value && typeof value === 'object' && value.coordinates) {
          const [lng, lat] = value.coordinates
          const maxDistance = value.maxDistance || 1000
          params[`${paramName}_point`] = { type: 'Point', coordinates: [lng, lat] }
          params[`${paramName}_distance`] = maxDistance
          conditions.push(
            `geo::distance(${fieldName}, $${paramName}_point) <= $${paramName}_distance`,
          )
        }
        break

      case 'not_equals':
        params[paramName] = value
        conditions.push(`${fieldName} != $${paramName}`)
        break

      case 'not_in':
        if (Array.isArray(value)) {
          params[paramName] = value
          conditions.push(`${fieldName} NOT IN $${paramName}`)
        }
        break

      default:
        // Unknown operator, skip
        break
    }
  }

  return conditions.join(' AND ')
}
