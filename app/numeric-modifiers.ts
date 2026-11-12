/** Independent factors share one base: ×2 and ×1.5 yield ×2.5, never ×3. */
export function combineMultipliers(...factors: number[]): number {
  return Math.max(0, 1 + factors.reduce((sum, factor) => sum + (Number.isFinite(factor) ? factor - 1 : 0), 0));
}

export function penetrationBreakdown(value: number) {
  const percent = Number.isFinite(value) ? Math.max(0, value) : 0;
  return { percent, ignoredPercent: Math.min(100, percent), excessStepsPercent: Math.max(0, percent - 100) };
}
