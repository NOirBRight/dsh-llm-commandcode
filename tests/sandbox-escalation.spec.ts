import { describe, expect, it } from 'vitest'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import { CommandCodeAdapter, narrowCommandCodeEscalationSchemas } from '../src/adapter.ts'
import { resolveAdapterOptions } from '../src/index.ts'

function baseOptions(mode: string): GenerateOptions {
  return {
    provider: 'commandcode',
    model: 'gpt-5.6-luna',
    messages: [],
    system: `Current DSH file policy: ${mode}.`,
    tools: [
      {
        name: 'write',
        description: 'write',
        parameters: {
          type: 'object',
          properties: {
            file_path: { type: 'string' },
            sandbox_permissions: { type: 'string', enum: ['workspace-write', 'danger-full-access'] },
            justification: { type: 'string' },
          },
          required: ['file_path', 'sandbox_permissions', 'justification'],
        },
      },
    ],
  } as unknown as GenerateOptions
}

describe('narrowCommandCodeEscalationSchemas', () => {
  it('reads the current mode from a DSH context-injection message', () => {
    const request = baseOptions('unknown')
    ;(request as any).system = 'You are a coding agent.'
    ;(request as any).messages = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Current DSH file policy: workspace-write. Writes are confined.' }],
      },
    ]
    const narrowed = narrowCommandCodeEscalationSchemas(request as never)
    expect((narrowed.tools?.[0]?.parameters as any).properties.sandbox_permissions.enum).toEqual(['danger-full-access'])
  })

  it('scans both system and messages (messages-first)', () => {
    const request = baseOptions('workspace-write')
    ;(request as any).messages = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Current DSH file policy: read-only. Some other.' }],
      },
    ]
    const narrowed = narrowCommandCodeEscalationSchemas(request as never)
    // messages-first: read-only from messages wins, so both modes remain
    expect((narrowed.tools?.[0]?.parameters as any).properties.sandbox_permissions.enum).toEqual(['workspace-write', 'danger-full-access'])
  })

  it('regression: stale system workspace-write overridden by latest message danger-full-access', () => {
    const request = baseOptions('workspace-write')
    request.messages = [
      { role: 'user', content: [{ type: 'text', text: 'Current DSH file policy: danger-full-access.' }] } as any,
    ]
    const narrowed = narrowCommandCodeEscalationSchemas(request as never)
    const params = (narrowed.tools?.[0]?.parameters as any)
    expect(params.properties.sandbox_permissions).toBeUndefined()
    expect(params.properties.justification).toBeUndefined()
    expect(params.required).toEqual(['file_path'])
  })

  it('picks newest message when multiple injections exist', () => {
    const request = baseOptions('workspace-write')
    request.messages = [
      { role: 'user', content: [{ type: 'text', text: 'Current DSH file policy: read-only.' }] } as any,
      { role: 'user', content: [{ type: 'text', text: 'Current DSH file policy: danger-full-access.' }] } as any,
    ]
    const narrowed = narrowCommandCodeEscalationSchemas(request as never)
    const params = (narrowed.tools?.[0]?.parameters as any)
    expect(params.properties.sandbox_permissions).toBeUndefined()
    expect(params.required).toEqual(['file_path'])
  })

  it('offers only strictly wider modes to a workspace-write session', () => {
    const original = baseOptions('workspace-write')
    const narrowed = narrowCommandCodeEscalationSchemas(original as never)
    expect((narrowed.tools?.[0]?.parameters as any).properties.sandbox_permissions.enum).toEqual(['danger-full-access'])
    expect((narrowed.tools?.[0]?.parameters as any).properties.justification).toBeDefined()
    // immutability: original unchanged
    expect((original.tools?.[0]?.parameters as any).properties.sandbox_permissions.enum).toEqual(['workspace-write', 'danger-full-access'])
  })

  it('removes impossible escalation fields from a danger-full-access session', () => {
    const narrowed = narrowCommandCodeEscalationSchemas(baseOptions('danger-full-access') as never)
    const params = narrowed.tools?.[0]?.parameters as any
    expect(params.properties.sandbox_permissions).toBeUndefined()
    expect(params.properties.justification).toBeUndefined()
    expect(params.required).toEqual(['file_path'])
    // also ensures file_path retained
    expect(params.properties.file_path).toBeDefined()
  })

  it('keeps both wider modes available to a read-only session', () => {
    const narrowed = narrowCommandCodeEscalationSchemas(baseOptions('read-only') as never)
    expect((narrowed.tools?.[0]?.parameters as any).properties.sandbox_permissions.enum).toEqual(['workspace-write', 'danger-full-access'])
  })

  it('returns original reference when no narrowing needed', () => {
    const original = baseOptions('read-only')
    const narrowed = narrowCommandCodeEscalationSchemas(original as never)
    expect(narrowed).toBe(original)
  })

  it('does not mutate original tool parameters (immutability)', () => {
    const original = baseOptions('danger-full-access')
    const snapshot = JSON.stringify(original)
    const narrowed = narrowCommandCodeEscalationSchemas(original as never)
    expect(JSON.stringify(original)).toBe(snapshot)
    expect(narrowed).not.toBe(original)
    // ensure deep clone of properties
    expect((original.tools?.[0]?.parameters as any).properties.sandbox_permissions).toBeDefined()
  })

  it('leaves tools without sandbox_permissions untouched', () => {
    const opts: GenerateOptions = {
      provider: 'commandcode',
      model: 'm',
      messages: [],
      system: 'Current DSH file policy: workspace-write.',
      tools: [{ name: 'read', description: 'r', parameters: { type: 'object', properties: { file_path: { type: 'string' } } } }],
    } as unknown as GenerateOptions
    const narrowed = narrowCommandCodeEscalationSchemas(opts as never)
    expect(narrowed).toBe(opts)
  })

  it('handles missing tools gracefully', () => {
    const opts: GenerateOptions = {
      provider: 'commandcode',
      model: 'm',
      messages: [],
      system: 'Current DSH file policy: workspace-write.',
    } as unknown as GenerateOptions
    expect(narrowCommandCodeEscalationSchemas(opts as never)).toBe(opts)
  })

  it('handles system undefined but messages contain policy', () => {
    const opts: GenerateOptions = {
      provider: 'commandcode',
      model: 'm',
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'Current DSH file policy: danger-full-access.' }] } as any,
      ],
      tools: [
        {
          name: 'write',
          description: 'w',
          parameters: {
            type: 'object',
            properties: {
              sandbox_permissions: { type: 'string', enum: ['workspace-write', 'danger-full-access'] },
              justification: { type: 'string' },
            },
          },
        },
      ],
    } as unknown as GenerateOptions
    const narrowed = narrowCommandCodeEscalationSchemas(opts as never)
    expect((narrowed.tools?.[0]?.parameters as any).properties.sandbox_permissions).toBeUndefined()
  })
})

