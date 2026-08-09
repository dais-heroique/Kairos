# Encaisser avec Stripe — guide pas à pas sur Mac

De zéro au premier euro encaissé, **automatiquement, à 0 €**.

Tout ce qui est écrit ici a été vérifié contre le code du dépôt. Ce qui n'a
**pas** pu l'être est signalé comme tel : aucune clé Stripe n'existait au
moment de l'écrire, donc le code n'a jamais tourné contre l'API réelle.

---

## 0. L'architecture, en une minute

Stripe a besoin d'un serveur, et ce n'est pas contournable :

- **Créer une session de paiement** demande `STRIPE_SECRET_KEY`, qui donne un
  accès total au compte Stripe. Elle ne peut pas partir dans le navigateur.
- **Recevoir un webhook** demande de vérifier une signature puis d'écrire
  `users/{uid}.plan` — champ que `firestore.rules` interdit au client,
  précisément pour qu'on ne puisse pas s'offrir un plan payant.

Le site reste donc sur **Firebase Hosting** (statique, plan Spark, 0 €), et
ces deux points d'entrée tournent sur un **Worker Cloudflare** :

```
Navigateur ──jeton Firebase──►  Worker Cloudflare  ──►  Stripe
                                       │
Stripe ──webhook signé────────────────►│
                                       └──► Firestore (users/{uid}.plan)
```

**Pourquoi Cloudflare et pas ailleurs :**

| | Coût réel | Usage commercial |
|---|---|---|
| **Cloudflare Workers** | 0 € — 100 000 requêtes/jour | ✅ autorisé |
| Vercel Hobby | 0 € | ❌ **interdit** par leurs conditions |
| Vercel Pro | 20 $/mois | ✅ |
| Cloud Functions (Blaze) | 0 € en pratique | ✅ mais carte bancaire obligatoire |

Tu feras quelques dizaines de requêtes par jour. Le palier gratuit
Cloudflare n'a aucune chance d'être atteint.

**Ce qui est déjà écrit dans le dépôt :**

- `packages/payments` — la logique qui décide qui reçoit quoi. Pure, 18 tests.
- `apps/stripe-worker` — le Worker, prêt à déployer.
- `apps/web/src/lib/stripe/checkout.ts` + `SubscribeButton` — le bouton.
- `apps/jobs/src/grant-plan.ts` — activation manuelle, pour les cas limites.
- `functions/src/stripe.ts` — la même chose en Cloud Functions, si tu passes
  un jour à Blaze. Les deux appellent le même cœur, ils ne peuvent pas
  diverger sur le métier.

---

## 1. Ce qui bloque la vente, et qui n'est pas du code

À régler avant d'encaisser le premier euro.

1. **Une entité légale.** Stripe demande un SIRET (auto-entrepreneur suffit)
   et un IBAN.
2. **`/mentions-legales` contient encore des crochets** :
   `[Nom légal de la société]`, `[SIREN/SIRET]`, `[adresse complète]`.
   Obligation légale (LCEN art. 6) — publier un site marchand avec ces
   placeholders est une infraction, pas une coquetterie.
3. **La TVA.** Vendre un service numérique à des particuliers de l'UE oblige
   à collecter la TVA du pays du client. `automatic_tax` est activé dans le
   code, mais **Stripe Tax doit être activé dans le tableau de bord** et ton
   adresse d'origine renseignée. En franchise en base, c'est différent —
   vérifie ta situation.
4. **Un moyen de résilier.** Obligation légale. Le plus rapide : activer le
   *portail client* de Stripe (Réglages → Facturation → Portail client) et
   poser son lien dans `/compte`.
5. **Les deux montants.** C'est la seule chose qui reste à décider.

---

## 2. Stripe : compte, produits, prix

### 2.1 Le compte

<https://dashboard.stripe.com/register>, puis active le compte. **Reste en
mode Test** pour toute la suite (bascule en haut à droite).

⚠️ Test et Réel ont des clés **et des identifiants de prix différents**.
Tout ce que tu crées en test devra être recréé en réel. C'est une sécurité.

### 2.2 Les deux produits

**Catalogue de produits → Ajouter un produit**, deux fois :

| Produit | Description |
|---|---|
| `KAIROS Creator` | Tes gains sur tous les produits, les courbes jour par jour, et le texte à dire face caméra |
| `KAIROS Pro` | Tout Creator, plus le suivi d'un produit sur plusieurs semaines |

