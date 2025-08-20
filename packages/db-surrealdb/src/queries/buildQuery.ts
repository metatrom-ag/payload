import type { Field, Where } from 'payload'

import { RecordId } from 'surrealdb'

import type { SurrealDBAdapter } from '../types.js'

interface BuildQueryArgs {
  adapter: SurrealDBAdapter
  fields: Field[]
  where?: Where
}

interface BuildQueryResult {
  params: Record<string, unknown>
  query: string
}

export const buildQuery = ({ adapter, fields, where }: BuildQueryArgs): BuildQueryResult => {
  if (!where || Object.keys(where).length === 0) {
    return { params: {}, query: '' }
  }

  const params: Record<string, unknown> = {}
  const conditions = buildWhereConditions(adapter, where, fields, params)

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
  adapter: SurrealDBAdapter,
  where: Where,
  fields: Field[],
  params: Record<string, unknown>,
  paramPrefix = '',
): string {
  const conditions: string[] = []

  for (const [key, value] of Object.entries(where)) {
    // Handle logical operators
    if (key === 'and' || key === 'AND') {
      const andConditions = (value as Where[]).map((condition, index) =>
        buildWhereConditions(adapter, condition, fields, params, `${paramPrefix}and${index}_`),
      )
      if (andConditions.length > 0) {
        conditions.push(`(${andConditions.join(' AND ')})`)
      }
      continue
    }

    if (key === 'or' || key === 'OR') {
      const orConditions = (value as Where[]).map((condition, index) =>
        buildWhereConditions(adapter, condition, fields, params, `${paramPrefix}or${index}_`),
      )
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`)
      }
      continue
    }

    // Handle field conditions
    const field = fields.find((f) => f.name === key)
    const fieldCondition = buildFieldCondition(adapter, key, value, field, params, paramPrefix)
    if (fieldCondition) {
      conditions.push(fieldCondition)
    }
  }

  return conditions.join(' AND ')
}

function buildFieldCondition(
  adapter: SurrealDBAdapter,
  fieldName: string,
  condition: unknown,
  field: Field | undefined,
  params: Record<string, unknown>,
  paramPrefix: string,
): string {
  // Special handling for nested field queries (e.g., document.relationTo, sessions.id)
  if (fieldName.includes('.')) {
    const parts = fieldName.split('.')

    // For nested object field queries (e.g., document.relationTo)
    if (typeof condition === 'object' && condition !== null) {
      for (const [operator, value] of Object.entries(condition)) {
        if (operator === 'equals') {
          const paramName = `${paramPrefix}${parts.join('_')}_${operator}`
          params[paramName] = value
          // Use direct dot notation for nested object fields
          // This handles both object properties and array filtering
          return `${fieldName} = $${paramName}`
        }
      }
    } else {
      // Simple equality for nested fields
      const paramName = `${paramPrefix}${parts.join('_')}`
      params[paramName] = condition
      return `${fieldName} = $${paramName}`
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
          // For ID field in SurrealDB, we need special handling
          if (fieldName === 'id' && value.length > 0 && adapter.currentTable) {
            // Use RecordId instances for safe parameterization
            const tableName = adapter.currentTable

            if (adapter.debug) {
              adapter.payload?.logger.debug(`[buildQuery] Building IN clause for IDs:`, value)
              adapter.payload?.logger.debug(`[buildQuery] Table name: ${String(tableName)}`)
            }

            // Create RecordId instances for each ID
            const recordIds = value.map((id: unknown) => new RecordId(tableName, String(id)))

            // Use the IN operator with RecordId array
            params[paramName] = recordIds
            conditions.push(`id IN $${paramName}`)

            if (adapter.debug) {
              adapter.payload?.logger.debug(`[buildQuery] Generated IN clause: id IN $${paramName}`)
              adapter.payload?.logger.debug(`[buildQuery] RecordIds:`, recordIds)
            }
          } else {
            params[paramName] = value
            conditions.push(`${fieldName} IN $${paramName}`)
          }
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
