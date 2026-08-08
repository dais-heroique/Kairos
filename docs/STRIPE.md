# Encaisser avec Stripe — guide pas à pas sur Mac

Ce document part de zéro et va jusqu'au premier euro encaissé. Tout ce qui
est écrit ici a été vérifié contre le code du dépôt ; ce qui n'a **pas** pu
être vérifié est signalé comme tel, parce qu'aucune clé Stripe n'existait au
moment de l'écrire.

---

## 0. La décision à prendre avant tout le reste

Stripe a besoin d'un serveur. Ce n'est pas contournable, et il vaut mieux le
savoir maintenant que trois heures plus tard :

- **Créer une session de paiement** demande `STRIPE_SECRET_KEY`. Cette clé
  donne un accès total au compte Stripe. Elle ne peut pas partir dans le
  bundle du navigateur, où n'importe qui la lirait en trois clics.
- **Recevoir un webhook** demande de vérifier une signature puis d'écrire
  `users/{uid}.plan` — champ que `firestore.rules` interdit au client,
  précisément pour qu'on ne puisse pas s'offrir un plan payant tout seul.

Or KAIROS tient aujourd'hui sur le **plan Spark** : site 100 % statique +
Firestore, 0 €, aucune Cloud Function. Trois issues, avec leurs vrais coûts.

### Option A — Lien de paiement + activation à la main (0 €, Spark préservé)

Tu crées un *Payment Link* dans le tableau de bord Stripe. C'est une URL
publique, donc parfaitement sûre dans une page statique. Le client paie, tu
vois le paiement arriver dans Stripe, et tu actives son plan depuis ton Mac :

```bash
cd apps/jobs
pnpm grant:plan -- --email lea@exemple.fr --plan creator
```

- ✅ Zéro euro, zéro serveur, disponible aujourd'hui.
- ✅ Les règles Firestore restent strictes : l'écriture passe par l'Admin
  SDK, en local, jamais par le navigateur.
- ❌ Manuel. Tu dois surveiller Stripe et activer à la main. Les
  résiliations et les impayés aussi.
- **Honnête jusqu'à ~20 clients.** Au-delà, tu oublieras quelqu'un.

### Option B — Cloud Functions (plan Blaze)

Le chemin standard, entièrement automatique. `functions/src/stripe.ts` est
déjà écrit pour ça.

- ✅ Automatique : paiement, renouvellement, impayé, résiliation.
- ⚠️ **Exige le plan Blaze**, donc une carte bancaire sur le compte Google.
  Le palier gratuit de Cloud Functions (2 millions d'appels/mois) couvre
  très largement ton volume, donc la facture restera à 0 € en pratique —
  mais ce n'est plus une garantie structurelle, c'est une prévision.
- **C'est le seul point où la contrainte « 0 € » devient « 0 € probable ».**
  À toi de trancher ; le code ne le fera pas à ta place.

### Option C — Les deux fonctions ailleurs (0 €, deux hébergeurs)

Le site reste sur Firebase Hosting, et seules les deux fonctions Stripe
tournent sur un hébergeur gratuit (Vercel, Cloudflare Workers). La logique
métier étant dans `packages/payments`, l'adaptateur à réécrire fait une
cinquantaine de lignes.

- ✅ Vraiment 0 €, sans carte bancaire.
- ❌ Deux plateformes à gérer, deux jeux de secrets, deux déploiements.

**Ma recommandation :** commence par **A** pour encaisser tes premiers
clients cette semaine sans rien casser, et passe à **B** quand l'activation
manuelle devient pénible. Le travail fait pour A n'est pas perdu :
`grant:plan` reste l'outil de reprise quand un webhook ne sait pas conclure.

---

## 1. Ce qui bloque la vente, indépendamment de Stripe

À régler avant d'encaisser le premier euro. Ce ne sont pas des détails de
code.

1. **Une entité légale.** Stripe demande un SIRET (auto-entrepreneur suffit)
   et un IBAN. Sans ça, pas de compte Stripe en France.
2. **`/mentions-legales` contient encore des crochets** :
   `[Nom légal de la société]`, `[SIREN/SIRET]`, `[adresse complète]`.
   C'est une obligation légale (LCEN art. 6), et publier un site marchand
   avec ces placeholders est une infraction, pas une coquetterie.
3. **La TVA.** Vendre un service numérique à des particuliers dans l'UE
   oblige à collecter la TVA du pays du client. `automatic_tax` est activé
   dans le code, mais **Stripe Tax doit être activé dans le tableau de bord**
   et ton adresse d'origine renseignée. En franchise en base (auto-entrepreneur
   sous les seuils), c'est différent — vérifie ta situation avant.
4. **Un moyen de résilier.** Obligation légale, et de toute façon la moindre
   des choses. Le plus simple : activer le *Customer Portal* dans Stripe
   (Réglages → Facturation → Portail client), qui donne une page hébergée
   où le client gère son abonnement. Le lien reste à poser dans `/compte`.
