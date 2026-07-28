# STATE — Kairos

Source de vérité du projet. Lu en premier à chaque session, mis à jour en dernier.

## Snapshot

- Date : 2026-07-28
- Branche : `claude/check-old-conversations-o3nwu4` (à jour avec `main`)
- Dernier commit avant LOT 0 : `50b02c0` "Initial commit: monorepo foundations, auth, onboarding, admin dashboard"

## Décisions actées

1. **`.gitignore` corrigé** — la règle nue `lib/` (ligne 4) ignorait par erreur `apps/web/src/lib/` (code source) en plus des dossiers de build de `packages/*`. Remplacée par `/packages/*/lib/`. Voir `docs/AUDIT.md` §1.
2. **Pas de stub pour `apps/web/src/lib/`** — ce dossier (8 modules : auth, auth-context, app-check, firestore/{user,admin,invite-codes,watchlist}, mock/products, niches) n'a jamais été commité, probablement à cause du bug ci-dessus. L'utilisateur a confirmé avoir vraisemblablement le vrai code ailleurs et le poussera lui-même. **Décision : ne rien fabriquer à sa place.**
3. **Périmètre du critère "typecheck/test propre" pour LOT 0** — redéfini pour exclure `apps/web` tant que le point 2 n'est pas résolu par l'utilisateur :
   - Verts et vérifiés : `packages/core`, `packages/shared`, `apps/collector`, `apps/jobs`, `functions`, tests de règles Firestore (30/30 contre l'émulateur réel).
   - Rouge et documenté (pas un échec du lot) : `apps/web` typecheck (~30 erreurs `Cannot find module '@/lib/...'`) + lint (1 erreur sur fichier auto-généré `next-env.d.ts`).
4. **Séparation `packages/core` / `packages/shared`** — déjà correcte à l'audit (core = moteurs purs verdict/earnings/opportunity, shared = types/schémas Zod). Contrairement à l'hypothèse initiale de l'utilisateur, pas d'inversion à corriger — le LOT 1 de sa consigne d'origine ("consolider les moteurs dans core") est déjà largement fait ; reste à vérifier la couverture de tests (≥10 scénarios) et l'extraction des poids/seuils dans `packages/core/config/weights.ts`.

## État courant par domaine

Voir le tableau complet dans `docs/AUDIT.md` §2. Résumé :

| Domaine | État |
|---|---|
| Auth, onboarding, compte, admin | Code réel mais non compilable (bloqué par le point 2) |
| `/admin/couts` | Absent |
| Pages légales | Présentes, placeholders société non remplis, pas de CGU d'affiliation séparée |
| Classements, watchlist, simulateur | 100 % maquette (mock data), aucune donnée réelle branchée |
| `apps/collector` | Health-check seul, sources non implémentées (Phase 3) |
| `apps/jobs` | Stub, pipeline quotidien non implémenté (Phase 4) |
| BigQuery | Schéma complet (10 tables DDL), 0 ligne de données |
| `firestore.rules` + tests | Solides, tests réels et **verts** (30/30) |
| App Check | Partiel côté serveur (1 callable), inactif côté client |
| `packages/core` / `packages/shared` | Moteurs réels, séparation propre, zéro import Firebase dans core |
| `<EstimatedValue>` | Composant déjà bien construit, réutilisable |

**Chemin critique confirmé** : collector (absent) → BigQuery (vide) → jobs (absent) → Firestore → UI (mock). Rien dans `apps/web` n'affiche de données réelles tant que `apps/jobs` (Lot 3 du backlog ci-dessous) ne tourne pas.

## Backlog des lots

Un lot = une branche = une PR. Détails et critères d'acceptation dans les issues GitHub correspondantes (`dais-heroique/Kairos`).

- **Lot 1** — Consolider les moteurs dans `packages/core` (tests de scénarios, poids/seuils externalisés) → [issue #1](https://github.com/dais-heroique/Kairos/issues/1)
- **Lot 2** — Collector : vraies données à coût maîtrisé (BigQuery, Playwright avec blocage de ressources, proxies, circuit breaker, Cloud Tasks) → [issue #2](https://github.com/dais-heroique/Kairos/issues/2)
- **Lot 3** — `apps/jobs` : pipeline quotidien (le lot qui débloque tout) → [issue #3](https://github.com/dais-heroique/Kairos/issues/3)
- **Lot 4** — Brancher l'UI existante sur le réel (classements, watchlist en pipeline, simulateur) → [issue #4](https://github.com/dais-heroique/Kairos/issues/4)
- **Lot 5** — Garde-fous de coût (`ai_spend`, quotas IA, `/admin/couts`) → [issue #5](https://github.com/dais-heroique/Kairos/issues/5)
- **Lot 6** — Créa DNA + Brief + Téléprompteur → [issue #6](https://github.com/dais-heroique/Kairos/issues/6)
- **Lot 7** — Affiliation 30 % → [issue #7](https://github.com/dais-heroique/Kairos/issues/7)
- **Lot 8** — Sample Radar + Compliance Guard → [issue #8](https://github.com/dais-heroique/Kairos/issues/8)

## LOT 0 — statut

- [x] Audit réel exécuté (install, typecheck, test, lint, tests de règles contre émulateur) — `docs/AUDIT.md`
- [x] `.gitignore` corrigé (root cause du dossier `lib/` manquant identifiée et documentée)
- [x] `docs/STATE.md` initialisé
- [x] 8 issues GitHub créées (une par lot, critères d'acceptation copiés de la consigne)
- [ ] Commit + push sur `claude/check-old-conversations-o3nwu4`

**Point de reprise** : une fois les issues créées et le commit poussé, LOT 0 est terminé. La prochaine session doit d'abord demander à l'utilisateur s'il a pu pousser le dossier `apps/web/src/lib/` manquant — c'est le seul bloqueur avant d'attaquer le Lot 1 ou le Lot 3 en toute confiance sur un `apps/web` qui compile.

## Coût mensuel projeté

Aucun changement — LOT 0 ne touche à aucune infrastructure payante (pas d'appel IA, pas de déploiement, pas de nouvelle ressource GCP provisionnée).
