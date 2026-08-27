import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const CLIENT_EXTERNALS = new Set([
  'react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-api-remotes/client', '@deepseek-ai/dsh-client-connection/client',
  '@deepseek-ai/dsh-client-locale/client', '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-settings/client',
  '@deepseek-ai/dsh-client-ui-layout/client', '@deepseek-ai/dsh-client-ui-slots',
])

describe('Command Code client bundle', () => {
  it('only requires web module-table externals', () => {
    const code = readFileSync(resolve('lib/client.js'), 'utf8')
    const required = [...code.matchAll(/require\("([^"]+)"\)/gu)].map(match => match[1] as string)
    expect(required.length).toBeGreaterThan(0)
    expect(required.filter(specifier => !CLIENT_EXTERNALS.has(specifier))).toEqual([])
  })
})
