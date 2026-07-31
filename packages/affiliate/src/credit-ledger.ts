// Mode crédit — première classe, pas un simple fallback : Stripe Connect
// exige 18 ans et une partie des créateurs sont mineurs. Conversion 1:1,
// aucun frais Stripe à déduire puisqu'aucun virement n'a lieu.
export function convertToAccountCredit(eligibleCents: number): { creditCents: number } {
  return { creditCents: eligibleCents };
}
