# STATE — Kairos

Source de vérité du projet. Lu en premier à chaque session, mis à jour en dernier.

## Snapshot

- Date : 2026-07-28
- Branche : `claude/check-old-conversations-o3nwu4`
- Dernier commit : LOT 3 (`3ce0b9d` au moment de cette mise à jour) — Lots 0, 1, 2, 3 faits et poussés.

## Décisions actées

1. **`.gitignore` corrigé** — la règle nue `lib/` (ligne 4) ignorait par erreur `apps/web/src/lib/` (code source) en plus des dossiers de build de `packages/*`. Remplacée par `/packages/*/lib/`. Voir `docs/AUDIT.md` §1.
2. **Pas de stub pour `apps/web/src/lib/`** — ce dossier (8 modules : auth, auth-context, app-check, firestore/{user,admin,invite-codes,watchlist}, mock/products, niches) n'a jamais été commité. L'utilisateur le poussera lui-même depuis son PC — **décision reconfirmée après LOT 0 : ne rien fabriquer à sa place**, y compris pendant les lots 1-8. `apps/web` reste donc rouge au typecheck jusqu'à ce que ce dossier arrive.
3. **Une seule branche pour tous les lots** — l'utilisateur a explicitement annulé sa propre règle "un lot = une branche = une PR" pour ce round : tout (Lots 1 à 8) part sur `claude/check-old-conversations-o3nwu4`, un commit par lot, pas de PR séparée, pas de pause d'approbation entre les lots.
4. **Aucun identifiant externe fourni** ("je te donne rien pour l'instant, prépare tout") — TikTok/proxies, GCP réel, Stripe, Gemini/Claude. Tout le code écrit est réel et testé (émulateur Firestore pour ce qui touche Firestore, mocks pour BigQuery/HTTP/Stripe/IA), avec un balisage explicite de ce qui est vérifié ici vs. ce qui attend de vraies clés/infra. Voir le "Checklist de configuration utilisateur" plus bas — elle grossit à chaque lot.
5. **Séparation `packages/core` / `packages/shared`** — déjà correcte structurellement à l'audit LOT 0, mais **correction importante après lecture du code réel (Lot 1)** : les 3 moteurs (`computeVerdict`, `computeEarnings`, `computeOpportunityScore`) étaient des stubs qui levaient `throw new Error("not implemented")`, pas juste "à consolider". Ils sont maintenant réellement implémentés (voir Lot 1 ci-dessous).
6. **`insufficient_data`** — pas de 5e valeur ajoutée à `verdictLabelSchema` (reste `entrer_maintenant/avec_un_angle/risque/eviter`). À la place : verdict `"risque"` + `productEstimates.method: "insufficient_data"` (déjà dans le schéma `estimate.ts`) + une ligne de `reasoning[]` explicite. Non cassant pour le schéma existant.
7. **`packages/core/config/weights.ts`** (et non `packages/core/config/weights.ts` à la racine du package comme suggéré initialement) — placé sous `src/config/` pour rester dans le `rootDir`/`include` du `tsconfig.json` du package (`"include": ["src"]`), sinon `tsc` échoue ("File is not under rootDir").

## État courant par domaine

