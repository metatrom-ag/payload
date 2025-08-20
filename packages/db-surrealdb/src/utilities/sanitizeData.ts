import type { Field } from 'payload'

import { RecordId } from 'surrealdb'

import type { SurrealDBAdapter } from '../types.js'

interface SanitizeDataArgs {
  adapter: SurrealDBAdapter
  data: Record<string, unknown>
  fields: Field[]
  operation: 'create' | 'update'
}

export const sanitizeData = ({
  adapter,
  data,
  fields,
  operation,
}: SanitizeDataArgs): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    // Skip id field on create unless allowIDOnCreate is true
    if (key === 'id' && operation === 'create' && !adapter.allowIDOnCreate) {
      continue
    }

    // Skip undefined values
    if (value === undefined) {
      continue
    }

    // Handle null values
    if (value === null) {
      sanitized[key] = null
      continue
    }

    // Find the field definition
    const field = fields.find((f) => 'name' in f && f.name === key)

    if (!field) {
      // For auth-related fields and other special fields, pass them through
      // These include: hash, salt, sessions, loginAttempts, lockUntil, resetPasswordToken, resetPasswordExpiration
      const authFields = [
        'hash',
        'salt',
        'sessions',
        'loginAttempts',
        'lockUntil',
        'resetPasswordToken',
        'resetPasswordExpiration',
      ]
      if (authFields.includes(key)) {
        sanitized[key] = value
      }
      // Special handling for relationship-like objects (e.g., user field in preferences)
      else if (
        typeof value === 'object' &&
        value !== null &&
        'relationTo' in value &&
        'value' in value
      ) {
        // This is a relationship field - convert to SurrealDB RecordId
        const relationValue = value as { relationTo: string; value: string }
        sanitized[key] = new RecordId(relationValue.relationTo, relationValue.value)
      }
      // Skip other unknown fields
      continue
    }

    // Sanitize based on field type
    sanitized[key] = sanitizeFieldValue(value, field)
  }

  return sanitized
}

function sanitizeFieldValue(value: unknown, field: Field): unknown {
  if (!('type' in field)) {
    return value
  }

  switch (field.type) {
    case 'array':
    case 'blocks':
      // Arrays and blocks are stored as JSON
      return Array.isArray(value) ? value : []
    case 'checkbox':
      return Boolean(value)
    case 'code':
    case 'email':
    case 'radio':
    case 'select':
    case 'text':
    case 'textarea':
      return String(value)

    case 'collapsible':
    case 'group':
    case 'row':
      // These are UI-only fields, process their children
      return value

    case 'date':
      if (value instanceof Date) {
        return value // Pass Date objects directly to SurrealDB
      }
      // If it's a string, convert to Date
      if (typeof value === 'string') {
        return new Date(value)
      }
      return value
    case 'json':
    case 'richText':
      // Store as JSON
      return value
    case 'number':
      return Number(value)
    case 'point':
      // SurrealDB supports geo points
      if (
        typeof value === 'object' &&
        value.longitude !== undefined &&
        value.latitude !== undefined
      ) {
        return {
          type: 'Point',
          coordinates: [value.longitude, value.latitude],
        }
      }
      return value

    case 'relationship':
    case 'upload': {
      // Handle relationships - store as SurrealDB RecordId objects
      const relationTo = 'relationTo' in field ? field.relationTo : null
      if (!relationTo) {
        return value
      }

      if (Array.isArray(value)) {
        return value.map((item) => {
          if (typeof item === 'string') {
            return new RecordId(relationTo as string, item)
          }
          // Handle object format { relationTo, value }
          if (typeof item === 'object' && item !== null && 'value' in item) {
            const relItem = item as { relationTo?: string; value: string }
            return new RecordId(relItem.relationTo || (relationTo as string), relItem.value)
          }
          return item
        })
      } else if (typeof value === 'string') {
        return new RecordId(relationTo as string, value)
      } else if (typeof value === 'object' && value !== null && 'value' in value) {
        // Handle object format { relationTo, value }
        const relValue = value as { relationTo?: string; value: string }
        return new RecordId(relValue.relationTo || (relationTo as string), relValue.value)
      }
      return value
    }

    default:
      return value
  }
}
