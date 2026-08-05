import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { FirebaseInit } from "@/components/FirebaseInit";
import { AuthProvider } from "@/lib/firebase/auth-context";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// `metadataBase` est ce qui transforme les chemins relatifs ci-dessous en
// URL absolues : sans lui, Next émet un avertissement et les balises Open
// Graph pointent nulle part — un lien partagé sur TikTok, WhatsApp ou
// Discord s'affiche alors sans titre ni image.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Produits TikTok Shop France : quand entrer, quand passer`,
    // Les pages internes n'ont plus à répéter la marque à la main.
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  keywords: [
    "TikTok Shop France",
    "produits gagnants TikTok",
    "affiliation TikTok Shop",
    "commission créateur TikTok",
    "saturation produit",
    "quoi vendre sur TikTok Shop",
  ],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE_NAME,
    url: "/",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "business",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <FirebaseInit />
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
