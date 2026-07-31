"use client";

import {
  GoogleAuthProvider,
  OAuthProvider,
  type User,
  deleteUser,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "./client";

// Clé localStorage utilisée pour retrouver l'email entre l'envoi du lien et
// son ouverture (potentiellement sur un autre onglet du même appareil).
const EMAIL_FOR_SIGN_IN_KEY = "kairos:emailForSignIn";

function buildEmailLinkUrl(): string {
  return `${window.location.origin}/connexion/verification`;
}

export async function sendEmailSignInLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, {
    url: buildEmailLinkUrl(),
    handleCodeInApp: true,
  });
  window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
}

export function isEmailSignInLink(url: string): boolean {
  return isSignInWithEmailLink(auth, url);
}

export function getStoredEmailForSignIn(): string | null {
  return window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
}

export async function completeEmailSignIn(
  email: string,
  url: string,
): Promise<User> {
  const credential = await signInWithEmailLink(auth, email, url);
  window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return credential.user;
}

export async function signInWithApple(): Promise<User> {
  const credential = await signInWithPopup(auth, new OAuthProvider("apple.com"));
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// Pas de Cloud Functions (plan Spark) — suppression de l'identité Auth
// directement depuis le client. Peut lever "auth/requires-recent-login" si
// la session date de plus de quelques minutes ; l'appelant doit alors
// renvoyer l'utilisateur se reconnecter avant de réessayer.
export async function deleteCurrentUserAccount(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("Aucun utilisateur connecté.");
  }
  await deleteUser(auth.currentUser);
}
