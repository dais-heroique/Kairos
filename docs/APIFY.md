# Apify — source de données produits

Intégration de l'actor Apify **TikTok Shop Search Pro** (`Hr1hjEAGdYMr1RbUj`)
comme source de collecte, en remplacement de la saisie manuelle (décision #8
de `STATE.md`).

## Ce que cette source couvre — et ce qu'elle ne couvre pas

| Champ KAIROS | Fourni par l'actor ? |
|---|---|
| titre, prix, note, nombre d'avis | ✅ |
| rang dans les résultats de recherche | ✅ |
| **taux de commission d'affiliation** | ❌ **absent** |
| créateurs actifs, vidéos, boutiques concurrentes | ❌ absent |
| estimations de ventes | ❌ absent |

**Conséquence à ne pas perdre de vue : cet actor alimente les classements,
pas le simulateur de gains.** Il expose `discount_pct`, qui est une remise
acheteur — pas une rémunération affilié. Les confondre produirait des
montants en euros faux, ce que le produit s'interdit explicitement (voir la
promesse « on ne t'affiche jamais un chiffre inventé » de la page d'accueil).
`commission` reste donc à `NEUTRAL_COMMISSION` (0 %), et les gains sortent
neutres plutôt que faux.

Pour obtenir de vraies commissions il faut une autre source : l'API Affiliate
TikTok (documentée comme fermée à l'UE, décision #8) ou une saisie manuelle
par produit depuis `/admin/produits`.

Autre limite : l'actor ne couvre que le **marché US** (`searchRegion` non
configurable) et renvoie des prix en **USD**, convertis en euros à taux fixe
(`USD_TO_EUR` dans `recover-apify-data.ts`) faute de source de change
branchée. Les requêtes en français ne renvoient rien — n'utiliser que des
mots-clés anglais.

## Configuration

`apps/jobs/.env.local` et `apps/collector/.env.local` (tous deux ignorés par
git) :

```
APIFY_API_TOKEN=apify_api_...
APIFY_ACTOR_ID=Hr1hjEAGdYMr1RbUj
```

`.env.local` est chargé automatiquement par `src/load-env.ts` (Node ne lit
aucun `.env` de lui-même et le projet n'embarque pas `dotenv`) : le token
n'est plus à passer sur chaque commande. Une variable fournie en ligne de
commande reste prioritaire.

Écrire en production demande en plus une clé de compte de service Firebase
(Console Firebase > Paramètres du projet > Comptes de service > « Générer une
nouvelle clé privée »), à ranger **hors du repo**. Elle est cherchée
automatiquement dans `~/Downloads`, `~` puis la racine du projet — tout
`.json` dont le nom contient `firebase-adminsdk`, `serviceaccount` ou
`service-account`. Ailleurs, la désigner via
`GOOGLE_APPLICATION_CREDENTIALS`. L'Admin SDK ignore les règles de sécurité :
aucune règle Firestore n'a besoin d'être assouplie.

## Commandes

Toutes depuis `apps/jobs/`, sans variable d'environnement à fournir.

**Récupérer des runs déjà facturés** — relit les datasets sans relancer
l'actor, donc sans coût supplémentaire. Les run IDs sont en dur en tête de
`recover-apify-data.ts`, à mettre à jour après chaque nouvelle collecte :

```bash
pnpm recover:apify
```

La récupération écrit désormais `sourceMarket: US` et génère les classements
`*_US_*`. Elle ne doit pas être utilisée pour alimenter le filtre France :
l’interface masque les anciens documents sans provenance ou dont le marché
source ne correspond pas au marché sélectionné. Cette protection évite de
présenter des produits américains comme des résultats français. Relire un run
existant reste gratuit ; aucune nouvelle collecte n’est déclenchée par cette
commande.

**Collecter des produits nommés** — liste éditable dans
`src/datasource/products.config.ts` :

```bash
pnpm apify:scrape
pnpm apify:scrape:dry   # sans écriture
```

**Découverte multi-niches** — 6 niches définies dans
`src/datasource/products-strategy.ts` :

```bash
pnpm apify:intelligent
pnpm apify:intelligent:dry
```

⚠️ Le scoring de `products-strategy.ts` n'a **jamais tourné contre de vraies
données** : le critère « commission » a été retiré (il lisait `discount_pct`),
les seuils restants (prix, note, volume d'avis) sont des hypothèses à
calibrer sur un premier vrai run.

## Verdicts : 3 relevés minimum

`computeVerdict` exige 3 snapshots (`minSnapshotsAbsolute`). En dessous, il
renvoie volontairement un verdict `risque` avec « Historique trop court » et
une confiance <0,1 — les produits sont affichés quand même, jamais masqués,
jamais accompagnés d'un chiffre inventé (voir `STATE.md`).

Une collecte unique produit donc un classement complet mais sans verdict
exploitable. Il faut collecter 3 jours pour que les verdicts aient du sens.
**Ne pas fabriquer d'historique** à partir d'un seul jour réel.

## Coût

Plan gratuit Apify : « Free users are limited to preview results » — une
partie des champs est masquée et les runs sont plafonnés. La première
collecte réelle (3 requêtes, ~90 produits) a coûté ~0,48 €.

Relire un dataset existant (`recover:apify`) est gratuit : `listItems()` ne
relance pas l'actor.

## Automatisation

Aucun serveur n'est nécessaire : `apps/jobs` tourne en local et écrit dans
Firestore, le site statique lit Firestore (architecture prévue par
`STATE.md`, plan Spark préservé). Pour une collecte périodique, un
LaunchAgent macOS suffit — à écrire une fois la collecte validée sur
plusieurs jours.
