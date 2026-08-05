#!/usr/bin/env bash
#
# Déploiement de Kairos sur Firebase Hosting + règles Firestore.
#
# Pourquoi un script plutôt que quatre commandes copiées-collées : la
# procédure a trois pièges, et deux d'entre eux sont silencieux.
#
#   1. `.env.local` a priorité sur `.env.production` chez Next. Si on
#      l'oublie, le bundle de production part avec la config émulateur —
#      le site se connecte à 127.0.0.1 et il ne se passe rien chez le
#      visiteur. Aucune erreur, aucun avertissement. Ici il est mis de
#      côté et remis en place par un `trap`, donc même si le build casse
#      ou si tu fais Ctrl-C, tu ne te retrouves pas avec un dépôt dont le
#      `.env.local` a disparu.
#
#   2. Une seule route dynamique (`ƒ`) et l'intégration Firebase bascule
#      sur « Building a Cloud Function », ce qui exige le plan Blaze —
#      donc de l'argent, alors que la contrainte est 0 €. On construit
#      d'abord et on refuse de déployer si une route dynamique apparaît.
#
#   3. Les règles Firestore doivent partir avec l'hébergement. Le
#      paywall côté navigateur est décoratif par construction ; ce qui
#      protège réellement les relevés, c'est `firestore.rules`. Déployer
#      l'hébergement seul publierait une interface qui promet un contrôle
#      d'accès que le serveur n'applique pas.
#
# Usage :
#   ./scripts/deploy.sh              déploie
#   ./scripts/deploy.sh --dry-run    construit et vérifie, ne déploie pas

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

if [[ ! -f firebase.json || ! -f firestore.rules ]]; then
  echo "❌ Lancé hors du dépôt Kairos ($ROOT)." >&2
  exit 1
fi

echo "▸ Dépôt      : $ROOT"
echo "▸ Branche    : $(git rev-parse --abbrev-ref HEAD) ($(git rev-parse --short HEAD))"
# `require('./.firebaserc')` échoue : sans extension connue, Node lit le
# fichier comme du JavaScript et la syntaxe JSON n'en est pas.
echo "▸ Projet     : $(node -p "JSON.parse(require('fs').readFileSync('.firebaserc','utf8')).projects.default")"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  Des modifications ne sont pas commitées. Tu déploierais un état"
  echo "    qui n'existe nulle part dans l'historique."
  git status --short
  read -r -p "    Continuer quand même ? [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" ]] || exit 1
fi

# macOS sur volume ExFAT sème des fichiers `._*` qui font échouer le build
# et ESLint avec des erreurs incompréhensibles.
export COPYFILE_DISABLE=1
find . -name "._*" -not -path "./node_modules/*" -not -path "./.git/*" -delete 2>/dev/null || true

# Utiliser le `firebase` global s'il existe : `npx firebase-tools` retélécharge
# la CLI et l'utilisateur en a déjà une, authentifiée.
if command -v firebase >/dev/null 2>&1; then
  FIREBASE=firebase
else
  FIREBASE="npx --yes firebase-tools"
fi

# Vérifier l'authentification AVANT de toucher à quoi que ce soit : échouer
# après avoir déplacé `.env.local` serait inutilement inquiétant. On ne teste
# que le cas franchement négatif — si le format de sortie de la CLI change,
# mieux vaut laisser `deploy` refuser lui-même que bloquer à tort.
if $FIREBASE login:list 2>&1 | grep -q "No authorized accounts"; then
  echo "❌ Aucun compte Firebase authentifié. Lance : firebase login" >&2
  exit 1
fi

ENV_LOCAL="apps/web/.env.local"
restore_env() {
  if [[ -f "$ENV_LOCAL.deploy-bak" ]]; then
    mv "$ENV_LOCAL.deploy-bak" "$ENV_LOCAL"
    echo "▸ $ENV_LOCAL remis en place."
  fi
}
trap restore_env EXIT

if [[ -f "$ENV_LOCAL" ]]; then
  mv "$ENV_LOCAL" "$ENV_LOCAL.deploy-bak"
  echo "▸ $ENV_LOCAL mis de côté (il aurait écrasé .env.production)."
fi

echo
echo "▸ Construction d'apps/web…"
BUILD_LOG="$(mktemp)"
if ! pnpm --filter @kairos/web build 2>&1 | tee "$BUILD_LOG"; then
  echo "❌ Le build a échoué — rien n'a été déployé." >&2
  exit 1
fi

# Les lignes du tableau de routes commencent par un caractère de cadre
# (┌ ├ └) suivi du symbole. La légende, elle, commence directement par le
# symbole — d'où le filtre, sinon on détecterait toujours « ƒ (Dynamic) »
# même avec zéro route dynamique.
#
# Alternation `(┌|├|└)` et non classe `[┌├└]` : en locale C, une classe de
# caractères raisonne en octets et découpe ces caractères multi-octets, si
# bien que le motif ne correspond jamais. Testé : la version avec crochets
# ne détectait rien du tout, y compris sur une sortie contenant réellement
# une route `ƒ`. Un garde-fou silencieusement inopérant est pire que pas
# de garde-fou — il donne le feu vert.
DYNAMIC_ROUTE_RE='^(┌|├|└)[[:space:]]+ƒ[[:space:]]'
if grep -qE "$DYNAMIC_ROUTE_RE" "$BUILD_LOG"; then
  echo >&2
  echo "❌ Route(s) dynamique(s) détectée(s) :" >&2
  grep -E "$DYNAMIC_ROUTE_RE" "$BUILD_LOG" >&2
  echo >&2
  echo "   Firebase déploierait une Cloud Function, ce qui exige le plan" >&2
  echo "   Blaze (payant). Déploiement annulé — la contrainte est 0 €." >&2
  exit 1
fi
echo "✅ Aucune route dynamique : build 100 % statique, plan Spark préservé."
rm -f "$BUILD_LOG"

if [[ "$DRY_RUN" == true ]]; then
  echo
  echo "▸ --dry-run : vérifications passées, aucun déploiement."
  exit 0
fi

echo
echo "▸ Déploiement (règles Firestore + hébergement)…"
$FIREBASE deploy --only firestore:rules,hosting

echo
echo "✅ En ligne : https://kairos-on.web.app"
echo "   Pense à mettre à jour le Snapshot de docs/STATE.md."
