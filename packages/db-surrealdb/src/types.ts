import type {
  DatabaseAdapterObj as _DatabaseAdapterObj,
  TypeWithID as _TypeWithID,
  BaseDatabaseAdapter,
  CollectionSlug,
  Migration,
  Payload,
} from 'payload'
import type { Surreal } from 'surrealdb'

export interface SurrealDBAdapter extends BaseDatabaseAdapter {
  client: Surreal
  collections: Record<CollectionSlug, SurrealDBCollection>
  currentTable?: string
  debug?: boolean
  globals: Record<string, SurrealDBGlobal>
  idType: 'custom' | 'ulid' | 'uuid'
  localesSuffix: string
  migrationDir: string
  namespaceDb: {
    database: string
    namespace: string
  }
  relationshipsSuffix: string
  transactionID?: string
  versions: Record<string, string>
  versionsSuffix: string
}

export interface SurrealDBCollection {
  slug: CollectionSlug
  tableName: string
}

export interface SurrealDBGlobal {
  slug: string
  tableName: string
}

export interface Args {
  /**
   * Enable debug logging
   * @default false
   */
  _debug?: boolean

  /**
   * Connection timeout in milliseconds
   * @default 30000
   */
  _timeout?: number

  /**
   * Enable this flag if you want to thread your own ID to create operation data
   * @default false
   */
  allowIDOnCreate?: boolean

  /**
   * Authentication credentials
   */
  auth?:
    | {
        access?: string
        database?: string
        namespace?: string
        variables?: Record<string, unknown>
      }
    | {
        password: string
        username: string
      }

  /**
   * Database to use in SurrealDB
   * @default 'payload'
   */
  database?: string

  /**
   * ID type to use
   * @default 'uuid'
   */
  idType?: 'custom' | 'ulid' | 'uuid'

  /**
   * Suffix for locale tables
   * @default '_locales'
   */
  localesSuffix?: string

  /**
   * Directory to store migration files
   */
  migrationDir?: string

  /**
   * Namespace to use in SurrealDB
   * @default 'payload'
   */
  namespace?: string

  /**
   * Suffix for relationship tables
   * @default '_rels'
   */
  relationshipsSuffix?: string

  /**
   * Connection URL for SurrealDB
   * @default 'http://127.0.0.1:8000/rpc'
   */
  url?: string

  /**
   * Suffix for version tables
   * @default '_v'
   */
  versionsSuffix?: string
}

export type MigrateUpArgs = {
  migration: Migration
  payload: Payload
}

export type MigrateDownArgs = {
  migration: Migration
  payload: Payload
}
