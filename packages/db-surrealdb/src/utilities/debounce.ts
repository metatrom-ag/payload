// Simple debounce for operations
const debounceMap = new Map<string, { resolve: (value: any) => void; timer: NodeJS.Timeout }[]>()

export function debounceOperation<T>(
  key: string,
  operation: () => Promise<T>,
  delay: number = 100,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const existing = debounceMap.get(key)

    if (existing) {
      // Clear existing timer
      clearTimeout(existing[0].timer)
      // Add this resolve to the queue
      existing.push({ resolve, timer: null as any })
    } else {
      debounceMap.set(key, [{ resolve, timer: null as any }])
    }

    const timer = setTimeout(async () => {
      const resolvers = debounceMap.get(key) || []
      debounceMap.delete(key)

      try {
        const result = await operation()
        resolvers.forEach(({ resolve }) => resolve(result))
      } catch (error) {
        resolvers.forEach(({ resolve: _resolve }) => reject(error as Error))
      }
    }, delay)

    // Update timer for all queued resolvers
    const queued = debounceMap.get(key)
    if (queued) {
      queued[0].timer = timer
    }
  })
}
