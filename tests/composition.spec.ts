import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import * as CommandCode from '../src/index.ts'
import { assemble } from './assemble.ts'
import { anthropicTextEvents, closeMockServers, mockServer, openAITextEvents } from './mock-server.ts'

const nativeFetch = globalThis.fetch
let context: Context | undefined
let root: string | undefined

function redirectOfficialRequests(baseURL: string): void {
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const original = input instanceof Request ? input : new Request(input, init)
    const requested = new URL(original.url)
    expect(requested.origin).toBe('https://api.commandcode.ai')
    return nativeFetch(new Request(baseURL + requested.pathname + requested.search, original))
  })
}

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
  await closeMockServers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

async function load(model: { id: string; defaultEffort?: string } = { id: 'gpt-5.6-luna' }, apiKey: string | null = 'test-key'): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-commandcode-comp-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    '- id: llm',
    "  name: 'test-llm-service'",
    '- id: llm-commandcode',
    "  name: 'dsh-llm-commandcode'",
    '  config:',
    '    models:',
    '      - id: ' + model.id,
    '        contextWindow: 1050000',
    ...model.defaultEffort === undefined ? [] : ['        defaultEffort: ' + model.defaultEffort],
    '',
  ].join('\n'))
  const ctx = new Context()
  context = ctx
  ctx.provide('credentials', {
    resolve: async () => apiKey === null ? undefined : { value: apiKey },
  } as never)
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      const modules = new Map<string, unknown>([['test-llm-service', LlmRuntime], ['dsh-llm-commandcode', CommandCode]])
      const module = modules.get(specifier)
      if (module === undefined) throw new Error('unexpected Loader import: ' + specifier)
      return module
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
  return ctx
}

describe('CommandCode composition', () => {
  it('registers the route and preserves exact context through LlmRuntime', async () => {
    const server = await mockServer([{ kind: 'sse', events: openAITextEvents }])
    redirectOfficialRequests(server.url)
    const ctx = await load()
    expect(ctx.llm.listProviders().map(provider => provider.id)).toEqual(['commandcode'])
    expect(ctx.llm.listConfigurableProviders().map(provider => provider.provider)).toEqual(['commandcode'])
    await expect(ctx.llm.resolveModelInfo('commandcode', 'gpt-5.6-luna')).resolves.toMatchObject({ context: { contextWindow: 1050000 }, reasoning: { defaultEffort: 'max' } })
    const result = await assemble(ctx, { model: 'gpt-5.6-luna', messages: [] })
    expect(result.finish).toEqual({ kind: 'stop' })
    expect(result.usage).toEqual({ inputTokens: 3, outputTokens: 1 })
    expect(server.paths).toEqual(['/provider/v1/chat/completions'])
    expect(server.requests[0]).toMatchObject({ reasoning_effort: 'max' })
    expect(server.headers[0]?.authorization).toBe('Bearer test-key')
  })


  it('dispatches Claude through Anthropic Messages with output_config effort', async () => {
    const server = await mockServer([{ kind: 'sse', events: anthropicTextEvents }])
    redirectOfficialRequests(server.url)
    const ctx = await load({
      id: 'claude-sonnet-4-6', defaultEffort: 'xhigh',
    })
    const result = await assemble(ctx, { model: 'claude-sonnet-4-6', messages: [] })
    expect(result.finish).toEqual({ kind: 'stop' })
    expect(server.paths).toEqual(['/provider/v1/messages'])
    expect(server.requests[0]).toMatchObject({
      output_config: { effort: 'xhigh' },
      thinking: { type: 'adaptive' },
    })
    expect(server.headers[0]?.['x-api-key']).toBe('test-key')
  })

  it('keeps the route registered and reports missing credentials at request time', async () => {
    const server = await mockServer([{ kind: 'sse', events: openAITextEvents }])
    const ctx = await load({ id: 'gpt-5.6-luna' }, null)
    expect(ctx.llm.listProviders().map(provider => provider.id)).toEqual(['commandcode'])
    const result = await assemble(ctx, { model: 'gpt-5.6-luna', messages: [] })
    expect(result.finish).toMatchObject({ kind: 'error', failure: { code: 'MISSING_CREDENTIAL' } })
    expect(server.requests).toHaveLength(0)
  })
})
