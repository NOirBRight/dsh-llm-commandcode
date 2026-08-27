import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const base = process.argv[2] ?? 'http://127.0.0.1:3080/'
const html = await (await fetch(base)).text()
const marker = 'globalThis["__DSH_BOOT__"] = '
const start = html.indexOf(marker)
const end = start < 0 ? -1 : html.indexOf('</script>', start + marker.length)
if (start < 0 || end < 0) throw new Error('missing DSH boot payload')
const boot = JSON.parse(html.slice(start + marker.length, end).trim().replace(/;$/u, ''))
const entries = (boot.entries ?? []).filter(entry => typeof entry?.id === 'string' && entry.id.startsWith('dsh-llm-'))
if (!entries.some(entry => entry.id === 'dsh-llm-commandcode')) throw new Error('boot payload does not include dsh-llm-commandcode')

const profilePath = join(homedir(), '.dsh/profiles/web/package.json')
if (!existsSync(profilePath)) throw new Error('missing production profile at ' + profilePath)
const profile = JSON.parse(readFileSync(profilePath, 'utf8'))
const deps = Object.keys(profile.dependencies ?? {})
const bundles = profile.dsh?.profile?.bundles ?? []
const pins = Object.values(profile.dependencies ?? {})
const hasCompatPin = typeof pins.find(value => typeof value === 'string' && value.includes('dsh-llm-commandcode')) === 'string' || deps.includes('dsh-llm-commandcode')
if (!hasCompatPin || !bundles.includes('dsh-llm-commandcode')) {
  throw new Error('production profile does not pin dsh-llm-commandcode as a bundle')
}
const bootIds = new Set(entries.map(entry => entry.id))
const missingFromBoot = bundles.filter(name => name.startsWith('dsh-llm-') && !bootIds.has(name))
if (missingFromBoot.length > 0) throw new Error('profile bundles missing from boot: ' + missingFromBoot.join(', '))

const incompatible = []
let commandCodeRegistersItem = false
for (const entry of entries) {
  const asset = await (await fetch(new URL(entry.url, base))).text()
  if (entry.id === 'dsh-llm-commandcode') {
    commandCodeRegistersItem = asset.includes('settings.provider.item') && asset.includes('llm-commandcode')
  }
  const canOwnSection = asset.includes('settings.section') && asset.includes('settings.provider.item')
  const canRenderCommandCode = asset.includes('llm-commandcode') || (asset.includes('bindProvidersSection') && asset.includes('orderedProviderItemKeys'))
  if (canOwnSection && !canRenderCommandCode) incompatible.push(entry.id)
}
if (!commandCodeRegistersItem) throw new Error('Command Code client asset does not register settings.provider.item as llm-commandcode')
if (incompatible.length > 0) throw new Error('shared provider section can hide Command Code when owned by: ' + incompatible.join(', '))
console.log('all active shared-provider owners can render llm-commandcode (' + entries.map(entry => entry.id).join(', ') + ')')
