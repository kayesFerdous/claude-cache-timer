/** The main conversation's latest model request, as the cache timer saw it. */
export type CacheRequest = {
  /** When the request was sent, in milliseconds since the epoch. */
  sentAt: number
  /** Whether the request read from or wrote to the prompt cache. */
  isCached: boolean
}

/** How long the prompt cache lives after each request that uses it. */
export type CacheTtl = '5m' | '1h'

declare module 'claude-code' {
  interface PluginState {
    cache: {
      last: CacheRequest | null
      ttl: CacheTtl | null
    }
  }
}