| Domaine | État |
|---|---|
| `packages/core` (verdict/earnings/opportunity) | ✅ **réel**, 17 tests, 10 scénarios nommés couverts (Lot 1) |
| `apps/collector` | ✅ plomberie réelle (BigQuery writers, circuit breaker Firestore, rotation proxy, blocage ressources, hot/cold) + `thirdparty` prêt pour un vrai fournisseur ; ⚠️ `tiktok-web`/`tiktok-api` best-effort, non validés contre le site réel (Lot 2) |
| `apps/jobs` | ✅ **pipeline complet et vérifié contre l'émulateur Firestore réel** (18 tests, idempotence + dry-run prouvés) (Lot 3) |
| Auth, onboarding, compte, admin (`apps/web`) | Code réel mais non compilable (bloqué par la décision #2 ci-dessus) |
| `/admin/couts` | Absent (Lot 5) |
| Classements, simulateur (`apps/web`) | ✅ branchés sur les vraies données (Lot 4) — `classements/produits`, `classements/opportunites` lisent `rankings/*` via `server/firestore/rankings.ts` (2 opérations Firestore/page, testé), simulateur utilise `computeEarnings` (Lot 1) sur de vrais produits |
| Watchlist (`apps/web`) | ✅ pipeline affiché (statut watching→…→dropped, schéma déjà présent), affichage minimal (ID produit, pas encore de fiche enrichie) |
| Pages détail `/produit/[id]`, `/boutique/[id]`, `/createur/[id]` | ✅ nouvelles, SSR indexables — ⚠️ nécessitent le plan Blaze Firebase (Cloud Functions/Cloud Run pour le SSR dynamique), contrairement au reste du site qui reste sur Spark (gratuit) ; décision de coût à confirmer avant déploiement |
| Règle ESLint anti-nombre-nu | ✅ `kairos/no-raw-estimate-number`, testée (7 tests) |
| Test de budget de lecture Firestore | ✅ `read-budget.test.ts`, prouve ≤5 opérations/page contre l'émulateur réel |
| BigQuery | Schéma complet (11 tables DDL avec `video_comments`), 0 ligne de données réelles (aucune infra GCP branchée depuis cette session) |
| `firestore.rules` + tests | Solides, tests réels et **verts** (30/30) |
| App Check | Partiel côté serveur (1 callable), inactif côté client (bloqué par la décision #2) |
| `<EstimatedValue>` | Composant déjà bien construit, réutilisable (Lot 4 s'en servira) |
| Garde-fous de coût IA (`packages/ai-gateway`) | ✅ nouveau package — `callAI` unique point d'entrée (quota → plafond global → appel → log), quotas par plan (Free 3/mois, Creator 60, Pro 200), 12 tests verts. Écriture double : BigQuery `ai_spend` (audit) + Firestore (lecture rapide quota/plafond) |
| `/admin/couts` | ✅ nouveau, hérite du garde admin existant, 1 requête BigQuery/page |
| Créa DNA (`apps/creative-dna`) | ✅ nouveau service — filtre de sélection (phase émergence/croissance, ≥5 créateurs, commission ≥8%), sélection top 12 vidéos par `gmvPer1kViews`, analyse Gemini via `callAI` (1 retry puis échec propre par vidéo), agrégation `creativeSummary`. 15 tests verts. ⚠️ jamais appelé de vraie API Gemini (aucune clé dans ce bac à sable) |
| Brief + cache (`packages/shared/src/brief.ts`) | ✅ schéma + clé de cache `(produit × niche × fourchette d'abonnés)`, testée déterministe. `briefCache/*` dans `firestore.rules` (lecture signée, écriture serveur), 31/31 tests de règles verts avec ce nouvel ajout. Génération du brief Claude elle-même pas encore câblée (texte du prompt à écrire une fois Gemini validé en conditions réelles) |
| Téléprompteur | ✅ `apps/web/src/components/Teleprompter.tsx` — plein écran, vitesse réglable, mode miroir, fort contraste, 6 tests verts (React Testing Library + jsdom), zéro dépendance IA/Firebase |
| Affiliation 30% (`packages/affiliate`) | ✅ nouveau package pur (argent réel, même rigueur que le Lot 1) — commission 30%/12 mois + palier Ambassadeur à vie, rétention 30j, seuil 25€, déclenchement Stripe Connect (jamais à l'inscription), mode crédit, first-touch 90j + saisie manuelle 7j, anti-fraude (auto-parrainage = score 100), clawback, kit de partage (QR + légendes, offline). 37 tests verts, zéro import Firebase |
| CGU affiliation | ✅ `apps/web/src/app/cgu-affiliation/page.tsx`, séparée des CGU générales |

**Chemin critique débloqué** : `apps/jobs` (Lot 3) sait maintenant produire les 9 documents de classement + feeds + `products/{id}.latestVerdict/latestEstimates/ranks` à partir de données BigQuery (ou fixtures en test). Reste à brancher `apps/collector` sur de vraies données (Lot 2 fait la plomberie, pas encore le scraping validé) et `apps/web` sur ces documents (Lot 4, bloqué par le `lib/` manquant pour la vérification complète).

## Checklist de configuration utilisateur (grossit à chaque lot)

À faire par l'utilisateur avant que les lots correspondants tournent en conditions réelles :
- Pousser `apps/web/src/lib/` (8 modules) — bloque `apps/web` et donc la vérification complète des Lots 4/5/8. Le vrai `lib/firestore/watchlist.ts` doit maintenant aussi exporter `updateWatchlistStatus(uid, productId, status: WatchlistStatus)` et `getWatchlistEntries(uid): Promise<WatchlistEntry[]>` (Lot 4, page watchlist).
- Choisir un vrai fournisseur de données tierces et renseigner `THIRDPARTY_PROVIDER_BASE_URL`/`THIRDPARTY_PROVIDER_API_KEY` (Lot 2) — ou valider/corriger les endpoints hypothétiques de `tiktok-api.ts`/`tiktok-web.ts` contre le site réel.
- Provisionner un vrai projet GCP (`GCP_PROJECT_ID`, `BIGQUERY_DATASET`, credentials) — rien n'a encore écrit de vraies données BigQuery.
- `PROXY_LIST_URL`/`PROXY_USERNAME`/`PROXY_PASSWORD` pour le collector.
- **Décision à prendre** : les nouvelles pages détail `/produit/[id]`, `/boutique/[id]`, `/createur/[id]` (Lot 4) sont du SSR dynamique — Firebase Hosting exige le plan **Blaze** (payant) pour ça, contrairement au reste du site qui reste volontairement sur Spark (gratuit). À confirmer avant déploiement, ou renoncer à ces pages / les rendre statiques avec un jeu de produits limité.
- `COLLECTOR_SERVICE_TOKEN` pour sécuriser l'endpoint `/tasks/collect` en production (sans lui, l'auth est désactivée — ne pas déployer sans le fixer).
- Configurer les alertes de budget GCP à 50/80/100% — non exécutable depuis cette session (nécessite un compte de facturation réel). Commande type à adapter :
  `gcloud billing budgets create --billing-account=<ID> --display-name="Kairos IA" --budget-amount=<montant>EUR --threshold-rule=percent=0.5 --threshold-rule=percent=0.8 --threshold-rule=percent=1.0`
- Vérifier/ajuster `DEFAULT_MODEL_PRICING` dans `packages/ai-gateway/src/spend-guard.ts` contre les tarifs réels de Gemini/Claude au moment du déploiement (valeurs actuelles provisoires).
- Créer le document Firestore `config/costGuards` (`{ dailyCapCents: <valeur> }`) — sans lui, le plafond par défaut (50€/jour) s'applique silencieusement.
- **Lot 7** : `apps/web/src/server/stripe/connect.ts` (création de compte Connect + webhooks) n'a pas été écrit — la logique de déclenchement (`shouldCreateStripeConnectAccount`, testée) est prête, mais le paquet `stripe` n'est pas installé et il n'y a pas de clé de test pour vérifier un vrai appel API ; écrire ce wrapper une fois une clé Stripe test disponible plutôt que deviner l'intégration. Ajouter aussi `stripe`, `STRIPE_CONNECT_WEBHOOK_SECRET` déjà dans `.env.example`.
- Fournir des templates de design pour les 3 visuels 1080×1920 du kit de partage (Lot 7) — seuls le QR code et les légendes texte sont générés (`packages/affiliate/src/share-kit.ts`), la composition d'image via `sharp` dépend d'assets non fournis dans cet environnement.

## Backlog des lots

Une seule branche pour tout ce round (voir décision #3), un commit par lot. Détails et critères d'acceptation dans les issues GitHub (`dais-heroique/Kairos`).

- [x] **Lot 1** — Consolider/implémenter les moteurs dans `packages/core` → [issue #1](https://github.com/dais-heroique/Kairos/issues/1) — fait, 17 tests verts
- [x] **Lot 2** — Collector : plomberie réelle + sources best-effort → [issue #2](https://github.com/dais-heroique/Kairos/issues/2) — fait, 39 tests verts
- [x] **Lot 3** — `apps/jobs` : pipeline quotidien → [issue #3](https://github.com/dais-heroique/Kairos/issues/3) — fait, 18 tests verts dont 6 contre l'émulateur réel
- [x] **Lot 4** — Brancher l'UI existante sur le réel → [issue #4](https://github.com/dais-heroique/Kairos/issues/4) — fait, 10 tests verts (règle ESLint + budget de lecture), reste bloqué au typecheck complet par le `lib/` manquant
- [x] **Lot 5** — Garde-fous de coût (`ai_spend`, quotas IA, `/admin/couts`) → [issue #5](https://github.com/dais-heroique/Kairos/issues/5) — fait, 12 tests verts (`packages/ai-gateway`)
- [x] **Lot 6** — Créa DNA + Brief + Téléprompteur → [issue #6](https://github.com/dais-heroique/Kairos/issues/6) — fait, 21 tests verts (15 `apps/creative-dna` + 3 `packages/shared` brief + 6 Téléprompteur), génération du brief Claude lui-même pas câblée (dépend de la validation Gemini en conditions réelles)
- [x] **Lot 7** — Affiliation 30 % → [issue #7](https://github.com/dais-heroique/Kairos/issues/7) — fait, 37 tests verts (`packages/affiliate`), câblage Stripe Connect réel non écrit (voir checklist ci-dessus)
- [ ] **Lot 8** — Sample Radar + Compliance Guard → [issue #8](https://github.com/dais-heroique/Kairos/issues/8)

**Point de reprise** : Lot 8 (Sample Radar + Compliance Guard) — dernier lot du round.

## Coût mensuel projeté

Toujours aucun changement — aucun appel IA, aucun déploiement, aucune ressource GCP payante provisionnée depuis cette session (tout tourne en local/émulateur/mocks).
