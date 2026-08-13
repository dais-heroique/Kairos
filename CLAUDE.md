# KAIROS — reprendre ce projet sans contexte

Ce fichier existe pour une seule raison : permettre à n'importe qui — toi,
une autre session Claude, un autre compte — de reprendre ce projet à froid,
sans rien savoir de son historique. Lis-le en entier avant de toucher au
code. Il renvoie ensuite vers `docs/STATE.md`, qui doit être lu **en
entier** lui aussi avant de proposer quoi que ce soit : c'est la source de
vérité technique, celui-ci n'en est que la porte d'entrée.

## Ce qu'est KAIROS

Un outil pour les créateurs TikTok Shop en France. Il répond à une seule
question : *est-ce que ça vaut encore le coup de filmer ce produit ?*
Classement des produits qui marchent, ce que le créateur toucherait
personnellement (pas le chiffre d'affaires du vendeur), une liste de suivi,
et le texte à dire face caméra, minuté. Marché français, langue française,
conformité à la loi française sur l'influence commerciale.

Dépôt : `github.com/dais-heroique/Kairos`, branche `main`.
Le propriétaire (le compte qui paie et décide) travaille sous
`veltris.buisness@gmail.com`, en général depuis un Mac dont le dépôt vit
sur un **volume ExFAT externe** — d'où le piège des fichiers `._*` détaillé
plus bas.

## Les contraintes non négociables

Elles ont été posées explicitement au tout début du projet et n'ont jamais
été renégociées. Toute proposition qui les enfreint doit être signalée
avant d'être codée, pas après.

1. **0 € de coût de fonctionnement.** Plan Firebase Spark, aucune Cloud
   Function, aucune route dynamique dans le build Next.js (aucun `ƒ` dans
   la sortie de `next build`). Le jour où un chiffre change ça, il faut le
   dire avant d'écrire le code, pas après.
2. **Jamais un chiffre inventé affiché à l'utilisateur.** Une donnée
   absente se dit « inconnue » ou « à confirmer », elle ne vaut jamais
   zéro et ne se déguise jamais en mesure. Ça vaut pour l'application
   *et* pour le site public — un exemple concret : la page d'accueil
   affirmait « un produit qui cartonne peut être fait par trois cents
   personnes en cinq jours », deux nombres inventés dans une phrase de
   marketing. Voir décision #81 dans STATE.md.
3. **Tout en français** — code, commentaires, interface, tout.
4. **`docs/STATE.md` est la source de vérité.** Lu en entier avant de
   proposer quoi que ce soit, mis à jour en dernier, après chaque
   changement significatif. Il contient l'historique complet des décisions
   (numérotées, ~84 à ce jour), les impasses déjà explorées à ne pas
   rouvrir sans élément nouveau, et un état technique détaillé par domaine.

## Où en est le produit, réellement

Ceci décrit l'état du monde réel (comptes, argent, déploiements), pas
l'état du code — pour ça, `docs/STATE.md`.

- **Le site est en ligne** : <https://kairos-on.web.app>, déployé via
  `pnpm deploy:prod`.
- **Stripe est en mode réel** (clé `sk_live`), pas en test. Tout paiement
  déclenché débite une vraie carte.
- **Le vendeur est en franchise en base de TVA** (art. 293 B du CGI) :
  `automatic_tax` est désactivé dans le code — voir
  `apps/stripe-worker/src/index.ts` et `functions/src/stripe.ts`. Ne pas
  le réactiver sans vérifier d'abord que la franchise est dépassée, et
  sans activer Stripe Tax côté tableau de bord en même temps.
- **Deux offres payantes, vendables** : Creator (19 €/mois, 190 €/an) et
  Pro (39 €/mois, 390 €/an), le double de Creator et pas plus. Radar
  (gratuit) reste le point d'entrée. Les montants vivent dans
  `packages/shared/src/plans.ts` — ne jamais les modifier sans les
  répercuter dans Stripe, et inversement.
- **L'encaissement passe par un Worker Cloudflare**, pas par des Cloud
  Functions Firebase (qui exigeraient le plan payant Blaze) :
  `kairos-stripe.t-dufour1703.workers.dev`. Il se redéploie tout seul à
  chaque push sur `main` (intégration GitHub côté Cloudflare). Le code
  vit dans `apps/stripe-worker`, les quatre identifiants de prix Stripe
  dans `apps/stripe-worker/wrangler.toml` — ce sont des valeurs publiques
  (elles apparaissent dans l'URL de paiement), donc sans risque à lire.
- **Le portail de résiliation a un double chemin**, volontairement : une
  session créée par le Worker (un clic, aucune saisie), et un lien Stripe
  « sans code » en secours qui ne dépend d'aucune de nos briques —
  `NEXT_PUBLIC_STRIPE_PORTAL_URL` dans `apps/web/.env.production`. Résilier
  est une obligation légale (art. L. 215-1 du code de la consommation) qui
  ne doit jamais tomber en panne en même temps que le reste.
- **Trois rôles** : `user`, `admin`, `owner`. Un admin gère produits,
  classements et conformité. Seul `owner` peut créer un code partenaire —
  parce que chaque code engage un virement réel (30 % de commission).
  Le rôle ne se change **jamais** depuis le navigateur ; le seul chemin
  légitime est `pnpm --filter @kairos/jobs grant:role -- --email … --role …`
  depuis une machine qui a la clé de service Firebase.
- **Programme partenaire** (`/admin/affiliation`) : le propriétaire crée
  des codes lisibles (pas générés au hasard), les confie à des
  influenceurs qui n'ont pas de compte KAIROS, et les paie par virement à
  la main sur la base de ce que la page affiche. Rien n'est versé
  automatiquement — c'est un choix, pas un manque.
- **Blocage légal réel avant de vendre à un tiers** : `/mentions-legales`
  contient encore des crochets (`[Nom légal de la société]`,
  `[SIREN/SIRET]`, `[adresse complète]`). Publier un site marchand avec
  ces crochets est une infraction à la LCEN. Il manque aussi la mention
  « TVA non applicable, art. 293 B du CGI » en pied de facture Stripe
  (Paramètres → Facturation), obligatoire et pas encore posée.

## Comment le dépôt est construit

Monorepo pnpm + Turborepo.

```
apps/
  web/            Next.js 15, App Router, export 100 % statique — le produit
  jobs/           scripts Node lancés à la main (collecte, rôles, plans)
  stripe-worker/  le seul serveur du projet, sur Cloudflare Workers
  collector/      collecte alternative (voir docs/APIFY.md)
  creative-dna/   pipeline créatif (Gemini), à part
packages/
  core/           moteurs purs : verdict, gains, score d'opportunité, brief
  shared/         schémas Zod, catalogue de plans, droits, formatage
  payments/       catalogue Stripe ↔ plans, résolution des webhooks
  affiliate/      programme partenaire, calcul de commissions
  ai-gateway/     appels IA, garde-fous de coût
```

`packages/core` ne connaît ni Firebase ni HTTP : ce sont des fonctions
pures, testées sans réseau. C'est délibéré et ça ne doit pas changer — un
moteur qui décide combien un créateur va gagner doit être testable sans
dépendre de rien d'externe.

Node **≥ 20** requis (`package.json.engines`). Un `git pull` qui touche
`packages/*` exige de reconstruire ces paquets avant `apps/web` — voir
piège n°1 ci-dessous.

## Commandes essentielles

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test   # tout doit être vert sauf
                                            # read-budget.test.ts (émulateur)
pnpm test:rules                            # règles Firestore, via émulateur
pnpm deploy:check                          # construit et vérifie, ne déploie pas
pnpm deploy:prod                           # construit, vérifie, déploie
```

`pnpm deploy:prod` déploie **les règles Firestore et l'hébergement
ensemble** — jamais l'un sans l'autre, sinon une page peut appeler une
règle qui n'existe pas encore.

## Quatre pièges qui font perdre du temps

Chacun a déjà coûté du temps réel dans ce projet — pas des risques
théoriques.

1. **`packages/*/lib/` périmé.** `pnpm --filter @kairos/web build` appelle
   `next build` directement et ne reconstruit pas les paquets dont il
   dépend. Après un `git pull` qui touche `packages/core` ou
   `packages/shared`, le site se compile contre d'anciennes déclarations
   de types. Symptôme trompeur : une erreur TypeScript sur une propriété
   « qui n'existe pas », alors qu'elle est bien dans le code source.
   `scripts/deploy.sh` reconstruit désormais les paquets internes avant le
   site — mais un simple `pnpm --filter @kairos/web build` lancé à la main
   retombe dans le piège. En cas de doute : `pnpm build` (Turbo, tout le
   graphe) avant de chercher l'erreur ailleurs.
2. **Ne jamais lancer un build de production pendant que le serveur de
   dev tourne.** Le build écrase le `.next` du dev, qui se met à répondre
   « Internal Server Error » partout. Il faut `rm -rf apps/web/.next` puis
   redémarrer le dev.
3. **`pnpm test:rules` échoue avec `ECONNREFUSED 127.0.0.1:8080`** si on
   lance les tests de règles directement au lieu de passer par le script
   racine, qui démarre l'émulateur Firestore avant de lancer les tests.
   Toujours `pnpm test:rules`, jamais
   `pnpm --filter @kairos/firestore-rules-tests test` seul.
4. **Volume ExFAT (Mac) : fichiers `._*`.** macOS y sème des métadonnées
   que git essaie de lire comme des objets, avec des erreurs du genre
   `error: non-monotonic index … pack-*.idx`. Inoffensif mais bruyant.
   `export COPYFILE_DISABLE=1` dans `~/.zshrc`, et en cas de crise :
   `find . -name "._*" -not -path "./node_modules/*" -delete`.

## Par où continuer

Dans `docs/STATE.md`, section « Point de reprise » et le tableau des
domaines juste avant : ce qui est fait, ce qui reste ouvert, dans quel
ordre. Les deux blocages légaux ci-dessus (mentions légales, pied de
facture Stripe) sont la priorité avant toute vente à un inconnu — tout le
reste peut attendre.

**Ne jamais deviner un identifiant, une clé ou un prix.** S'il en manque
un, demander au propriétaire plutôt que d'inventer une valeur plausible —
c'est la règle n°2 appliquée à la configuration, pas seulement à
l'affichage.
