# STATE — Kairos

Source de vérité du projet. Lu en premier à chaque session, mis à jour en dernier.

## Snapshot

- Date : 2026-07-29 (mise à jour : 2026-07-31, fin de journée)
- Branche : `main` (la branche `claude/check-old-conversations-o3nwu4` a été fusionnée dans `main`, commit `cb407a2`)
- **Lots 0 à 8 faits, fusionnés dans `main`, et `apps/web/src/lib/` reçu de l'utilisateur (commit `10e379d`).**
- **`pnpm typecheck` et `pnpm lint` sont 100 % verts sur les 12 packages/apps.**
- **🚀 EN LIGNE : <https://kairos-on.web.app>** — build 100 % statique, plan Spark (gratuit) préservé, aucune Cloud Function déployée.
- **Le pipeline tourne réellement**, mais sur des relevés saisis à la main (voir décision #8) : aucune collecte automatisée n'est branchée.

## Décisions actées

1. **`.gitignore` corrigé** — la règle nue `lib/` (ligne 4) ignorait par erreur `apps/web/src/lib/` (code source) en plus des dossiers de build de `packages/*`. Remplacée par `/packages/*/lib/`. Voir `docs/AUDIT.md` §1.
2. **Pas de stub pour `apps/web/src/lib/`** — décision tenue du LOT 0 au LOT 8 : rien fabriqué à sa place. **Résolu le 2026-07-31** : l'utilisateur a poussé les 11 fichiers réels depuis son PC (commit `10e379d` sur `main`), fusionnés dans cette branche (`dd00371`). Il manquait `getWatchlistEntries`/`updateWatchlistStatus` dans `firestore/watchlist.ts` (nécessaires au pipeline watchlist du Lot 4/8) — ajoutés (`b19fa6b`). `apps/web` compile maintenant intégralement.
3. **Une seule branche pour tous les lots** — l'utilisateur a explicitement annulé sa propre règle "un lot = une branche = une PR" pour ce round : tout (Lots 1 à 8) part sur `claude/check-old-conversations-o3nwu4`, un commit par lot, pas de PR séparée, pas de pause d'approbation entre les lots.
4. **Aucun identifiant externe fourni** ("je te donne rien pour l'instant, prépare tout") — TikTok/proxies, GCP réel, Stripe, Gemini/Claude. Tout le code écrit est réel et testé (émulateur Firestore pour ce qui touche Firestore, mocks pour BigQuery/HTTP/Stripe/IA), avec un balisage explicite de ce qui est vérifié ici vs. ce qui attend de vraies clés/infra. Voir le "Checklist de configuration utilisateur" plus bas — elle grossit à chaque lot.
5. **Séparation `packages/core` / `packages/shared`** — déjà correcte structurellement à l'audit LOT 0, mais **correction importante après lecture du code réel (Lot 1)** : les 3 moteurs (`computeVerdict`, `computeEarnings`, `computeOpportunityScore`) étaient des stubs qui levaient `throw new Error("not implemented")`, pas juste "à consolider". Ils sont maintenant réellement implémentés (voir Lot 1 ci-dessous).
6. **`insufficient_data`** — pas de 5e valeur ajoutée à `verdictLabelSchema` (reste `entrer_maintenant/avec_un_angle/risque/eviter`). À la place : verdict `"risque"` + `productEstimates.method: "insufficient_data"` (déjà dans le schéma `estimate.ts`) + une ligne de `reasoning[]` explicite. Non cassant pour le schéma existant.
7. **`packages/core/config/weights.ts`** (et non `packages/core/config/weights.ts` à la racine du package comme suggéré initialement) — placé sous `src/config/` pour rester dans le `rootDir`/`include` du `tsconfig.json` du package (`"include": ["src"]`), sinon `tsc` échoue ("File is not under rootDir").
8. **Source de données : saisie manuelle, faute de mieux à 0 €** (2026-07-31). L'utilisateur a posé une contrainte ferme : *« je veux que ça ne me coûte rien, 0 euro »*. Les quatre pistes ont été explorées et fermées, dans cet ordre :
   - **API Affiliate officielle TikTok Shop** → la doc du Partner Center l'indique explicitement : *« Affiliate APIs are currently not available in the UK and EU markets »*. Les critères d'éligibilité créateur ne listent que US/UK/SEA. **Fermée pour la France**, malgré le fait que TikTok Shop soit bien live en FR (10 marchés européens depuis juin 2026).
   - **Scraping direct TikTok** (choix initial de l'utilisateur) → `shop.tiktok.com` renvoie un CAPTCHA anti-bot dès la première requête, avant même toute page produit. Contourner un CAPTCHA est exclu, et le scraping est contraire aux CGU TikTok. Les sélecteurs de `tiktok-web.ts`/`tiktok-api.ts` restent des hypothèses jamais validées.
   - **Kalodata** (suggéré par l'utilisateur : « prends les données de Kalodata ») → **refusé**. C'est un SaaS payant concurrent dont les données agrégées *sont* le produit ; les extraire pour alimenter un concurrent direct est un pillage de données, plus clairement problématique que de scraper TikTok.
   - **TikTok Creative Center** → gratuit, officiel, public, **France supportée** (vérifié : hashtags FR avec catégories, posts, vues). Mais ce sont des tendances de **contenu**, pas des produits TikTok Shop avec commissions. Utile plus tard pour des signaux de niche/timing, insuffisant pour les classements produits.

   **Retenu** : l'utilisateur relève lui-même les chiffres dans son propre espace affilié TikTok Shop — son accès, ses données, 0 €, parfaitement légal. Un relevé par produit par jour, qui est exactement la forme d'entrée de `computeVerdict`. Viable à l'échelle visée (l'utilisateur a précisé que le produit est « juste pour des amis »).
9. **Le pipeline tourne côté client, pas sur Cloud Run** (2026-07-31) — conséquence directe du plan Spark. `apps/web/src/lib/pipeline/run-pipeline.ts` rejoue la chaîne d'`apps/jobs` dans le navigateur : lecture des snapshots Firestore → `computeVerdict` + `computeOpportunityScore` (mêmes fonctions pures de `packages/core`) → écriture de `rankings/*`. Déclenché à la main depuis `/admin/produits`. `apps/jobs` reste la version serveur de référence pour le jour où une vraie collecte existera.
10. **Lecture publique du catalogue** (2026-07-31) — `products`, `shops`, `rankings` (+ `products/{id}/snapshots`) passent de `isSignedIn()` à `allow read: if true`, écriture réservée à `isAdmin()`. Raison : les pages de classement sont rendues sans utilisateur connecté, et le catalogue ne contient aucune donnée personnelle. Les collections utilisateur restent strictement cloisonnées.
11. **Pages détail rendues statiques plutôt que supprimées** (2026-07-31) — `/produit/[id]`, `/boutique/[id]`, `/createur/[id]` exigeaient le plan Blaze (SSR dynamique). Résolu par `generateStaticParams()` renvoyant `[]` + `dynamicParams = false` : le code reste intact, aucun lien du site n'y mène encore, et deux lignes suffisent à les réactiver le jour où Blaze est souscrit. **La décision « rester sur Spark » est donc tenue.**
12. **Thème blanc forcé** (2026-07-31) — suppression de la bascule `@media (prefers-color-scheme: dark)` de `globals.css`. Elle repassait tout le site en noir sur les appareils en mode sombre système, contre la consigne explicite et répétée de l'utilisateur (« le couleur principal donc partout doit être blanc pas noir »). Décision produit assumée, pas un oubli.

13. **Revue croisée du 2026-08-03 — la démo pouvait se faire passer pour du réel.** `seedDemoRankingData()` écrivait 10 produits inventés, avec des verdicts codés en dur (jamais passés par `computeVerdict`, sans le moindre relevé), dans **les mêmes documents** `rankings/products_FR_7d_all` et `rankings/opportunities_FR_7d_all` que le vrai pipeline lit et publie. Rien à l'écran ne les distinguait d'une analyse réelle, alors que la FAQ de la page d'accueil affirme noir sur blanc que les verdicts sont « appliqués à de vraies données produit ». Corrigé : drapeau `isDemo` sur le document, remonté jusqu'à l'UI par `getRankingPageData()`, et bandeau explicite (`RankingMeta`) qui dit que les produits sont fictifs. `runPipeline()` écrit `isDemo: false` et écrase donc la démo. **Le bouton reste utile pour tester l'interface — il ne peut simplement plus mentir.**
14. **Fraîcheur affichée** (2026-08-03) — `generatedAt` était écrit, lu par `getRankingPageData()`, puis **jeté** par les deux pages de classement. Avec une saisie manuelle, un classement peut dater de plusieurs jours ; or tout le produit repose sur le timing (« la fenêtre de tir avant saturation »). `RankingMeta` affiche l'âge, et bascule en alerte au-delà de 3 jours.
15. **Fuseau horaire de la saisie** (2026-08-03) — `todayIso()` utilisait `toISOString()` (UTC). Toute saisie faite entre minuit et 2h du matin heure française était classée à la date de la veille, et comme `capturedDate` sert d'ID de document, **elle écrasait le relevé de la veille** au lieu d'en créer un nouveau : un trou dans l'historique, donc une confiance de verdict dégradée (`maxAllowedGapDays`), causé par un simple décalage horaire. Passé en `Europe/Paris`.
16. **`method: "manual_entry"` n'existait pas dans le schéma** (2026-08-03) — `run-pipeline.ts` écrivait cette valeur dans `latestEstimates.method` alors que `estimateMethodSchema` ne la connaissait pas : tout `productSchema.parse()` sur un produit issu du pipeline client échouait. TypeScript ne voyait rien (`setDoc` accepte n'importe quelle forme). Valeur **ajoutée** au schéma plutôt que remplacée par `seller_declared` : le chiffre vient bien d'un relevé recopié à la main, autant le dire. Libellé utilisateur « relevé manuel » dans `<EstimatedValue>` — et c'est le `Record<EstimateMethod, string>` exhaustif de ce composant qui a fait remonter l'oubli au typecheck.
17. **Coût des lectures Firestore** (2026-08-03) — `listStoredProducts()` lisait *tous* les relevés de *tous* les produits uniquement pour les compter, puis `runPipeline()` les relisait intégralement : ~6 000 lectures par passage pour 50 produits × 60 jours, sur un quota gratuit de 50 000/jour. Le quota gratuit est ce qui tient réellement la contrainte « 0 € » — remplacé par `getCountFromServer()` (1 lecture par produit) + cache des noms de boutique.
18. **Constantes de confiance vendeur, non mesurées** (2026-08-03) — `shipDays: 5`, `commissionHonorRate: 0.95`, `sampleApprovalRate: 0.5`, `disputeRate: 0.03` étaient dupliquées à l'identique dans `product-entry.ts` et `run-pipeline.ts`, et alimentent `computeOpportunityScore`. Regroupées sous un seul nom explicite, `UNMEASURED_SELLER_TRUST`. Elles étant identiques pour tous les produits, elles ne changent pas *l'ordre* du classement, mais rendent le score d'opportunité **absolu** peu signifiant. **Décision produit non tranchée** — voir « Questions ouvertes ».

## Questions ouvertes (posées le 2026-08-03, aucune action prise)

Ces points sont des arbitrages, pas des bugs : ils ne sont pas corrigés unilatéralement.

- **Le catalogue est entièrement public.** `products`, `snapshots`, `shops`, `rankings` sont en `allow read: if true` (décision #10, prise pour que les pages statiques se chargent sans utilisateur connecté). Conséquence : n'importe qui peut vider toute la base avec quelques lignes de JS et la config Firebase, qui est publique par conception. Le verrouillage du plan gratuit (`FREE_PLAN_LIMIT`) est un rendu côté client — il ne peut rien empêcher. Sans objet tant que le produit est « pour des amis » ; bloquant le jour où il se vend. Solution à 0 € si besoin : scinder les données (public = ce que le plan gratuit peut voir ; le reste dans une collection dont les règles lisent le `plan` de l'utilisateur via `get()`).
- **App Check n'est pas actif** — `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` est vide dans `.env.production`. Sur le plan Spark, épuiser le quota gratuit ne coûte rien (0 € tient), mais **coupe le site** jusqu'au lendemain. C'est le garde-fou prévu contre ça.
- **Porte dérobée admin toujours ouverte** — `isBootstrapAdminEmail()` (`firestore.rules`) code en dur `contact.conforva@gmail.com`, avec un commentaire « BOOTSTRAP TEMPORAIRE — à supprimer après la première promotion admin » qui n'a jamais été suivi. Quiconque contrôle cette adresse peut se promouvoir admin, donc écrire dans tout le catalogue. À retirer une fois le compte admin réel en place.
- **Score d'opportunité partiellement fabriqué** (voir décision #18) — trois options : demander ces champs dans le formulaire, les retirer du calcul, ou afficher le score comme un rang plutôt qu'une note absolue.
- **`config/complianceRules` est vide** — le Compliance Guard tourne donc sur zéro règle. Il est inerte au moment précis où il servirait : la génération de briefs (Lot 6). À peupler **avant** de brancher Gemini/Claude, pas après. Contexte français : loi n°2023-451 sur l'influence commerciale (mentions « publicité »/« collaboration commerciale » obligatoires, allégations santé/beauté encadrées) — le brief dicte ce que le créateur va dire à l'écran.
- **L'identifiant produit est `slugify(titre)`** — deux titres proches entrent en collision et fusionnent leurs historiques ; renommer un produit en crée un nouveau et abandonne tout son historique de relevés. C'est l'actif le plus précieux du produit (il ne se reconstitue pas rétroactivement).
- **Pas de saisie rétroactive** — le formulaire écrit toujours à la date du jour. Un week-end ou un oubli crée un trou irrattrapable, alors que `saveProductWithSnapshot()` accepte déjà un paramètre `capturedDate` qu'il suffirait d'exposer.

## État courant par domaine

| Domaine | État |
|---|---|
| `packages/core` (verdict/earnings/opportunity) | ✅ **réel**, 17 tests, 10 scénarios nommés couverts (Lot 1) |
| `apps/collector` | ✅ plomberie réelle (BigQuery writers, circuit breaker Firestore, rotation proxy, blocage ressources, hot/cold) + `thirdparty` prêt pour un vrai fournisseur ; ⚠️ `tiktok-web`/`tiktok-api` best-effort, non validés contre le site réel (Lot 2) |
| `apps/jobs` | ✅ **pipeline complet et vérifié contre l'émulateur Firestore réel** (18 tests, idempotence + dry-run prouvés) (Lot 3) |
| Auth, onboarding, compte, admin (`apps/web`) | ✅ code réel, **compile et lint proprement** depuis la fusion de `lib/` |
| `/admin/couts` | Absent (Lot 5) |
| Classements, simulateur (`apps/web`) | ✅ branchés sur les vraies données (Lot 4) — `classements/produits`, `classements/opportunites` lisent `rankings/*` via `server/firestore/rankings.ts` (2 opérations Firestore/page, testé), simulateur utilise `computeEarnings` (Lot 1) sur de vrais produits |
| Watchlist (`apps/web`) | ✅ pipeline affiché (statut watching→…→dropped, schéma déjà présent), affichage minimal (ID produit, pas encore de fiche enrichie) |
| Pages détail `/produit/[id]`, `/boutique/[id]`, `/createur/[id]` | ⏸️ **neutralisées pour rester sur Spark** — `generateStaticParams()` renvoie `[]` + `dynamicParams = false`, donc 0 page générée et aucune Cloud Function. Code intact, réactivable en 2 lignes si Blaze est souscrit (décision #11) |
| Saisie manuelle des produits (`/admin/produits`) | ✅ **nouveau** — formulaire produit + relevé du jour → `products/{id}/snapshots/{date}`, badge `Nj` par produit (orange <3 jours, vert ≥3) |
| Pipeline côté client (`lib/pipeline/run-pipeline.ts`) | ✅ **nouveau** — rejoue la chaîne d'`apps/jobs` dans le navigateur sur les vrais moteurs `packages/core`, 4 tests verts sur la chaîne de calcul (décision #9) |
| Déploiement | ✅ **en ligne sur <https://kairos-on.web.app>** — 32 routes, 100 % statiques (`○`/`●`, aucune `ƒ`), Firestore rules déployées |
| Thème | ✅ blanc forcé partout, y compris en mode sombre système (décision #12) ; nav principale déplacée en haut (`sticky top-0`) |
| Verrouillage plan gratuit | ✅ pattern « ligne visible, gain flouté » au-delà du top 10 (observé chez Kalodata) au lieu de masquer les produits |
| Règle ESLint anti-nombre-nu | ✅ `kairos/no-raw-estimate-number`, testée (7 tests) |
| Test de budget de lecture Firestore | ✅ `read-budget.test.ts`, prouve ≤5 opérations/page contre l'émulateur réel |
| BigQuery | Schéma complet (11 tables DDL avec `video_comments`), 0 ligne de données réelles (aucune infra GCP branchée depuis cette session) |
| `firestore.rules` + tests | Solides, tests réels et **verts** (30/30) |
| App Check | Partiel côté serveur (1 callable) ; `initClientAppCheck` existe maintenant côté client (reçu avec `lib/`) mais son activation réelle dépend de `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` (pas configurée ici) |
| `<EstimatedValue>` | Composant déjà bien construit, réutilisable (Lot 4 s'en servira) |
| Garde-fous de coût IA (`packages/ai-gateway`) | ✅ nouveau package — `callAI` unique point d'entrée (quota → plafond global → appel → log), quotas par plan (Free 3/mois, Creator 60, Pro 200), 12 tests verts. Écriture double : BigQuery `ai_spend` (audit) + Firestore (lecture rapide quota/plafond) |
| `/admin/couts` | ✅ nouveau, hérite du garde admin existant, 1 requête BigQuery/page |
| Créa DNA (`apps/creative-dna`) | ✅ nouveau service — filtre de sélection (phase émergence/croissance, ≥5 créateurs, commission ≥8%), sélection top 12 vidéos par `gmvPer1kViews`, analyse Gemini via `callAI` (1 retry puis échec propre par vidéo), agrégation `creativeSummary`. 15 tests verts. ⚠️ jamais appelé de vraie API Gemini (aucune clé dans ce bac à sable) |
| Brief + cache (`packages/shared/src/brief.ts`) | ✅ schéma + clé de cache `(produit × niche × fourchette d'abonnés)`, testée déterministe. `briefCache/*` dans `firestore.rules` (lecture signée, écriture serveur), 31/31 tests de règles verts avec ce nouvel ajout. Génération du brief Claude elle-même pas encore câblée (texte du prompt à écrire une fois Gemini validé en conditions réelles) |
| Téléprompteur | ✅ `apps/web/src/components/Teleprompter.tsx` — plein écran, vitesse réglable, mode miroir, fort contraste, 6 tests verts (React Testing Library + jsdom), zéro dépendance IA/Firebase |
| Affiliation 30% (`packages/affiliate`) | ✅ nouveau package pur (argent réel, même rigueur que le Lot 1) — commission 30%/12 mois + palier Ambassadeur à vie, rétention 30j, seuil 25€, déclenchement Stripe Connect (jamais à l'inscription), mode crédit, first-touch 90j + saisie manuelle 7j, anti-fraude (auto-parrainage = score 100), clawback, kit de partage (QR + légendes, offline). 37 tests verts, zéro import Firebase |
| CGU affiliation | ✅ `apps/web/src/app/cgu-affiliation/page.tsx`, séparée des CGU générales |
| Sample Radar | ✅ `SampleRadarPrompt.tsx`, boucle 1-tap sur `status === "sample_requested"` dans la watchlist, 4 tests verts |
| Compliance Guard | ✅ `evaluateCompliance`/`hasBlockingIssues` (`packages/core`, pur, 8 tests verts), schéma `packages/shared/src/compliance.ts`, règle Firestore `config/complianceRules` admin-only (34/34 tests de règles verts avec cet ajout), page admin `/admin/compliance` (édition JSON, pas encore de formulaire dédié) |

**Chemin critique débloqué** : `apps/jobs` (Lot 3) sait produire les 9 documents de classement + feeds + `products/{id}.latestVerdict/latestEstimates/ranks` à partir de données BigQuery (ou fixtures en test), `apps/web` (Lot 4) les lit déjà. Il ne reste plus qu'un maillon vide dans la chaîne : `apps/collector` n'a pas encore de vraies données à collecter (Lot 2 = plomberie prête, scraping non validé contre le site réel, aucun projet GCP branché). Tout le reste — moteurs, pipeline, UI, coûts, créa, affiliation, compliance — est réel, testé, et compile.

**Contournement en place depuis le 2026-07-31** : ce maillon vide est comblé manuellement (décisions #8 et #9). La chaîne complète fonctionne donc de bout en bout — saisie → snapshots Firestore → moteurs `packages/core` → `rankings/*` → UI — mais la source des snapshots est un humain, pas un collector. Le jour où une vraie source existe, seule cette source change : les moteurs, les schémas et l'UI sont déjà les bons.

⚠️ **Conséquence à ne pas oublier** : un verdict n'a de sens qu'à partir de **3 relevés** (`minSnapshotsAbsolute = 3`). En dessous, `computeVerdict` renvoie volontairement un verdict `"risque"` dont le `reasoning[]` dit « Historique trop court » avec une confiance <0,1. Ces produits sont **affichés quand même** avec ce message, jamais masqués et jamais accompagnés d'un chiffre inventé.

### Piste ouverte : API TikTok Shop officielle (2026-07-31, en cours)

L'utilisateur affirme pouvoir obtenir un accès API TikTok Shop pour la France et va générer des identifiants. À traiter à la reprise :
- Variables déjà ajoutées à `.env.example` : `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET`, `TIKTOK_ACCESS_TOKEN`, `TIKTOK_REFRESH_TOKEN`, `TIKTOK_SHOP_CIPHER`, `TIKTOK_SHOP_ID`, `TIKTOK_API_BASE_URL`.
- **Question non tranchée** : quelle API exactement ? La **Seller API** (produits/commandes de sa propre boutique) est disponible en Europe ; l'**Affiliate API** (marketplace créateurs, taux de commission — celle dont KAIROS a réellement besoin) est documentée comme fermée à l'UE. À vérifier dans les scopes de son app avant d'écrire la moindre ligne.
- **Contrainte d'architecture** : les appels TikTok Shop sont signés en HMAC-SHA256 avec l'`app_secret`, qui ne doit jamais partir dans un bundle navigateur. Le pipeline client (décision #9) ne convient donc pas. Solution à 0 € : faire tourner **`apps/jobs` en local sur le PC de l'utilisateur** (déjà du Node, 18 tests verts), qui écrit dans Firestore ; le site statique lit Firestore. Aucun Cloud Run, plan Spark préservé.
- **Ne jamais demander ni manipuler l'`app_secret` en clair** : l'utilisateur le place lui-même dans son `.env.local`, le code lit `process.env`.

## Checklist de configuration utilisateur (grossit à chaque lot)

À faire par l'utilisateur avant que les lots correspondants tournent en conditions réelles :
- ~~Pousser `apps/web/src/lib/`~~ **Fait** (2026-07-31, commit `10e379d`).
- ~~**Décision Blaze vs Spark** pour les pages détail~~ **Tranché** (2026-07-31) : reste sur Spark, pages neutralisées mais conservées (décision #11).
- **En cours** : générer les identifiants API TikTok Shop et **les placer soi-même dans `.env.local`** (jamais les coller dans une conversation). Puis indiquer quels scopes l'app a réellement — voir « Piste ouverte » ci-dessus.
- Choisir un vrai fournisseur de données tierces et renseigner `THIRDPARTY_PROVIDER_BASE_URL`/`THIRDPARTY_PROVIDER_API_KEY` (Lot 2) — **seulement si l'API officielle ne couvre pas le besoin**. Les endpoints de `tiktok-api.ts`/`tiktok-web.ts` restent des hypothèses non validées, et le scraping direct est bloqué par CAPTCHA (décision #8) : ne pas les déployer en l'état.
- Provisionner un vrai projet GCP (`GCP_PROJECT_ID`, `BIGQUERY_DATASET`, credentials) — rien n'a encore écrit de vraies données BigQuery. ⚠️ Sans ça, `/admin/couts` et l'Admin SDK côté serveur dégradent volontairement vers un état vide plutôt que de faire échouer le build statique.
- `PROXY_LIST_URL`/`PROXY_USERNAME`/`PROXY_PASSWORD` pour le collector — **sans objet tant que le scraping n'est pas la voie retenue** (décision #8).
- `COLLECTOR_SERVICE_TOKEN` pour sécuriser l'endpoint `/tasks/collect` en production (sans lui, l'auth est désactivée — ne pas déployer sans le fixer).
- Configurer les alertes de budget GCP à 50/80/100% — non exécutable depuis cette session (nécessite un compte de facturation réel). Commande type à adapter :
  `gcloud billing budgets create --billing-account=<ID> --display-name="Kairos IA" --budget-amount=<montant>EUR --threshold-rule=percent=0.5 --threshold-rule=percent=0.8 --threshold-rule=percent=1.0`
- Vérifier/ajuster `DEFAULT_MODEL_PRICING` dans `packages/ai-gateway/src/spend-guard.ts` contre les tarifs réels de Gemini/Claude au moment du déploiement (valeurs actuelles provisoires).
- Créer le document Firestore `config/costGuards` (`{ dailyCapCents: <valeur> }`) — sans lui, le plafond par défaut (50€/jour) s'applique silencieusement.
- **Lot 7** : `apps/web/src/server/stripe/connect.ts` (création de compte Connect + webhooks) n'a pas été écrit — la logique de déclenchement (`shouldCreateStripeConnectAccount`, testée) est prête, mais le paquet `stripe` n'est pas installé et il n'y a pas de clé de test pour vérifier un vrai appel API ; écrire ce wrapper une fois une clé Stripe test disponible plutôt que deviner l'intégration. Ajouter aussi `stripe`, `STRIPE_CONNECT_WEBHOOK_SECRET` déjà dans `.env.example`.
- Fournir des templates de design pour les 3 visuels 1080×1920 du kit de partage (Lot 7) — seuls le QR code et les légendes texte sont générés (`packages/affiliate/src/share-kit.ts`), la composition d'image via `sharp` dépend d'assets non fournis dans cet environnement.
- Peupler `config/complianceRules` (Lot 8) — le document n'existe pas encore, `evaluateCompliance` reçoit un tableau de règles vide tant que personne ne l'a rempli via `/admin/compliance`.

## Backlog des lots

Une seule branche pour tout ce round (voir décision #3), un commit par lot. Détails et critères d'acceptation dans les issues GitHub (`dais-heroique/Kairos`).

- [x] **Lot 1** — Consolider/implémenter les moteurs dans `packages/core` → [issue #1](https://github.com/dais-heroique/Kairos/issues/1) — fait, 17 tests verts
- [x] **Lot 2** — Collector : plomberie réelle + sources best-effort → [issue #2](https://github.com/dais-heroique/Kairos/issues/2) — fait, 39 tests verts
- [x] **Lot 3** — `apps/jobs` : pipeline quotidien → [issue #3](https://github.com/dais-heroique/Kairos/issues/3) — fait, 18 tests verts dont 6 contre l'émulateur réel
- [x] **Lot 4** — Brancher l'UI existante sur le réel → [issue #4](https://github.com/dais-heroique/Kairos/issues/4) — fait, 10 tests verts (règle ESLint + budget de lecture) ; **typecheck complet confirmé le 2026-07-31** après réception de `lib/`
- [x] **Lot 5** — Garde-fous de coût (`ai_spend`, quotas IA, `/admin/couts`) → [issue #5](https://github.com/dais-heroique/Kairos/issues/5) — fait, 12 tests verts (`packages/ai-gateway`)
- [x] **Lot 6** — Créa DNA + Brief + Téléprompteur → [issue #6](https://github.com/dais-heroique/Kairos/issues/6) — fait, 21 tests verts (15 `apps/creative-dna` + 3 `packages/shared` brief + 6 Téléprompteur), génération du brief Claude lui-même pas câblée (dépend de la validation Gemini en conditions réelles)
- [x] **Lot 7** — Affiliation 30 % → [issue #7](https://github.com/dais-heroique/Kairos/issues/7) — fait, 37 tests verts (`packages/affiliate`), câblage Stripe Connect réel non écrit (voir checklist ci-dessus)
- [x] **Lot 8** — Sample Radar + Compliance Guard → [issue #8](https://github.com/dais-heroique/Kairos/issues/8) — fait, 12 tests verts (4 Sample Radar + 8 Compliance Guard), 34/34 tests de règles au global

**Tous les lots (0 à 8) sont terminés, fusionnés dans `main` et déployés.**

## Point de reprise pour la prochaine session

Le développement de fonctionnalités est terminé ; le site est en ligne et utilisable. Il ne reste que du branchement sur du réel, par ordre de priorité :

1. **API TikTok Shop** (bloquant pour tout le reste) — attendre que l'utilisateur ait ses identifiants, **puis d'abord vérifier quels scopes son app expose réellement** avant d'écrire du code. Si l'Affiliate API est bien fermée à l'UE comme le dit la doc, la Seller API ne donnera que sa propre boutique, pas le marketplace : ce serait à rediscuter avec lui plutôt qu'à contourner. Architecture cible : `apps/jobs` en local (voir « Piste ouverte »).
2. **Clés Gemini/Claude** (Lot 6) — la génération de brief n'est pas câblée.
3. **Clé Stripe test** (Lot 7) — `server/stripe/connect.ts` reste à écrire.
4. **Assets de design** pour le kit de partage (Lot 7).
5. **Projet GCP réel** — seulement si BigQuery devient nécessaire ; le produit fonctionne sans, Firestore suffit à l'échelle actuelle.

**À ne pas refaire** : les quatre impasses de source de données sont documentées en décision #8 (API Affiliate fermée UE, CAPTCHA TikTok, Kalodata refusé, Creative Center hors-sujet produits). Ne pas les réexplorer sans élément nouveau.

## Commandes utiles

```bash
pnpm typecheck && pnpm lint          # 12 packages, doit être 100 % vert
pnpm test                            # les suites émulateur échouent ici, c'est normal
pnpm test:rules                      # 34/34 contre l'émulateur Firestore
pnpm test:jobs-integration           # 18/18
pnpm test:web-integration            # 29/29
# Total vérifié le 2026-08-03 : 216 tests, tous verts.
```

**Déploiement** (⚠️ l'ordre compte — `.env.local` a priorité sur `.env.production` chez Next et injecterait la config émulateur dans le bundle de prod) :

```bash
cd /Volumes/Data3/KAIROS
mv apps/web/.env.local apps/web/.env.local.bak
firebase deploy --only firestore:rules,hosting
mv apps/web/.env.local.bak apps/web/.env.local
```

Vérifier dans la sortie de build que **toutes** les routes sont `○` ou `●` : une seule route `ƒ` (dynamique) déclencherait « Building a Cloud Function » et exigerait le plan Blaze.

**Volume ExFAT** : macOS sème des fichiers `._*` qui cassent vitest, ESLint et parfois `.git/objects/pack/`. En cas d'erreur bizarre : `find . -name "._*" -not -path "*/node_modules/*" -delete`, et `export COPYFILE_DISABLE=1` avant les builds.

## Coût mensuel projeté

**0 €**, et c'est une contrainte explicite de l'utilisateur, pas un état de fait transitoire. Firebase Spark (gratuit) : hébergement statique + Firestore. Aucune Cloud Function, aucun Cloud Run, aucun appel IA, aucune ressource GCP payante. Toute évolution qui casserait ça (SSR dynamique, collector hébergé, BigQuery) doit être validée avec lui au préalable.
