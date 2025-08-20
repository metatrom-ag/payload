import type { SurrealDBAdapter } from '../types.js'

interface CreateTableNameArgs {
  adapter: SurrealDBAdapter
  name: string
  type: 'collection' | 'global'
}

export const createTableName = ({ name, type, adapter }: CreateTableNameArgs): string => {
  // SurrealDB table names should be lowercase and use underscores
  const sanitized = name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_')

  // Add prefix based on type if needed
  if (type === 'global') {
    return `global_${sanitized}`
  }

  return sanitized
}
