# STATE — Kairos

Source de vérité du projet. Lu en premier à chaque session, mis à jour en dernier.

## Snapshot

- Date : **2026-08-07**
- Branche : `main`, tout est fusionné et poussé. Aucune autre branche ne
  contient de travail (vérifié : `origin`, `origin/main` et
  `origin/claude/check-old-conversations-o3nwu4` pointaient toutes sur le
  même commit avant cette session).
- **🚀 EN LIGNE et à jour : <https://kairos-on.web.app>** — déployé avec
  `./scripts/deploy.sh`, règles Firestore comprises. Build 100 % statique,
  plan Spark préservé.
- **90 vrais produits TikTok Shop en base de production**, collectés via
  Apify, avec photos, prix, notes, avis et unités vendues.
- `pnpm typecheck` et `pnpm lint` verts sur les 12 packages. Tests
  (2026-08-09, émulateur compris) : **116 web, 82 core, 48 collector,
  51 règles, 37 affiliate, 35 shared, 18 jobs, 18 payments, 15 créa DNA,
  12 ai-gateway, 4 stripe-worker**. `core` passe à 82 (archive), `web` à 116.
- ⚠️ **Les classements de production sont périmés** : ils datent d'avant les
  décisions #52 à #55. Il faut **relancer le pipeline depuis `/admin`** pour
  que la production en bénéficie — sans ça, « Opportunités » garde son
  30/100 uniforme et Boutiques / Catégories / Nouveautés restent vides.
- ✅ **Parcours vérifié bout en bout le 2026-08-08** (Chromium contre les
  émulateurs) : inscription par lien email → onboarding → bootstrap admin →
  seed + pipeline → les 19 pages → fiche produit → brief. **0 problème
  d'affichage, 0 erreur applicative.** Les seules erreurs console viennent
  d'App Check qui tente de joindre `www.google.com/recaptcha` depuis un
  conteneur sans accès sortant — inactif en production
  (`NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` vide).

### ⚠️ Trois pièges qui font perdre du temps si on les ignore

1. **`pnpm build` avant tout** après un `git pull`. `packages/*/lib/` est
   gitignoré : un `lib/` périmé fait échouer `apps/web` sur des exports
   « manquants » qui existent pourtant dans `src/`. Symptôme typique :
   *« Module '@kairos/shared' has no exported member X »*.
2. **Ne jamais lancer `pnpm --filter @kairos/web build` pendant que le
   serveur de dev tourne** : le build de production écrase le `.next` du
   dev, qui répond ensuite « Internal Server Error » sur toutes les pages.
   Il faut `rm -rf apps/web/.next` puis redémarrer.
3. **`tests/firestore-rules/rules.test.ts` code le port 8080 en dur.** Il
   ignore `FIRESTORE_EMULATOR_HOST` : lancer l'émulateur sur un autre port
   fait échouer la suite en `TypeError: fetch failed`, et pire, elle passe
   silencieusement si un *autre* émulateur écoute sur 8080. Toujours lancer
   les émulateurs sur les ports du projet (8080 / 9099).

### Ce qu'il reste à trancher (par ordre d'impact)

1. **Les taux de commission.** Le simulateur et les gains affichés sont
   inertes sans eux. Vérifié sur deux actors Apify se présentant comme
   « affiliate » : le taux est une **donnée privée du compte affilié**,
   absente des pages produit publiques. Aucun scraper ne la sortira. Deux
   voies : saisie manuelle par produit (`/admin/produits`, le champ existe
   et est désormais préservé d'une collecte à l'autre), ou un taux
   d'hypothèse par niche **affiché comme tel**. La seconde touche à la
   promesse « jamais un chiffre inventé » — décision produit, pas technique.
2. **Collecter 2 jours de plus.** `computeVerdict` exige 3 relevés ; avec un
   seul jour, tous les verdicts disent « Historique trop court ». Aucun
   historique n'est fabriqué — c'est le comportement voulu. ⚠️ Ce n'est
   **pas gratuit** : ~0,48 € par collecte Apify, soit ~1 € pour les deux
   jours. `recover:apify` ne rejoue que des runs déjà facturés.

~~3. `DEFAULT_MEDIAN_CONVERSION_RATE` = 0,015 dans `RankingList`.~~
**Déjà réglé le 2026-08-03 par la décision #20**, cette entrée n'avait
jamais été retirée d'ici et a coûté une session à être revérifiée. La
constante n'existe plus : c'est `DEFAULT_EARNINGS_CONFIG.defaultConversionRate`
= **0,002** dans `packages/core/src/config/weights.ts`, source unique lue
par `RankingList`, `HeroEarningsTeaser`, `/produit`, `/tableau-de-bord` et
le simulateur. Reste un ordre de grandeur à calibrer, pas un placeholder à
10–30× près.

- **Le pipeline tourne réellement**, et désormais sur une vraie collecte
  Apify (voir la section Apify plus bas) en plus de la saisie manuelle.

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

19. **Marché de démonstration simulé plutôt qu'inventé** (2026-08-03) — `seed-demo-data.ts` n'écrit plus de verdicts. Il pose 22 produits TikTok Shop FR plausibles avec leur **historique quotidien de relevés** (`apps/web/src/lib/demo/market-simulation.ts`, déterministe par PRNG à graine), et c'est `runPipeline()` qui en déduit ensuite les verdicts avec les moteurs de production. Les chiffres du marché sont simulés, l'analyse est réelle — un bug de moteur se voit donc dans la démo au lieu d'y être masqué. 16 tests, dont cinq qui vérifient que `computeVerdict` **retrouve seul** la phase simulée (émergence, croissance, fin de croissance, maturité, déclin), sans qu'elle soit jamais écrite dans les données. Les cas limites sont représentés exprès : deux produits à 2 relevés (« historique trop court »), un avec un trou de collecte de 9 jours, deux en saturation brutale.
20. **Taux de conversion par défaut : 1,5 % → 0,2 %** (2026-08-03) — constaté en utilisant l'app : 8 000 vues devenaient 120 commandes, soit ~530 € annoncés pour un sérum à 16,90 €. En affiliation TikTok Shop on observe plutôt 1 à 3 commandes pour 1 000 vues. La valeur était codée en dur dans `RankingList.tsx`, et une **seconde** valeur (1,5 également) dans `SimulateurContent.tsx` : les deux écrans pouvaient diverger. Désormais une seule source, `DEFAULT_EARNINGS_CONFIG.defaultConversionRate`. Le curseur du simulateur allait de 0,5 % à 5 %, c'est-à-dire entièrement au-dessus du réel — la valeur crédible était hors de portée ; ramené à 0,05–2 %. **Surestimer le gain est la faute la plus grave pour un outil vendu sur son honnêteté** : le créateur tourne la vidéo, touche le dixième, et ne revient pas. Reste un ordre de grandeur à calibrer, pas une mesure.
21. **Le score d'opportunité ne récompense plus une phase inconnue** (2026-08-03) — `computeVerdict` renvoie, faute d'historique, un verdict prudent (« risque ») mais doit bien renvoyer *une* phase : c'est `"emergence"`, qui vaut 100, le maximum de `PHASE_SCORE`. Un produit saisi la veille sortait donc **7e sur 22** du classement « Opportunités », au-dessus de produits en croissance confirmée — verdict et classement se contredisaient. La note de phase est maintenant interpolée entre un score neutre (`UNKNOWN_PHASE_SCORE = 25`) et sa valeur pleine, proportionnellement à la confiance du verdict : aucun seuil arbitraire, et sans historique aucune phase ne peut rapporter de points. ⚠️ **Cela modifie les classements existants** — c'est voulu.
22. **« 0 €–0 € » ne s'affiche plus jamais** (2026-08-03) — `RequireAuth` ne vérifie que l'authentification, pas que l'onboarding soit terminé. Un profil incomplet laisse `avgViews` à 0, et **tout le classement affichait « Gains estimés 0 €–0 € (à confirmer) »** : un résultat qui a toutes les apparences d'un calcul abouti, et qui se lit « ces produits ne rapportent rien » alors qu'il faut lire « ton profil est incomplet ». `computeEarnings` renvoie désormais `insufficient_data`, `<EstimatedValue>` affiche un tiret pour cette méthode (protège tous les appelants d'un coup), et `RankingList` invite explicitement à compléter le profil.
23. **Trois correctifs d'affichage trouvés à l'usage** (2026-08-03) — (a) `toProductRankItem()` oubliait de mapper `emoji` : toutes les lignes retombaient sur l'icône générique 📦 alors que le pipeline l'écrivait bien ; (b) la watchlist affichait l'identifiant brut (`huile-ricin-cils-sourcils`) là où l'utilisateur revient chaque jour — elle montre maintenant emoji, titre, boutique, commission et verdict ; (c) `getPublicFirestore()` ne lisait que `FIRESTORE_EMULATOR_HOST`, que Next **n'inline pas** dans le bundle navigateur : en dev, `/admin` écrivait dans l'émulateur pendant que les classements lisaient la **production**, sans le moindre message d'erreur.

