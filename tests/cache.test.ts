import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const MINUTE = 60_000
const START = Date.UTC(2026, 10, 11, 10, 0)

// Stands for the API: one response that read this many tokens from the cache.
function answerWith(cacheRead: number) {
  return async function* () {
    return {
      turnId: 't1',
      index: 0,
      answer: 'hi',
      toolUses: [],
      stopReason: 'end_turn' as const,
      usage: {
        model: 'claude-opus-5-5',
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: cacheRead,
        cache_creation_input_tokens: 0,
      },
    }
  }
}

// Starts the session and records every status line the mod sets.
async function start($: Engine, on: On) {
  const lines: (string | undefined)[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.status', (_, e) => {
    lines.push(e.text)

    return { value: undefined }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  return { latest: () => lines.at(-1) }
}

// Sends one model request of the main conversation through the mod.
async function step($: Engine) {
  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', messageCount: 1 })
  for await (const _ of stream) {
    // drain
  }
}

test('before any request the status line stays empty', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const status = await start($, on)

  await clock.advance(10_000)

  expect(status.latest()).toBeUndefined()
})

test('a request shows the time left at once, then counts down', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  on('turn.step', answerWith(5000))
  const status = await start($, on)

  await step($)
  expect(status.latest()).toBe('● 60m')

  await clock.advance(3 * MINUTE)
  expect(status.latest()).toBe('● 57m')

  await clock.advance(56 * MINUTE + 15_000)
  expect(status.latest()).toBe('○ 45s')

  await clock.advance(MINUTE)
  expect(status.latest()).toBe('○ expired')
})

test('the ring empties a quarter at a time', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  on('turn.step', answerWith(5000))
  const status = await start($, on)

  await step($)
  const seen: (string | undefined)[] = []
  for (const minutesLeft of [45, 30, 15, 5]) {
    await clock.set(START + (60 - minutesLeft) * MINUTE)
    seen.push(status.latest())
  }

  expect(seen).toEqual(['◕ 45m', '◑ 30m', '◔ 15m', '○ 5m'])
})

test('a five-minute lifetime reported by the engine counts down five minutes', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  on('turn.step', answerWith(5000))
  on('classic.PreModelSwitch', () => ({}))
  const status = await start($, on)

  await $.classic.PreModelSwitch({
    from_model: 'claude-opus-5-5',
    to_model: 'claude-sonnet-5-5',
    requested_model: 'sonnet',
    source: 'command',
    context_tokens: 5000,
    prompt_cache_warm: true,
    cache_ttl: '5m',
    estimated_cache_write_usd: 0.01,
    pricing: 'catalog',
  })
  await step($)
  await clock.advance(MINUTE)

  expect(status.latest()).toBe('◕ 4m')
})

test('a request with no cache use says none', async ($, on) => {
  mock.clock(on, { now: START })
  on('turn.step', answerWith(0))
  const status = await start($, on)

  await step($)

  expect(status.latest()).toBe('◌ none')
})