describe('CommandCodeAdapter sandbox filtering (direct and prepared)', () => {
  function connection() {
    return resolveAdapterOptions({
      apiKeyEnv: 'COMMANDCODE_API_KEY',
      models: [{ id: 'gpt-5.6-luna', contextWindow: 1_000_000 }],
    })
  }

  it('filters on direct stream()', async () => {
    const adapter = new CommandCodeAdapter({ options: connection, resolveApiKey: async () => 'key' })
    let captured: GenerateOptions | undefined
    const fake = {
      providerInfo: () => ({ id: 'commandcode', name: 'Command Code' }),
      providerRetryPolicy: () => undefined,
      listModels: async () => [],
      resolveModel: async () => ({ provider: 'commandcode', id: 'gpt-5.6-luna', name: 'gpt-5.6-luna' }) as any,
      stream: async function* (opts: GenerateOptions) {
        captured = opts
        yield { type: 'text-delta', text: 'hi', index: 0 } as any
        yield { type: 'finish', reason: { kind: 'stop' } } as any
      },
      prepareCall: async () => { throw new Error('unreachable') },
    } as any
    ;(adapter as any).snapshot = { options: connection(), adapter: fake }
    // stub current to return fake
    ;(adapter as any).current = () => fake

    const opts = baseOptions('workspace-write')
    for await (const _ of adapter.stream(opts as unknown as GenerateOptions)) {}
    expect(captured).toBeDefined()
    expect((captured!.tools?.[0]?.parameters as any).properties.sandbox_permissions.enum).toEqual(['danger-full-access'])
    // immutability: original opts unchanged
    expect((opts.tools?.[0]?.parameters as any).properties.sandbox_permissions.enum).toEqual(['workspace-write', 'danger-full-access'])
  })

  it('filters on prepared stream()', async () => {
    const adapter = new CommandCodeAdapter({ options: connection, resolveApiKey: async () => 'key' })
    let captured: GenerateOptions | undefined
    const fakePreparedStream = async function* (opts: GenerateOptions) {
      captured = opts
      yield { type: 'text-delta', text: 'hi', index: 0 } as any
      yield { type: 'finish', reason: { kind: 'stop' } } as any
    }
    const fake = {
      providerInfo: () => ({ id: 'commandcode', name: 'Command Code' }),
      providerRetryPolicy: () => undefined,
      listModels: async () => [],
      resolveModel: async () => ({ provider: 'commandcode', id: 'gpt-5.6-luna', name: 'gpt-5.6-luna' }) as any,
      stream: async function* () {},
      prepareCall: async () => ({
        model: { provider: 'commandcode', id: 'gpt-5.6-luna', name: 'gpt-5.6-luna' },
        stream: fakePreparedStream,
      }),
    } as any
    ;(adapter as any).snapshot = { options: connection(), adapter: fake }
    ;(adapter as any).current = () => fake

    const prepared = await adapter.prepareCall('commandcode', 'gpt-5.6-luna')
    const opts = baseOptions('danger-full-access')
    for await (const _ of prepared.stream(opts as unknown as GenerateOptions)) {}
    expect(captured).toBeDefined()
    const params = (captured!.tools?.[0]?.parameters as any)
    expect(params.properties.sandbox_permissions).toBeUndefined()
    expect(params.properties.justification).toBeUndefined()
  })
})