24. **Tableau de bord** (2026-08-04) — nouvelle page `/tableau-de-bord`, désormais le point d'arrivée après connexion et le premier onglet. Elle ne rejoue pas les classements : elle répond à « qu'est-ce que je tourne cette semaine ? ». Le pick prioritaire (pondéré par la niche déclarée), le reste du top 5 avec le gain cumulé, les fenêtres qui se referment, le pipeline watchlist par étape, les produits à laisser passer, et ceux qui n'ont pas encore assez d'historique — affichés, jamais masqués. Logique isolée en fonction pure testable (`lib/dashboard/build-dashboard.ts`, 15 tests), page à 4 lectures Firestore, sous le budget de 5.
25. **Le raisonnement du verdict est enfin affiché** (2026-08-04) — `reasoning[]` était recalculé à chaque passage du pipeline puis jeté. C'est pourtant ce qui distingue KAIROS d'un tableau de chiffres : « Phase growth depuis 21 jours, tendance +183% », « Saturation 24/100, principal facteur : boutiques concurrentes ». Les items de `rankings/*` embarquent maintenant `phase`, `saturationScore`, la fenêtre restante, la confiance, le raisonnement et le score d'opportunité — dénormalisés côté écriture (les deux pipelines, `apps/jobs/rank.ts` et `run-pipeline.ts`) pour ne pas relire un document par produit à l'affichage.
26. **Fiche produit, sans quitter le plan Spark** (2026-08-04) — `/produit/[id]` restait neutralisée (décision #11) : un utilisateur payant cliquait un produit et n'obtenait rien. Contourné par une route **fixe** `/produit?id=…`, statique par construction, qui lit l'identifiant dans la query string et travaille côté navigateur. Zéro Cloud Function, zéro euro. Elle montre le raisonnement, les gains personnalisés, et l'historique quotidien tracé par `SnapshotChart` (SVG écrit à la main — une librairie de graphes pour deux courbes ne se justifie pas).
27. **Habilitations centralisées + accès fondateur** (2026-08-04) — `packages/shared/src/entitlements.ts` remplace les tests de `plan.slug` réécrits dans chaque composant. `contact.conforva@gmail.com` et tout compte `role: "admin"` obtiennent l'équivalent du plan maximum. **L'accès est dérivé, jamais stocké** : le champ `plan` reste protégé par `planUnchanged()` dans les règles, et le modifier pour offrir un accès rouvrirait exactement la faille que cette règle ferme. Un abonnement `past_due`/`canceled` redescend au gratuit malgré son slug. 7 tests.
28. **« Phase growth depuis 2 jour(s) »** (2026-08-04) — lu à l'écran sur un produit en croissance depuis un mois. `daysInCurrentTrend` comparait les ventes jour par jour et rompait la séquence au premier creux, or le bruit quotidien réel dépasse largement `FLAT_EPSILON`. La série est maintenant lissée (moyenne glissante sur 3 points) avant d'être parcourue. Même famille de problème que la bande « maturity » signalée plus bas : des seuils calibrés plus fins que le bruit des données.

29. **Référencement : il n'y avait rien à indexer** (2026-08-05) — le vrai problème n'était pas des balises manquantes mais le fait que **tout le produit est derrière `<RequireAuth>`** : Google ne pouvait voir que la page d'accueil et les mentions légales. Un site de trois pages ne se positionne sur rien. Ajouté : `/methode`, page publique substantielle qui explique la méthode réellement implémentée (les cinq phases, les cinq indicateurs de saturation avec leurs poids, la formule de gain, ce qu'on refuse d'afficher) — **ses chiffres sont lus dans les constantes de `packages/core`**, donc elle ne peut pas devenir un discours marketing qui ne correspond plus au produit.
30. **Métadonnées, robots, sitemap, données structurées** (2026-08-05) — `metadataBase` (sans lui les balises Open Graph pointent nulle part : un lien partagé sur TikTok ou WhatsApp s'affiche sans titre), gabarit de titre, Open Graph + Twitter Card, mots-clés, `robots.txt` et `sitemap.xml` générés au build (fichiers statiques, aucune Cloud Function). Les chemins privés sont en `Disallow` **sans slash final** : `Disallow: /produit/` ne couvre pas `/produit?id=…`, dont le chemin est exactement `/produit` — précisément la forme utilisée par les fiches produit et les briefs. Données structurées `Organization`, `SoftwareApplication` et `FAQPage` sur l'accueil : la FAQ peut s'afficher dépliée dans les résultats Google. Un seul tarif déclaré, celui du plan gratuit — annoncer un prix Creator/Pro que personne ne peut payer serait une donnée structurée fausse.
31. **Le Compliance Guard était inerte** (2026-08-05) — `config/complianceRules` n'avait jamais été créé : le garde-fou évaluait chaque script contre un tableau vide, sans rien signaler et sans que rien ne l'indique. Pire qu'absent, puisqu'on se croit couvert. Ajout de `DEFAULT_COMPLIANCE_RULES_FR` (16 règles adossées à la loi n° 2023-451 sur l'influence commerciale, aux règlements CE 1223/2009 et 1924/2006, et au Code de la consommation), d'un bouton de chargement dans `/admin/compliance`, et d'un repli sur ces règles quand le document est absent ou mal formé. Le blocage reste minoritaire — un garde-fou qui crie sur tout finit ignoré ; deux règles ont d'ailleurs été repassées en avertissement parce que leur motif ne distingue pas la promesse (« ça soigne l'eczéma ») du démenti (« je n'ai pas d'eczéma »), et punir la formulation prudente aurait été absurde.
32. **Brief de tournage sans IA, parce que l'IA ne peut pas tourner ici** (2026-08-05) — le plan Spark interdit les Cloud Functions et une clé d'API n'a rien à faire dans un bundle navigateur : un bouton branché sur Gemini serait resté grisé. `packages/core/src/brief/build-brief.ts` construit le brief à partir de ce qu'on sait déjà — accroches choisies selon la **phase** (arriver en premier ou en cinquantième n'appelle pas la même vidéo), plan de tournage, script minuté, objections par famille de produit, interdits **dérivés des règles de conformité elles-mêmes** pour qu'ils ne puissent pas diverger de ce qui est contrôlé. Page `/brief?id=…` (statique, comme la fiche produit), branchée sur le téléprompteur existant. 17 tests, dont celui qui compte : **le script généré passe son propre contrôle de conformité dans les cinq phases** — un outil censé protéger le créateur ne peut pas produire ce que son garde-fou refuserait. La mention « Collaboration commerciale » est écrite dans le script, pas laissée à la bonne volonté.
33. **Deux bugs trouvés en écrivant ces règles** (2026-08-05) — (a) la règle de mention publicitaire utilisait `.*` dans son antislash-négatif, or `.` n'inclut pas les sauts de ligne : la recherche s'arrêtait à la première ligne et la règle se déclenchait dès que la mention se trouvait plus bas dans le script, c'est-à-dire presque toujours. Corrigé en `[\s\S]*`. (b) L'abrègement des titres coupait « Huile de ricin cils & sourcils » en « Huile de ricin cils », qui s'entend comme une phrase inachevée — il recule maintenant tant que le dernier mot ne peut pas clore le groupe, et retire le conditionnement (« 30 ml »), inutile à l'oral.

34. **Le moteur devient jouable au lieu d'être expliqué** (2026-08-05) — `/methode`, écrite la veille, était un mur de texte : exactement ce que personne ne lit. Or `computeVerdict` est une fonction pure, elle tourne gratuitement dans le navigateur. `VerdictPlayground` la met donc entre les mains du visiteur : quatre situations tapables (« La pépite », « Ça monte », « La ruée », « Trop tard ») qui couvrent **les quatre verdicts possibles**, cinq curseurs, et le verdict, la barre de saturation, la fenêtre restante et **le raisonnement** qui se réécrivent à chaque mouvement. Rien n'est truqué : le moteur reçoit la même forme de données que sur un produit réel, donc la page ne peut pas raconter autre chose que ce que fait le produit. Les cinq phases sont passées en `<details>` repliés, et les poids de saturation en barres — on voit d'un coup d'œil que la concurrence pèse trois fois la décélération des avis, sans comparer cinq pourcentages.
35. **Le curseur de gains dans le hero** (2026-08-05) — la carte d'accueil était figée (« Exemple — pas tes vraies données ») : on la regarde une seconde et on ferme. `HeroEarningsTeaser` demande « Tu fais combien de vues ? » et affiche la commission correspondante en direct, avec le vrai `computeEarnings` : 64–110 € à 10 000 vues, 1 774–2 580 € à 250 000. Le visiteur voit **son** chiffre avant d'avoir créé un compte — c'est la promesse du produit démontrée plutôt qu'annoncée, et toujours en fourchette avec son niveau de confiance.
36. **Alias `@/` ajouté à la configuration vitest d'`apps/web`** (2026-08-05) — Next résout ces chemins via `tsconfig`, vitest non : un composant important `@/components/X` compilait parfaitement mais était intestable. Découvert en écrivant les tests du bac à sable.

**Piste IA, quand une clé existera** : `packages/ai-gateway` (`callAI`, quotas, plafond) et `apps/creative-dna` sont prêts et testés. L'enrichissement du brief est la première brique à brancher — il apportera les tournures propres à chaque produit et les objections réellement lues en commentaires (`objectionsSource` passera de `"generic"` à `"real_comments"`). Architecture à 0 € : faire tourner l'appel depuis `apps/jobs` **en local**, jamais depuis le navigateur.

37. **Catalogue d'offres : une seule source** (2026-08-05) — `packages/shared/src/plans.ts` définit neuf capacités vendables, leur libellé, et ce que chaque plan débloque. `entitlementsOf()` **lit ce catalogue** au lieu d'avoir sa propre liste, et la page de tarifs comme la section « Les plans » de l'accueil en sont **entièrement dérivées** — il n'y a plus une seule fonctionnalité écrite à la main dans les fichiers de traduction. Une page qui promet ce que l'application ne délivre pas est une promesse non tenue payée par l'utilisateur ; c'était structurellement possible, ça ne l'est plus. Des tests vérifient que les plans forment une échelle (chacun contient le précédent) et que chaque palier payant apporte quelque chose de neuf — un palier qui n'ajoute rien ne se vend pas.
38. **Le plan gratuit garde l'information, pas la production** (2026-08-05) — Radar donne le classement **complet** avec les verdicts, la watchlist et le simulateur. Ce qui se vend : le détail des gains au-delà du top 10, l'historique jour par jour, le brief de tournage, les alertes (Creator), puis l'archive des classements (Pro). Un plan gratuit inutile ne convertit personne, il fait juste partir les gens avant qu'ils aient compris l'outil.
39. **Le paywall est enfin appliqué côté serveur, au moins une fois** (2026-08-05) — jusqu'ici il était **entièrement décoratif** : `products`, `shops`, `rankings` et `snapshots` étaient en `allow read: if true`, donc n'importe qui pouvait vider le catalogue avec la configuration Firebase publique et récupérer le produit gratuitement. Deux corrections : (a) tout le catalogue repasse à `isSignedIn()` — la lecture publique ne servait plus à rien depuis que les pages de classement sont derrière `<RequireAuth>` (voir la question ouverte du 2026-08-03, désormais close) ; (b) `products/{id}/snapshots` exige un **abonnement actif** via une nouvelle fonction `paidPlan()` dans les règles. L'historique est l'actif le plus long à reconstituer : un compte gratuit ne peut pas le lire, même en appelant Firestore directement. 6 tests de règles dédiés, dont « refuse un abonnement Pro impayé ».
40. **Conséquence attrapée au passage** (2026-08-05) — `getPublicFirestore()` créait une **seconde application Firebase nommée**, donc anonyme. Une fois le catalogue fermé, ses requêtes auraient été refusées alors même que l'utilisateur est connecté, et les classements se seraient affichés vides **sans erreur visible**. Elle réutilise maintenant l'application par défaut dans le navigateur. Le test de budget de lecture, lui, s'authentifie anonymement contre l'émulateur Auth — il mesure un nombre d'opérations, pas les règles, et doit donc se placer dans la situation réelle (`test:web-integration` démarre désormais `firestore,auth`).
41. **`PaywallGate` : montrer ce qu'on rate** (2026-08-05) — un paywall qui affiche « réservé aux abonnés » et rien d'autre est une porte fermée : l'utilisateur ne sait pas ce qu'il manque, donc il ne paie pas, il part. Le composant affiche un aperçu flouté et inerte de l'interface verrouillée, **toutes** les capacités du palier (la décision se prend sur la valeur totale, pas sur la fonctionnalité qu'on vient de heurter), le prix, et propose **le premier plan qui débloque** — jamais le plus cher. `LockedValue` fait la version compacte pour un gain masqué dans une liste : la ligne reste visible, seul le chiffre est retenu.
42. **Aucun prix inventé** (2026-08-05, **appliqué le 2026-08-10**) — `priceCents` valait `null` pour Creator et Pro, ce qui affichait « Bientôt » et « Pas encore ouvert » au lieu d'un bouton de paiement qui ne mène nulle part : annoncer un tarif qu'on ne peut pas facturer serait à la fois une donnée structurée fausse pour Google et une promesse commerciale intenable. **Creator est désormais tarifé** (19 €/mois, 190 €/an) parce que les prix existent réellement dans Stripe ; **Pro reste à `null`**, et la règle continue donc de s'appliquer à lui.

    Conséquence tirée le même jour : les données structurées (`JsonLd.tsx`) **dérivent maintenant du catalogue** au lieu de déclarer en dur la seule offre gratuite. Elles annonçaient encore « watchlist illimitée » pour le plan Radar, plafonné à 5 depuis la décision #70 — un tarif recopié à la main finit toujours par mentir, même quand il ne s'agit que du texte à côté.

43. **Deux fonctionnalités étaient vendues sans exister** (2026-08-05) — les **alertes** (seul un booléen `alertsEnabled` était écrit dans Firestore, aucune notification n'existe) et l'**archive des classements** (le document `rankings/*` porte un identifiant fixe, écrasé à chaque calcul : il n'y a aucun historique). Elles figuraient dans le catalogue au même niveau que le reste. Ajout d'un statut `live | soon` par capacité, affiché en toutes lettres — « pas encore là » — **à l'endroit exact où la fonctionnalité est annoncée**, pas dans une note de bas de page. Tests : le plan gratuit ne repose que sur des capacités `live`.
44. **Le jargon dégagé de toute l'interface** (2026-08-05) — « GMV », « saturation », « phase émergence », « fenêtre de tir », « pipeline » : ces mots désignent quelque chose de précis dans le code, et rien du tout pour quelqu'un qui débute — c'est-à-dire le public visé. Nouveau module `packages/shared/src/labels.ts` : `PHASE_LABELS` (« Personne n'en parle encore », « Ça décolle », « Beaucoup l'ont déjà fait », « Tout le monde en fait », « La vague est passée ») et `crowdingWording()` pour la concurrence. Un seul endroit, pour que les cinq écrans qui affichent une phase ne la nomment pas de cinq façons.
45. **Le `reasoning[]` du moteur réécrit** (2026-08-05) — c'est le texte le plus lu du produit : il s'affiche sur le tableau de bord, la fiche produit et le bac à sable public. Il était rédigé en vocabulaire interne (« Phase "growth" depuis 21 jour(s) », « Score de saturation 24/100, principal facteur : competingShops »). Devenu : « Ça décolle depuis 21 jours — les ventes ont augmenté de 183 % », « Concurrence : 24 sur 100. Ce qui pèse le plus : le nombre de boutiques qui le vendent ». Les noms de champs restent ceux du code, seules les phrases changent.
46. **Ce que l'app fait, dit concrètement** (2026-08-05) — les libellés de capacités décrivent l'action, plus la fonctionnalité : « Le texte à dire face caméra, minuté seconde par seconde, avec le plan des images à filmer » au lieu de « Brief de tournage ». Un test impose plus de six mots par libellé — en dessous, c'est une étiquette, pas une explication. La page d'accueil a été réécrite dans le même esprit, et la mention répétée « en euros, jamais en dollars » retirée (elle apparaissait trois fois ; une seule suffit, et elle est dans les faits partout puisque tous les montants sont en €).
47. **Section « Où en est l'app »** (2026-08-05) — sur `/tarifs` et `/methode`, en clair : ce qui marche et dont on peut se servir aujourd'hui, ce qui n'y est pas encore, **comment les produits arrivent réellement** (relevés à la main dans l'espace affilié officiel, parce que l'API d'affiliation TikTok n'est pas ouverte en France et qu'aspirer le site est contraire à leurs conditions), et le fait qu'aucun paiement n'est encaissé.

48. **Le point de rupture `sm:` était réglé à 390 px** (2026-08-05) — c'est-à-dire **exactement la largeur d'un iPhone 12/13/14**. Tous les `sm:grid-cols-3` passaient donc en trois colonnes sur un écran de 390 px, et les `sm:text-4xl`/`sm:text-7xl` agrandissaient le texte au moment précis où il y avait le moins de place : d'où les cartes tassées et les mots coupés. Remonté à 640 px (la valeur par défaut de Tailwind), pour que `sm:` veuille dire « plus large qu'un téléphone ». Les grilles de trois cartes passent en `md:` (768 px) — trois cartes à 640 px restent trop serrées. Vérifié au navigateur à 375 px et 390 px : cartes empilées, aucun débordement horizontal.
49. **Tableau comparatif masqué sur téléphone** (2026-08-05) — il demandait un défilement horizontal, donc on n'en voyait que la colonne des libellés : une liste de fonctionnalités sans aucune indication de plan, soit pire que rien. Réservé au grand écran ; les trois cartes empilées portent déjà la même information.
50. **Urgence réelle, jamais fabriquée** (2026-08-05) — la tentation serait « plus que 3 places » ou « offre valable 24 h » : ce sont **exactement** les formulations que notre propre Compliance Guard signale comme trompeuses (`trompeur-urgence`), et il serait intenable de les interdire aux créateurs tout en s'en servant. L'urgence retenue est celle du produit lui-même :
   - **Page de tarifs** : « Un produit reste jouable 15 à 40 jours. Après, c'est trop tard. » Ce sont les bornes réellement utilisées par `computeWindowDaysRemaining` pour un produit en croissance, exportées en `TYPICAL_WINDOW_DAYS`.
   - **Dans l'app, au moment du paywall** : la fenêtre calculée sur *ce* produit — « Sur ce produit, il te reste environ 25 à 63 jours avant que tout le monde s'y mette ». Vraie, personnelle, affichée à l'instant de la décision.
   - **Friction retirée** : « Créer mon compte gratuit — 30 secondes », « sans carte bancaire », aux trois moments où quelqu'un peut décider. Le bouton mort « Pas encore ouvert » devient « Commencer gratuitement en attendant » : la seule action qui existe aujourd'hui, et celle qu'on veut.
   - **`FOUNDING_PRICE_LOCK`** : les inscrits d'aujourd'hui gardent le tarif de lancement. Seule raison honnête de s'inscrire maintenant plutôt que dans six mois — une promesse qui ne dépend que de nous, donc tenable. La constante à `false` la retire partout.
51. **`TYPICAL_WINDOW_DAYS` utilise `min`/`max`, pas `low`/`high`** (2026-08-05) — la règle ESLint `kairos/no-raw-estimate-number` a refusé l'affichage, et elle avait raison : `low`/`high` désignent partout ailleurs les bornes d'une estimation portant sur un produit précis, qui doit alors passer par `<EstimatedValue>` avec sa confiance. Ici c'est un ordre de grandeur général.

52. **Les 90 produits avaient tous exactement le même score d'opportunité** (2026-08-07) — trouvé en dérivant le score à partir des constantes, pas en lisant l'écran. Avec un seul relevé, `computeVerdict` sort par la branche « historique insuffisant » et renvoie des valeurs **fixes** (`saturationScore: 50`, `confidence: 0.05`) ; l'actor Apify ne fournit **aucun** taux de commission (`NEUTRAL_COMMISSION`, ratePct 0) ; et la confiance vendeur est un remplissage identique pour tous (`NEUTRAL_SELLER_TRUST`, score 50). Les quatre termes de la somme sont alors des constantes :

    | Axe | Poids | Valeur | Contribution |
    |---|---|---|---|
    | Phase | 0,35 | 25 + 75 × 0,05 = 28,75 | 10,06 |
    | Commission | 0,25 | 0 (absente) | 0 |
    | Confiance vendeur | 0,25 | 50 (constante) | 12,5 |
    | Saturation inverse | 0,15 | 100 − 50 = 50 | 7,5 |

    **Total : 30/100 pour les 90 produits.** Et `rank.ts` triait sur ce score sans départage : à égalité parfaite, `Array.sort` étant stable, l'ordre affiché était celui d'arrivée des documents — l'ordre alphabétique des identifiants, présenté comme un classement d'opportunités. Le score lui-même n'est affiché nulle part, mais le **rang** l'est, et « 1er sur 90 » est une affirmation.

    Corrigé selon la doctrine déjà en place pour les gains (décision #22) : `computeOpportunityScore` renvoie **`number | null`** et refuse de produire un nombre quand aucun des quatre axes ne repose sur une donnée réelle. Un seul axe mesuré suffit à rendre le score publiable — un taux de commission saisi à la main, par exemple. Les marqueurs d'absence sont ceux que le projet utilise déjà : `ratePct === 0` (aucun programme ne rémunère à 0 %) et `sampleCount === 0` (posé par les deux constantes de remplissage). L'historique, lui, ne se devine pas depuis le verdict — `confidence` est bornée à `[0,05 ; 0,95]` et 0,05 est **aussi** atteignable par un vrai calcul avec un gros trou de collecte — il est donc passé explicitement (`OpportunityBasis`), ce qui a fait échouer la compilation des quatre appelants, exactement comme la décision #16.

53. **« Éviter » relégué, pas exclu, du classement Opportunités** (2026-08-07) — question ouverte du 2026-08-03, tranchée. Un classement d'opportunités qui liste en 8e position ce que l'outil dit d'éviter se contredit à l'écran. Trois options étaient posées : exclure, reléguer, séparer visuellement. **Retenu : reléguer *et* séparer**, jamais exclure — le projet montre ce qu'il sait plutôt que de le masquer (même choix que les produits sans historique, affichés avec « historique trop court »). Ordre par utilité décroissante pour le lecteur : ce qu'il peut jouer, ce qui n'est pas encore jugeable, ce qu'on lui dit d'éviter. Le comparateur `compareOpportunity` vit dans `packages/core` et sert aux **deux** pipelines, donc le rang stocké dans `rankings/*` porte déjà cet ordre et l'UI n'a qu'à dessiner les frontières. ⚠️ **Cela modifie les classements existants** — c'est voulu, et il faut relancer le pipeline pour que la production en bénéficie. Passer à l'exclusion pure demanderait un `filter`, pas une refonte.

54. **Le paywall aurait fui en découpant la liste** (2026-08-07) — attrapé en écrivant la correction précédente, pas après. `RankingList` calculait le verrou du plan gratuit sur `index` dans **sa** liste : rendu en trois tranches, chaque tranche rouvrait son propre top 10, c'est-à-dire donnait gratuitement ce que le plan Creator vend. Le composant reçoit désormais `startIndex`/`totalCount` (défauts inchangés pour les deux autres pages de classement, qui rendent une seule liste), et 4 tests couvrent le décalage — dont celui qui échouerait sans lui.

55. **Le pipeline qui tourne n'écrivait que 2 des 9 classements** (2026-08-08) — trouvé en faisant tourner l'app pour de vrai (Chromium contre les émulateurs, parcours complet inscription → onboarding → seed → toutes les pages). Boutiques, Nouveautés et Catégories affichaient *« le pipeline n'a pas encore tourné sur des produits collectés »* **juste après l'avoir fait tourner**. La cause n'était ni une source manquante ni un bug d'affichage : `apps/jobs/src/rank.ts` sait construire les 9 documents, mais c'est le **pipeline navigateur** qui tourne (décision #9), et `run-pipeline.ts` n'écrivait que `products` et `opportunities`. Trois onglets vides sur cinq visibles, alors que la donnée était là.

    Ces trois classements sont des **agrégations des mêmes produits** — aucune collecte supplémentaire. Les fonctions sont remontées dans `packages/core/src/rankings/aggregate.ts` (pures, 9 tests) et les **deux** pipelines les appellent, donc ils ne peuvent plus diverger. Résultat mesuré sur le marché de démonstration : **7 boutiques, 8 catégories, 2 nouveautés** au lieu de trois pages vides.

    Deux détails qui comptent : (a) le tri retombe sur le nombre de produits quand `soldTotal` est absent — avec les 90 produits Apify, qui n'ont aucune donnée de ventes, un tri sur des zéros partagés n'aurait départagé personne ; (b) « Nouveautés » a besoin de `firstSeenAt`, que seule la collecte Apify pose : côté navigateur il est **dérivé du relevé le plus ancien**, ce qui est exactement la même chose et ne peut pas se désynchroniser. Le classement est donc discriminant dès la démo (2 produits sur 22, pas 22 sur 22).

56. **Créateurs / Vidéos / Sons / Vagues restent vides, et c'est correct** (2026-08-08) — vérifié à l'écran pendant le même parcours. Ce sont les **seuls** onglets réellement bloqués, par absence de source et non par du code manquant (impasse #5 et recherche de sources du 2026-08-03). Ils sont déjà masqués de la navigation, leurs routes répondent toujours, et chaque page nomme la source qui manque. **Rien à corriger ici sans dépenser de l'argent** (`clockworks/tiktok-scraper`, ~1,70 $/1 000 résultats) — ce serait un arbitrage budgétaire, pas un correctif.

57. **Le site public décrivait le produit au lieu de le montrer** (2026-08-08) — mesuré au navigateur avant de toucher quoi que ce soit : accueil à 6 131 px sur desktop et **9 757 px sur téléphone** (11,5 écrans), 1 206 mots, et **un seul élément manipulable** — le curseur de vues du hero. Les cinq sections du milieu étaient ~1 000 mots de prose statique. `/tarifs` : 0 bouton, 0 champ, 0 dépliant.

    Le levier était sous la main : **les moteurs sont des fonctions pures, elles tournent gratuitement dans le navigateur d'un visiteur non connecté**. C'est ce qui permet d'être à la fois interactif et honnête — le visiteur manipule le vrai calcul, pas une maquette.

    - `VerdictShowcase` remplace les quatre cartes de texte : quatre situations tapables, et `computeVerdict` répond à l'écran avec sa pastille, sa concurrence, sa fenêtre et son `reasoning[]` — le texte exact de l'application. Un test vérifie que **les quatre situations donnent bien quatre verdicts distincts** : c'est ce que le titre promet, et un réglage du moteur pourrait le faire tomber à trois sans que rien ne le signale.
    - `ProductTour` remplace « ce qu'il y a dedans » : quatre onglets qui montrent les écrans réels (la liste avec ses verdicts, les gains via `<EstimatedValue>`, la courbe via `SnapshotChart`, et le brief produit par le vrai `buildBrief`, mention « Collaboration commerciale » comprise).
    - Résultat mesuré : accueil de 1 à **8 boutons + 8 onglets**, `/tarifs` de 0 à 2 onglets + 1 dépliant. Aucun débordement horizontal à 390 px.

58. **`/methode` n'était reliée à rien** (2026-08-08) — c'est la page la plus convaincante du site (le moteur y tourne en direct), et **aucun lien de l'accueil n'y menait**. Sur les 11 liens de la page d'accueil : 3 vers `/connexion`, 1 vers `/tarifs`, 6 vers les mentions légales, 1 le logo. Elle était dans le `sitemap.xml`, donc Google la trouvait ; un humain, non. Nouveau `PublicNav` partagé par les trois pages publiques.

59. **Le paywall se contredisait d'une page à l'autre** (2026-08-08) — sur l'accueil, chaque colonne listait **tout** ce que le plan donne : sur 21 lignes affichées, **17 étaient des doublons**, et on ne pouvait pas voir ce que Creator ajoutait sans comparer mot à mot. Sur `/tarifs`, l'inverse : le motif « Tout Creator, plus : » ne laissait à Pro **qu'une seule ligne** et 40 % de carte blanche — le plan le plus cher paraissait le plus pauvre. Un seul composant `PlanCards` sert désormais les deux pages : différentiel en tête, hérité replié dans un `<details>` (de l'information réelle à la place du trou), et total par plan. Un test interdit qu'une même capacité soit annoncée deux fois en tête de carte.

60. **Le tableau comparatif était invisible sur téléphone** (2026-08-08) — `hidden md:flex` depuis la décision #49, qui réglait le bon problème (le défilement horizontal) par le mauvais moyen (le masquer). Or c'est la seule vue qui répond à « qu'est-ce que je perds si je ne paie pas », et `/tarifs` perdait 27 % de son contenu sur mobile (688 → 502 mots). Il devient un dépliant fermé par défaut, avec les colonnes de plan en initiale pour tenir dans 390 px. S'y ajoute `PaywallDemo` : un classement de 12 lignes où l'on bascule Radar/Creator et où les gains au-delà du top 10 se verrouillent sous les yeux — le motif exact de l'application, « ligne visible, chiffre masqué ». Mobile : 502 → **750 mots**.

61. **Stripe : le cœur est écrit et testé, l'encaissement demande une décision** (2026-08-08) — `packages/payments` (nouveau paquet pur, 18 tests) porte ce qui doit être juste : la table prix Stripe → plan, et la traduction d'un événement en changement de droits. Volontairement conservateur — un prix inconnu (prix archivé dont un abonnement en cours se réclame) ou un `uid` manquant ressortent en `unresolved` plutôt qu'en décision par défaut : rétrograder un client à jour et promouvoir un non-payant sont deux fautes, pas une. `buildPriceCatalog` **refuse de démarrer** si deux offres portent le même identifiant de prix — un client paierait pour l'une et recevrait l'autre.

    **Le point qui n'est pas technique** : Stripe exige un serveur, pour deux raisons irréductibles. Créer une session de paiement demande `STRIPE_SECRET_KEY`, qui ne peut pas partir dans un bundle navigateur ; recevoir un webhook demande de vérifier une signature puis d'écrire `users/{uid}.plan`, que `planUnchanged()` interdit au client — précisément pour qu'on ne puisse pas s'offrir un plan payant. Le plan Spark n'autorise aucune Cloud Function. Les trois issues sont détaillées dans **`docs/STRIPE.md`** ; aucune n'a été choisie unilatéralement, parce que celle qui automatise tout (Blaze) transforme « 0 € garanti » en « 0 € probable ».

62. **`pnpm grant:plan` — encaisser sans serveur, et rattraper les webhooks** (2026-08-08) — `apps/jobs/src/grant-plan.ts` attribue un plan par email via l'Admin SDK, depuis le Mac. Il sert deux fois : il rend viable l'encaissement par lien de paiement Stripe **sans casser Spark** (le client paie, on active à la main — honnête jusqu'à ~20 clients), et il tranche les cas que le webhook refuse de deviner. `--dry-run` montre l'avant/après sans écrire. Il ne contourne aucune règle : l'Admin SDK est le seul chemin légitime vers `plan`, et il tourne en local, jamais dans un navigateur.

63. **`functions/src/stripe.ts` écrit, pas déployé** (2026-08-08) — session de paiement + webhook, signature vérifiée sur le corps brut (`req.rawBody` : `req.body` a déjà été réécrit par le parsing JSON, la signature ne correspondrait plus), idempotence par `stripeEvents/{id}` — Stripe réémet tant qu'il n'a pas reçu de 2xx. L'`uid` est posé **deux fois** (`client_reference_id` sur la session, `subscription_data.metadata.uid` sur l'abonnement) parce que Stripe ne le recopie pas : sans le second, tous les événements de cycle de vie arrivent orphelins. ⚠️ **Jamais exécuté contre l'API Stripe réelle** — aucune clé n'existait. La logique métier est testée ; la plomberie HTTP reste à confirmer, § 4.3 de `docs/STRIPE.md`.

64. **Ce qui bloque la vente n'est pas du code** (2026-08-08) — audit fait avant d'écrire une ligne de Stripe. Par ordre de blocage : (a) il faut une **entité légale** (SIRET + IBAN) pour ouvrir un compte Stripe ; (b) **`/mentions-legales` contient encore `[Nom légal de la société]`, `[SIREN/SIRET]`, `[adresse complète]`** — publier un site marchand avec ces crochets est une infraction à la LCEN, pas une coquetterie ; (c) la **TVA** sur un service numérique vendu à des particuliers de l'UE (`automatic_tax` est activé dans le code, mais Stripe Tax doit être activé côté tableau de bord) ; (d) un **moyen de résilier**, obligation légale — le portail client hébergé de Stripe est le plus rapide, son lien reste à poser dans `/compte` ; (e) **les deux montants**, seule chose qui reste à décider dans `plans.ts`. Tant que `priceCents` vaut `null`, aucun bouton de paiement n'apparaît : c'est la décision #42 qui tient toute seule.

65. **Encaissement automatique à 0 € : Cloudflare Workers** (2026-08-08) — le fait décisif n'est pas technique : **le plan Hobby de Vercel interdit l'usage commercial**, donc y héberger un produit qui vend coûterait 20 $/mois. Cloud Functions resterait à 0 € en pratique mais exige le plan Blaze, donc une carte. **Cloudflare Workers** est le seul palier gratuit qui autorise explicitement le commercial : 100 000 requêtes/jour, sans carte. `apps/stripe-worker` porte les deux seuls points du produit qui ont besoin d'un serveur ; le site reste statique sur Firebase Hosting et Firestore ne bouge pas.

    Trois pièges de l'environnement Workers, qui ne sont pas Node : (a) `firebase-admin` n'y tourne pas (gRPC, modules natifs, `Buffer`) — d'où un **client Firestore REST** minimal, avec `updateMask.fieldPaths=plan` qui est ce qui rend l'écriture sûre : sans lui un PATCH remplace le document entier et un paiement effacerait le profil et la watchlist du client ; (b) le SDK Stripe a besoin de `Stripe.createFetchHttpClient()` et de **`constructEventAsync`**, la version synchrone échouant parce que WebCrypto est asynchrone ; (c) la vérification du jeton Firebase est refaite à la main via JWKS — et elle doit contrôler `aud`, sinon un jeton émis pour **un autre projet Firebase** passerait, c'est-à-dire que n'importe qui créant un projet pourrait se faire passer pour un utilisateur de KAIROS.

66. **Le bouton de paiement ne peut pas être mort** (2026-08-08) — `SubscribeButton` ne s'affiche que si l'adresse du Worker **et** l'identifiant de prix sont configurés ; sinon il retombe sur « Commencer gratuitement en attendant ». Double sécurité avec `priceCents` : poser un tarif dans `plans.ts` ne suffit pas à faire apparaître un bouton qui renverrait une erreur. Un bouton en panne fait croire à un bug ; « pas encore ouvert » dit la vérité (décision #42, appliquée au paiement réel).

    L'idempotence est portée par Firestore plutôt que par le code : `claimEvent` crée `stripeEvents/{id}` avec `currentDocument.exists=false`, donc deux livraisons simultanées du même événement — Stripe réémet tant qu'il n'a pas reçu de 2xx — n'en laissent passer qu'une. Un `unresolved` répond quand même 200 : un 5xx ferait réessayer en boucle un événement qu'on ne saura pas mieux interpréter, et `pnpm grant:plan` permet de trancher à la main.

67. **Le plan Pro se serait vendu sur du vide** (2026-08-09) — constaté en préparant les produits Stripe : Pro n'ajoutait à Creator qu'**une seule capacité**, `rankingArchive`, marquée « pas encore là ». Le vendre plus cher que Creator revenait à facturer zéro fonctionnalité supplémentaire. Quatre capacités ont donc été **construites**, pas déclarées :

    - **`rankingArchive`** — `rankings/*` porte un identifiant fixe, réécrit à chaque passage : il n'existait aucune trace du passé, et « suivre un produit dans la durée » ne reposait sur rien. Fenêtre glissante de 30 jours dans **un seul document** (`rankingArchive/FR_7d`) : le budget de ≤5 opérations par page interdit un document par jour, une trajectoire en ferait trente. Les libellés y sont stockés une fois, pas trente, et un produit sorti du classement garde le sien — sinon les journées passées où il figurait deviendraient illisibles, ce qu'on vient précisément chercher dans une archive.
    - **`rankTrend`** — la fiche produit montrait la courbe de *ses* ventes, jamais sa place **par rapport aux autres**. Un produit dont les ventes montent pendant que dix concurrents montent plus vite est en train de perdre, et rien ne le disait. Axe inversé (rang 1 en haut) pour qu'un tracé qui monte se lise « je gagne des places », et tracé **coupé** les jours sans classement : relier ferait passer une absence pour une position intermédiaire.
    - **`productCompare`** — le classement répond « lequel est le mieux placé », pas « lequel je tourne entre ces trois-là ». Jusqu'à quatre produits sur les mêmes lignes. Zéro lecture Firestore de plus : tout est déjà dénormalisé dans les items.
    - **`dataExport`** — CSV séparé par point-virgule avec BOM, sans quoi Excel en français met tout dans la première colonne et affiche « SÃ©rum ». Une donnée absente reste **vide** et non zéro : dans un tableur un 0 se moyenne et se somme, et transformerait « on ne sait pas » en « ça ne rapporte rien ».

    `alerts` passe aussi en `live`, côté Creator : envoyer une vraie notification demanderait un serveur et un service d'envoi, donc de l'argent. Le même service à 0 € est un **résumé calculé à l'ouverture** à partir de l'archive — « 15ᵉ → 1ʳᵉ, 14 places gagnées », « la concurrence a pris 35 points ». Le libellé du catalogue dit exactement ça et ne promet aucune notification push.

68. **La règle Firestore supposait le mauvais pipeline** (2026-08-09) — première version de `rankingArchive` : `allow write: if false`, commentée « écrite par l'Admin SDK qui ignore les règles ». Or le pipeline qui la remplit tourne dans le **navigateur** (décision #9, plan Spark), pas dans un job serveur. Le `Promise.all` du pipeline échouait donc entièrement, et le seed avec lui. Corrigé en `isAdmin()`, comme `rankings/*`. Un test vérifie maintenant les deux côtés : un abonné Pro ne peut pas réécrire l'archive, l'administrateur qui fait tourner le pipeline le peut.

69. **Des tests qui punissaient le travail** (2026-08-09) — trois tests codaient en dur que `alerts` et `rankingArchive` étaient « à venir », et un quatrième recopiait le libellé exact d'une capacité. Ils échouaient donc le jour où on les livrait, ou dès qu'on reformulait une phrase. Réécrits autour de l'invariant plutôt que de l'état : *toute capacité annoncée sans être livrée porte sa mention*, et — nouveau garde-fou né de ce défaut — **aucun palier payant ne se vend sur du vide** : chaque plan facturé doit ajouter au moins une capacité `live`.

70. **Le plan gratuit va au bout de la boucle, une fois** (2026-08-09) — un plan gratuit qui ne sert à rien ne convertit personne, un plan gratuit qui donne tout ne se transforme jamais en abonnement. La ligne retenue : **le gratuit donne l'information et une production, le payant donne la production au rythme voulu.** Concrètement, un compte gratuit peut trouver un produit, voir ce qu'il rapporterait, le suivre, **et obtenir le texte à dire face caméra** — une fois. Quelqu'un qui a tourné une vidéo avec sait exactement ce qu'il achète ensuite ; c'est plus convaincant qu'une démonstration, et plus honnête.

    `FREE_LIMITS` réunit les trois plafonds : **1 brief**, **5 produits suivis**, **gains chiffrés sur les 10 premiers**. Le dernier vivait en dur dans `RankingList.tsx` — la page de tarifs et l'application pouvaient donc annoncer deux chiffres différents. `FREE_PLAN_NOTES` en est **dérivé**, jamais recopié : un plafond annoncé qui ne correspond plus au plafond appliqué est exactement la promesse non tenue que ce fichier existe pour empêcher. Et il est affiché **sur la carte d'offre**, pas découvert à l'usage — rencontrer un plafond après coup donne le sentiment d'avoir été attiré sous un faux prétexte.

71. **Le seul verrou du gratuit réellement appliqué côté serveur** (2026-08-09) — le quota de briefs se compte par l'existence des documents `users/{uid}/briefs/{productId}`, créés au premier affichage. Deux propriétés en découlent : **revoir un brief déjà ouvert ne consomme rien** (un quota qui se viderait à chaque rechargement serait perçu comme une arnaque, à juste titre), et **le compteur ne peut pas être remis à zéro** — la règle autorise `create` et interdit `update`/`delete`. Il a fallu **sortir `briefs` de la règle générique** `{subcollection}` : en Firestore, les règles ne se surchargent pas, elles s'additionnent, et une règle restrictive ajoutée à côté d'une permissive ne verrouille rien. 6 tests dédiés, dont celui qui compte : la suppression est refusée.

    Le reste des limites du gratuit (top 10 des gains, taille de la watchlist) est du **rendu client, assumé comme tel** : une entrée de watchlist n'est qu'un pointeur vers un produit déjà visible gratuitement dans le classement. Ce qui est réellement protégé côté serveur, ce sont les données qui ne se reconstituent pas — l'historique des relevés et l'archive. Prétendre verrouiller le reste serait de la sécurité de façade.

    `watchlistLimit` est porté par `entitlementsOf` et non recopié : les trois écrans qui ajoutent à la watchlist (classement, fiche produit, tableau de bord) appliquent la même règle, sinon la limite se contournerait en changeant de page. Un abonnement impayé **replafonne** — sinon il suffirait de ne pas payer pour garder l'illimité.

72. **Résilier, et payer à l'année** (2026-08-10) — deux trous découverts en branchant le paiement réel, dont un juridique.

    **Le portail client** (`/stripe/portal` côté Worker, `SubscriptionCard` côté site) : pouvoir résilier aussi simplement qu'on s'est abonné est une obligation (art. L. 215-1 du code de la consommation), pas un confort. Le portail hébergé de Stripe la remplit sans qu'on écrive d'écran de gestion d'abonnement — mais encore faut-il y donner accès. L'identifiant client vient du document Firestore, **jamais de la requête** : accepter un `customerId` envoyé par le navigateur ouvrirait les factures et les cartes de n'importe quel client. Un plan accordé à la main (`pnpm grant:plan`, compte fondateur) n'a pas de client Stripe : la carte le dit au lieu d'offrir un bouton qui échouerait.

    **Le prix annuel existait dans Stripe et n'était atteignable nulle part** — `NEXT_PUBLIC_STRIPE_PRICE_CREATOR_YEARLY` était lu par `checkout.ts`, mais aucun écran ne demandait jamais `period: "yearly"`. Un prix créé, payé au tableau de bord Stripe, invendable. D'où `BillingPeriod` remonté dans `@kairos/shared` (et **réexporté** par `@kairos/payments` plutôt que redéclaré : le catalogue Stripe et les prix affichés désignent désormais le même ensemble, ajouter une périodicité d'un côté sans l'autre ne compile plus), un sélecteur mensuel/annuel, et `yearlyPriceCents` séparé de `priceCents`.

    **`yearlyPriceCents` n'est pas calculé à partir du mensuel**, et c'est le point. Appliquer une remise de tête (« × 10 mois ») afficherait un montant que Stripe ne facturerait pas. Symétriquement `yearlySavingsPct` arrondit **vers le bas** et renvoie `null` si l'annuel n'est pas avantageux : pas de badge « −20 % » pour 19,6 %, pas de « économisez 0 % ». 13 tests (`pricing.test.ts`), dont un qui **tombera le jour où les montants seront saisis** — délibérément, pour forcer une relecture au moment où les vrais chiffres arrivent.

73. **« 0 € partout » — une donnée absente redevenue zéro** (2026-08-11) — signalé en utilisant l'app sur des produits réellement collectés : tous les gains estimés s'affichaient « 0 € ». La chaîne fautive tenait en deux maillons, chacun défendable isolément. `toProductRankItem` (`server/firestore/rankings.ts`) remplace un taux de commission manquant par `?? 0`, ce qui est commode pour le typage ; `computeEarnings` multipliait ensuite consciencieusement par ce zéro et renvoyait une fourchette 0 €–0 € avec une confiance élevée.

    Le résultat n'était pas « pas de chiffre » mais **un chiffre faux, énoncé avec assurance** : « ce produit ne rapporte rien », là où la vérité est « on ne sait pas ce qu'il rapporte ». C'est exactement la règle invariante n°2, contournée non pas par une décision mais par un `??` anodin.

    Correctif dans le moteur, au même endroit que les deux gardes existantes : prix nul ou commission nulle donnent `insufficient_data`, donc un tiret. Un produit d'affiliation à 0 % de commission n'existe pas dans un catalogue d'affiliation — entre les deux lectures possibles du zéro, on prend celle qui n'affirme rien. **Un test affirmait l'inverse** (« commission absente — gains à zéro, pas de crash », avec `confidence >= 0.4`) : il encodait le bug, il a été réécrit. Côté écrans, `commissionLabel`/`commissionShort` remplacent « 0 % » par « inconnue » sur les onze endroits qui affichaient un taux.

74. **Trois défauts d'interface du simulateur, tous du rendu natif** (2026-08-11) — le sélecteur de produit et les curseurs n'avaient **aucune mise en forme** : `<select className="kai-input">` et `accent-color` sur un `input[type=range]`. D'où un menu système, un chevron gris, une piste de 2 px à peine distincte du fond blanc, et une pastille trop petite pour être visée au pouce — alors que le simulateur *est* une page qu'on manipule au pouce. Ajout de `.kai-select` et `.kai-range` dans `globals.css` (les deux moteurs, WebKit et Firefox, n'exposent pas les mêmes pseudo-éléments : la duplication n'est pas une redite).

    Les titres TikTok Shop empilent marque, modèle, couleur et arguments de vente ; rendus tels quels ils poussaient le reste de la ligne hors de l'écran. `shortTitle` coupe **sur un mot entier**, et le titre complet reste affiché sous le sélecteur — le raccourcir ne doit pas revenir à le cacher. Dans le menu déroulant le prix passe **en tête** : le rendu natif d'iOS ignore `text-overflow`, et le prix placé en fin de ligne se faisait tronquer avant le titre.

    Vérifié par capture réelle dans Chromium, pas seulement au typecheck.

75. **Le brief affichait ses identifiants internes** (2026-08-11) — `hook.type.replace(/_/g, " ")` donnait « REACTION CHOC », « ABSURDE PATTERN INTERRUPT » : les clés de la taxonomie partagée avec les prompts Gemini/Claude, en capitales, dans la page censée expliquer comment tourner une vidéo. `HOOK_LABELS` (dans `packages/shared/src/hooks.ts`, à côté de la taxonomie qu'il traduit) donne un libellé qui dit ce qu'il faut *faire* — « Réaction à chaud », « Ouverture du colis ».

76. **Le taux de commission n'existe pas dans la source — on l'estime, et on le dit** (2026-08-11) — suite directe de #73. Le zéro ne venait pas d'un défaut de collecte : **TikTok Shop n'expose nulle part les taux d'affiliation**, ils vivent dans l'espace affilié du créateur. Deux actors Apify se présentant comme « affiliate » le confirment noir sur blanc. Il n'y a donc pas de correctif de collecte à attendre — la question est ce qu'on affiche à la place.

    Trois options, une seule tenable. Afficher « 0 % » ment (#73). Laisser « inconnue » partout est honnête mais rend le produit invendable : un classement où aucun gain n'est chiffré ne sert à rien. Déduire le taux de la remise acheteur (`discountDecimal`) produirait un montant faux présenté comme mesuré. Retenu : **le taux médian de la famille de produits** (`COMMISSION_BENCHMARKS`, 6 familles + défaut, rattachement par mots-clés du titre), marqué `isEstimated: true` de bout en bout.

    Ce qui rend l'option acceptable, c'est la propagation, pas la table. Le marqueur traverse `products/{id}.commission` → les deux pipelines → `rankings/*.items[]` → `ProductRankItem` → l'écran. `computeEarnings` **ajoute 0,25 à l'écart** quand la commission est estimée : l'incertitude de l'entrée se retrouve dans la sortie. Propriété testée, et c'est elle qui compte : **un gain calculé sur une commission estimée ne peut jamais s'afficher « fiable »** (écart minimal 0,40 → confiance plafonnée à 0,60, sous le seuil de 0,75 d'`<EstimatedValue>`), quel que soit le volume de vues. Les libellés écrivent « ~19 % de commission (moyenne de la catégorie) », jamais « 19 % ».

    Un taux saisi à la main dans `/admin/produits` prime toujours et n'est jamais écrasé par une collecte. `isEstimated` **ne rattrape pas une absence** : un `ratePct` à 0 reste `insufficient_data`, estimé ou non.

    `EarningsInput` est passé à `z.input` plutôt que `z.infer` : avec un `.default(false)`, le type de sortie aurait obligé les vingt appelants existants à écrire le champ pour ne rien changer à leur comportement.

77. **Le barème ne servait à rien tant qu'il n'agissait qu'à l'écriture** (2026-08-11) — décision #76 posait l'estimation au moment de la collecte. Constaté en production : **les commissions restaient à 0**. Normal — les documents `products/*` et `rankings/*` déjà en base ne repassent pas par la collecte, et rien ne les réécrivait.

    La règle est donc appliquée **à la lecture**, dans `resolveCommission` — un seul endroit, trois appelants (`product-meta.ts` pour le pipeline jobs, `run-pipeline.ts` pour la saisie admin, `toProductRankItem` pour l'affichage). Comme elle est entièrement dérivée du titre, le résultat est identique à celui qu'aurait produit une réécriture, sans toucher à la base — et un taux réellement renseigné n'est jamais remplacé. Corollaire : aucune migration à lancer, l'effet est visible au prochain chargement de page.

    **Un bug trouvé par un test que j'écrivais pour autre chose** : `findCommissionBenchmark` concaténait titre et mot-clé de collecte en une seule chaîne, alors que sa propre documentation affirmait « le titre prime ». L'ordre du tableau tranchait à sa place — un casque Bluetooth remonté par une requête « skincare » ressortait en beauté à 19 % au lieu de tech à 8 %, soit un gain annoncé plus du double du réel. Deux passes désormais : le titre, puis seulement le mot-clé.

78. **Le tableau de bord montrait des compteurs avant de montrer des euros** (2026-08-11) — quatre tuiles de comptage, puis le pick, et le premier montant n'apparaissait qu'au troisième écran. La question qui fait ouvrir l'application le lundi est « combien ». Le chiffre existait déjà (`focusEarnings`), il était enterré ; il passe en tête.

    Trois blocs ajoutés, chacun répondant à une question que les données permettaient déjà de traiter. **« Où le marché est ouvert »** (`buildCategoryPulse`, 5 tests) : un créateur choisit d'abord un terrain, ensuite un produit — savoir que beauté compte 12 fenêtres ouvertes et tech 2 oriente une semaine mieux qu'un classement de 90 lignes. Le classement se fait sur les fenêtres ouvertes, pas sur le volume : 4 produits tous jouables valent mieux que 30 tous fermés. **« Rien dans tes niches »** : `nicheMatches` à 0 était jusque-là un silence, que le créateur lisait comme « l'outil n'a rien pour moi » alors que ce sont ses niches qui ne recoupent pas la collecte. **« Ton activité »** : `userDoc.stats` était écrit et jamais relu — affiché seulement une fois non nul, sinon c'est un bilan d'échec à la première visite ; le repli propose la première action. `estimatedEarningsCents` n'est **pas** affiché : c'est une somme d'estimations, la présenter comme un revenu constaté serait le mensonge le plus coûteux du produit.

79. **L'onboarding collectait sans rien démontrer** (2026-08-11) — trois champs, un bouton, et la valeur du produit n'apparaissait qu'après. Or `avgViews` est le champ dont tout dépend : mal renseigné, l'application entière n'affiche que des tirets. Un aperçu chiffré s'affiche désormais pendant la saisie, avec **le même moteur que le reste de l'application** — une démonstration qui ne correspondrait pas au produit réel serait pire que pas de démonstration. Les `<select>` des trois étapes passent à `.kai-select` (voir #74).

80. **Le paywall envoyait relire une grille tarifaire** (2026-08-11) — son bouton pointait sur `/tarifs`. Ce bloc s'affiche au moment précis où quelqu'un vient de buter sur une limite, c'est-à-dire au point d'intention le plus haut du parcours ; l'y renvoyer lui donne surtout l'occasion de refermer l'onglet. Le paiement démarre maintenant depuis le paywall (`SubscribeButton`, qui vérifie lui-même que l'encaissement est branché — aucun bouton mort possible), avec « comparer les offres d'abord » en lien secondaire. Ce n'était pas faisable avant que Creator ait un prix.

81. **La règle « aucun chiffre inventé » ne s'appliquait pas à la page d'accueil** (2026-08-11) — signalé par l'utilisateur : « Un produit qui cartonne aujourd'hui peut être fait par **trois cents** personnes dans **cinq** jours. » Deux nombres, aucun mesuré, affichés à des visiteurs — la règle invariante n°2 avait été appliquée avec rigueur au moteur et jamais au texte marketing, alors que c'est le premier chiffre qu'un visiteur lit. Le problème décrit est réel ; il se dit sans nombre.

    L'audit qui a suivi a trouvé plus grave que la formulation :

    - **La page d'accueil portait sa propre description des offres**, en dur dans `fr.json` : « Watchlist illimitée » pour le plan gratuit, plafonné à 5 depuis la décision #70. Personne n'avait menti — la copie avait cessé d'être vraie et rien ne pouvait le signaler. Ces 15 clés n'étaient **même plus affichées** (la page rend `<PlanCards />`, dérivé du catalogue) : de la copie fausse qui dort est de la copie qu'on finit par réutiliser. Supprimées.
    - **La FAQ décrivait une collecte qui n'est plus la seule** (« relevés faits chaque jour dans l'espace affilié officiel ») et passait sous silence le point qui compte pour quelqu'un qui paie 19 € : d'où vient le taux de commission. Réécrite pour distinguer les deux sources et annoncer explicitement la moyenne de catégorie (#76-77).
    - **« Commission, retours produits, tout est déjà dedans »** laissait croire que le taux est relevé.

    Quatre tests (`messages/fr.test.ts`) gardent l'invariant, sans juger la rédaction : aucune clé ne redécrit un plan, rien n'est promis « illimité », un « top N » cité correspond à `FREE_LIMITS.earningsTop`, et aucune capacité marquée `soon` n'est vendue sur la page publique. Ce sont des tests sur la **cohérence catalogue ↔ copie**, le seul aspect du texte qui soit vérifiable automatiquement.

## Questions ouvertes (posées le 2026-08-03, aucune action prise)

- ~~**La lecture publique du catalogue (décision #10) ne sert à rien.**~~ **Traité le 2026-08-05** (décision #39) : `/classements/*` est enveloppé dans `<RequireAuth>` : aucun visiteur anonyme n'atteint jamais ces pages — vérifié en naviguant réellement, on est redirigé vers `/connexion`. La justification d'origine (« rendues sans utilisateur connecté ») valait pour un rendu statique au build ; les pages sont depuis passées en `"use client"` + `useEffect`, ce qui l'a rendue caduque, mais la règle n'a jamais été refermée. **Repasser `products`/`shops`/`rankings`/`snapshots` en `isSignedIn()` ne coûterait aucune fonctionnalité** et fermerait le trou « n'importe qui vide la base ».
- ~~**Un produit « Éviter » apparaît dans le classement « Opportunités »**~~ **Tranché le 2026-08-07** (décision #53) : relégué en fin de classement et séparé visuellement, jamais exclu.
- **L'échelle du score de commission est bancale** : `commissionScoreOf` traite le taux en pourcentage comme une note sur 100, donc une commission de 30 % — excellente en affiliation — ne pèse que 33/100. L'axe commission est de fait sous-pondéré par rapport aux trois autres.
- **La bande « maturity » du moteur est plus étroite que le bruit.** `classifyPhase` ne range en maturité qu'un ratio de croissance dans ±2 %, mesuré sur des moyennes de 3 points. Avec un bruit quotidien réaliste (±12 %), l'erreur type dépasse largement ce seuil et un produit parfaitement plat ressort en `late_growth` au hasard. En pratique la maturité n'est atteignable de façon fiable que par la règle de durée (`span > 150 jours`).



Ces points sont des arbitrages, pas des bugs : ils ne sont pas corrigés unilatéralement.

- ~~**Le catalogue est entièrement public.**~~ **Fermé le 2026-08-05** (décision #39). Ce qui suit est conservé pour mémoire : `products`, `snapshots`, `shops`, `rankings` étaient en `allow read: if true` (décision #10, prise pour que les pages statiques se chargent sans utilisateur connecté). Conséquence : n'importe qui peut vider toute la base avec quelques lignes de JS et la config Firebase, qui est publique par conception. Le verrouillage du plan gratuit (`FREE_PLAN_LIMIT`) est un rendu côté client — il ne peut rien empêcher. Sans objet tant que le produit est « pour des amis » ; bloquant le jour où il se vend. Solution à 0 € si besoin : scinder les données (public = ce que le plan gratuit peut voir ; le reste dans une collection dont les règles lisent le `plan` de l'utilisateur via `get()`).
- **App Check n'est pas actif** — `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` est vide dans `.env.production`. Sur le plan Spark, épuiser le quota gratuit ne coûte rien (0 € tient), mais **coupe le site** jusqu'au lendemain. C'est le garde-fou prévu contre ça.
- **Porte dérobée admin toujours ouverte** — `isBootstrapAdminEmail()` (`firestore.rules`) code en dur `contact.conforva@gmail.com`, avec un commentaire « BOOTSTRAP TEMPORAIRE — à supprimer après la première promotion admin » qui n'a jamais été suivi. Quiconque contrôle cette adresse peut se promouvoir admin, donc écrire dans tout le catalogue. À retirer une fois le compte admin réel en place.
- **Score d'opportunité partiellement fabriqué** (voir décision #18) — trois options : demander ces champs dans le formulaire, les retirer du calcul, ou afficher le score comme un rang plutôt qu'une note absolue. **Partiellement traité le 2026-08-07** (décision #52) : le cas extrême — *aucun* axe mesuré — ne produit plus de note du tout. Reste entier le cas intermédiaire : un produit dont seule la commission est saisie reçoit une note dont trois quarts du poids viennent encore de constantes.
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
| Rédaction | ✅ **refondue** — plus aucun jargon sur les pages publiques (vérifié à l'écran) ; libellés centralisés dans `labels.ts` ; `reasoning[]` du moteur réécrit en français courant ; statut `live`/`soon` affiché par fonctionnalité (décisions #43-47) |
| Offres & paywall | ✅ **refondu** — catalogue unique (`plans.ts`) dont dérivent les droits, la page `/tarifs` et l'accueil ; `PaywallGate` montre l'aperçu flouté + tout ce que le palier débloque ; `productHistory` réellement appliqué dans `firestore.rules` (décisions #37-42) |
| Interactivité | ✅ **étendue au site public** — `/methode` fait tourner le vrai moteur (préréglages + 5 curseurs) ; curseur de gains dans le hero ; `VerdictShowcase` et `ProductTour` sur l'accueil ; `PaywallDemo` sur `/tarifs`. Tout tourne dans le navigateur, sur les moteurs de production (décisions #34-35, #57-60) |
| Paiement (`packages/payments`) | ✅ **cœur écrit et testé** (18 tests) — table prix→plan, événement→droits, refus de deviner (décision #61) |
| Plan gratuit | ✅ **calibré** — `FREE_LIMITS` : 1 brief offert, 5 produits suivis, gains sur le top 10. La boucle complète est jouable une fois, texte à dire compris. Quota de briefs appliqué **côté serveur** (création seule, suppression interdite), le reste assumé côté client (décisions #70-71) |
| Plan Pro | ✅ **quatre capacités construites** — archive des classements (30 jours, un document, 1 lecture), trajectoire d'un produit, comparateur jusqu'à 4, export CSV. Plus `alerts` enfin réelle côté Creator. Un test interdit qu'un palier payant n'ajoute que du « pas encore là » (décisions #67-69) |
| Encaissement (`apps/stripe-worker`) | ✅ **Worker Cloudflare prêt à déployer** — session de paiement + webhook, client Firestore REST, vérification du jeton Firebase par JWKS (4 tests). 0 €, usage commercial autorisé, sans carte bancaire. ⚠️ Jamais exécuté contre l'API Stripe réelle (décisions #65-66) |
| Déploiement du Worker sans machine | ✅ `pnpm cf:build` + intégration GitHub de Cloudflare — tout se configure au navigateur, donc depuis un téléphone. Bundle vérifié : 416 Ko, 72 Ko compressés, très en dessous de la limite du palier gratuit. ⚠️ Les identifiants de prix vont dans `wrangler.toml` et non dans les variables du tableau de bord : `wrangler deploy` remplace ces dernières à chaque déploiement, alors que les secrets survivent (`docs/STRIPE.md` § 4 bis) |
| Installation du Worker | ✅ `apps/stripe-worker/setup.sh` — installation guidée : connexion, déploiement, les trois secrets, redéploiement, vérification. Chaque étape est contrôlée, y compris le piège de `wrangler whoami` qui sort en code 0 même sans authentification |
| Bouton d'abonnement | ✅ `SubscribeButton` — n'apparaît que si Worker **et** prix sont configurés, sinon retombe sur l'inscription gratuite. Aucun bouton mort possible (décision #66) |
| Activation manuelle | ✅ `pnpm grant:plan` — attribue un plan par email via l'Admin SDK depuis le Mac. Rend viable l'encaissement par lien de paiement sans casser Spark, et rattrape les webhooks non résolus (décision #62) |
| Site public | ✅ **refondu** — `PublicNav` relie enfin accueil / méthode / tarifs ; l'accueil montre les écrans au lieu de les décrire ; le paywall est démontré, plus seulement listé (décisions #57-60) |
| Référencement | ✅ **nouveau** — `/methode` publique (le seul contenu indexable au-delà de l'accueil), métadonnées complètes + Open Graph, `robots.txt`, `sitemap.xml`, JSON-LD Organization/SoftwareApplication/FAQPage (décisions #29-30) |
| Compliance Guard | ✅ **actif** — 16 règles FR par défaut chargeables depuis `/admin/compliance` ; il tournait jusqu'ici sur zéro règle, en silence (décision #31) |
| Brief de tournage (`/brief?id=`) | ✅ **nouveau** — accroches par phase, plan de tournage, script minuté, objections, interdits dérivés des règles de conformité ; le script passe son propre contrôle. Sans IA, donc sans coût (décision #32) |
| Tableau de bord (`/tableau-de-bord`) | ✅ **nouveau** — pick prioritaire pondéré par la niche, top 5 + gain cumulé, fenêtres qui se referment, pipeline watchlist, à éviter, pas encore jugeables. Logique pure testée (15 tests), 4 lectures Firestore (décision #24) |
| Fiche produit (`/produit?id=`) | ✅ **nouveau** — raisonnement du verdict, gains personnalisés, historique tracé (`SnapshotChart`, 5 tests). Route fixe + query string : statique, donc plan Spark préservé (décision #26) |
| Habilitations | ✅ `packages/shared/src/entitlements.ts` — source unique ; `contact.conforva@gmail.com` et les admins ont l'accès maximum sans que leur document `plan` soit touché (décision #27) |
| Marché de démonstration | ✅ 22 produits FR simulés avec historique quotidien (`lib/demo/market-simulation.ts`), 16 tests dont 5 qui vérifient que les moteurs retrouvent seuls la phase (décision #19) |
| Parcours utilisateur vérifié bout en bout | ✅ 2026-08-03, navigateur réel (Chromium/Playwright) contre les émulateurs : inscription par lien email → onboarding → classements → simulateur → watchlist → compte. C'est ce parcours qui a fait apparaître les décisions #20 à #23 |
| Verrouillage plan gratuit | ✅ pattern « ligne visible, gain flouté » au-delà du top 10 (observé chez Kalodata) au lieu de masquer les produits |
| Règle ESLint anti-nombre-nu | ✅ `kairos/no-raw-estimate-number`, testée (7 tests) |
| Score d'opportunité | ✅ **corrigé** — `number \| null`, refuse de noter sans un seul axe mesuré ; « éviter » relégué et séparé à l'écran ; comparateur partagé par les deux pipelines (décisions #52-54, 14 tests core + 4 tests paywall) |
| Agrégations de classement (`packages/core/src/rankings/`) | ✅ **nouveau** — `aggregateShops`, `aggregateCategories`, `selectNewcomers`, pures et partagées par les deux pipelines (9 tests). Le pipeline navigateur écrit désormais 5 documents au lieu de 2 : Boutiques, Catégories et Nouveautés ne sont plus vides (décision #55) |
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
- ~~**Reporter les montants Creator**~~ **Fait le 2026-08-10** : Creator est à **19 €/mois et 190 €/an** (`priceCents: 1900`, `yearlyPriceCents: 19000`), soit 16 % d'économie sur l'annuel et 15,83 €/mois équivalent. Le bouton de paiement apparaît donc désormais pour Creator. **Reste Pro** : ses deux prix Stripe ne sont pas créés, `priceCents` vaut `null`, la carte affiche « Bientôt » et aucun bouton n'apparaît — l'offre est simplement invendable, sans rien casser.
- ~~**TVA**~~ **Tranché le 2026-08-11** : le vendeur relève de la **franchise en base** (art. 293 B du CGI). `automatic_tax` est donc à `false` dans `apps/stripe-worker/src/index.ts` **et** `functions/src/stripe.ts` — activer Stripe Tax facturerait au client une taxe non due, qu'il faudrait ensuite rembourser. Les prix affichés (19 €, 190 €) sont les prix finaux, et les CGU le disent. **Reste à poser dans Stripe** : la mention « TVA non applicable, art. 293 B du CGI » en pied de facture (Paramètres → Facturation), où elle est obligatoire. Le jour où le seuil de la franchise est dépassé : repasser le drapeau à `true` **et** activer Stripe Tax dans le tableau de bord — l'un sans l'autre fait échouer la création de session.
- **Remplir `/mentions-legales`** : `[Nom légal de la société]`, `[SIREN/SIRET]`, `[adresse complète]` sont encore des crochets. Bloquant pour vendre. ⚠️ La clé Stripe utilisée est une **`sk_live`** : l'encaissement porte sur de l'argent réel, ce blocage n'est donc plus théorique.
- ~~**Portail client**~~ **Fait le 2026-08-11.** Deux chemins coexistent volontairement : `/stripe/portal` (le Worker crée une session sur le bon client — un clic, aucune saisie) et le lien **« sans code »** `billing.stripe.com/p/login/…`, qui sert de secours et part **automatiquement** si l'appel API échoue. La redondance est délibérée : résilier est une obligation légale (art. L. 215-1) qui ne doit pas tomber en même temps que le Worker, le compte de service ou Firestore. Le lien figure aussi en clair dans les CGU, donc atteignable même site en panne. Il reste proposé quand `stripeCustomerId` est absent — ce qui arrive aussi le temps que le webhook écrive.
- ~~**Activer le portail client dans le tableau de bord Stripe**~~ (Paramètres → Facturation → Portail client) — le code l'appelle (`/stripe/portal`, décision #72), mais Stripe refuse de créer une session tant que le portail n'est pas configuré côté tableau de bord. Sans lui, le bouton « Gérer ou résilier » renvoie une erreur.
- **Déployer le Worker Cloudflare** (`docs/STRIPE.md` § 4) : `wrangler login`, trois secrets, `wrangler deploy`. Gratuit, sans carte bancaire, usage commercial autorisé. C'est le chemin retenu ; Cloud Functions reste écrit dans `functions/src/stripe.ts` pour le jour où Blaze serait souscrit. **En cours** (2026-08-10, depuis un téléphone, § 4 bis) : Worker déployé sur `kairos-stripe.t-dufour1703.workers.dev`, `STRIPE_SECRET_KEY` et `FIREBASE_SERVICE_ACCOUNT` posés en secrets. Reste `STRIPE_WEBHOOK_SECRET`, qui n'existe qu'une fois le point de terminaison créé côté Stripe.

    **Piège constaté** : les identifiants de prix posés en *secrets du tableau de bord* n'atteignent pas le Worker — `/health` les listait comme manquants alors qu'ils existaient. `wrangler deploy` reconstruit la configuration à partir de `wrangler.toml`, qui est donc le seul emplacement fiable pour les valeurs non secrètes. Ne pas recréer de secret portant un nom déjà présent dans `[vars]` : les deux entrent en conflit au déploiement.
- **Vérifier que les prix Creator sont bien en mode réel** — la clé est une `sk_live`, et un identifiant de prix Stripe **n'encode pas son mode** : un prix créé en test avec une clé réelle échoue en « No such price » au moment de payer, pas au déploiement. Test : `/health` ne doit pas lister Creator dans `prixManquants`, puis un vrai passage en caisse.
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

## Source de données : Apify (2026-08-02) — partiellement branchée

Décision #8 (saisie manuelle) reste valable pour les commissions ; Apify la
complète sur le catalogue. Détail complet dans `docs/APIFY.md`.

**Fait et vérifié** :
- Actor **TikTok Shop Search Pro** (`Hr1hjEAGdYMr1RbUj`) appelé avec succès
  depuis `apps/jobs` — 3 requêtes, 90 produits bruts, ~0,48 €.
- Source Apify dans `apps/collector` (9 tests verts) et dans `apps/jobs`.
- `recover:apify` relit les datasets de runs déjà facturés sans relancer
  l'actor (donc sans coût) et écrit en prod via l'**Admin SDK**, qui ignore
  les règles de sécurité — aucune règle Firestore n'est assouplie.

**⚠️ La documentation publique de l'actor est fausse sur les noms de champs.**
Elle annonce du snake_case (`product_id`, `product_name`, `avg_price`,
`product_rating`, `review_count`, `discount_pct`) ; l'actor renvoie du
camelCase (`productId`, `name`, `amount`, `rating`, `reviews`,
`discountDecimal`) et expose des champs non documentés, dont `sold` (unités
vendues, cumulé) et `image`. Coder d'après la doc fait rejeter **100 %** des
produits en silence. Le parsing est centralisé dans
`apps/jobs/src/datasource/apify-product.ts`, écrit contre un vrai dataset.
Vérifier contre un dataset réel, jamais contre la doc.

`reviews` arrive en chaîne ("6096"), `rating` et `sold` peuvent être absents.
`sold` étant un cumul exact, il alimente `estSalesLow`/`estSalesHigh` à
l'identique (pas de fourchette) : le moteur compare les relevés entre jours,
donc la différence redonne les ventes de la journée.

**Limites réelles, mesurées, pas théoriques** :
- ⚠️ **L'actor ne renvoie aucun taux de commission.** `discount_pct` est une
  remise acheteur, pas une rémunération affilié. Le code le mappait comme
  commission (`products-strategy.ts`) : corrigé, `commission` reste à
  `NEUTRAL_COMMISSION`. **Cette source alimente les classements, pas le
  simulateur de gains.**
- ⚠️ Marché **US uniquement** (`searchRegion` non configurable), prix en USD
  convertis à taux fixe. Les requêtes en français renvoient 0 résultat.
- ⚠️ Plan gratuit Apify : « limited to preview results », champs partiels.
- ⚠️ Une collecte = 1 relevé/produit, donc verdicts « Historique trop court »
  jusqu'à 3 jours de collecte. Aucun historique n'est fabriqué.
- ⚠️ Le scoring multi-niches de `products-strategy.ts` n'a jamais tourné
  contre de vraies données ; ses seuils sont des hypothèses non calibrées.

**Reste à faire** : générer une clé de compte de service Firebase (action
utilisateur), lancer `recover:apify`, puis collecter 3 jours pour obtenir des
verdicts exploitables.

## Refonte de l'interface connectée (2026-08-02)

- **Nouvelle coquille `AppShell`** (`components/AppShell.tsx`) — remplace
  `BottomNav` (supprimé), qui portait mal son nom (`sticky top-0`) et
  n'offrait que 4 liens en `text-xs` sur toute la largeur. Barre avec logo,
  icônes, conteneur centré `.kai-shell` (max 72rem) au lieu du `px-5` bord à
  bord. Appliquée à classements, watchlist, simulateur, compte ; la barre de
  la landing utilise le même conteneur.
- **4e couleur : `--color-accent` (indigo)**, uniquement pour la chrome
  d'interface (onglet actif, filtre appliqué). Les couleurs existantes sont
  inchangées. Motif : l'état actif était en corail, qui entrait en
  concurrence visuelle avec le verdict « entrer maintenant » — le corail est
  désormais réservé à l'action.
- **Réglages des classements** (`components/RankingControls.tsx`) : période
  (24h/7j/30j) et marché (FR/US/UK) relisent Firestore ; tri et filtres
  (verdict, tendance, fourchette de prix) s'appliquent côté client sans
  lecture supplémentaire. Repliés derrière un bouton sous 768px. Le test de
  budget de lecture (≤5 opérations/page) reste vert.
- ⚠️ Les tris « croissance » et « opportunité » n'ont pas été implémentés :
  ces scores ne sont pas embarqués dans `rankings/*.items[]`. Tris réels :
  classement, tendance, commission, prix.
- ⚠️ Le sélecteur de marché propose US/UK alors que l'onboarding les annonce
  « Bientôt disponible » et qu'aucune donnée n'existe pour eux — ils
  affichent un état vide. À trancher : les masquer, ou les marquer.
- **Bug corrigé dans `server/firebase-client.ts`** : `getPublicFirestore()`
  ne basculait sur l'émulateur que via `FIRESTORE_EMULATOR_HOST`, variable
  serveur absente du bundle navigateur. En développement local, les pages de
  classement lisaient donc la **production** pendant que le reste de l'app
  parlait à l'émulateur — invisible car `getRankingPageData` avale l'erreur.
  Le fallback `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` corrige l'écart.
- **Largeur** : `.kai-shell` passe à pleine largeur (plafond 160rem pour les
  moniteurs ultra-larges). Ces écrans sont des listes denses, pas de la
  prose ; brider à 72rem laissait de grandes marges vides sur un écran de
  bureau.
- **« 0 % commission » corrigé en « commission inconnue »** — et la ligne de
  gain « 0€–0€ » remplacée par « Gain non calculable ». Zéro était un
  mensonge d'affichage : aucun programme d'affiliation ne rémunère à 0 %, la
  donnée est absente. `NEUTRAL_COMMISSION` (ratePct 0) sert de marqueur
  d'absence, l'UI doit le traiter comme tel. « 0€–0€ » se lisait « ce produit
  ne rapporte rien » alors que la vérité est « on ne sait pas ».
- **`sold` remonté jusqu'à l'UI** — la donnée existait dans `products/*`
  depuis la correction du parsing mais n'était affichée nulle part. Ajoutée à
  `ProductMeta`, aux items de `rankings/*`, au type `ProductRankItem` et à la
  carte, avec le prix. Nouveau tri « Ventes » basé dessus (les produits sans
  donnée tombent en fin de liste, pas traités comme « 0 vendu »).
- **Vérifié** avec 90 vrais produits Apify chargés dans l'émulateur, à 390px
  et 1280px : typecheck 12/12, lint vert, 24/24 tests web et 18/18 tests jobs
  (émulateur inclus), aucune erreur console.
- **Déployé en production** le 2026-08-02 : données (90 produits, 68
  boutiques, 27 documents de classement) + hébergement. Build 100 % statique
  vérifié (aucune route `ƒ`, plan Spark préservé) et bundle contrôlé après
  déploiement — `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` figé à `"false"`.
  ⚠️ Procédure obligatoire : sortir `apps/web/.env.local` avant le build. Le
  correctif de `firebase-client.ts` rend cet oubli bien plus grave qu'avant —
  le drapeau redirigerait Firestore vers `127.0.0.1` chez les visiteurs.

## Classements : ce qui est peuplé, et pourquoi le reste ne l'est pas

Sur les 9 classements, 4 sont réellement alimentés par la source produit.
Les 5 autres ne le sont pas par manque de **source**, pas par manque de code
— aucune configuration de l'actor Apify ne les remplira.

| Classement | État | Raison |
|---|---|---|
| Produits | ✅ 90 | volume de ventes |
| Opportunités | ⚠️ 90 collectés, **0 classable** | Le score exige au moins un axe mesuré (décision #52). Ces 90 produits n'ont ni 3 relevés, ni commission, ni confiance vendeur : ils s'affichent sous « Pas encore classables ». Deux jours de collecte de plus, ou un taux de commission saisi, suffisent à en faire sortir |
| Boutiques | ✅ 68 | agrégat par `sellerId`/`shopName` — calcul, pas collecte. **Écrit par les deux pipelines depuis le 2026-08-08** (décision #55) ; le pipeline navigateur l'oubliait |
| Catégories | ⚠️ 3 | agrégat par **mot-clé de collecte** (Apify) ou par **catégorie déclarée à la saisie**, jamais la taxonomie TikTok — la source ne l'expose pas, et la page le dit. Idem #55 : le pipeline navigateur ne l'écrivait pas |
| Créateurs, Vidéos, Sons | ❌ | l'actor est un scraper **produit** : aucune donnée créateur/vidéo/son. Voir l'impasse #5 ci-dessous |
| Nouveautés | ✅ | `products/{id}.firstSeenAt`, posé une seule fois à l'insertion et jamais réécrit (idempotence vérifiée : 2e passage = « 0 jamais vu, 90 déjà connus »). Côté navigateur, dérivé du relevé le plus ancien quand le champ est absent (saisie manuelle, démo). Discriminant à partir de la 2e collecte |
| Vagues | ❌ | exige une collecte multi-marchés |

Les pages sans source affichent désormais *quelle* source manque, plutôt
qu'un « bientôt disponible » qui laissait croire à un travail en cours.

### Impasse #5 — TikTok Creative Center est authentifié (vérifié 2026-08-02)

La décision #8 notait Creative Center comme « gratuit, officiel, public,
France supportée », écarté seulement parce qu'il ne couvre pas les produits.
Il couvre en revanche sons, hashtags et créateurs — donc réexaminé pour ces
trois classements. **Testé, et fermé** :

- `ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list` répond
  HTTP 200 mais avec `{"code":40101,"msg":"no permission"}` dans le corps —
  un piège : le code HTTP seul laisse croire au succès.
- La page publique redirige vers `/creative/creativeCenter/trends`, une
  application rendue côté client dont le HTML ne contient aucune donnée.

Y accéder demanderait un compte TikTok Business connecté ou l'extraction de
jetons de session, c'est-à-dire contourner un contrôle d'accès. **Non fait,
et à ne pas faire.** « Public » décrivait la consultation dans un navigateur,
pas un accès programmatique libre.

### Recherche de sources (2026-08-03) — deux conclusions fermes

**1. Les taux de commission d'affiliation ne sont PAS récupérables.**
Vérifié sur deux actors Apify indépendants qui se présentent pourtant comme
« affiliate » :
- `sentry/tiktok-shop-affiliate-products` documente des champs
  `commissionRate`/`commission`, mais précise noir sur blanc : *« This Actor
  does **not** claim to expose private TikTok Shop affiliate marketplace
  commission data »* et *« Most public TikTok Shop search results do not
  include reliable raw affiliate commission rates »*. Il conclut que
  l'utilisateur doit valider les taux dans son propre compte affilié.
- `george.the.developer/tiktok-shop-affiliate-sales-scraper` ne renvoie
  aucun champ de commission.

Le taux de commission est une **donnée privée du compte affilié**, pas une
donnée publique de la fiche produit. Aucun scraper ne peut la sortir. Les
seules voies : saisie manuelle par produit (`/admin/produits`, champ déjà
présent), ou un taux d'hypothèse par niche **explicitement présenté comme
une hypothèse** — décision produit à trancher, puisque cela touche à la
promesse « jamais un chiffre inventé ».

**2. Créateurs / Vidéos / Sons SONT récupérables — mais par un autre actor.**
`clockworks/tiktok-scraper` (scraper de contenu, pas de commerce) renvoie
vidéos (`playCount`, `diggCount`, `shareCount`), sons (`musicMeta`) et
profils créateurs (`authorMeta`, abonnés), avec ciblage pays via
`proxyCountryCode` (donc FR), sans login ni cookies. Tarif annoncé :
~1,70 $ / 1 000 résultats. **Non branché** — en attente d'arbitrage
budgétaire de l'utilisateur.

L'impasse #5 (Creative Center) reste valable : c'est la voie *gratuite* qui
est fermée, pas la voie payante.

## Finitions (2026-08-03)

- **Photos produit** — `imageUrl` était collecté et stocké depuis le
  2026-08-02 mais n'était affiché nulle part. Remonté jusqu'aux cartes
  (classements + watchlist), avec repli sur l'icône si le lien CDN expire
  (les URL TikTok sont signées). `<img>` volontaire plutôt que `next/image` :
  ce dernier exige un serveur d'optimisation (plan Blaze) et une liste figée
  de domaines distants, or le CDN TikTok en change.
- **Watchlist enrichie** — affichait l'identifiant brut
  (`1729385482393260168`). Affiche désormais photo, titre, boutique et prix
  via `lib/firestore/product-summary.ts` (lecture groupée par lots de 30,
  jamais un `get()` par ligne). Échec non bloquant : on retombe sur
  l'identifiant plutôt que sur une page vide.
- **Simulateur** — affichait « Commission 0 % » et un gain de 0 €. Même
  mensonge que les cartes : dit maintenant que le taux n'est pas renseigné et
  renvoie vers `/admin/produits`.
- **Opportunités** — a désormais les mêmes réglages que Produits
  (période, marché, tri, filtres).
- **Vignettes redimensionnées** (`lib/product-image.ts`) — le CDN TikTok
  sert les visuels en pleine résolution : les URL collectées portent un
  gabarit `~tplv-<id>-<transfo>:3000:3000`, soit ~150 Ko par image pour une
  vignette de 56 px. Sur 90 produits, ~14 Mo, et la liste paraissait vide le
  temps du chargement. Réécrire le gabarit en `:200:200` ramène l'image à
  ~4 Ko (mesuré : 154 634 → 3 852 octets, **facteur 40**). Réécriture faite à
  l'affichage, pas au stockage : les URL déjà en base en bénéficient sans
  recollecte. Combiné à `loading="lazy"`, seules les vignettes visibles sont
  téléchargées (13 au lieu de 90 au premier écran).
- ~~⚠️ **Piège de breakpoint** : `sm` vaut **390px** dans ce projet.~~
  **Périmé depuis la décision #48 (2026-08-05)** : `--breakpoint-sm` vaut
  **640px**, la valeur par défaut de Tailwind. `sm:` veut donc bien dire
  « plus large qu'un téléphone ». La consigne d'utiliser `md` (768px) pour
  une grille de trois cartes reste valable, elle.

## Gains exprimés pour 1 000 vues (2026-08-03)

**Le profil ne demande plus les vues moyennes.** Un créateur ne connaît pas
ce chiffre de façon fiable (la portée varie d'un facteur 100 d'une vidéo à
l'autre), et en tirer un montant en euros donnait une fausse précision —
contraire à la promesse « jamais un chiffre inventé ».

- `userProfileSchema.avgViews` → `postsPerDay` (rythme de publication, sans
  effet sur le calcul de gain). `.default(1)` pour que les documents
  antérieurs restent lisibles.
- L'onboarding demande le nombre de vidéos par jour, et explique pourquoi il
  ne demande pas les vues.
- `RankingList` évalue `computeEarnings` à **1 000 vues** (la fonction est
  linéaire en `expectedViews`, donc c'est un taux exact, pas une
  prédiction). Libellé : « Gain pour 1 000 vues ».
- Le simulateur garde son curseur de vues : là, c'est une hypothèse que
  l'utilisateur pose lui-même, plus une moyenne auto-déclarée. Valeur de
  départ neutre (10 000) au lieu du profil.
- Textes alignés : accroche, « comment ça marche », carte d'exemple, et
  **politique de confidentialité** (qui listait une donnée qu'on ne collecte
  plus).
- `creator.avgViews` est conservé : ce sont des vues **observées** d'un
  créateur tiers, pas une auto-déclaration.

**Bug corrigé au passage** : `recover:apify` réécrivait
`commission: NEUTRAL_COMMISSION` à chaque passage, effaçant donc tout taux
saisi à la main dans `/admin/produits` — seule source possible pour cette
donnée. Un taux existant (> 0) est désormais préservé, comme `firstSeenAt`.

⚠️ **À calibrer avant de se fier aux montants** — mais l'alerte d'origine
est close. Le taux de conversion par défaut est passé de 1,5 % à **0,2 %**
le 2026-08-03 (décision #20) et vit désormais dans
`DEFAULT_EARNINGS_CONFIG.defaultConversionRate`, en un seul endroit. Ce qui
reste vrai : 0,2 % est un **ordre de grandeur, pas une mesure**, en attente
de `bigquery/08_calibration_factors.sql`. Ce qui n'est plus vrai : le
facteur 10 à 30 et la double valeur codée en dur dans deux écrans.

## Navigation unifiée (2026-08-06)

`BottomNav` est la **seule** barre de navigation. Elle porte mal son nom
(elle est en `sticky top-0`), mais 7 pages l'importent — la renommer
demanderait de toutes les toucher pour un gain nul.

`AppShell` ne redéfinit plus la sienne : il l'utilise. Auparavant les deux
divergeaient — indigo large sur `/classements/*`, corail étroit ailleurs —
et le changement d'onglet donnait l'impression de changer d'application.
`AppShell` n'apporte donc que le bandeau de titre (`PageHeader`) et le
conteneur de contenu ; les pages qui n'en ont pas besoin (tableau de bord,
fiche produit, brief) importent `BottomNav` directement et sont identiques.

Toute modification de la navigation se fait dans `BottomNav`, jamais dans
`AppShell`.

## Point de reprise pour la prochaine session

0. **Encaissement** — tout est écrit et prêt : `docs/STRIPE.md` va de zéro au premier euro encaissé automatiquement, à 0 €, via Cloudflare Workers. Il ne reste que les actions qui demandent tes identifiants : compte Stripe, produits, prix, secrets, déploiement.
1. **Commissions d'affiliation** — c'est le maillon manquant, pas le
   catalogue. Sans elles, le simulateur de gains (cœur de la promesse
   produit) ne peut rien afficher de vrai. Options : API Affiliate TikTok
   (fermée à l'UE d'après décision #8), autre fournisseur, ou saisie manuelle
   par produit depuis `/admin/produits`.
2. **Clés Gemini/Claude** (Lot 6) — la génération de brief n'est pas câblée.
3. **Clé Stripe test** (Lot 7) — `server/stripe/connect.ts` reste à écrire.
4. **Assets de design** pour le kit de partage (Lot 7).
5. **Projet GCP réel** — seulement si BigQuery devient nécessaire ; le produit fonctionne sans, Firestore suffit à l'échelle actuelle.

**À ne pas refaire** : les impasses de source de données sont documentées en
décision #8 et en impasse #5 — API Affiliate fermée à l'UE, CAPTCHA sur
`shop.tiktok.com`, Kalodata refusé, et **Creative Center authentifié**
(testé le 2026-08-02 : l'API répond HTTP 200 avec
`{"code":40101,"msg":"no permission"}` dans le corps, et la page publique ne
contient aucune donnée). Ne pas les réexplorer sans élément nouveau, et ne
pas chercher à contourner une authentification.

**Ce qui existe mais coûte de l'argent** : `clockworks/tiktok-scraper`
(~1,70 $/1 000 résultats) renvoie vidéos, sons et profils créateurs avec
ciblage France, sans login. C'est la seule voie connue pour remplir les
classements Créateurs / Vidéos / Sons. Écartée pour l'instant : contrainte
« gratuit en tout ». Ces quatre onglets (+ Vagues) sont donc masqués de la
navigation, routes conservées.

**Travail en attente d'arbitrage, non commité** : un `git stash` local sur
le poste de l'utilisateur (`stash@{0}`, session du 2026-08-03) contenait
deux changements. **Vérifié dans le code le 2026-08-07 — un seul reste à
faire :**

- ⏳ **À refaire** : remplacer les vues moyennes auto-déclarées par le
  rythme de publication (`postsPerDay`) et afficher les gains **pour
  1 000 vues** plutôt qu'un total — un créateur ne connaît pas sa portée
  future, et en tirer un montant donne une fausse précision. Toujours
  bloqué par la même raison : `RankingList`, `produit`, `tableau-de-bord`,
  `simulateur` et `onboarding/profil` lisent tous `profile.avgViews`, et
  `userProfileSchema` le déclare encore.
- ✅ **Déjà fait, ne pas refaire** : « commission inconnue » au lieu de
  « 0 % » et « gain non calculable » au lieu de « 0 € — 0 € ». C'est en
  place depuis la refonte du 2026-08-02 (`NEUTRAL_COMMISSION` traité comme
  marqueur d'absence) et la décision #22.

Ce stash n'existe que sur ce poste : il sera perdu si le dépôt est recloné
ailleurs. L'idée restante est décrite ici pour pouvoir être refaite de zéro
sur la base actuelle.

## Commandes utiles

```bash
pnpm typecheck && pnpm lint          # 12 packages, doit être 100 % vert
pnpm test                            # les suites émulateur échouent ici, c'est normal
pnpm test:rules                      # 51/51 contre l'émulateur Firestore
pnpm test:jobs-integration           # 18/18
pnpm test:web-integration            # 98/98 (démarre firestore + auth)
# Total vérifié le 2026-08-09 : 446 tests, tous verts.
# Build vérifié : 0 route « ƒ » — 100 % statique, plan Spark préservé.
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
