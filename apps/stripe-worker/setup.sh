#!/usr/bin/env bash
#
# Installation guidée du Worker Stripe sur Cloudflare.
#
# Pourquoi un script plutôt qu'une liste d'étapes : la procédure demande de
# poser trois secrets, de déployer deux fois, et de vérifier que rien ne
# manque. Chaque étape a une façon de rater en silence — un secret posé sur
# le mauvais nom, un fichier JSON collé au lieu d'être lu, un déploiement
# oublié après le dernier secret. Le script vérifie à chaque étape.
#
#   ./setup.sh
#
# Rien n'est écrit dans le dépôt : les secrets partent chez Cloudflare, la
# clé Firebase reste là où elle est sur ton disque.

set -euo pipefail

cd "$(dirname "$0")"

BLEU="\033[1;34m"; VERT="\033[1;32m"; ROUGE="\033[1;31m"; JAUNE="\033[1;33m"; RAZ="\033[0m"

titre() { printf "\n${BLEU}▸ %s${RAZ}\n" "$1"; }
ok()    { printf "${VERT}  ✓ %s${RAZ}\n" "$1"; }
alerte(){ printf "${JAUNE}  ! %s${RAZ}\n" "$1"; }
mourir(){ printf "\n${ROUGE}✗ %s${RAZ}\n\n" "$1"; exit 1; }

WRANGLER="pnpm exec wrangler"

# --------------------------------------------------------------------------
titre "1/6 — Connexion à Cloudflare"

# ⚠️ `wrangler whoami` sort en code 0 même sans authentification : il faut
# lire sa sortie, pas son code de retour. Sinon le script annonce « déjà
# connecté » et c'est le déploiement qui échoue trois lignes plus bas, avec
# un message qui ne parle pas de connexion.
QUI=$($WRANGLER whoami 2>&1 || true)

if printf '%s' "$QUI" | grep -qi "not authenticated"; then
  echo "  Une page va s'ouvrir dans ton navigateur. Autorise, puis reviens ici."
  $WRANGLER login || mourir "Connexion Cloudflare refusée."
  QUI=$($WRANGLER whoami 2>&1 || true)
  printf '%s' "$QUI" | grep -qi "not authenticated" && mourir "Toujours pas connecté."
  ok "connecté"
else
  ok "déjà connecté : $(printf '%s' "$QUI" | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' | head -1 || echo 'compte actif')"
fi

# --------------------------------------------------------------------------
titre "2/6 — Première mise en ligne du Worker"

echo "  (il ne saura encore rien faire : c'est normal, les secrets viennent après)"
$WRANGLER deploy >/tmp/kairos-deploy.log 2>&1 || {
  cat /tmp/kairos-deploy.log
  mourir "Le déploiement a échoué. Le message est juste au-dessus."
}

URL=$(grep -oE 'https://[a-z0-9.-]+\.workers\.dev' /tmp/kairos-deploy.log | head -1 || true)
[ -n "$URL" ] || mourir "Impossible de lire l'adresse du Worker. Regarde /tmp/kairos-deploy.log"
ok "en ligne : $URL"

# --------------------------------------------------------------------------
titre "3/6 — Ta clé Firebase (le fichier .json)"

echo "  Elle donne accès à ta base : elle part chez Cloudflare, jamais dans le dépôt."
echo

