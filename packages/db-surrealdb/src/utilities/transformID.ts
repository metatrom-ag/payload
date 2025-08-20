/**
 * Escape an ID for use in SurrealDB queries
 * SurrealDB requires backticks around IDs that contain special characters
 */
export function escapeID(id: number | string): string {
  return `\`${id}\``
}

/**
 * Extract the ID from SurrealDB's compound format (table:id or table:`id` or _RecordId object)
 */
export function extractID(surrealID: any): string {
  if (!surrealID) {
    return surrealID
  }

  // Handle _RecordId object format from newer SurrealDB client
  if (typeof surrealID === 'object' && surrealID.id) {
    return surrealID.id
  }

  // Handle string format
  if (typeof surrealID === 'string') {
    // If it contains a colon, it's in the format table:id or table:`id`
    if (surrealID.includes(':')) {
      const parts = surrealID.split(':')
      let id = parts.slice(1).join(':') // Join back in case ID contains colons
      // Remove backticks if present
      id = id.replace(/^`|`$/g, '')
      // Remove Unicode brackets if present (⟨ and ⟩)
      id = id.replace(/^⟨|⟩$/g, '')
      return id
    }
  }

  // Otherwise return as-is
  return surrealID
}

/**
 * Transform a document from SurrealDB format to Payload format
 */
export function transformFromSurrealDB(doc: any): any {
  if (!doc) {
    return null
  }

  const id = extractID(doc.id)
  const { id: _, ...rest } = doc

  return {
    id,
    ...rest,
  }
}
