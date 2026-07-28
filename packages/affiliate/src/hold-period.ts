// Rétention 30 jours avant qu'une commission "pending" devienne
// "eligible" (payable) — protection contre les remboursements précoces.
export const HOLD_PERIOD_DAYS = 30;

export function isCommissionPayable(earnedAt: Date, now: Date = new Date()): boolean {
  const diffDays = (now.getTime() - earnedAt.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= HOLD_PERIOD_DAYS;
}

export function daysUntilPayable(earnedAt: Date, now: Date = new Date()): number {
  const diffDays = (now.getTime() - earnedAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(HOLD_PERIOD_DAYS - diffDays));
}