5. **Les prix.** `packages/shared/src/plans.ts` a `priceCents: null` pour
   Creator et Pro, ce qui affiche « Bientôt ». Tant que c'est `null`, aucun
   bouton de paiement n'apparaît — c'est voulu. Ce sont **les deux montants
   que tu dois décider**, et ils doivent correspondre exactement à ce que tu
   crées dans Stripe.

---

## 2. Créer le compte et les produits Stripe

### 2.1 Le compte

<https://dashboard.stripe.com/register> → active le compte (SIRET, IBAN,
pièce d'identité). Garde le **mode Test** activé pour toute la suite : le
bouton bascule est en haut à droite.

⚠️ Le mode Test et le mode Réel ont des clés **différentes** et des
identifiants de prix **différents**. Tout ce que tu crées en test devra être
recréé en réel. C'est normal, et c'est une sécurité.

### 2.2 Les produits

Dans **Catalogue de produits → Ajouter un produit**, crée **deux produits** :

| Produit | Description à saisir |
|---|---|
| `KAIROS Creator` | Tes gains sur tous les produits, les courbes jour par jour, et le texte à dire face caméra |
| `KAIROS Pro` | Tout Creator, plus le suivi d'un produit sur plusieurs semaines |

Ces descriptions viennent de `plans.ts` (`highlight`). Garde-les alignées :
un client qui lit une promesse sur Stripe et une autre sur le site a raison
de se méfier.

### 2.3 Les prix

Pour **chacun** des deux produits, ajoute **deux tarifs récurrents** :

- **Mensuel** — récurrent, tous les mois, EUR
- **Annuel** — récurrent, tous les ans, EUR

Soit **quatre prix au total**. Les montants sont ta décision ; le code n'en
impose aucun. Repère commun en SaaS : l'annuel équivaut à 10 mois payés.

Note les quatre identifiants, de la forme `price_1Ab2Cd...` :

| Offre | Variable d'environnement |
|---|---|
| Creator mensuel | `STRIPE_PRICE_CREATOR_MONTHLY` |
| Creator annuel | `STRIPE_PRICE_CREATOR_YEARLY` |
| Pro mensuel | `STRIPE_PRICE_PRO_MONTHLY` |
| Pro annuel | `STRIPE_PRICE_PRO_YEARLY` |

> Le code **refuse de démarrer** si deux de ces variables portent le même
> identifiant : deux offres derrière un même prix voudrait dire qu'un client
> paie pour l'une et reçoit l'autre. Test : `packages/payments`.

### 2.4 Reporter les prix dans le code

Ouvre `packages/shared/src/plans.ts` et remplace les `priceCents: null` par
les montants **en centimes**, identiques à Stripe :

```ts
{ slug: "creator", name: "Creator", priceCents: 1900, … }  // 19,00 €
{ slug: "pro",     name: "Pro",     priceCents: 3900, … }  // 39,00 €
```

Dès qu'un montant est posé, la page de tarifs cesse d'afficher « Bientôt » et
le bouton d'abonnement apparaît. **Ne le fais qu'une fois l'encaissement
réellement branché** — sinon tu affiches un bouton qui ne mène nulle part,
exactement ce que la décision #42 interdit.

---

## 3. Option A — encaisser dès cette semaine, sans serveur

### 3.1 Créer les liens de paiement

Tableau de bord → **Liens de paiement** → **Créer un lien** → choisis le prix
Creator mensuel. Répète pour les trois autres. Tu obtiens quatre URL
`https://buy.stripe.com/...`.

Dans la configuration du lien, **Après le paiement** → « Rediriger vers une
page » → `https://kairos-on.web.app/compte?paiement=ok`.

### 3.2 Activer le client

Quand un paiement arrive (notification Stripe, ou Paiements dans le tableau
de bord), récupère l'email du client puis, sur ton Mac :

```bash
cd ~/chemin/vers/KAIROS
pnpm build                      # obligatoire après un git pull
cd apps/jobs
pnpm grant:plan -- --email lea@exemple.fr --plan creator --dry-run
pnpm grant:plan -- --email lea@exemple.fr --plan creator
```

`--dry-run` montre l'avant/après sans rien écrire. Prends l'habitude.

Il faut une **clé de compte de service Firebase** : Console Firebase →
Paramètres du projet → Comptes de service → « Générer une nouvelle clé
privée ». Range-la **hors du dépôt** ; le script la cherche automatiquement
dans `~/Downloads` et `~`, sinon donne-lui
`GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle.json`.

### 3.3 Et les résiliations

Même commande, en sens inverse :

```bash
pnpm grant:plan -- --email lea@exemple.fr --plan radar --status canceled
```

C'est ce point qui rend l'option A pénible dans la durée : Stripe sait que
le client est parti, ton application ne l'apprendra que si tu le lui dis.

---

## 4. Option B — automatiser avec les Cloud Functions

> ⚠️ Cette section fait passer le projet en plan **Blaze**. Relis le § 0.

### 4.1 Installer les outils

```bash
brew install stripe/stripe-cli/stripe
stripe login
npm install -g firebase-tools    # si pas déjà fait
firebase login
```

### 4.2 Récupérer les clés

Tableau de bord Stripe → **Développeurs → Clés d'API** (en mode Test) :