CANDIDATS=$(ls ~/Downloads/*adminsdk*.json ~/Downloads/*serviceaccount*.json \
               ~/*adminsdk*.json 2>/dev/null | head -5 || true)

if [ -n "$CANDIDATS" ]; then
  echo "  Fichiers trouvés :"
  echo "$CANDIDATS" | nl -w4 -s') '
  echo
  read -r -p "  Numéro du bon fichier (ou colle un chemin complet) : " CHOIX
  if [[ "$CHOIX" =~ ^[0-9]+$ ]]; then
    CLE=$(echo "$CANDIDATS" | sed -n "${CHOIX}p")
  else
    CLE="${CHOIX/#\~/$HOME}"
  fi
else
  alerte "Aucun fichier trouvé dans ~/Downloads."
  read -r -p "  Chemin complet du .json : " CHOIX
  CLE="${CHOIX/#\~/$HOME}"
fi

[ -f "$CLE" ] || mourir "Fichier introuvable : $CLE"
grep -q '"private_key"' "$CLE" || mourir "Ce fichier n'est pas une clé de compte de service (pas de private_key)."
ok "clé lue : $(basename "$CLE")"

$WRANGLER secret put FIREBASE_SERVICE_ACCOUNT < "$CLE" >/dev/null 2>&1 \
  || mourir "Envoi de la clé refusé."
ok "clé envoyée chez Cloudflare"

# --------------------------------------------------------------------------
titre "4/6 — Ta clé secrète Stripe"

echo "  Stripe → Développeurs → Clés d'API → « Clé secrète »"
echo "  Elle commence par sk_test_ (mode Test) ou sk_live_ (mode Réel)."
echo
read -r -s -p "  Colle-la ici (elle ne s'affichera pas) : " SK
echo

[ -n "$SK" ] || mourir "Aucune clé saisie."
case "$SK" in
  sk_test_*|sk_live_*) ;;
  *) mourir "Une clé secrète Stripe commence par sk_test_ ou sk_live_. Tu as peut-être copié la clé publique (pk_)." ;;
esac

printf '%s' "$SK" | $WRANGLER secret put STRIPE_SECRET_KEY >/dev/null 2>&1 \
  || mourir "Envoi de la clé Stripe refusé."
ok "clé Stripe envoyée"

# --------------------------------------------------------------------------
titre "5/6 — Le webhook Stripe"

cat <<EOF

  Va dans Stripe → Développeurs → Webhooks → « Ajouter un point de terminaison »

  Adresse à coller :
      ${URL}/stripe/webhook

  Événements à cocher — ces quatre-là, surtout pas « tous » :
      checkout.session.completed
      customer.subscription.created
      customer.subscription.updated
      customer.subscription.deleted

  Stripe affiche ensuite un « secret de signature » qui commence par whsec_

EOF
read -r -s -p "  Colle-le ici : " WHSEC
echo

[ -n "$WHSEC" ] || mourir "Aucun secret saisi."
case "$WHSEC" in
  whsec_*) ;;
  *) mourir "Le secret de signature commence par whsec_." ;;
esac

printf '%s' "$WHSEC" | $WRANGLER secret put STRIPE_WEBHOOK_SECRET >/dev/null 2>&1 \
  || mourir "Envoi du secret de webhook refusé."
ok "secret de webhook envoyé"

# --------------------------------------------------------------------------
titre "6/6 — Remise en ligne et vérification"

$WRANGLER deploy >/dev/null 2>&1 || mourir "Le second déploiement a échoué."
ok "Worker redéployé avec ses secrets"

SANTE=$(curl -fsS "$URL/health" 2>/dev/null || true)
[ -n "$SANTE" ] || mourir "Le Worker ne répond pas sur $URL/health"

MANQUANTS=$(printf '%s' "$SANTE" | grep -o '"prixManquants":\[[^]]*\]' || true)

printf "\n${VERT}════════════════════════════════════════════${RAZ}\n"
printf "${VERT} Le Worker tourne.${RAZ}\n"
printf "${VERT}════════════════════════════════════════════${RAZ}\n\n"
printf "  Adresse : %s\n\n" "$URL"

if printf '%s' "$MANQUANTS" | grep -q 'STRIPE_PRICE'; then
  cat <<EOF
  Il reste les tarifs. Dans Stripe, crée tes produits et leurs prix
  récurrents, puis note les identifiants « price_… ».

  Ensuite ouvre  apps/stripe-worker/wrangler.toml  et complète le bloc
  [vars] avec ces quatre lignes, puis relance :

      pnpm exec wrangler deploy

  Enfin, dans  apps/web/.env.production  :

      NEXT_PUBLIC_STRIPE_WORKER_URL=$URL
      NEXT_PUBLIC_STRIPE_PRICE_CREATOR_MONTHLY=price_…
      NEXT_PUBLIC_STRIPE_PRICE_CREATOR_YEARLY=price_…
      NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_…
      NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_…

  et les deux montants dans  packages/shared/src/plans.ts  (priceCents),
  puis  ./scripts/deploy.sh  à la racine.

EOF
else
  cat <<EOF
  Tous les tarifs sont configurés. Vérifie l'adresse dans
  apps/web/.env.production :

      NEXT_PUBLIC_STRIPE_WORKER_URL=$URL

  puis déploie le site :  ./scripts/deploy.sh

EOF
fi

printf "  Pour voir ce qui se passe en direct :  pnpm exec wrangler tail\n\n"
