import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'

export type MockSseEvent = string | { event: string; data: string }
export type MockBehavior = { kind: 'sse'; events: MockSseEvent[] } | { kind: 'json'; status: number; body: string }
export interface MockServer { url: string; paths: string[]; requests: unknown[]; headers: IncomingMessage['headers'][]; close(): Promise<void> }
const servers: Server[] = []

export async function closeMockServers(): Promise<void> {
  await Promise.all(servers.splice(0).map(server => new Promise(resolve => server.close(resolve))))
}

export const openAITextEvents = [
  JSON.stringify({ choices: [{ delta: { role: 'assistant', content: 'hello' } }] }),
  JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 1 } }),
  '[DONE]',
]

export const anthropicTextEvents: MockSseEvent[] = [
  { event: 'message_start', data: JSON.stringify({ type: 'message_start', message: { id: 'msg-1', role: 'assistant', model: 'claude-sonnet-4-6', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 3, output_tokens: 0 } } }) },
  { event: 'content_block_start', data: JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }) },
  { event: 'content_block_delta', data: JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hello' } }) },
  { event: 'content_block_stop', data: JSON.stringify({ type: 'content_block_stop', index: 0 }) },
  { event: 'message_delta', data: JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 1 } }) },
  { event: 'message_stop', data: JSON.stringify({ type: 'message_stop' }) },
]

export async function mockServer(script: MockBehavior[]): Promise<MockServer> {
  const paths: string[] = []
  const requests: unknown[] = []
  const headers: IncomingMessage['headers'][] = []
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    let body = ''
    request.on('data', chunk => { body += chunk.toString() })
    request.on('end', () => {
      paths.push(request.url ?? '')
      try { requests.push(JSON.parse(body)) } catch { requests.push(body) }
      headers.push(request.headers)
      const behavior = script.shift()
      if (behavior === undefined) { response.writeHead(500).end('script exhausted'); return }
      if (behavior.kind === 'json') { response.writeHead(behavior.status, { 'content-type': 'application/json' }).end(behavior.body); return }
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      response.end(behavior.events.map(event => typeof event === 'string' ? 'data: ' + event + '\n\n' : 'event: ' + event.event + '\ndata: ' + event.data + '\n\n').join(''))
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('mock server address unavailable')
  servers.push(server)
  return {
    url: 'http://127.0.0.1:' + String(address.port), paths, requests, headers,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  }
}
