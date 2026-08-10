// Archive des classements — ce qui rend le plan Pro réel.
//
// Le problème qu'elle résout : `rankings/{type}_{market}_{period}` porte un
// identifiant **fixe**, réécrit à chaque passage du pipeline. Il n'existait
// donc aucune trace du passé, et la promesse « suivre un produit dans la
// durée » ne reposait sur rien.
//
// Contrainte de forme, dictée par le budget de lecture (≤5 opérations par
// page) : **un seul document** porte toute l'archive, pas un document par
// jour. Une page qui affiche la trajectoire d'un produit ferait sinon
// trente lectures. D'où une fenêtre glissante de 30 jours dans un document
// unique, avec les libellés stockés une seule fois plutôt que répétés
// chaque jour.

/** Combien de jours l'archive conserve. Au-delà, le plus ancien tombe. */
export const ARCHIVE_MAX_DAYS = 30;

export interface ArchiveLabel {
  title: string;
  emoji?: string;
}

export interface ArchiveDay {
  /** AAAA-MM-JJ, fuseau Europe/Paris (voir todayIso côté web). */
  date: string;
  /** Identifiants produit, dans l'ordre du classement par volume. */
  products: string[];
  /** Identifiants produit, dans l'ordre du score d'opportunité. */
  opportunities: string[];
  /** Concurrence mesurée ce jour-là, par produit. */
  saturation: Record<string, number>;
}

export interface RankingArchive {
  updatedAt: string;
  /** Titre et emoji par produit — stockés une fois, pas trente. */
  labels: Record<string, ArchiveLabel>;
  /** Du plus ancien au plus récent. */
  days: ArchiveDay[];
}

export const EMPTY_ARCHIVE: RankingArchive = { updatedAt: "", labels: {}, days: [] };

/**
 * Insère la journée du jour dans l'archive.
 *
 * Deux propriétés qui comptent :
 *
 *  - **Idempotent par date.** Relancer le pipeline deux fois le même jour
 *    remplace l'entrée du jour au lieu d'en empiler une seconde. Sans ça,
 *    « il y a 7 jours » ne voudrait plus rien dire dès le deuxième passage.
 *  - **Les libellés fusionnent.** Un produit disparu du classement garde son
 *    titre, sinon les journées passées où il figurait deviendraient
 *    illisibles — or c'est exactement ce qu'on vient chercher ici.
 */
export function appendArchiveDay(
  archive: RankingArchive,
  day: ArchiveDay,
  labels: Record<string, ArchiveLabel>,
  maxDays: number = ARCHIVE_MAX_DAYS,
): RankingArchive {
  const days = archive.days.filter((d) => d.date !== day.date);
  days.push(day);
  days.sort((a, b) => a.date.localeCompare(b.date));

  return {
    updatedAt: new Date().toISOString(),
    labels: { ...archive.labels, ...labels },
    days: days.slice(-maxDays),
  };
}

export interface RankPoint {
  date: string;
  /** Rang à partir de 1, ou `null` si le produit n'était pas classé ce jour-là. */
  rank: number | null;
  saturation: number | null;
}

export type ArchiveBoard = "products" | "opportunities";

/**
 * La trajectoire d'un produit, jour par jour.
 *
 * `null` — et non zéro — quand le produit ne figurait pas au classement :
 * « absent » et « dernier » sont deux choses différentes, et les confondre
 * dessinerait une chute qui n'a pas eu lieu.
 */
export function rankTrend(
  archive: RankingArchive,
  productId: string,
  board: ArchiveBoard = "products",
): RankPoint[] {
  return archive.days.map((day) => {
    const index = day[board].indexOf(productId);
    return {
      date: day.date,
      rank: index >= 0 ? index + 1 : null,
      saturation: day.saturation[productId] ?? null,
    };
  });
}

export interface RankMove {
  productId: string;
  title: string;
  emoji?: string;
  /** Rang à la date de référence, `null` si absent. */
  from: number | null;
  /** Rang aujourd'hui, `null` si sorti du classement. */
  to: number | null;
  /** Positions gagnées (positif) ou perdues (négatif). `null` si incomparable. */
  delta: number | null;
  /** Points de concurrence gagnés depuis la référence. `null` si inconnu. */
  saturationDelta: number | null;
}

/**
 * Ce qui a bougé depuis une date, pour une liste de produits suivis.
 *
 * C'est la matière des alertes : « ça monte » et surtout « la place se
 * remplit ». On ne renvoie que ce qui est réellement comparable — un
 * produit apparu entre-temps n'a pas de `delta`, et on ne lui en invente
 * pas un depuis un rang imaginaire.
 */
export function movesSince(
  archive: RankingArchive,
  since: string,
  productIds: string[],
  board: ArchiveBoard = "products",
): RankMove[] {
  const past = [...archive.days].reverse().find((d) => d.date <= since) ?? archive.days[0];
  const today = archive.days[archive.days.length - 1];
  if (!past || !today || past.date === today.date) return [];

  const rankIn = (day: ArchiveDay, id: string): number | null => {
    const index = day[board].indexOf(id);
    return index >= 0 ? index + 1 : null;
  };

  return productIds
    .map((productId): RankMove => {
      const from = rankIn(past, productId);
      const to = rankIn(today, productId);
      const satFrom = past.saturation[productId];
      const satTo = today.saturation[productId];
      return {
        productId,
        title: archive.labels[productId]?.title ?? productId,
        ...(archive.labels[productId]?.emoji ? { emoji: archive.labels[productId]!.emoji } : {}),
        from,
        to,
        // Un rang qui *baisse* est une progression : 34e → 6e vaut +28.
        delta: from !== null && to !== null ? from - to : null,
        saturationDelta:
          typeof satFrom === "number" && typeof satTo === "number"
            ? Math.round(satTo - satFrom)
            : null,
      };
    })
    .filter((move) => move.delta !== null || move.saturationDelta !== null)
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
}

/** La date archivée la plus proche de `wanted`, sans jamais la dépasser. */
export function dayAt(archive: RankingArchive, wanted: string): ArchiveDay | null {
  return [...archive.days].reverse().find((d) => d.date <= wanted) ?? null;
}
