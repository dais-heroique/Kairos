import { describe, expect, it } from "vitest";
import type { Plan } from "@kairos/shared";
import { decodeString, encodePlan } from "./firestore-rest";

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    slug: "creator",
    status: "active",
    currentPeriodEnd: "2026-09-08T00:00:00.000Z",
    stripeCustomerId: "cus_1",
    ...overrides,
  };
}

describe("encodePlan", () => {
  // Firestore REST attend des valeurs typées : {"stringValue": "x"} et non
  // "x". Une valeur mal encodée n'échoue pas bruyamment — elle écrit un
  // document que `planSchema.parse()` rejettera à la lecture, c'est-à-dire
  // un compte cassé après un paiement réussi.
  it("encode chaque champ dans sa forme typée Firestore", () => {
    expect(encodePlan(plan())).toEqual({
      mapValue: {
        fields: {
          slug: { stringValue: "creator" },
          status: { stringValue: "active" },
          currentPeriodEnd: { stringValue: "2026-09-08T00:00:00.000Z" },
          stripeCustomerId: { stringValue: "cus_1" },
        },
      },
    });
  });

  // Omettre un champ nul laisserait l'ancienne valeur en place : un
  // `currentPeriodEnd` périmé après une résiliation raconterait que
  // l'abonnement court encore.
  it("écrit explicitement les valeurs nulles au lieu de les omettre", () => {
    const encoded = encodePlan(plan({ currentPeriodEnd: null, stripeCustomerId: null }));
    const fields = "mapValue" in encoded ? encoded.mapValue.fields : {};

    expect(fields.currentPeriodEnd).toEqual({ nullValue: null });
    expect(fields.stripeCustomerId).toEqual({ nullValue: null });
    expect(Object.keys(fields).sort()).toEqual([
      "currentPeriodEnd",
      "slug",
      "status",
      "stripeCustomerId",
    ]);
  });

  it("porte le retour au gratuit d'une résiliation", () => {
    const encoded = encodePlan(plan({ slug: "radar", status: "canceled" }));
    const fields = "mapValue" in encoded ? encoded.mapValue.fields : {};

    expect(fields.slug).toEqual({ stringValue: "radar" });
    expect(fields.status).toEqual({ stringValue: "canceled" });
  });
});

describe("decodeString", () => {
  it("lit une chaîne, et rien d'autre", () => {
    expect(decodeString({ stringValue: "abc" })).toBe("abc");
    expect(decodeString({ nullValue: null })).toBeNull();
    expect(decodeString({ booleanValue: true })).toBeNull();
    expect(decodeString(undefined)).toBeNull();
  });
});
