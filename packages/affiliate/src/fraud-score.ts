export interface FraudSignals {
  referrerUid: string;
  referredUid: string;
  referrerIpHash: string | null;
  referredIpHash: string | null;
  referrerFingerprint: string | null;
  referredFingerprint: string | null;
}

export const FRAUD_BLOCK_THRESHOLD = 70;

export function isSelfReferral(referrerUid: string, referredUid: string): boolean {
  return referrerUid === referredUid;
}

// Auto-parrainage = score maximal immédiat, pas une simple pénalité —
// c'est structurellement interdit, pas juste "suspect". Même IP ou même
// empreinte d'appareil entre parrain et filleul sont de forts signaux de
// comptes multiples chez la même personne.
export function computeFraudScore(signals: FraudSignals): number {
  if (isSelfReferral(signals.referrerUid, signals.referredUid)) return 100;

  let score = 0;
  if (signals.referrerIpHash && signals.referrerIpHash === signals.referredIpHash) score += 50;
  if (
    signals.referrerFingerprint &&
    signals.referrerFingerprint === signals.referredFingerprint
  ) {
    score += 50;
  }
  return Math.min(100, score);
}

export function isFraudBlocked(fraudScore: number): boolean {
  return fraudScore >= FRAUD_BLOCK_THRESHOLD;
}
