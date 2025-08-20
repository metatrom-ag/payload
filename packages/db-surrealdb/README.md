# @payloadcms/db-surrealdb

Official SurrealDB database adapter for [Payload CMS](https://payloadcms.com).

## Installation

```bash
npm install @payloadcms/db-surrealdb
# or
yarn add @payloadcms/db-surrealdb
# or
pnpm add @payloadcms/db-surrealdb
```

## Prerequisites

- SurrealDB server running (version 1.0 or higher)
- Node.js 18+
- Payload CMS 3.0+

## Quick Start

### 1. Start SurrealDB

```bash
# Using Docker
docker run --rm -p 8000:8000 surrealdb/surrealdb:latest start --user root --pass root memory

# Or install locally
curl -sSf https://install.surrealdb.com | sh
surreal start --user root --pass root memory
```

### 2. Configure Payload

```typescript
import { buildConfig } from 'payload'
import { surrealDBAdapter } from '@payloadcms/db-surrealdb'

export default buildConfig({
  db: surrealDBAdapter({
    url: 'http://127.0.0.1:8000/rpc',
    namespace: 'payload',
    database: 'payload',
    auth: {
      username: 'root',
      password: 'root',
    },
  }),
  // ... rest of your config
})
```

## Configuration Options

| Option                | Type                           | Default                       | Description                           |
| --------------------- | ------------------------------ | ----------------------------- | ------------------------------------- |
| `url`                 | `string`                       | `'http://127.0.0.1:8000/rpc'` | SurrealDB connection URL              |
| `namespace`           | `string`                       | `'payload'`                   | SurrealDB namespace                   |
| `database`            | `string`                       | `'payload'`                   | SurrealDB database name               |
| `auth`                | `object`                       | -                             | Authentication credentials            |
| `allowIDOnCreate`     | `boolean`                      | `false`                       | Allow custom IDs on document creation |
| `idType`              | `'uuid' \| 'ulid' \| 'custom'` | `'uuid'`                      | ID generation strategy                |
| `migrationDir`        | `string`                       | `'./migrations'`              | Directory for migration files         |
| `relationshipsSuffix` | `string`                       | `'_rels'`                     | Suffix for relationship tables        |
| `versionsSuffix`      | `string`                       | `'_v'`                        | Suffix for version tables             |
| `localesSuffix`       | `string`                       | `'_locales'`                  | Suffix for locale tables              |
| `timeout`             | `number`                       | `30000`                       | Connection timeout in milliseconds    |
| `debug`               | `boolean`                      | `false`                       | Enable debug logging                  |

## Authentication Options

### Basic Authentication

```typescript
auth: {
  username: 'root',
  password: 'root'
}
```

### Token Authentication

```typescript
auth: {
  namespace: 'payload',
  database: 'payload',
  access: 'user',
  variables: {
    email: 'user@example.com',
    pass: 'password'
  }
}
```

## Features

### Multi-Model Support

SurrealDB's multi-model architecture allows you to leverage:

- **Document storage** for collections and globals
- **Graph relationships** for efficient relationship queries
- **Full-text search** capabilities
- **Geospatial** queries for location-based data
- **Time-series** data handling

### Schema Management

The adapter automatically creates and manages SurrealDB schemas based on your Payload configuration:

```typescript
// Payload collection config
{
  slug: 'posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'author', type: 'relationship', relationTo: 'users' }
  ]
}

// Generates SurrealDB schema:
// - Table: posts
// - Table: posts_author_rels (for relationships)
// - Table: posts_v (if versions enabled)
```

### Relationships

Relationships are handled using SurrealDB's graph capabilities:

```typescript
// One-to-many relationship
{
  name: 'categories',
  type: 'relationship',
  relationTo: 'categories',
  hasMany: true
}

// Creates edge table: collection_categories_rels
```

### Versioning

Full support for Payload's versioning system:

```typescript
{
  slug: 'pages',
  versions: {
    drafts: true,
    maxPerDoc: 10
  }
}
```

### Transactions

While SurrealDB doesn't have traditional ACID transactions, the adapter provides transaction-like behavior:

```typescript
const transaction = await payload.db.beginTransaction()
try {
  // Perform operations
  await payload.db.commitTransaction(transaction)
} catch (error) {
  await payload.db.rollbackTransaction(transaction)
}
```

## Advanced Usage

### Custom Queries

Access the SurrealDB client directly:

```typescript
const db = payload.db as SurrealDBAdapter
const results = await db.client.query('SELECT * FROM posts WHERE published = true')
```

### Geospatial Queries

```typescript
{
  name: 'location',
  type: 'point',
  // Automatically stored as SurrealDB geo point
}

// Query nearby locations
where: {
  location: {
    near: {
      coordinates: [longitude, latitude],
      maxDistance: 1000 // meters
    }
  }
}
```

### Full-Text Search

```typescript
where: {
  title: {
    contains: 'search term'
  }
}
```

## Migration System

Create migrations:

```bash
payload migrate:create --name add-index
```

Run migrations:

```bash
payload migrate
```

## Performance Considerations

1. **Indexes**: SurrealDB automatically creates indexes for primary keys and unique fields
2. **Relationships**: Use graph traversal for complex relationship queries
3. **Caching**: Implement application-level caching for frequently accessed data
4. **Connection Pooling**: The adapter maintains a persistent connection

## Limitations

- No traditional ACID transactions (compensating transactions pattern recommended)
- Schema changes require migrations
- Some Payload features may have limited support in initial versions

## Development

### Running Tests

```bash
pnpm test
```

### Building

```bash
pnpm build
```

## Troubleshooting

### Connection Issues

```typescript
// Enable debug mode
surrealDBAdapter({
  debug: true,
  // ... other options
})
```

### Schema Sync Issues

```bash
# Reset database and rebuild schema
payload migrate:fresh --force-accept-warning
```

## Contributing

Contributions are welcome! Please read our [contributing guidelines](../../CONTRIBUTING.md) before submitting PRs.

## License

MIT
