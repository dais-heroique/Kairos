# AUDIT — Kairos, état réel au 2026-07-28

Audit exécuté en LOT 0, sur `claude/check-old-conversations-o3nwu4` (commit de base `50b02c0`, à jour avec `main`). Toutes les commandes ci-dessous ont réellement été exécutées dans cette session (pas d'estimation) — sorties complètes en annexe (§4).

## 0. Méthode

```
pnpm install
pnpm typecheck        # turbo run typecheck (respecte l'ordre de build)
pnpm test             # turbo run test
npx firebase-tools experiments:enable webframeworks
npx firebase-tools emulators:exec --only firestore --project kairos-test \
  "pnpm --filter @kairos/firestore-rules-tests test"
pnpm lint
git ls-files | wc -l ; git ls-files | xargs wc -l (sur .ts/.tsx)
grep -rn "TODO|FIXME|HACK|@ts-ignore|@ts-expect-error" (hors node_modules)
```

## 1. Constat critique : `apps/web/src/lib/` manquant

**`.gitignore` ligne 4 contenait une règle nue `lib/`**, censée ignorer les dossiers de *build* de `packages/core` et `packages/shared` (leurs `tsconfig.json` ont `outDir: "./lib"`, confirmé). Mais une règle gitignore non ancrée (`lib/` sans `/` en tête) matche **tout dossier nommé `lib` où qu'il soit** — y compris `apps/web/src/lib/`, qui est un dossier de **code source**, pas de build.

Résultat : `apps/web/src/lib/` n'a **jamais été commité**, ne figure dans aucun commit de l'historique (un seul commit total : *"Initial commit: monorepo foundations, auth, onboarding, admin dashboard"*), et n'existait pas non plus sur le disque de ce checkout avant l'audit. 8 modules y sont importés dans une trentaine de fichiers d'`apps/web` :

- `@/lib/firebase/auth`
- `@/lib/firebase/auth-context`
- `@/lib/firebase/app-check`
- `@/lib/firestore/user`
- `@/lib/firestore/admin`
- `@/lib/firestore/invite-codes`
- `@/lib/firestore/watchlist`
- `@/lib/mock/products`
- `@/lib/niches`

**Correctif appliqué en LOT 0** : `.gitignore` ligne 4 remplacée par `/packages/*/lib/` (portée exacte, vérifiée avec `git check-ignore -v` avant/après — `apps/web/src/lib/x.ts` n'est plus ignoré, `packages/core/lib/index.js` l'est toujours).

**Décision actée avec l'utilisateur** : ne pas fabriquer de stubs/fausses implémentations pour ces 8 modules — il a très probablement le vrai code ailleurs (autre session/appareil, jamais poussé à cause de ce bug) et le poussera lui-même. En attendant, `apps/web` reste en échec de typecheck, **de façon documentée et assumée**, pas comme un défaut caché.

## 2. Tableau de synthèse par module

| Module | État | Fichier(s) | Preuve |
|---|---|---|---|
| Auth (connexion, vérification) | ✅ code réel, ⚠️ non compilable | `apps/web/src/app/connexion/**` | Magic-link + Google/Apple, mais importe `@/lib/firebase/auth` (manquant, §1) |
| Onboarding (profil/marché/niches) | ✅ code réel, ⚠️ non compilable | `apps/web/src/app/onboarding/**` | Validation réelle (ex. niches vides bloque le submit), typé sur enums `@kairos/shared`, mais dépend de `@/lib/firestore/user` (manquant) |
| Compte | ✅ code réel, ⚠️ non compilable | `apps/web/src/app/compte/page.tsx` (276 lignes) | Idem, dépend de 4 modules manquants |
| Admin dashboard + bootstrap | ✅ code réel, ⚠️ non compilable | `apps/web/src/app/admin/**` | Liste users, CRUD invite codes, promotion premier admin — dépend de `@/lib/firestore/admin`, `invite-codes` |
| **`/admin/couts`** | ❌ absent | — | Aucun fichier `*couts*`/`*cost*` sous `apps/web/src/app` |
| Pages légales (CGU, confidentialité, mentions, rétractation) | ⚠️ divergent | `apps/web/src/app/{cgu,confidentialite,mentions-legales,retractation}/page.tsx` | CGU a une section "Programme d'affiliation" mais **pas de CGU d'affiliation séparée**. `mentions-legales` (lignes 18-25) et `retractation` (lignes 34-43) ont des placeholders `[Nom légal]`, `[SIREN/SIRET]`, `[adresse]` non remplis |
| Classements (produits, opportunités, [category]) | ❌ maquette | `apps/web/src/app/classements/**` | 100 % `MOCK_PRODUCTS`/`MOCK_OPPORTUNITIES`, commentaire explicite *"Données de démonstration — la collecte réelle arrive en Phase 3-4"*. Ni précompute Firestore, ni requête live — aucune des deux |
| Watchlist | ⚠️ hybride | `apps/web/src/app/watchlist/page.tsx` | Sauvegarde/suppression d'ID réelle via `@/lib/firestore/watchlist` (manquant), mais contenu produit = `MOCK_PRODUCTS` filtré. **Aucun champ de pipeline** (watching/sample_requested/…) trouvé nulle part dans le repo, malgré le texte UI *"Ton pipeline — pas une liste de favoris"* |
| Simulateur | ⚠️ formule figée | `apps/web/src/app/simulateur/page.tsx` | `RETURN_RATE = 0.08` en dur, commentaire *"formule de démonstration (M3)"*. Vues par défaut liées au vrai profil utilisateur, mais niche non prise en compte |
| `<EstimatedValue>` | ✅ solide | `apps/web/src/components/EstimatedValue.tsx` (51 lignes) | Fourchette + label de confiance + méthode au clic, conforme à la règle "jamais un nombre nu" |
| `apps/collector` | ❌ quasi vide | `apps/collector/src/{index,sources/*}.ts` | `index.ts` = health-check HTTP seul. Les 3 sources (`thirdparty`, `tiktok-api`, `tiktok-web`) font toutes `throw new Error("not implemented — Phase 3")`. Aucun `@google-cloud/bigquery` dans les dépendances. Playwright déclaré en dépendance mais **jamais importé/utilisé** — pas de blocage de ressources, pas de rotation de proxy, pas de circuit breaker, pas de Cloud Tasks |
| `apps/jobs` | ❌ stub | `apps/jobs/src/index.ts` (~10 lignes) | `console.log("daily job: not implemented — Phase 4")` puis exit. `firebase-admin` et `@google-cloud/bigquery` en dépendances mais inutilisés |
| Schéma BigQuery | ⚠️ défini, vide | `bigquery/00_dataset.sql` → `09_creator_benchmarks.sql` | 10 fichiers DDL (`CREATE TABLE IF NOT EXISTS`), incluant `ai_spend`, `product_snapshots`, `video_metrics`, `shop_snapshots`, `creator_snapshots`, `verdict_history`, `ground_truth`, `calibration_factors`, `creator_benchmarks`. Aucun script de chargement, aucune ligne de données réelle (rien n'écrit encore) |
| `firestore.rules` | ✅ plus mature que prévu | `firestore.rules` | `plan` immuable côté client (`planUnchanged()`), `allow write: if false` sur `products/creators/shops/sounds/rankings/feeds/waves/config` (lecture seule pour signés, écriture Admin SDK uniquement) |
| Tests de règles Firestore | ✅ existent et **passent réellement** | `tests/firestore-rules/rules.test.ts` (511 lignes, 30 tests) | Exécutés en LOT 0 contre l'émulateur réel : **30/30 verts**. Couvrent users CRUD, immutabilité du plan, bootstrap admin, invite codes, collections publiques en lecture seule, affiliateReferrals |
| App Check | ⚠️ partiel, non actif côté client | `functions/src/index.ts`, `apps/web/src/components/FirebaseInit.tsx` | Seul le callable `ping` (14 lignes au total dans `functions/`) a `enforceAppCheck: true`. Côté client, `FirebaseInit.tsx` importe `@/lib/firebase/app-check` — fait partie des 8 modules manquants (§1), donc **pas d'initialisation App Check active actuellement** |
| `packages/core` | ✅ réel, contrairement à l'hypothèse initiale | `packages/core/src/{verdict,earnings,opportunity}/*.ts` | Moteurs verdict/earnings/opportunity déjà codés, pas juste le test anti-Firebase. `no-firebase-imports.test.ts` passe (1/1) |
| `packages/shared` | ✅ propre | `packages/shared/src/*.ts` (13 fichiers, schémas Zod) | affiliate, creator, estimate, hooks, invite-code, market, product, ranking, shop, snapshot, sound, user, verdict — aucun import Firebase, tests `estimate.test.ts` passent (4/4) |
| GCP budget / App Check projet / données BigQuery réelles | ❓ non vérifiable depuis cette session | — | Aucun identifiant GCP dans cet environnement. À confirmer par l'utilisateur côté console GCP/Firebase, pas concluable depuis le repo |

## 3. Réponses aux questions posées

- **Les émulateurs Firebase démarrent-ils ?** Oui — l'émulateur Firestore démarre et sert correctement (`npx firebase-tools emulators:exec --only firestore`), après activation de l'expérience `webframeworks` (requise à cause de `hosting.source: apps/web` qui déclenche la détection de framework Next.js même pour un run Firestore-only). `firebase` CLI n'est pas préinstallé dans cet environnement mais s'obtient via `npx firebase-tools@latest` sans problème.
- **Existe-t-il des tests de règles Firestore ?** Oui, déjà écrits et complets (`tests/firestore-rules/rules.test.ts`, 30 tests), et ils **passent tous** contre l'émulateur réel. Ce n'est donc pas un trou de sécurité à combler de zéro — la couverture existante est bonne (auth, `plan` non modifiable, collections serveur en lecture seule, bootstrap admin, invite codes, RGPD delete).
- **Le collector a-t-il déjà écrit de vraies données dans BigQuery ?** Non. Aucune ligne, 0 jour d'historique — le collector n'a même pas de dépendance BigQuery, et les 3 sources lèvent explicitement une erreur "not implemented".
- **Les pages de classement lisent-elles des documents pré-calculés ou font-elles des requêtes Firestore ?** Ni l'un ni l'autre — elles affichent des données mock en dur (`MOCK_PRODUCTS`/`MOCK_OPPORTUNITIES`), avec un commentaire explicite indiquant que la vraie collecte arrive en Phase 3-4.
- **La table `ai_spend` existe-t-elle ?** Oui, en schéma (`bigquery/01_ai_spend.sql`), mais vide — rien ne l'alimente encore (aucun appel IA câblé dans le repo).
- **Les alertes de budget GCP sont-elles configurées ?** Non vérifiable depuis le repo (config d'infra hors dépôt Git) — à confirmer par l'utilisateur côté console GCP.
- **App Check est-il réellement actif ou juste configuré ?** Juste partiellement configuré : un seul callable (`ping`) l'impose côté serveur ; côté client, le module d'initialisation fait partie du dossier `lib/` manquant (§1), donc non actif actuellement.
- **Où vivent les moteurs (verdict, estimations, ranking) ?** Le calcul (verdict, earnings, opportunity) est déjà dans `packages/core/src/**`, conformément à l'intention de l'architecture (fonctions pures, zéro import Firebase, vérifié par test). `packages/shared` contient les types/schémas/taxonomies, pas de logique de calcul — la séparation core/shared est **déjà correcte**, contrairement à l'hypothèse de départ de l'utilisateur.

## 4. Résultats bruts des commandes (résumé)

```
pnpm install               → OK, 634 paquets résolus, 40s
pnpm typecheck (turbo)     → 6/7 packages verts (shared, core, collector, jobs, functions,
                              firestore-rules-tests n/a) ; apps/web ROUGE :
                              - ~30 erreurs TS2307 "Cannot find module '@/lib/...'" (attendu, §1)
                              - 5 erreurs TS7006 implicit-any préexistantes, indépendantes du
                                problème lib/ : onboarding/niches/page.tsx:54 (niche, i),
                                simulateur/page.tsx:21,51 (p), watchlist/page.tsx:30,50 (p, item)
                                → violent le "TypeScript strict, zéro any" de la règle invariante #1,
                                à corriger dès que le dossier lib/ sera reçu et que ces fichiers
                                seront de nouveau typecheckables en contexte.
pnpm test (turbo)          → packages/core: 1/1 ✓ · packages/shared: 4/4 ✓ ·
                              firestore-rules-tests: 30 SKIPPED (pas d'émulateur dans ce run turbo,
                              nécessite le wrapper firebase emulators:exec — voir ligne suivante)
pnpm test:rules (émulateur)→ 30/30 ✓ (voir §3)
pnpm lint (turbo)          → apps/web ROUGE : 1 erreur (next-env.d.ts, triple-slash-reference,
                              fichier auto-généré par Next.js) + 1 warning (postcss.config.mjs,
                              export anonyme) — mineur, indépendant du problème lib/, pré-existant
git ls-files | wc -l       → 115 fichiers trackés
wc -l (.ts/.tsx trackés)   → 3664 lignes au total ; plus gros fichiers : rules.test.ts (511),
                              admin/(dashboard)/page.tsx (209), compte/page.tsx (276)
grep TODO/FIXME/HACK/@ts-ignore/@ts-expect-error → 0 occurrence, repo entier
node --version              → v22.22.2 (root package.json exige >=20, OK ;
                              functions/package.json exige exactement "20" → warning pnpm à
                              chaque commande, sans faire échouer le build)
```

## 5. Risques et dettes identifiées

1. **Dossier `apps/web/src/lib/` manquant** — bloque tout typecheck/build d'`apps/web` tant que l'utilisateur ne pousse pas les vrais fichiers (décision actée : pas de stub, voir §1).
2. **5 erreurs `implicit any`** dans `onboarding/niches`, `simulateur`, `watchlist` — préexistantes, indépendantes de #1, à corriger (violent la règle invariante "TypeScript strict, zéro any").
3. **Chaîne de données non fermée** : collector (Phase 3, non codé) → BigQuery (schéma seul, 0 ligne) → jobs (Phase 4, stub) → Firestore (rules prêtes, rien à lire) → UI (mock pur). Confirme le diagnostic du chemin critique de l'utilisateur : rien dans `apps/web` n'affiche de données réelles tant que `apps/jobs` n'existe pas.
4. **App Check client non actif** — dépend aussi du dossier `lib/` manquant.
5. **Placeholders légaux non remplis** (`mentions-legales`, `retractation`) — à compléter avant mise en production, comme déjà noté dans le code lui-même.
6. **Pas de CGU d'affiliation séparée** — seulement une section dans les CGU générales.
7. **`functions/package.json` exige Node 20 strictement** alors que l'environnement tourne en Node 22 — warning pnpm à chaque commande ; sans impact fonctionnel aujourd'hui, mais à aligner un jour (soit assouplir la contrainte, soit fixer Node 20 dans l'environnement CI/déploiement).
8. **Lint `apps/web` rouge** sur un fichier auto-généré (`next-env.d.ts`) — probablement un souci de configuration ESLint (ce fichier devrait être exclu), à corriger séparément du problème `lib/`.
