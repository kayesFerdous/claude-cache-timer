import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CacheRequest, CacheTtl } from '../types'

// The latest main-conversation request, and the lifetime the engine reported
// (it says so only on a model switch). Both outlive a reload of the mod.
const last = atom({ plugin: 'cache', key: 'last' } as const, null)
const reportedTtl = atom({ plugin: 'cache', key: 'ttl' } as const, null)

const MINUTE = 60_000
const LIFETIME_MS: Record<CacheTtl, number> = { '5m': 5 * MINUTE, '1h': 60 * MINUTE }
// How often the line is refreshed so the countdown moves between messages.
const TICK_MS = 5_000

export const register: Register = (on, options) => {
  const configuredTtl: CacheTtl = options.ttl === '5m' ? '5m' : '1h'

  on('session.start', ($, e, next) => {
    $.clock.every(TICK_MS, () => void showTimeLeft($, configuredTtl))

    return next(e)
  })

  // Every request of the main conversation reads or writes the cache, and that
  // restarts the cache's lifetime from the moment the request is sent.
  // Subagents keep caches of their own, so they are left out.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) {
      return yield* next(e)
    }

    const sentAt = await $.clock.now()
    const response = yield* next(e)

    if (response.usage !== null) {
      const { cache_read_input_tokens, cache_creation_input_tokens } = response.usage
      const isCached = cache_read_input_tokens + cache_creation_input_tokens > 0
      await update($, last, () => ({ sentAt, isCached }))
      await showTimeLeft($, configuredTtl)
    }

    return response
  })

  // A model switch is where the engine says which lifetime it uses.
  on('classic.PreModelSwitch', async ($, e, next) => {
    await update($, reportedTtl, () => e.cache_ttl)

    return next(e)
  })
}

// The status line under the input box. The desktop app shows the mod's name,
// "cache", in front of it, so the line itself is just the ring and the time left.
async function showTimeLeft($: EngineInterface, configuredTtl: CacheTtl) {
  const request = await read($, last)
  const ttl = (await read($, reportedTtl)) ?? configuredTtl
  const now = await $.clock.now()
  $.ui.status(request === null ? undefined : timeLeft(request, LIFETIME_MS[ttl], now))
}

// The line can only hold text, so the ring is a character that empties as
// the cache ages: full, three quarters, half, a quarter, then empty.
const RING = ['○', '◔', '◑', '◕', '●'] as const

// "◕ 42m" while a minute or more is left (rounded up, so it never reads 0m),
// then "○ 45s"; "○ expired" after, and "◌ none" when the last request used no cache.
function timeLeft(request: CacheRequest, lifetimeMs: number, now: number): string {
  if (!request.isCached) {
    return '◌ none'
  }

  const left = request.sentAt + lifetimeMs - now

  if (left <= 0) {
    return '○ expired'
  }

  const ring = RING[Math.round((left / lifetimeMs) * 4)] ?? '●'
  const time = left >= MINUTE ? `${Math.ceil(left / MINUTE)}m` : `${Math.ceil(left / 1000)}s`

  return `${ring} ${time}`
}
