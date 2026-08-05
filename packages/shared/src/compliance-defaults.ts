import type { ComplianceRule } from "./compliance";

// Jeu de règles par défaut pour le marché français. Le Compliance Guard
// existait depuis le Lot 8 mais tournait sur un tableau vide : il était
// donc inerte exactement au moment où il sert, c'est-à-dire quand un
// script est mis entre les mains d'un créateur.
//
// Base réglementaire, pour que chaque règle soit défendable et non un avis
// personnel :
//  - Loi n° 2023-451 du 9 juin 2023 encadrant l'influence commerciale :
//    mention « Publicité » ou « Collaboration commerciale » claire et
//    lisible pendant toute la promotion ; interdictions sectorielles.
//  - Règlement (CE) 1223/2009 sur les cosmétiques : pas d'allégation
//    thérapeutique — un cosmétique ne soigne pas, ne traite pas.
//  - Règlement (CE) 1924/2006 : allégations nutritionnelles et de santé
//    uniquement si autorisées.
//  - Code de la consommation, art. L121-1 et suivants : pratiques
//    commerciales trompeuses.
//
// **Ce n'est pas un avis juridique.** L'objectif est d'attraper les
// formulations les plus courantes et les plus risquées avant tournage,
// pas de garantir la conformité. Les règles sont éditables sans
// redéploiement depuis /admin/compliance.
//
// Sur la sévérité : `blocking` est réservé à ce qui expose réellement le
// créateur (allégation de santé, promesse d'argent, mineurs, secteurs
// interdits). Le reste est en `warning` — un garde-fou qui crie tout le
// temps finit par être ignoré, et devient pire qu'aucun garde-fou.

