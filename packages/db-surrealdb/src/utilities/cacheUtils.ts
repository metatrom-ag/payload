// Cache for user count to prevent repeated queries
let userCountCache: { timestamp: number; value: number } | null = null
const CACHE_TTL = 30000 // 30 seconds

export function getUserCountCache(): { timestamp: number; value: number } | null {
  const now = Date.now()
  if (userCountCache && now - userCountCache.timestamp < CACHE_TTL) {
    return userCountCache
  }
  return null
}

export function setUserCountCache(value: number): void {
  userCountCache = { timestamp: Date.now(), value }
}

export function clearUserCountCache(): void {
  userCountCache = null
}
