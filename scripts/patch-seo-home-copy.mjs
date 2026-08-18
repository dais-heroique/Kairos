import fs from "node:fs";

const copy = {
  fr: {
    title: "Analyse le timing TikTok Shop",
    kicker: "Pour les créateurs et affiliés TikTok Shop",
  },
  en: {
    title: "Analyze TikTok Shop product timing",
    kicker: "For TikTok Shop creators and affiliates",
  },
  de: {
    title: "TikTok-Shop-Produkt-Timing analysieren",
    kicker: "Für TikTok-Shop-Creator und Affiliates",
  },
  es: {
    title: "Analiza el momento de cada producto TikTok Shop",
    kicker: "Para creadores y afiliados de TikTok Shop",
  },
  it: {
    title: "Analizza il momento giusto per ogni prodotto TikTok Shop",
    kicker: "Per creator e affiliati TikTok Shop",
  },
  nl: {
    title: "Analyseer de timing van TikTok Shop-producten",
    kicker: "Voor TikTok Shop-creators en affiliates",
  },
  pl: {
    title: "Analizuj moment wejścia produktu TikTok Shop",
    kicker: "Dla twórców i afiliantów TikTok Shop",
  },
};

for (const [locale, values] of Object.entries(copy)) {
  const path = `apps/web/src/messages/${locale}.json`;
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  data.Home.title = values.title;
  data.Home.kicker = values.kicker;
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}
