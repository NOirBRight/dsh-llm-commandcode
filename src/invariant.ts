/** Small invariant helper exported for built-entry verification. */

export function assertCommandCodeInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('dsh-llm-commandcode invariant failed: ' + message)
}
