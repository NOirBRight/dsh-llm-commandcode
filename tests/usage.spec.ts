import { describe, expect, it, vi } from 'vitest'
import { parseCommandCodeUsageBodies, readCommandCodeUsage } from '../src/usage.ts'

describe('Command Code account quota', () => {
  it('parses credits, windows, identity, plan, and summary', () => {
    const result = parseCommandCodeUsageBodies({
      now: '2026-08-26T00:00:00.000Z',
      whoami: { user: { name: 'A User', userName: 'a-user' } },
      credits: {
        credits: { monthlyCredits: 15, purchasedCredits: 4, freeCredits: 1 },
        windowLimits: {
          fiveHour: { used: 3, cap: 10, exceeded: false, resetAt: 1_800_000_000 },
          weekly: { used: 8, cap: 20, resetAt: '2026-08-30T00:00:00Z' },
        },
      },
      subscription: { data: { planId: 'individual-provider', status: 'active', currentPeriodEnd: 1_800_000_000 } },
      summary: { totalCost: 1.25, totalTokensIn: 100, totalTokensOut: 50 },
      failures: ['one optional endpoint failed'],
    })
    expect(result.account?.userName).toBe('a-user')
    expect(result.credits?.monthlyCredits).toBe(15)
    expect(result.credits?.fiveHour?.resetAt).toBe('2027-01-15T08:00:00.000Z')
    expect(result.plan?.name).toBe('Provider')
    expect(result.summary?.totalCost).toBe(1.25)
    expect(result.failures).toEqual(['one optional endpoint failed'])
  })

  it('follows the official CLI account endpoint sequence and keeps partial data', async () => {
    const seen: string[] = []
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      seen.push(url)
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer key')
      if (url.endsWith('/alpha/whoami')) return new Response(JSON.stringify({ user: { userName: 'me' }, org: { id: 'org-1' } }))
      if (url.includes('/alpha/billing/credits?orgId=org-1')) return new Response(JSON.stringify({ credits: { monthlyCredits: 10 }, windowLimits: {} }))
      if (url.includes('/alpha/billing/subscriptions?orgId=org-1')) return new Response(JSON.stringify({ data: { planId: 'individual-provider', currentPeriodStart: '2026-08-01T00:00:00Z' } }))
      if (url.includes('/alpha/usage/summary?orgId=org-1')) return new Response('', { status: 503 })
      throw new Error('unexpected URL ' + url)
    })
    const result = await readCommandCodeUsage({}, async () => 'key', fetchImpl)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.usage.account?.userName).toBe('me')
      expect(result.usage.credits?.monthlyCredits).toBe(10)
      expect(result.usage.failures).toContain('/alpha/usage/summary?orgId=org-1&since=2026-08-01T00%3A00%3A00.000Z: HTTP 503')
    }
    expect(seen).toHaveLength(4)
  })

  it('returns unsupported when every alpha account endpoint is absent', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 }))
    await expect(readCommandCodeUsage({}, async () => 'key', fetchImpl)).resolves.toEqual({ status: 'unsupported' })
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('ignores legacy endpoint/key fields and uses fixed Host services', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input).startsWith('https://api.commandcode.ai/alpha/')).toBe(true)
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer credential-key')
      return new Response('', { status: 404 })
    })
    const legacy = { accountBaseURL: 'https://evil.example', apiKey: 'evil-key' } as unknown as Parameters<typeof readCommandCodeUsage>[0]
    await expect(readCommandCodeUsage(legacy, async () => 'credential-key', fetchImpl)).resolves.toEqual({ status: 'unsupported' })
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('requires a key before making any account request', async () => {
    const fetchImpl = vi.fn()
    await expect(readCommandCodeUsage({}, async () => undefined, fetchImpl)).rejects.toMatchObject({ code: 'MISSING_CREDENTIAL' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