export const DEFAULT_COMPLIANCE_RULES_FR: ComplianceRule[] = [
  // ---------- Allégations de santé ----------
  {
    id: "sante-guerir",
    market: "FR",
    pattern: "\\b(gu[ée]ri[trs]?|soigne(?:r|nt)?|trait(?:e|er|ement)\\s+(?:l[ae']|contre)|cure\\s+de)\\b",
    severity: "blocking",
    message:
      "Allégation thérapeutique : un produit cosmétique ou un complément ne peut pas prétendre guérir, soigner ou traiter (règlement CE 1223/2009). Reformule en termes d'apparence ou de confort ressenti.",
  },
  {
    id: "sante-maladie",
    market: "FR",
    pattern: "\\b(acn[ée]\\s+s[ée]v[èe]re|eczema|ecz[ée]ma|psoriasis|d[ée]pression|anxi[ée]t[ée]|diab[èe]te|cancer|migraine)\\b",
    // Avertissement et non blocage : le motif ne distingue pas la promesse
    // (« ça soigne l'eczéma ») du démenti (« je n'ai pas d'eczéma »), et
    // bloquer la seconde reviendrait à punir la formulation prudente.
    severity: "warning",
    message:
      "Nommer une pathologie peut transformer la promotion en allégation de santé, interdite hors dispositifs médicaux autorisés. Si c'est une promesse, reformule en ressenti (« peau qui tiraille ») ; si c'est un simple contexte, tu peux ignorer.",
  },
  {
    id: "sante-miracle",
    market: "FR",
    pattern: "\\b(miracle|miraculeux|r[ée]volutionnaire|effet\\s+imm[ée]diat|r[ée]sultat\\s+garanti)\\b",
    severity: "warning",
    message:
      "Promesse de résultat non démontrable : risque de pratique commerciale trompeuse (art. L121-1 du Code de la consommation). Reste sur ce que tu as constaté toi.",
  },
  {
    id: "sante-minceur",
    market: "FR",
    pattern: "\\b(perdre\\s+\\d+\\s*(kg|kilos?)|maigrir\\s+sans|br[ûu]le[- ]graisses?|coupe[- ]faim|d[ée]tox)\\b",
    severity: "blocking",
    message:
      "Allégation minceur chiffrée ou non autorisée (règlement CE 1924/2006). Ces formulations sont parmi les plus contrôlées par la DGCCRF sur les réseaux.",
  },

  // ---------- Transparence publicitaire ----------
  {
    id: "transparence-mention-absente",
    market: "FR",
    // `.` n'inclut pas les sauts de ligne : avec `.*`, la recherche
    // s'arrêtait à la première ligne et la règle se déclenchait dès que la
    // mention se trouvait plus bas dans le script — c'est-à-dire presque
    // toujours. `[\\s\\S]*` balaie le texte entier.
    pattern: "^(?![\\s\\S]*(publicit[ée]|collaboration\\s+commerciale|sponsoris|partenariat\\s+r[ée]mun[ée]r|#pub|#ad))[\\s\\S]*$",
    severity: "blocking",
    message:
      "Aucune mention publicitaire détectée. La loi n° 2023-451 impose « Publicité » ou « Collaboration commerciale », lisible pendant toute la vidéo — un lien d'affiliation suffit à la rendre obligatoire.",
  },
  {
    id: "transparence-dissimulation",
    market: "FR",
    pattern: "\\b(je\\s+ne\\s+suis\\s+pas\\s+pay[ée]|aucun\\s+partenariat|pas\\s+sponsoris[ée]|achet[ée]\\s+avec\\s+mon\\s+argent)\\b",
    severity: "blocking",
    message:
      "Nier une rémunération alors qu'un lien d'affiliation rapporte une commission est une dissimulation caractérisée. C'est le cas de figure le plus lourdement sanctionné.",
  },

  // ---------- Promesses de gains ----------
  {
    id: "gains-promesse",
    market: "FR",
    pattern: "\\b(argent\\s+facile|revenus?\\s+garantis?|devenir\\s+riche|\\d+\\s*€\\s*(par|\\/)\\s*(jour|semaine|mois)\\s+garantis?)\\b",
    severity: "blocking",
    message:
      "Promesse de revenus : trompeuse par nature, et particulièrement surveillée depuis la loi influence. À proscrire même en parlant du programme d'affiliation.",
  },

  // ---------- Secteurs interdits ou encadrés ----------
  {
    id: "secteurs-interdits",
    market: "FR",
    pattern: "\\b(cigarette\\s+[ée]lectronique|vapotage|nicotine|chirurgie\\s+esth[ée]tique|paris\\s+sportifs?|crypto[- ]?monnaie|trading)\\b",
    severity: "blocking",
    message:
      "Secteur interdit ou strictement encadré pour l'influence commerciale (loi n° 2023-451, art. 4 et 5) : nicotine, chirurgie esthétique, paris et actifs numériques.",
  },
  {
    id: "secteurs-medicament",
    market: "FR",
    pattern: "\\b(m[ée]dicament|ordonnance|antibiotique|compl[ée]ment\\s+dopant)\\b",
    // Même raison : « ce produit n'est pas un médicament » est précisément
    // la phrase qu'on veut encourager, pas interdire.
    severity: "warning",
    message:
      "La promotion de médicaments auprès du public est très encadrée et interdite pour ceux soumis à prescription (Code de la santé publique). Si tu l'emploies pour préciser que le produit n'en est pas un, c'est au contraire recommandé.",
  },

  // ---------- Mineurs ----------
  {
    id: "mineurs-ciblage",
    market: "FR",
    pattern: "\\b(pour\\s+les\\s+enfants|d[èe]s\\s+\\d+\\s+ans|ados?\\b|coll[ée]giens?)\\b",
    severity: "warning",
    message:
      "Cibler explicitement des mineurs impose des précautions renforcées, et interdit certains produits. Vérifie que le produit et le discours s'y prêtent.",
  },

  // ---------- Pratiques trompeuses ----------
  {
    id: "trompeur-superlatif",
    market: "FR",
    pattern: "\\b(le\\s+meilleur\\s+du\\s+march[ée]|n[°o]\\s*1\\s+(mondial|fran[çc]ais|en\\s+france)|le\\s+seul\\s+qui)\\b",
    severity: "warning",
    message:
      "Superlatif absolu : il doit pouvoir être prouvé, sinon il constitue une allégation trompeuse. Une formulation subjective (« mon préféré ») ne pose pas ce problème.",
  },
  {
    id: "trompeur-urgence",
    market: "FR",
    pattern: "\\b(derni[èe]res?\\s+pi[èe]ces?|stock\\s+presque\\s+[ée]puis[ée]|offre\\s+valable\\s+\\d+\\s*(min|heures?)\\s*(seulement)?)\\b",
    severity: "warning",
    message:
      "Fausse urgence : n'affirme la rareté que si tu l'as vérifiée sur la fiche produit au moment du tournage. Sinon c'est une pratique commerciale trompeuse.",
  },
  {
    id: "trompeur-prix-barre",
    market: "FR",
    pattern: "\\b(-\\s*\\d{2,}\\s*%|au\\s+lieu\\s+de\\s+\\d+\\s*€|prix\\s+barr[ée])\\b",
    severity: "warning",
    message:
      "Une réduction annoncée doit se référer au prix le plus bas pratiqué sur les 30 derniers jours (directive Omnibus). Vérifie que la remise affichée par la boutique respecte cette règle.",
  },
  {
    id: "trompeur-avant-apres",
    market: "FR",
    pattern: "\\b(avant\\s*\\/\\s*apr[èe]s|r[ée]sultat\\s+en\\s+\\d+\\s+jours?)\\b",
    severity: "warning",
    message:
      "Comparatif avant/après : il doit refléter un résultat réel, non retouché, obtenu dans les conditions annoncées. Précise la durée et tes conditions d'usage.",
  },
  {
    id: "trompeur-temoignage",
    market: "FR",
    pattern: "\\b(tout\\s+le\\s+monde\\s+en\\s+parle|des\\s+milliers\\s+de\\s+personnes|avis\\s+v[ée]rifi[ée]s?\\s+5\\s*[\\/★]\\s*5)\\b",
    severity: "warning",
    message:
      "Preuve sociale invérifiable. Cite un chiffre que tu peux montrer à l'écran, ou reformule.",
  },
  {
    id: "trompeur-sans-risque",
    market: "FR",
    pattern: "\\b(sans\\s+risque|100\\s*%\\s*(s[ûu]r|naturel|efficace)|z[ée]ro\\s+effet\\s+secondaire)\\b",
    severity: "warning",
    message:
      "« 100 % naturel » et « sans risque » sont des allégations absolues rarement démontrables. « Sans parfum » ou « testé dermatologiquement » se prouvent, elles.",
  },
];

/**
 * Document prêt à écrire dans `config/complianceRules`. Sans lui, la règle
 * Firestore existait mais le document jamais créé — donc zéro règle
 * évaluée, en silence.
 */
export function defaultComplianceRulesDoc(now: Date = new Date()) {
  return {
    rules: DEFAULT_COMPLIANCE_RULES_FR,
    updatedAt: now.toISOString(),
  };
}
