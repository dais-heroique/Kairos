/**
 * Attribue un plan à un utilisateur, depuis le Mac, via l'Admin SDK.
 *
 *   pnpm grant:plan -- --email lea@exemple.fr --plan creator
 *   pnpm grant:plan -- --email lea@exemple.fr --plan radar --status canceled
 *   pnpm grant:plan -- --email lea@exemple.fr --plan creator --dry-run
 *
 * Pourquoi cet outil existe, et pourquoi il n'est pas un raccourci sale :
 *
 * `users/{uid}.plan` est **volontairement** impossible à écrire depuis le
 * navigateur — `planUnchanged()` dans firestore.rules l'interdit, y compris
 * aux admins. C'est ce qui empêche n'importe qui de s'offrir un plan payant
 * en modifiant son propre document. Le seul chemin légitime est l'Admin
 * SDK, qui ignore les règles, et qui tourne ici en local sur ta machine —
 * jamais dans un bundle navigateur.
 *
 * Il sert dans deux situations :
 *
 *   1. **Encaissement par lien de paiement Stripe**, sans serveur ni Cloud
 *      Function : le client paie, tu vois le paiement dans le tableau de
 *      bord Stripe, tu actives son plan avec cette commande. Le plan Spark
 *      est préservé, la contrainte 0 € tient. Viable à petite échelle,
 *      pénible au-delà — voir docs/STRIPE.md.
 *
 *   2. **Reprise manuelle** quand le webhook renvoie `unresolved` : prix
 *      archivé, `metadata.uid` perdu. Le webhook refuse volontairement de
 *      deviner ; c'est ici qu'on tranche, en connaissance de cause.
 */
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { planSchema, type PlanSlug, type PlanStatus } from "@kairos/shared";
import { findServiceAccountKey, loadEnvLocal } from "./load-env.js";

loadEnvLocal();

const VALID_PLANS: PlanSlug[] = ["radar", "creator", "pro"];
const VALID_STATUSES: PlanStatus[] = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
];

interface Args {
  email: string;
  plan: PlanSlug;
  status: PlanStatus;
  periodEnd: string | null;
  dryRun: boolean;
}

function usage(message: string): never {
  console.error(`\n❌ ${message}\n`);
  console.error("Usage :");
  console.error("  pnpm grant:plan -- --email <email> --plan <radar|creator|pro>");
  console.error("                     [--status <active|trialing|past_due|canceled|incomplete>]");
  console.error("                     [--period-end <ISO 8601>] [--dry-run]\n");
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const email = get("email")?.trim();
  if (!email) usage("--email est obligatoire.");

  const plan = get("plan")?.trim() as PlanSlug | undefined;
  if (!plan || !VALID_PLANS.includes(plan)) {
    usage(`--plan doit valoir ${VALID_PLANS.join(", ")}.`);
  }

  // Par défaut « active » : c'est l'usage normal (quelqu'un vient de payer).
  // Le statut compte autant que le plan — `entitlementsOf` ne considère
  // actifs que `active` et `trialing`, donc un slug payant avec un statut
  // impayé ne donne aucun accès. C'est voulu.
  const status = (get("status")?.trim() ?? "active") as PlanStatus;
  if (!VALID_STATUSES.includes(status)) {
    usage(`--status doit valoir ${VALID_STATUSES.join(", ")}.`);
  }

  const periodEnd = get("period-end")?.trim() ?? null;
  if (periodEnd && Number.isNaN(Date.parse(periodEnd))) {
    usage("--period-end doit être une date ISO 8601, par exemple 2026-09-08T00:00:00.000Z.");
  }

  return { email, plan, status, periodEnd, dryRun: argv.includes("--dry-run") };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const keyPath = findServiceAccountKey();
  if (!keyPath && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      "\n❌ Aucune clé de compte de service trouvée.\n" +
        "   Console Firebase > Paramètres du projet > Comptes de service >\n" +
        "   « Générer une nouvelle clé privée », puis :\n\n" +
        "   GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle.json pnpm grant:plan -- …\n",
    );
    process.exit(1);
  }
  if (keyPath) process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.GCP_PROJECT_ID ?? "kairos-on",
      credential: applicationDefault(),
    });
  }

  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  try {
    uid = (await auth.getUserByEmail(args.email)).uid;
  } catch {
    console.error(
      `\n❌ Aucun compte Firebase Auth pour ${args.email}.\n` +
        "   L'utilisateur doit s'être connecté au moins une fois.\n",
    );
    process.exit(1);
  }

  const ref = db.collection("users").doc(uid);
  const before = (await ref.get()).data();
  if (!before) {
    console.error(`\n❌ users/${uid} n'existe pas — onboarding jamais terminé ?\n`);
    process.exit(1);
  }

  const plan = planSchema.parse({
    slug: args.plan,
    status: args.status,
    currentPeriodEnd: args.periodEnd ? new Date(args.periodEnd).toISOString() : null,
    // Conservé s'il existe : c'est le lien avec le client Stripe, et
    // l'écraser rendrait un futur webhook orphelin.
    stripeCustomerId: (before.plan?.stripeCustomerId as string | undefined) ?? null,
  });

  const previous = before.plan as Record<string, unknown> | undefined;
  console.log(`\nUtilisateur : ${args.email} (${uid})`);
  console.log(`Avant       : ${previous?.slug ?? "?"} / ${previous?.status ?? "?"}`);
  console.log(`Après       : ${plan.slug} / ${plan.status}`);
  if (plan.currentPeriodEnd) console.log(`Fin période : ${plan.currentPeriodEnd}`);

  if (args.dryRun) {
    console.log("\n(--dry-run : rien n'a été écrit)\n");
    return;
  }

  await ref.set({ plan }, { merge: true });
  console.log("\n✅ Plan appliqué.\n");
}

main().catch((error: unknown) => {
  console.error("\n❌ Échec :", error instanceof Error ? error.message : error, "\n");
  process.exit(1);
});
