# Dossier juridique Kairos — projet à valider

> **Statut : DRAFT — revue par un avocat ou un juriste français obligatoire avant publication commerciale.** Ce document prépare le contenu et les décisions à prendre ; il ne constitue pas un avis juridique et ne garantit pas à lui seul la conformité de Kairos.

## 1. Périmètre réel du service

Kairos est un service numérique d’aide à la décision destiné aux créateurs et vendeurs affiliés de TikTok Shop. Il fournit notamment des classements, des fiches produit, des comparaisons, des watchlists, des briefs et des estimations calculées à partir des données réellement disponibles. Kairos n’est pas TikTok, n’est pas affilié à TikTok et ne vend pas les produits présentés.

Le service comporte un accès gratuit Radar et des abonnements payants Creator et Pro, facturés via Stripe selon une périodicité mensuelle ou annuelle. La collecte Kairos ne doit jamais être présentée comme exhaustive lorsqu’un marché ou un produit ne dispose pas encore de relevés suffisants. Les données et estimations sont indicatives et ne constituent ni une garantie de ventes, ni un conseil financier, fiscal ou juridique.

Le programme partenaire est distinct du service d’abonnement. Les codes sont créés uniquement par l’owner ; un code nouvellement créé donne cinq jours d’essai Pro. L’attribution est first-touch pendant 90 jours et la saisie manuelle d’un code est limitée à sept jours après l’inscription. Les commissions sont soumises à une période de retenue de 30 jours et les virements partenaires sont manuels : Stripe Connect n’est pas actuellement branché.

## 2. Documents à publier avant la première vente

| Document | Route prévue | État actuel | Action avant publication |
|---|---|---|---|
| Mentions légales | `/mentions-legales` | Présente avec crochets | Remplacer toutes les informations de l’éditeur, du directeur de publication et de l’hébergeur. |
| CGU/CGV | `/cgu` | Présentes comme modèle | Faire valider les abonnements, le renouvellement, la résiliation, la TVA, la médiation et le droit de rétractation. |
| Politique de confidentialité | `/confidentialite` | Présente comme modèle | Confirmer les prestataires réellement activés, les transferts, les durées et les bases légales. |
| Politique cookies/traceurs | `/cookies` | À publier | Décrire uniquement les traceurs effectivement déposés et ajouter un mécanisme de retrait si des traceurs soumis au consentement existent. |
| Droit de rétractation | `/retractation` | Présente comme modèle | Confirmer le parcours de renoncement à l’accès immédiat et le remboursement avec le juriste. |
| Programme partenaire | `/cgu-affiliation` | Présent | Aligner les clauses sur l’attribution, la retenue de 30 jours et les paiements manuels. |
| Médiation | Dans `/cgu` et le footer | Manquante | Désigner un médiateur référencé et publier son nom, son adresse et son site. |

Les CGV destinées aux consommateurs doivent être accessibles avant la conclusion du contrat et couvrir notamment le service, le prix, le paiement, la durée, la résiliation, le droit de rétractation et le règlement des litiges.[1] Les mentions légales doivent permettre d’identifier l’éditeur et l’hébergeur.[2]

## 3. Informations réelles à fournir

Les champs suivants ne doivent pas rester sous forme de crochets en production :

| Information | Valeur à fournir |
|---|---|
| Nom légal de l’exploitant | `[À compléter]` |
| Forme juridique | `[EI, micro-entreprise, SAS, etc.]` |
| Adresse du siège | `[Adresse complète]` |
| SIREN / SIRET et RCS | `[À compléter]` |
| Numéro de TVA ou mention de franchise | `[À confirmer avec le comptable]` |
| Email de contact commercial | `[À compléter]` |
| Email vie privée | `[À compléter]` |
| Directeur de publication | `[À compléter]` |
| Médiateur de la consommation | `[Nom du médiateur référencé]` |
| Adresse du médiateur | `[À compléter]` |
| Site du médiateur | `[URL à compléter]` |
| Tribunal ou clause de compétence | `[À faire valider]` |
| Date d’entrée en vigueur | `[JJ mois AAAA]` |

**Ne pas publier le site payant avec ces champs incomplets.** Le Service public rappelle que les informations d’identification et de contact doivent être facilement accessibles, et que les CGV B2C doivent être communiquées avant la conclusion du contrat.[2]

## 4. Clauses à conserver dans les CGU/CGV

### Service et disponibilité

Kairos fournit un service numérique accessible en ligne, sans transfert de propriété sur les produits, comptes ou données TikTok Shop présentés. Les fonctionnalités peuvent évoluer pour des raisons de sécurité, de maintenance ou d’amélioration. Les limites d’accès propres à chaque plan sont celles affichées avant la souscription.

### Prix et abonnement

