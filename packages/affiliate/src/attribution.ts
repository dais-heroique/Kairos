export const ATTRIBUTION_WINDOW_DAYS = 90;
export const MANUAL_CODE_ENTRY_WINDOW_DAYS = 7;

export interface ClickCandidate {
  code: string;
  clickedAt: Date;
}

// First-touch, jamais last-touch : le PREMIER clic dans la fenêtre de 90
// jours gagne l'attribution, même si l'utilisateur a cliqué sur d'autres
// liens d'affiliation depuis.
export function resolveFirstTouchAttribution(
  clicks: ClickCandidate[],
  signupAt: Date,
): string | null {
  const withinWindow = clicks.filter((c) => {
    const ageDays = (signupAt.getTime() - c.clickedAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays >= 0 && ageDays <= ATTRIBUTION_WINDOW_DAYS;
  });
  if (withinWindow.length === 0) return null;

  const earliest = withinWindow.reduce((a, b) => (a.clickedAt < b.clickedAt ? a : b));
  return earliest.code;
}

// Saisie manuelle du code jusqu'à 7 jours après l'inscription — au-delà,
// seule l'attribution par cookie (resolveFirstTouchAttribution) compte.
export function canEnterCodeManually(signupAt: Date, now: Date = new Date()): boolean {
  const ageDays = (now.getTime() - signupAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays >= 0 && ageDays <= MANUAL_CODE_ENTRY_WINDOW_DAYS;
}
