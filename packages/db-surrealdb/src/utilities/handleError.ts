interface HandleErrorArgs {
  collection?: string
  error: any
  operation: string
}

export const handleError = ({ collection, error, operation }: HandleErrorArgs): void => {
  let message = `SurrealDB ${operation} error`

  if (collection) {
    message += ` for collection "${collection}"`
  }

  // Log the error details

  // Check for specific SurrealDB errors
  if (error?.message?.includes('already exists')) {
    const duplicateError = new Error(`Document already exists`)
    ;(duplicateError as any).code = 11000 // MongoDB duplicate key error code for compatibility
    throw duplicateError
  }

  if (error?.message?.includes('not found')) {
    const notFoundError = new Error(`Document not found`)
    ;(notFoundError as any).status = 404
    throw notFoundError
  }

  if (error?.message?.includes('permission')) {
    const permissionError = new Error(`Permission denied`)
    ;(permissionError as any).status = 403
    throw permissionError
  }

  // Re-throw the original error if it doesn't match known patterns
  throw error
}
