"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { ReferredUser } from "@kairos/affiliate";
import {
  normalisePartnerCode,
  partnerCodeDocSchema,
  planBySlug,
  userSchema,
  type PartnerCodeDoc,
} from "@kairos/shared";
import { firestore } from "@/lib/firebase/client";

// Accès Firestore du programme partenaire.
//
// Tout passe par le navigateur du propriétaire : c'est lui, et lui seul,
// qui a le droit d'écrire ici (firestore.rules → isSiteOwner). Pas de
// Cloud Function, donc pas de plan Blaze — le programme partenaire ne
// coûte rien à faire tourner.

const COLLECTION = "partnerCodes";

export function partnerCodeRef(code: string) {
  return doc(firestore, COLLECTION, normalisePartnerCode(code));
}

/** Le code existe-t-il déjà ? À vérifier avant d'en créer un. */
export async function partnerCodeExists(code: string): Promise<boolean> {
  const snapshot = await getDoc(partnerCodeRef(code));
  return snapshot.exists();
}

export class PartnerCodeTakenError extends Error {
  constructor(readonly code: string) {
    super(`Le code ${code} existe déjà.`);
  }
}

/**
 * Crée un code. Refuse d'écraser un code existant : un `setDoc` sans garde
 * remplacerait silencieusement le nom du partenaire et son taux, donc
 * réattribuerait à quelqu'un d'autre les inscrits déjà rattachés.
 */
export async function createPartnerCode(
  input: Omit<PartnerCodeDoc, "createdAt" | "code"> & { code: string },
): Promise<PartnerCodeDoc> {
  const code = normalisePartnerCode(input.code);
  if (await partnerCodeExists(code)) throw new PartnerCodeTakenError(code);

  const document = partnerCodeDocSchema.parse({
    ...input,
    code,
    createdAt: new Date().toISOString(),
  });
  await setDoc(partnerCodeRef(code), document);
  return document;
}

/** Active ou désactive un code. On ne supprime jamais — voir firestore.rules. */
export async function setPartnerCodeActive(code: string, active: boolean): Promise<void> {
  await updateDoc(partnerCodeRef(code), { active });
}

export async function listPartnerCodes(): Promise<PartnerCodeDoc[]> {
  const snapshot = await getDocs(collection(firestore, COLLECTION));
  return snapshot.docs
    .map((d) => partnerCodeDocSchema.safeParse(d.data()))
    .filter((r): r is { success: true; data: PartnerCodeDoc } => r.success)
    .map((r) => r.data);
}

/**
 * Les inscrits porteurs d'un code, réduits à ce que le calcul demande.
 *
 * Lit **toute** la collection `users`, ce qui n'est tenable que parce que
 * seul le propriétaire exécute cette requête, depuis une page qu'il ouvre
 * lui-même. Le jour où le nombre de comptes rend ça coûteux, la réponse
 * n'est pas de paginer ici mais de tenir un compteur par code — à ce
 * moment-là seulement, parce qu'un compteur dénormalisé est une occasion
 * de plus de diverger du réel.
 */
export async function listReferredUsers(): Promise<ReferredUser[]> {
  const snapshot = await getDocs(collection(firestore, "users"));
  const users: ReferredUser[] = [];

  for (const document of snapshot.docs) {
    const parsed = userSchema.safeParse(document.data());
    if (!parsed.success) continue;
    const user = parsed.data;
    if (!user.referredByCode) continue;

    // Le montant vient du catalogue et non du document utilisateur : le
    // prix réellement facturé est celui du plan au moment du calcul, et
    // c'est la seule valeur qu'on puisse justifier devant un partenaire.
    const definition = planBySlug(user.plan.slug);
    users.push({
      uid: user.uid,
      referredByCode: normalisePartnerCode(user.referredByCode),
      planSlug: user.plan.slug,
      planStatus: user.plan.status,
      monthlyPriceCents: definition.priceCents ?? 0,
      signedUpAt: user.createdAt,
    });
  }

  return users;
}