- **Clé secrète** `sk_test_...` → `STRIPE_SECRET_KEY`

Le secret de webhook s'obtient à l'étape suivante.

### 4.3 Tester en local, avant tout déploiement

Dans un premier terminal :

```bash
cd ~/chemin/vers/KAIROS/functions
pnpm build
firebase emulators:start --only functions,firestore
```

Dans un second :

```bash
stripe listen --forward-to http://127.0.0.1:5001/kairos-on/europe-west1/stripeWebhook
```

La commande affiche un secret `whsec_...` **valable pour cette session** :
c'est `STRIPE_WEBHOOK_SECRET` en local.

Dans un troisième, déclenche un vrai événement :

```bash
stripe trigger customer.subscription.created
```

Regarde les logs de l'émulateur. Trois issues possibles, et elles sont
explicites :

- `[stripe] customer.subscription.created → <uid> : creator/active` — tout va bien.
- `[stripe] NON RÉSOLU — prix inconnu…` — normal avec `stripe trigger`, qui
  fabrique un prix bidon. Pour un test de bout en bout, passe par un vrai
  paiement (§ 4.5) avec la carte `4242 4242 4242 4242`.
- `signature refusée` — le `whsec_` du terminal ne correspond pas à celui
  chargé par la fonction.

### 4.4 Déployer

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase deploy --only functions
```

Les quatre `STRIPE_PRICE_*` ne sont pas des secrets (ce sont des
identifiants publics) : mets-les dans `functions/.env`.

Puis, dans Stripe → **Développeurs → Webhooks → Ajouter un point de
terminaison** :

- URL : celle affichée par `firebase deploy`, de la forme
  `https://europe-west1-kairos-on.cloudfunctions.net/stripeWebhook`
- Événements à écouter — exactement ceux-là, pas « tous » :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Stripe affiche alors le vrai `whsec_...` de production : refais
`firebase functions:secrets:set STRIPE_WEBHOOK_SECRET` avec celui-là, puis
redéploie.

### 4.5 Vérifier de bout en bout

1. Crée un compte de test sur le site.
2. Va sur `/tarifs`, clique l'abonnement.
3. Carte `4242 4242 4242 4242`, date future, CVC quelconque.
4. Dans Firestore, `users/{uid}.plan` doit passer à
   `{ slug: "creator", status: "active" }`.
5. Dans Stripe, annule l'abonnement → le plan doit retomber sur
   `radar` / `canceled`.

Si l'étape 4 ne se produit pas, regarde `stripeEvents/{id}` dans Firestore :
le champ `reason` dit pourquoi.

### 4.6 Passer en réel

Rebascule Stripe en mode Réel, **recrée les deux produits et les quatre
prix** (les identifiants de test n'existent pas en réel), refais le webhook,
et remplace les deux secrets par les clés `sk_live_...` / `whsec_...`.

---

## 5. Ce qui n'est pas fait, et qu'il faudra faire

Dit franchement, pour que personne ne le découvre en production :

- **Le code Stripe n'a jamais tourné contre l'API réelle.** Aucune clé
  n'existait quand il a été écrit. La logique métier, elle, est testée
  (18 tests, `packages/payments`) : c'est la plomberie HTTP qui reste à
  confirmer, et c'est ce que fait le § 4.3.
- **Le bouton d'abonnement côté site n'est pas câblé sur la fonction.**
  Tant que `priceCents` vaut `null`, le bouton n'existe pas ; quand tu
  poseras les montants, il faudra brancher `createCheckoutSession` sur
  `/compte`.
- **Le portail client n'est pas intégré.** Le plus rapide est d'activer le
  portail hébergé de Stripe et d'en poser le lien dans `/compte`.
- **Stripe Connect (affiliation 30 %) n'est pas branché.**
  `packages/affiliate` calcule tout — commissions, seuils, anti-fraude,
  clawback — mais `apps/web/src/server/stripe/connect.ts` n'existe pas.
  C'est un chantier distinct : verser de l'argent à des tiers demande
  Connect, des vérifications d'identité, et une comptabilité.

---

## 6. Récapitulatif des variables

| Variable | Où | Secret ? |
|---|---|---|
| `STRIPE_SECRET_KEY` | Cloud Functions | 🔴 oui |
| `STRIPE_WEBHOOK_SECRET` | Cloud Functions | 🔴 oui |
| `STRIPE_PRICE_CREATOR_MONTHLY` | `functions/.env` | non |
| `STRIPE_PRICE_CREATOR_YEARLY` | `functions/.env` | non |
| `STRIPE_PRICE_PRO_MONTHLY` | `functions/.env` | non |
| `STRIPE_PRICE_PRO_YEARLY` | `functions/.env` | non |
| `GOOGLE_APPLICATION_CREDENTIALS` | ton Mac, hors dépôt | 🔴 oui |

**Ne colle jamais une clé `sk_` dans une conversation, un ticket ou un
commit.** Si ça arrive, révoque-la immédiatement dans Stripe → Développeurs
→ Clés d'API : une clé secrète exposée donne accès à l'argent.
