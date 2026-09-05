/**
 * Pure function: compare a numeric value against extracted reference range bounds.
 * Returns 'low', 'normal', 'high', or 'unknown'.
 * Only uses ranges explicitly from the database — never invents them.
 */
export type RangeLabel = 'low' | 'normal' | 'high' | 'unknown';

export function labelRange(
  value: string | null | undefined,
  low: number | null | undefined,
  high: number | null | undefined
): RangeLabel {
  if (value === null || value === undefined) return 'unknown';

  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) return 'unknown';

  const hasLow = low !== null && low !== undefined && !isNaN(low);
  const hasHigh = high !== null && high !== undefined && !isNaN(high);

  if (!hasLow && !hasHigh) return 'unknown';

  if (hasLow && hasHigh) {
    if (numericValue < low!) return 'low';
    if (numericValue > high!) return 'high';
    return 'normal';
  }

  if (hasLow && !hasHigh) {
    return numericValue < low! ? 'low' : 'normal';
  }

  if (!hasLow && hasHigh) {
    return numericValue > high! ? 'high' : 'normal';
  }

  return 'unknown';
}
