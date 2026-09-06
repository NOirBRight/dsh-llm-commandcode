/** Verify the built mark on the existing 3082 lab; restore the user's theme. */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
const source = await readFile(new URL('../docs/commandcode.svg', import.meta.url), 'utf8')
const expected = [...source.matchAll(/<path[^>]* d="([^"]+)"/g)].map(match => match[1])
assert.equal(expected.length, 3)
const tabs = await (await fetch('http://127.0.0.1:9229/json')).json()
const tab = tabs.find(tab => tab.type === 'page' && new URL(tab.url).origin === 'http://127.0.0.1:3082')
assert.ok(tab, 'Existing authenticated lab browser required')
const ws = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map()
ws.addEventListener('message', event => { const message = JSON.parse(event.data); pending.get(message.id)?.(message); pending.delete(message.id) })
async function call(method, params) {
  const key = ++id
  const response = new Promise(resolve => pending.set(key, resolve))
  ws.send(JSON.stringify({ id: key, method, params }))
  const result = await response
  assert.ok(!result.error, result.error?.message ?? method + ' failed')
  return result.result
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  assert.ok(!result.exceptionDetails, 'Browser evaluation failed')
  return result.result.value
}
async function wait(expression) {
  await evaluate('new Promise((resolve,reject)=>{const end=Date.now()+20000;function check(){if(' + expression + ')resolve(true);else if(Date.now()>end)reject(Error("UI timeout"));else requestAnimationFrame(check)}check()})')
}
async function click(label) {
  const button = '[...document.querySelectorAll("button")].find(b=>b.textContent.trim()===' + JSON.stringify(label) + '&&b.getClientRects().length)'
  await wait(button)
  await evaluate(button + '.click()')
}
const mark = '[...document.querySelectorAll("[data-provider-card]")].find(c=>c.querySelector("[data-provider-card-header]")?.textContent.includes("Command Code"))?.querySelector("[data-provider-header-mark] svg")'
let originalTheme
const colors = []
try {
  if (!await evaluate('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="General")')) {
    await evaluate('[...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==="Open sidebar")?.click()')
    await click('Settings')
  }
  await click('General')
  originalTheme = await evaluate('[...document.querySelectorAll("button[aria-pressed=true]")].find(b=>["Light","Dark","System"].includes(b.textContent.trim()))?.textContent.trim()')
  assert.ok(originalTheme)
  for (const theme of ['Light', 'Dark']) {
    await click('General'); await click(theme); await click('LLM Providers'); await wait(mark)
    await evaluate(mark + '.scrollIntoView({block:"center"})')
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    const data = await evaluate('(()=>{const svg=' + mark + ';const b=svg.getBoundingClientRect();return {paths:[...svg.querySelectorAll("path")].map(p=>p.getAttribute("d")),fills:[...svg.querySelectorAll("path")].map(p=>getComputedStyle(p).fill),box:{x:b.x-4,y:b.y-4,width:b.width+8,height:b.height+8,scale:4}}})()')
    assert.deepEqual(data.paths, expected, 'Supplied SVG geometry must remain exact')
    assert.equal(data.fills[0], data.fills[1])
    assert.notEqual(data.fills[0], data.fills[2], 'Symbol must contrast with its background')
    colors.push(data.fills)
    const screenshot = await call('Page.captureScreenshot', { format: 'png', clip: data.box })
    await writeFile('/tmp/commandcode-' + theme.toLowerCase() + '.png', Buffer.from(screenshot.data, 'base64'))
  }
  assert.notDeepEqual(colors[0], colors[1], 'The mark must adapt to the active theme')
  console.log('PASS: supplied paths preserved, contrasting grayscale theme fills verified in Light and Dark.')
} finally {
  if (originalTheme) { await click('General'); await click(originalTheme); await click('LLM Providers') }
  ws.close()
}
