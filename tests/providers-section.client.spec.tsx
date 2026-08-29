// @vitest-environment jsdom

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProvidersSection } from '../src/client/ProvidersSection.tsx'

describe('ProvidersSection dynamic keyed providers', () => {
  it('renders every registered provider key, including later plugins', () => {
    const Component = ProvidersSection as unknown as (props: Record<string, unknown>) => ReturnType<typeof createElement>
    const html = renderToStaticMarkup(createElement(Component, {
      registeredKeys: ['llm-commandcode', 'llm-opencode-go', 'llm-future'],
      renderSlot: (_name: string, _props: object, options?: { entryKey?: string }) =>
        createElement('span', null, options?.entryKey),
    }))
    expect(html).toContain('llm-commandcode')
    expect(html).toContain('llm-opencode-go')
    expect(html).toContain('llm-future')
  })
})
