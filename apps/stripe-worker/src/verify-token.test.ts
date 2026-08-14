import { describe, expect, it } from "vitest";
import { unverifiedClaims } from "./verify-token";

// `unverifiedClaims` ne vérifie aucune signature — elle existe uniquement
// pour transformer « unexpected iss claim value » (l'erreur brute de jose,
// vue en production le 2026-08-14) en un message qui dit contre quel projet
// le jeton a réellement été émis, sans obliger à le décoder à la main.

function fakeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  // La signature n'est jamais lue par unverifiedClaims — un segment
  // arbitraire suffit à imiter la forme d'un JWT.
  return `${base64url({ alg: "RS256" })}.${base64url(payload)}.signature`;
}

describe("unverifiedClaims", () => {
  it("lit iss et aud sans vérifier la signature", () => {
    const token = fakeToken({ iss: "https://securetoken.google.com/autre-projet", aud: "autre-projet" });
    expect(unverifiedClaims(token)).toEqual({
      iss: "https://securetoken.google.com/autre-projet",
      aud: "autre-projet",
    });
  });

  it("ne lève jamais — un jeton mal formé renvoie null", () => {
    expect(unverifiedClaims("pas-un-jeton")).toBeNull();
    expect(unverifiedClaims("")).toBeNull();
    expect(unverifiedClaims("a.b")).toBeNull();
  });

  it("renvoie des champs manquants comme undefined, pas comme une erreur", () => {
    const token = fakeToken({ sub: "u1" });
    expect(unverifiedClaims(token)).toEqual({ iss: undefined, aud: undefined });
  });
});
