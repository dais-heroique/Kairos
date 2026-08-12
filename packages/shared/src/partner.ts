import { z } from "zod";

// Programme partenaire — la version « je choisis les codes et je paie par
// virement », distincte du parrainage en libre-service de `affiliate.ts`.
//
// Les deux modèles coexistent volontairement et ne se mélangent pas :
//
//   `affiliate.ts` — chaque utilisateur obtient un code aléatoire de 8
//   caractères, gagne des paliers, et serait payé par Stripe Connect. Écrit
//   au Lot 7, jamais branché faute de compte Connect.
//
//   `partner.ts` (ici) — le propriétaire crée lui-même des codes lisibles
//   qu'il confie à des influenceurs. Ces influenceurs **ne sont pas des
//   utilisateurs de KAIROS** : ils n'ont pas de compte, pas de tableau de
//   bord, et sont payés par virement bancaire à la main. Il n'y a donc ni
//   paliers, ni portefeuille, ni versement automatique — trois choses qui
//   n'existeraient que pour faire joli.

/**
 * Un code partenaire est **choisi**, pas généré.
 *
 * C'est tout l'intérêt : « LEA20 » se retient, se prononce à l'oral dans
 * une vidéo et se tape sans faute. Un `A7K2M9PX` aléatoire, non — et un
 * code d'affiliation qu'on ne peut pas dicter en story ne sert à rien.
 *
 * Contraintes : 3 à 24 caractères, majuscules, chiffres et tirets. Pas
 * d'espace (il casserait l'URL `?ref=`), pas d'accent (impossible à dicter
 * de façon fiable), pas de minuscule — la casse est normalisée à la
 * saisie, sinon « LEA20 » et « lea20 » seraient deux codes différents et
 * l'un des deux ne serait payé par personne.
 */
export const PARTNER_CODE_MIN = 3;
export const PARTNER_CODE_MAX = 24;
export const partnerCodeSchema = z
  .string()
  .min(PARTNER_CODE_MIN)
  .max(PARTNER_CODE_MAX)
  .regex(/^[A-Z0-9-]+$/, "Majuscules, chiffres et tirets uniquement.");

/**
 * Normalise une saisie en code canonique.
 *
 * Appliqué **des deux côtés** — à la création par le propriétaire et à la
 * lecture du `?ref=` dans l'URL — sinon un influenceur qui écrit son lien
 * en minuscules enverrait des inscrits sur un code qui n'existe pas, et
 * personne ne s'en rendrait compte avant la première facture.
 */
export function normalisePartnerCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/** La saisie donne-t-elle un code valide ? */
export function isValidPartnerCode(input: string): boolean {
  return partnerCodeSchema.safeParse(normalisePartnerCode(input)).success;
}

/**
 * Part reversée au partenaire, en pourcentage du montant réellement
 * encaissé. Alignée sur `COMMISSION_RATE_PCT` de `@kairos/affiliate` — un
 * partenaire et un parrain touchent la même chose, il n'y aurait aucune
 * raison défendable de leur servir deux taux.
 */
export const PARTNER_COMMISSION_PCT = 30;

// partnerCodes/{code}
export const partnerCodeDocSchema = z.object({
  /** Le code lui-même, qui sert aussi d'identifiant de document. */
  code: partnerCodeSchema,
  /** Qui reçoit l'argent — nom lisible, pas un identifiant. */
  partnerName: z.string().min(1).max(80),
  /** Pour le contacter et lui envoyer le virement. */
  contact: z.string().max(200).nullable(),
  /**
   * Taux négocié avec ce partenaire. Stocké par code et non lu depuis la
   * constante : renégocier avec quelqu'un ne doit pas réécrire l'histoire
   * de tous les autres.
   */
  commissionPct: z.number().min(0).max(100),
  /**
   * Un code désactivé n'attribue plus de nouvelles inscriptions, mais les
   * commissions déjà dues restent dues. On ne supprime jamais un code —
   * ce serait effacer la trace de sommes à verser.
   */
  active: z.boolean(),
  createdAt: z.string().datetime(),
  notes: z.string().max(500).nullable(),
});
export type PartnerCodeDoc = z.infer<typeof partnerCodeDocSchema>;