Le prix affiché avant le paiement est celui de la périodicité sélectionnée. Un abonnement mensuel est renouvelé chaque mois et un abonnement annuel chaque année, jusqu’à résiliation. Stripe traite le paiement et émet les documents correspondants selon la configuration du compte Stripe. Le client peut gérer son moyen de paiement, télécharger ses factures et résilier depuis le portail Stripe.

### Rétractation et accès immédiat

Le texte final doit expliquer le délai légal applicable, la procédure d’exercice et le traitement du remboursement. Si Kairos demande un accès immédiat au service, le parcours de paiement doit présenter séparément l’information et la demande expresse appropriées. Cette clause doit être validée avant activation, car le régime dépend de la qualification exacte du service et de la manière dont l’accès est fourni.

### Données et estimations

Les classements, scores, fourchettes, gains et niveaux de confiance sont des informations indicatives. Un produit sans historique suffisant doit être affiché comme « en observation » ou « données insuffisantes », jamais avec une valeur inventée. Kairos ne garantit ni volume de vente, ni taux de conversion, ni revenu.

### Litiges et médiation

Avant toute saisine, le client adresse une réclamation à l’email officiel de Kairos. Si le litige n’est pas résolu, le client consommateur doit pouvoir saisir gratuitement le médiateur de la consommation désigné par Kairos. Le nom et les coordonnées du médiateur doivent figurer sur le site et dans les CGV.[3]

## 5. Politique de confidentialité à finaliser

La politique doit distinguer les données réellement utilisées par Kairos des prestataires seulement envisagés. Les fonctionnalités observées dans le code comprennent l’authentification Firebase, le profil créateur, les marchés sélectionnés, les produits suivis, les briefs, les données d’abonnement et les informations nécessaires au paiement via Stripe. Les cartes bancaires ne doivent pas être décrites comme stockées par Kairos si elles restent chez Stripe.

La politique doit être réécrite si Anthropic, Vertex AI, Sentry, PostHog, Resend ou Stripe ne sont pas effectivement activés. Un prestataire simplement mentionné mais non utilisé rend l’information inexacte. Il faut aussi documenter les transferts hors UE, les garanties applicables, les durées de conservation et le point de contact pour exercer les droits.

Les droits à décrire sont l’accès, la rectification, l’effacement, la portabilité, la limitation et l’opposition lorsque les conditions sont réunies. Le compte propose déjà un export et une suppression ; il faut vérifier que ces fonctions couvrent les sous-collections réellement créées et qu’une sauvegarde légale de facturation est traitée séparément.

## 6. Cookies et traceurs

Le code actuel utilise notamment `localStorage` pour l’adresse de connexion temporaire et pour la préférence de langue. Ces mécanismes ne doivent pas être décrits comme des cookies publicitaires. En revanche, toute mesure d’audience, publicité, pixel, outil de session ou traceur non strictement nécessaire doit être inventorié et soumis à un consentement préalable lorsque le droit l’exige.

La CNIL rappelle que le consentement doit être préalable, libre, spécifique, éclairé, retirable aussi simplement qu’il a été donné, et qu’une acceptation des CGU ne suffit pas comme consentement cookies.[4] Kairos doit donc soit rester limité aux mécanismes strictement nécessaires, soit intégrer une vraie bannière avec accepter, refuser et gérer mes choix, ainsi qu’un lien permanent pour retirer le consentement.

## 7. Checklist de mise en production

Avant d’accepter un premier paiement réel, l’owner doit faire compléter les informations d’entreprise, choisir un médiateur référencé, faire relire les CGU/CGV et la politique de confidentialité, configurer dans Stripe les factures et la mention TVA vérifiée par le comptable, puis tester les parcours d’achat, remboursement, résiliation et exercice du droit de rétractation.

Il faut également vérifier que les pages `/cgu`, `/confidentialite`, `/cookies`, `/mentions-legales` et `/retractation` sont accessibles depuis le footer, que la case d’acceptation contractuelle est distincte du consentement cookies, que la périodicité mensuelle ou annuelle affichée correspond au prix Stripe choisi, et que les textes ne promettent pas de données ou de revenus inexistants.

## Références officielles

[1]: https://entreprendre.service-public.fr/vosdroits/F33527 "Service Public Entreprendre — Conditions générales de vente"
[2]: https://www.service-public.fr/professionnels-entreprises/vosdroits/F31228 "Service Public — Mentions obligatoires sur un site professionnel"
[3]: https://www.economie.gouv.fr/mediation-conso/vous-etes-un-professionnel/vos-principales-obligations-0 "Économie.gouv.fr — Obligations de médiation de la consommation"
[4]: https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi "CNIL — Cookies et traceurs : que dit la loi ?"
