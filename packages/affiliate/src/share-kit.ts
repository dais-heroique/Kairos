import QRCode from "qrcode";

const BASE_URL = "https://kairos.app";

export function buildReferralUrl(code: string, baseUrl: string = BASE_URL): string {
  return `${baseUrl}/r/${code}`;
}

// PNG en data URL — pas de dépendance réseau, généré entièrement côté
// serveur à partir du code d'affiliation.
export async function generateReferralQrCode(code: string, baseUrl?: string): Promise<string> {
  return QRCode.toDataURL(buildReferralUrl(code, baseUrl));
}

// 3 légendes prêtes à copier-coller — le contenu visuel (1080×1920, via
// sharp) dépend d'assets de design non fournis dans cet environnement ;
// voir docs/STATE.md pour ce qui reste à faire une fois le template reçu.
export function buildShareCaptions(code: string): [string, string, string] {
  const url = buildReferralUrl(code);
  return [
    `Je teste des produits TikTok Shop avant tout le monde avec Kairos 👀 Rejoins-moi : ${url}`,
    `Comment je trouve mes prochains produits gagnants sur TikTok Shop 📈 Code : ${code}`,
    `+30% de commission offerts si tu t'inscris avec mon lien : ${url}`,
  ];
}