Ces textes viennent de `plans.ts` (`highlight`). Garde-les alignés : un
client qui lit une promesse sur Stripe et une autre sur le site a raison de
se méfier.

### 2.3 Les quatre prix

Pour **chaque** produit, ajoute deux tarifs **récurrents** en EUR : un
**mensuel**, un **annuel**. Les montants sont ta décision — repère courant
en SaaS : l'annuel vaut dix mois.

Note les quatre identifiants `price_1Ab2Cd…` :

| Offre | Variable |
|---|---|
| Creator mensuel | `STRIPE_PRICE_CREATOR_MONTHLY` |
| Creator annuel | `STRIPE_PRICE_CREATOR_YEARLY` |
| Pro mensuel | `STRIPE_PRICE_PRO_MONTHLY` |
| Pro annuel | `STRIPE_PRICE_PRO_YEARLY` |

> Le code **refuse de démarrer** si deux variables portent le même
> identifiant : un client paierait pour une offre et recevrait l'autre.

### 2.4 La clé secrète

**Développeurs → Clés d'API** → copie la **clé secrète** `sk_test_…`.

Ne la colle jamais dans une conversation, un ticket ou un commit. Si ça
arrive, révoque-la immédiatement au même endroit.

---

## 3. La clé de compte de service Firebase

Le Worker écrit dans Firestore, donc il lui faut une identité serveur.

Console Firebase → ⚙️ **Paramètres du projet** → **Comptes de service** →
**Générer une nouvelle clé privée**. Un `.json` est téléchargé.

⚠️ **Range-le hors du dépôt.** Ce fichier donne un accès complet à ta base.

---

## 4. Déployer le Worker

### 4.1 Installer les outils

```bash
brew install node          # si besoin
npm install -g wrangler
wrangler login             # ouvre le navigateur, crée le compte Cloudflare au passage
```

Le compte Cloudflare est gratuit et ne demande pas de carte.

### 4.2 Poser les secrets

```bash
cd ~/chemin/vers/KAIROS/apps/stripe-worker

wrangler secret put STRIPE_SECRET_KEY
# colle sk_test_…

wrangler secret put FIREBASE_SERVICE_ACCOUNT
# colle le CONTENU ENTIER du .json de l'étape 3, en une seule fois

# Le secret du webhook n'existe pas encore : on le posera à l'étape 4.4.
```

### 4.3 Poser les identifiants de prix

Ce ne sont pas des secrets. Ouvre `apps/stripe-worker/wrangler.toml` et
décommente le bloc `[vars]` avec tes quatre `price_…` :

```toml
[vars]
FIREBASE_PROJECT_ID = "kairos-on"
ALLOWED_ORIGINS = "https://kairos-on.web.app,https://kairos-on.firebaseapp.com"
STRIPE_PRICE_CREATOR_MONTHLY = "price_1Ab…"
STRIPE_PRICE_CREATOR_YEARLY  = "price_1Cd…"
STRIPE_PRICE_PRO_MONTHLY     = "price_1Ef…"
STRIPE_PRICE_PRO_YEARLY      = "price_1Gh…"
```

### 4.4 Déployer et brancher le webhook

```bash
wrangler deploy
```

Wrangler affiche une URL du type
`https://kairos-stripe.<ton-compte>.workers.dev`. Vérifie-la tout de suite :

```bash
curl https://kairos-stripe.<ton-compte>.workers.dev/health
# {"ok":true,"prixManquants":[]}
```

Si `prixManquants` n'est pas vide, un `STRIPE_PRICE_*` manque.

Puis dans Stripe → **Développeurs → Webhooks → Ajouter un point de
terminaison** :

- URL : `https://kairos-stripe.<ton-compte>.workers.dev/stripe/webhook`
- Événements — exactement ceux-là, surtout pas « tous » :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Stripe affiche alors le secret `whsec_…` :

```bash
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler deploy
```

---

## 5. Brancher le site

### 5.1 Les variables publiques

