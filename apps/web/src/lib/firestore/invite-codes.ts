"use client";

import {
  collection,
  doc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { type InviteCode, inviteCodeSchema } from "@kairos/shared";
import { firestore } from "@/lib/firebase/client";
import { userDocRef } from "./user";

function inviteCodeRef(code: string) {
  return doc(firestore, "inviteCodes", code.toUpperCase());
}

export const INVITE_TRIAL_DAYS = 5;

export async function createInviteCode(
  createdBy: string,
  input: { code: string; maxUses: number },
): Promise<void> {
  const value = inviteCodeSchema.parse({
    code: input.code.toUpperCase(),
    trialDays: INVITE_TRIAL_DAYS,
    maxUses: input.maxUses,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy,
  });
  await setDoc(inviteCodeRef(input.code), value);
}

export async function listInviteCodes(): Promise<InviteCode[]> {
  const snap = await getDocs(collection(firestore, "inviteCodes"));
  return snap.docs.map((d) => inviteCodeSchema.parse(d.data()));
}

export async function setInviteCodeActive(
  code: string,
  active: boolean,
): Promise<void> {
  await updateDoc(inviteCodeRef(code), { active });
}

export type RedeemResult =
  | { ok: true; trialDays: number }
  | { ok: false; reason: "not_found" | "inactive" | "exhausted" | "already_applied" };

// Transaction : incrémente usedCount ET passe l'utilisateur en essai Pro en
// une seule opération atomique — voir firestore.rules isValidTrialGrant()
// et isValidCodeRedemption() pour les contraintes miroir côté serveur.
export async function redeemInviteCode(
  rawCode: string,
  uid: string,
): Promise<RedeemResult> {
  const codeRef = inviteCodeRef(rawCode);
  const userRef = userDocRef(uid);

  return runTransaction(firestore, async (tx) => {
    const [codeSnap, userSnap] = await Promise.all([
      tx.get(codeRef),
      tx.get(userRef),
    ]);

    if (!codeSnap.exists()) return { ok: false, reason: "not_found" as const };
    const invite = inviteCodeSchema.parse(codeSnap.data());
    if (!invite.active) return { ok: false, reason: "inactive" as const };
    if (invite.usedCount >= invite.maxUses) {
      return { ok: false, reason: "exhausted" as const };
    }
    if (userSnap.data()?.appliedInviteCode) {
      return { ok: false, reason: "already_applied" as const };
    }

    const currentPeriodEnd = new Date(
      Date.now() + invite.trialDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    tx.update(codeRef, { usedCount: invite.usedCount + 1 });
    tx.update(userRef, {
      appliedInviteCode: invite.code,
      plan: {
        slug: "pro",
        status: "active",
        currentPeriodEnd,
        stripeCustomerId: null,
      },
    });

    return { ok: true, trialDays: invite.trialDays };
  });
}
