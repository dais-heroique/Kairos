import { initializeApp } from "firebase-admin/app";
import { onCall } from "firebase-functions/v2/https";

initializeApp();

// Le plan Spark (gratuit) ne permet pas de déployer de Cloud Functions
// (nécessite le plan Blaze). L'export et la suppression RGPD (§ Phase 1)
// tournent donc entièrement côté client — voir apps/web/src/lib/firestore/user.ts
// et apps/web/src/lib/firebase/auth.ts. Ce fichier reste minimal en attendant
// les vraies callables serveur (webhooks Stripe, briefs, etc. — Phase 5+),
// qui exigeront de passer au plan Blaze.
export const ping = onCall({ enforceAppCheck: true }, () => {
  return { ok: true, at: new Date().toISOString() };
});