Dans `apps/web/.env.production`, renseigne (ce sont des valeurs publiques,
elles apparaissent de toute façon dans l'URL de paiement) :

```
NEXT_PUBLIC_STRIPE_WORKER_URL=https://kairos-stripe.<ton-compte>.workers.dev
NEXT_PUBLIC_STRIPE_PRICE_CREATOR_MONTHLY=price_1Ab…
NEXT_PUBLIC_STRIPE_PRICE_CREATOR_YEARLY=price_1Cd…
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_1Ef…
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_1Gh…
```

### 5.2 Les prix affichés

`packages/shared/src/plans.ts` — remplace `priceCents: null` par les montants
**en centimes**, identiques à Stripe :

```ts
{ slug: "creator", name: "Creator", priceCents: 1900, … }  // 19,00 €
{ slug: "pro",     name: "Pro",     priceCents: 3900, … }  // 39,00 €
```

> **Double sécurité** : même avec un prix posé ici, le bouton de paiement ne
> s'affiche que si `NEXT_PUBLIC_STRIPE_WORKER_URL` **et** l'identifiant de
> prix sont configurés. Sinon on retombe sur « Commencer gratuitement en
> attendant ». Impossible d'afficher un bouton mort par distraction.

### 5.3 Déployer le site

```bash
cd ~/chemin/vers/KAIROS
./scripts/deploy.sh
```

---

## 6. Vérifier de bout en bout

1. Crée un compte de test sur le site.
2. `/tarifs` → clique « Passer en Creator ».
3. Carte **`4242 4242 4242 4242`**, date future, CVC quelconque.
4. Dans Firestore, `users/{uid}.plan` doit passer à
   `{ slug: "creator", status: "active" }` **en quelques secondes**.
5. L'application doit débloquer les gains sur tous les produits.
6. Dans Stripe, annule l'abonnement → le plan retombe sur
   `radar` / `canceled`.

### Si l'étape 4 ne se produit pas

```bash
wrangler tail        # les logs du Worker, en direct
```

Trois messages possibles, et ils sont explicites :

- `[stripe] customer.subscription.created → <uid> : creator/active` — c'est bon.
- `[stripe] NON RÉSOLU — prix inconnu…` — un `STRIPE_PRICE_*` du Worker ne
  correspond pas à celui de l'abonnement.
- `signature refusée` — le `whsec_` posé ne correspond pas à celui du
  webhook Stripe.

Regarde aussi `stripeEvents/{id}` dans Firestore : le champ `reason` dit
pourquoi un événement n'a pas conclu.

### Rattraper à la main

Si un événement reste non résolu, tranche depuis ton Mac :

```bash
cd apps/jobs
pnpm grant:plan -- --email lea@exemple.fr --plan creator --dry-run
pnpm grant:plan -- --email lea@exemple.fr --plan creator
```

`--dry-run` montre l'avant/après sans rien écrire. Prends l'habitude.

---

## 7. Passer en réel

1. Bascule Stripe en mode **Réel**.
2. **Recrée les deux produits et les quatre prix** — les identifiants de test
   n'existent pas en réel.
3. Recrée le webhook sur la même URL, récupère le nouveau `whsec_…`.
4. Repose les deux secrets avec les valeurs `sk_live_…` / `whsec_…`, puis
   `wrangler deploy`.
5. Mets à jour les `NEXT_PUBLIC_STRIPE_PRICE_*` avec les identifiants réels,
   puis `./scripts/deploy.sh`.
6. Fais un vrai paiement à 1 € sur toi-même, vérifie, rembourse.

---

## 8. Ce qui n'est pas fait, dit franchement

- **Le code Stripe n'a jamais tourné contre l'API réelle.** Aucune clé
  n'existait quand il a été écrit. La logique métier est testée
  (18 tests `packages/payments` + 4 sur l'encodage Firestore) ; c'est la
  plomberie HTTP que l'étape 6 confirme.
- **Le portail client n'est pas intégré.** Active le portail hébergé de
  Stripe et pose son lien dans `/compte` — c'est le moyen de résiliation.
- **Stripe Connect (affiliation 30 %) n'est pas branché.**
  `packages/affiliate` calcule tout — commissions, seuils, anti-fraude,
  clawback — mais verser de l'argent à des tiers demande Connect, des
  vérifications d'identité et une comptabilité. Chantier distinct.

---

## 9. Récapitulatif des variables

| Variable | Où | Secret ? |
|---|---|---|
| `STRIPE_SECRET_KEY` | `wrangler secret put` | 🔴 oui |
| `STRIPE_WEBHOOK_SECRET` | `wrangler secret put` | 🔴 oui |
| `FIREBASE_SERVICE_ACCOUNT` | `wrangler secret put` | 🔴 oui |
| `STRIPE_PRICE_*` | `wrangler.toml` `[vars]` | non |
| `NEXT_PUBLIC_STRIPE_*` | `apps/web/.env.production` | non |
| `GOOGLE_APPLICATION_CREDENTIALS` | ton Mac, hors dépôt | 🔴 oui |
