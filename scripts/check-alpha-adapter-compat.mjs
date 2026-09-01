#!/usr/bin/env node

/** Verify the built adapter provides the method called directly by an alpha1 Host. */
const adapterModule = await import(new URL('../lib/index.js', import.meta.url).href)
const Adapter = adapterModule.CommandCodeAdapter
if (typeof Adapter !== 'function') throw new Error('CommandCodeAdapter is not exported from lib/index.js')
if (!Object.hasOwn(Adapter.prototype, 'imageRequestPricing')) {
  throw new Error('CommandCodeAdapter must own imageRequestPricing')
}
const adapter = Object.create(Adapter.prototype)
const pricing = adapter.imageRequestPricing('commandcode', 'gpt-5.6-luna')
if (pricing !== undefined) throw new Error('neutral imageRequestPricing must return undefined')
console.log('CommandCodeAdapter alpha1 adapter compatibility passed')
