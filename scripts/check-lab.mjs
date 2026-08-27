const LAB_URL = 'http://127.0.0.1:3082/'

const response = await fetch(LAB_URL)
if (!response.ok) throw new Error('lab GUI returned HTTP ' + String(response.status))
const html = await response.text()
const marker = 'globalThis["__DSH_BOOT__"] = '
const start = html.indexOf(marker)
const end = start < 0 ? -1 : html.indexOf('</script>', start + marker.length)
if (start < 0 || end < 0) throw new Error('lab GUI has no DSH boot payload')
const serialized = html.slice(start + marker.length, end).trim().replace(/;$/u, '')
const boot = JSON.parse(serialized)
const entry = boot.entries?.find(candidate => candidate?.id === 'dsh-llm-commandcode')
if (entry === undefined || typeof entry.url !== 'string') throw new Error('lab GUI did not load dsh-llm-commandcode')

const assetResponse = await fetch(new URL(entry.url, LAB_URL))
if (!assetResponse.ok) throw new Error('Command Code client asset returned HTTP ' + String(assetResponse.status))
const asset = await assetResponse.text()
for (const required of [
  'settings.provider.item',
  'commandcode-model-picker',
  '0 0 137 137',
  'Fixed official Command Code Provider API endpoint.',
  'Default effort',
]) {
  if (!asset.includes(required)) throw new Error('Command Code client asset is missing marker: ' + required)
}
for (const forbidden of ['Account API URL', 'Image input', 'Provider default']) {
  if (asset.includes(forbidden)) throw new Error('Command Code client asset contains forbidden copy: ' + forbidden)
}
console.log('lab GUI smoke passed at ' + LAB_URL + ' (client rev ' + String(entry.rev ?? 'unknown') + ')')
