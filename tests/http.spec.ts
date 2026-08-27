import { describe, expect, it } from 'vitest'
import { readBoundedText } from '../src/http.ts'

describe('bounded HTTP response reading', () => {
  it('limits chunked bodies before the complete response is buffered', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('1234'))
        controller.enqueue(new TextEncoder().encode('5678'))
      },
      cancel() { cancelled = true },
    })
    const response = new Response(body)
    await expect(readBoundedText(response, 5, 'test', 'TOO_LARGE')).rejects.toMatchObject({ code: 'TOO_LARGE' })
    expect(cancelled).toBe(true)
  })

  it('preserves UTF-8 split across chunks under the limit', async () => {
    const encoded = new TextEncoder().encode('额度')
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, 1))
        controller.enqueue(encoded.slice(1))
        controller.close()
      },
    })
    expect(await readBoundedText(new Response(body), 20, 'test', 'TOO_LARGE')).toBe('额度')
  })
})
