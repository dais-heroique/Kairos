import {
  PARTNER_COMMISSION_PCT,
  type PartnerCodeDoc,
  type PlanSlug,
  type PlanStatus,
} from "@kairos/shared";

// Ce que rapporte chaque code partenaire — la seule chose que le
// propriétaire regarde avant de faire un virement.
//
// Fonction pure : elle prend la liste des codes et celle des inscrits
// rattachés, elle rend des nombres. Aucun accès Firestore, donc testable
// sans réseau — et c'est important, parce qu'une erreur ici se paie en
// euros virés à la mauvaise personne, ou pas virés du tout.

/** Ce qu'on a besoin de savoir d'un inscrit pour le compter. */
export interface ReferredUser {
  uid: string;
  /** Code d'affiliation saisi à l'inscription, déjà normalisé. */
  referredByCode: string | null;
  planSlug: PlanSlug;
  planStatus: PlanStatus;
  /** Montant mensuel réellement facturé, en centimes. */
  monthlyPriceCents: number;
  signedUpAt: string;
}

export interface PartnerStats {
  code: string;
  partnerName: string;
  commissionPct: number;
  active: boolean;
  /** Comptes créés avec ce code, payants ou non. */
  signups: number;
  /**
   * Comptes qui **paient réellement** aujourd'hui. Un abonnement résilié
   * ou impayé n'en fait pas partie : la commission suit l'encaissement,
   * pas l'intention.
   */
  payingCustomers: number;
  /** Chiffre d'affaires mensuel récurrent apporté, en centimes. */
  monthlyRevenueCents: number;
  /** Ce qu'il faut virer pour un mois, en centimes. */
  monthlyCommissionCents: number;
}

/**
 * Un abonnement compte-t-il comme payant ?
 *
 * `trialing` est exclu volontairement : rien n'a encore été encaissé, donc
 * rien n'est dû. `past_due` aussi — un prélèvement en échec peut encore
 * être rejoué, et verser une commission sur un paiement qui ne rentre
 * jamais oblige à la reprendre, ce qui est la pire conversation possible
 * avec un partenaire.
 */
export function isPayingCustomer(user: ReferredUser): boolean {
  return user.planSlug !== "radar" && user.planStatus === "active";
}

/**
 * La commission d'un montant, arrondie **à l'entier inférieur**.
 *
 * Vers le bas et pas au plus proche : sur un virement, l'arrondi
 * favorable doit aller à celui qui paie de sa poche. L'écart maximal est
 * d'un centime par ligne, et il est traçable.
 */
export function commissionCentsOf(amountCents: number, pct: number): number {
  if (amountCents <= 0 || pct <= 0) return 0;
  return Math.floor((amountCents * pct) / 100);
}

/**
 * Agrège les inscrits par code.
 *
 * Les codes sans aucun inscrit sont **conservés** dans le résultat, à
 * zéro : un partenaire qui n'a rien rapporté est une information utile —
 * c'est même celle qui décide si on continue avec lui.
 */
export function buildPartnerStats(
  codes: PartnerCodeDoc[],
  users: ReferredUser[],
): PartnerStats[] {
  const byCode = new Map<string, ReferredUser[]>();
  for (const user of users) {
    if (!user.referredByCode) continue;
    const bucket = byCode.get(user.referredByCode);
    if (bucket) bucket.push(user);
    else byCode.set(user.referredByCode, [user]);
  }

  return codes
    .map((doc) => {
      const referred = byCode.get(doc.code) ?? [];
      const paying = referred.filter(isPayingCustomer);
      const monthlyRevenueCents = paying.reduce((sum, u) => sum + u.monthlyPriceCents, 0);
      return {
        code: doc.code,
        partnerName: doc.partnerName,
        commissionPct: doc.commissionPct,
        active: doc.active,
        signups: referred.length,
        payingCustomers: paying.length,
        monthlyRevenueCents,
        // Calculée sur le total et non ligne par ligne : additionner des
        // arrondis produit un écart qui grandit avec le nombre de clients.
        monthlyCommissionCents: commissionCentsOf(monthlyRevenueCents, doc.commissionPct),
      };
    })
    .sort((a, b) => b.monthlyCommissionCents - a.monthlyCommissionCents || a.code.localeCompare(b.code));
}

/** Totaux tous partenaires confondus, pour la ligne de synthèse. */
export function totalPartnerStats(stats: PartnerStats[]) {
  return stats.reduce(
    (acc, s) => ({
      signups: acc.signups + s.signups,
      payingCustomers: acc.payingCustomers + s.payingCustomers,
      monthlyRevenueCents: acc.monthlyRevenueCents + s.monthlyRevenueCents,
      monthlyCommissionCents: acc.monthlyCommissionCents + s.monthlyCommissionCents,
    }),
    { signups: 0, payingCustomers: 0, monthlyRevenueCents: 0, monthlyCommissionCents: 0 },
  );
}

/**
 * Inscrits portant un code qui n'existe pas dans le registre.
 *
 * Cas réel : un influenceur diffuse « LEA20 » avant que le code soit créé,
 * ou avec une faute. Ces inscrits existent, ils ne sont rattachés à
 * personne, et sans cette liste ils resteraient invisibles — donc jamais
 * payés, et jamais réclamés puisque personne ne sait qu'ils existent.
 */
export function orphanCodes(
  codes: PartnerCodeDoc[],
  users: ReferredUser[],
): { code: string; signups: number }[] {
  const known = new Set(codes.map((c) => c.code));
  const counts = new Map<string, number>();
  for (const user of users) {
    const code = user.referredByCode;
    if (!code || known.has(code)) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, signups]) => ({ code, signups }))
    .sort((a, b) => b.signups - a.signups);
}

export { PARTNER_COMMISSION_PCT };
