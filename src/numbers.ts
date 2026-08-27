/** Browser-safe numeric domain predicates shared by config and wire decoders. */

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

export function positiveInteger(value: unknown): number | undefined {
  return isPositiveInteger(value) ? value : undefined
}
