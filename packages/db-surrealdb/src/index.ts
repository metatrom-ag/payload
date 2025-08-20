import type { DatabaseAdapterObj, Payload } from 'payload'

import path from 'path'
import { createDatabaseAdapter, defaultBeginTransaction } from 'payload'
import { Surreal } from 'surrealdb'
import { fileURLToPath } from 'url'

import type { Args, SurrealDBAdapter } from './types.js'

import { connect } from './connect.js'
import { count } from './count.js'
import { countGlobalVersions } from './countGlobalVersions.js'
import { countVersions } from './countVersions.js'
import { create } from './create.js'
import { createGlobal } from './createGlobal.js'
import { createGlobalVersion } from './createGlobalVersion.js'
import { createMigration } from './createMigration.js'
import { createVersion } from './createVersion.js'
import { deleteMany } from './deleteMany.js'
import { deleteOne } from './deleteOne.js'
import { deleteVersions } from './deleteVersions.js'
import { destroy } from './destroy.js'
import { find } from './find.js'
import { findDistinct } from './findDistinct.js'
import { findGlobal } from './findGlobal.js'
import { findGlobalVersions } from './findGlobalVersions.js'
import { findOne } from './findOne.js'
import { findVersions } from './findVersions.js'
import { init } from './init.js'
import { migrateFresh } from './migrateFresh.js'
import { queryDrafts } from './queryDrafts.js'
import { beginTransaction } from './transactions/beginTransaction.js'
import { commitTransaction } from './transactions/commitTransaction.js'
import { rollbackTransaction } from './transactions/rollbackTransaction.js'
import { updateGlobal } from './updateGlobal.js'
import { updateGlobalVersion } from './updateGlobalVersion.js'
import { updateJobs } from './updateJobs.js'
import { updateMany } from './updateMany.js'
import { updateOne } from './updateOne.js'
import { updateVersion } from './updateVersion.js'
import { upsert } from './upsert.js'

const _filename = fileURLToPath(import.meta.url)

export function surrealDBAdapter(args: Args = {}): DatabaseAdapterObj<SurrealDBAdapter> {
  const {
    _debug = false,
    _timeout = 30000,
    allowIDOnCreate = false,
    auth,
    database = 'payload',
    idType = 'uuid',
    localesSuffix = '_locales',
    migrationDir,
    namespace = 'payload',
    relationshipsSuffix = '_rels',
    url = 'http://127.0.0.1:8000/rpc',
    versionsSuffix = '_v',
  } = args

  const payloadIDType = idType === 'custom' ? 'text' : 'text' // SurrealDB uses string IDs

  function adapter({ payload }: { payload: Payload }) {
    const client = new Surreal()

    let resolveInitializing: () => void
    let rejectInitializing: (error: Error) => void

    const initializing = new Promise<void>((res, rej) => {
      resolveInitializing = res
      rejectInitializing = rej

      // Connect immediately when adapter is created
      client
        .connect(url)
        .then(() => {
          // Sign in as root user first if credentials provided
          if (auth && 'username' in auth && 'password' in auth) {
            return client.signin({
              password: auth.password,
              username: auth.username,
            })
          }
        })
        .then(() => {
          // Then use the namespace and database
          return client.use({ database, namespace })
        })
        .then(() => {
          payload.logger.info('Successfully connected to SurrealDB during initialization')
        })
        .catch((error) => {
          payload.logger.error({
            err: error,
            msg: 'Failed to connect to SurrealDB during initialization',
          })
          rej(error as Error)
        })
    })

    const finalMigrationDir = migrationDir || path.resolve(process.cwd(), 'migrations')

    const adapterConfig = {
      auth,
      database,
      debug: _debug,
      namespace,
      url,
    }

    return createDatabaseAdapter<SurrealDBAdapter>({
      name: 'surrealdb',
      allowIDOnCreate,
      client,
      collections: {},
      defaultIDType: payloadIDType,
      globals: {},
      idType,
      initializing,
      localesSuffix,
      migrationDir: finalMigrationDir,
      namespaceDb: { database, namespace },
      relationshipsSuffix,
      versions: {},
      versionsSuffix,
      // Store config for connect method
      ...adapterConfig,

      // Connection methods
      connect,
      destroy,
      init,

      // Transaction methods
      beginTransaction: args.auth ? beginTransaction : defaultBeginTransaction(),
      commitTransaction,
      rollbackTransaction,

      // CRUD operations
      create,
      deleteMany,
      deleteOne,
      find,
      findDistinct,
      findOne,
      updateMany,
      updateOne,
      upsert,

      // Count operations
      count,

      // Global operations
      createGlobal,
      findGlobal,
      updateGlobal,

      // Version operations
      countVersions,
      createVersion,
      deleteVersions,
      findVersions,
      updateVersion,

      // Global version operations
      countGlobalVersions,
      createGlobalVersion,
      findGlobalVersions,
      updateGlobalVersion,

      // Query operations
      queryDrafts,

      // Migration operations
      createMigration,
      migrate: () => {
        // TODO: Implement migrations
        payload.logger.info('SurrealDB migrations not yet implemented')
        return Promise.resolve()
      },
      migrateDown: () => {
        payload.logger.info('SurrealDB migrate down not yet implemented')
        return Promise.resolve()
      },
      migrateFresh,
      migrateRefresh: () => {
        payload.logger.info('SurrealDB migrate refresh not yet implemented')
        return Promise.resolve()
      },
      migrateReset: () => {
        payload.logger.info('SurrealDB migrate reset not yet implemented')
        return Promise.resolve()
      },
      migrateStatus: () => {
        payload.logger.info('SurrealDB migrate status not yet implemented')
        return Promise.resolve()
      },

      // Jobs
      updateJobs,

      // Adapter metadata
      packageName: '@payloadcms/db-surrealdb',
      payload,

      // Session management
      sessions: {},

      // Internal properties
      rejectInitializing,
      resolveInitializing,
    } as SurrealDBAdapter)
  }

  return {
    name: 'surrealdb',
    allowIDOnCreate,
    defaultIDType: payloadIDType,
    init: adapter,
  }
}

export type {
  Args as SurrealDBAdapterArgs,
  MigrateDownArgs,
  MigrateUpArgs,
  SurrealDBAdapter,
} from './types.js'
