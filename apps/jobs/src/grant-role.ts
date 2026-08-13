/**
 * Attribue un rôle à un utilisateur, depuis le Mac, via l'Admin SDK.
 *
 *   pnpm grant:role -- --email anthony@exemple.fr --role admin
 *   pnpm grant:role -- --email moi@exemple.fr --role owner
 *   pnpm grant:role -- --email quelquun@exemple.fr --role user
 *   pnpm grant:role -- --email … --role admin --dry-run
 *
 * Pourquoi un script plutôt qu'un bouton dans `/admin` :
 *
 * `users/{uid}.role` est **volontairement** impossible à écrire depuis le
 * navigateur (`roleUnchanged()` dans firestore.rules). Ajouter une
 * exception pour qu'un admin promeuve un autre admin ouvrirait exactement
 * le chemin que cette règle existe pour fermer — et une élévation de
 * privilèges ne se rattrape pas après coup. L'Admin SDK ignore les règles,
 * il tourne ici en local, et jamais dans un bundle navigateur.
 *
 * Les trois rôles :
 *
 *   `user`  — tout le monde.
 *   `admin` — produits, classements, pipeline, conformité. Voit les
 *             chiffres du programme partenaire mais ne peut pas créer de
 *             code.
 *   `owner` — tout ce qui précède, **plus** créer et désactiver les codes
 *             partenaires. C'est le seul rôle qui peut engager un virement,
 *             d'où sa séparation.
 */
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { USER_ROLES, userRoleSchema, type UserRole } from "@kairos/shared";
import { findServiceAccountKey, loadEnvLocal } from "./load-env.js";

loadEnvLocal();

interface Args {
  email: string;
  role: UserRole;
  dryRun: boolean;
}

function usage(message: string): never {
  console.error(`\n❌ ${message}\n`);
  console.error("Usage :");
  console.error(`  pnpm grant:role -- --email <email> --role <${USER_ROLES.join("|")}> [--dry-run]\n`);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const email = get("email")?.trim();
  if (!email) usage("--email est obligatoire.");

  const parsed = userRoleSchema.safeParse(get("role")?.trim());
  if (!parsed.success) usage(`--role doit valoir ${USER_ROLES.join(", ")}.`);

  return { email, role: parsed.data, dryRun: argv.includes("--dry-run") };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const keyPath = findServiceAccountKey();
  if (!keyPath && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      "\n❌ Aucune clé de compte de service trouvée.\n" +
        "   Console Firebase > Paramètres du projet > Comptes de service >\n" +
        "   « Générer une nouvelle clé privée », puis :\n\n" +
        "   GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle.json pnpm grant:role -- …\n",
    );
    process.exit(1);
  }
  if (keyPath) process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

  const projectId = process.env.GCP_PROJECT_ID ?? "kairos-on";
  if (getApps().length === 0) {
    initializeApp({ projectId, credential: applicationDefault() });
  }

  // Affiché systématiquement, avant tout appel : si le projet réellement
  // interrogé ne correspond pas à celui vu dans la console (plusieurs
  // projets sur le même compte Google, clé téléchargée pour le mauvais),
  // c'est ici que ça se voit — et pas après un message d'erreur trompeur.
  console.log(`▸ Projet Firebase : ${projectId}`);

  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  try {
    uid = (await auth.getUserByEmail(args.email)).uid;
  } catch (error) {
    const code = (error as { code?: string } | undefined)?.code;
    if (code === "auth/user-not-found") {
      console.error(
        `\n❌ Aucun compte Firebase Auth pour ${args.email} dans le projet ${projectId}.\n` +
          "   La personne doit s'être connectée au moins une fois — c'est cette\n" +
          "   première connexion qui crée son compte et son document.\n" +
          "   Si tu la vois pourtant dans la console Firebase : vérifie en haut à\n" +
          "   gauche de la console que le projet sélectionné est bien\n" +
          `   « ${projectId} », et pas un autre projet du même compte Google.\n`,
      );
    } else {
      // Toute autre erreur (identifiants invalides, permissions, projet de
      // la clé différent de celui interrogé, réseau…) mérite d'être vue
      // telle quelle : la déguiser en « compte introuvable » a déjà fait
      // perdre du temps à chercher le problème au mauvais endroit.
      console.error(`\n❌ Échec de la recherche du compte (${code ?? "erreur inconnue"}).`);
      console.error(error);
      console.error(
        "\n   Ce n'est pas forcément « le compte n'existe pas » — vérifie que la clé\n" +
          `   de compte de service appartient bien au projet ${projectId} (son champ\n` +
          "   project_id, dans le fichier .json).\n",
      );
    }
    process.exit(1);
  }

  const ref = db.collection("users").doc(uid);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    console.error(
      `\n❌ users/${uid} n'existe pas encore.\n` +
        "   Le compte Auth existe mais pas le document : demande à la personne\n" +
        "   d'ouvrir le site une fois, puis relance.\n",
    );
    process.exit(1);
  }

  const before = (snapshot.data()?.role as UserRole | undefined) ?? "user";

  console.log(`\n▸ ${args.email}  (${uid})`);
  console.log(`▸ Rôle : ${before} → ${args.role}`);

  if (before === args.role) {
    console.log("\n✓ Rien à faire, le rôle est déjà celui-là.\n");
    return;
  }

  // Retirer le dernier propriétaire laisserait le programme partenaire sans
  // personne pour créer un code — et personne pour se redonner le rôle,
  // puisque seul ce script le peut. On refuse, plutôt que de le découvrir
  // après coup.
  if (before === "owner" && args.role !== "owner") {
    const owners = await db.collection("users").where("role", "==", "owner").get();
    if (owners.size <= 1) {
      console.error(
        "\n❌ C'est le dernier propriétaire du site.\n" +
          "   Promeus quelqu'un d'autre en `owner` avant de rétrograder celui-ci.\n",
      );
      process.exit(1);
    }
  }

  if (args.dryRun) {
    console.log("\n⚠️  --dry-run : rien n'a été écrit.\n");
    return;
  }

  // `update` et non `set` : un `set` sans merge remplacerait le document
  // entier — profil, plan et watchlist compris.
  await ref.update({ role: args.role });
  console.log("\n✓ Rôle appliqué.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
