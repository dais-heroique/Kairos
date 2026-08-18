"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import de from "@/messages/de.json";
import es from "@/messages/es.json";
import it from "@/messages/it.json";
import nl from "@/messages/nl.json";
import pl from "@/messages/pl.json";

export const SUPPORTED_LOCALES = ["fr", "en", "de", "es", "it", "nl", "pl"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
};

const MESSAGE_OVERRIDES: Record<Locale, AbstractIntlMessages> = {
  fr,
  en,
  de,
  es,
  it,
  nl,
  pl,
};

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  labels: Record<Locale, string>;
}>({
  locale: "fr",
  setLocale: () => undefined,
  labels: LOCALE_LABELS,
});

function isMessageRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeMessages(
  base: AbstractIntlMessages,
  override: AbstractIntlMessages,
): AbstractIntlMessages {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];
    if (isMessageRecord(baseValue) && isMessageRecord(value)) {
      merged[key] = mergeMessages(
        baseValue as AbstractIntlMessages,
        value as AbstractIntlMessages,
      );
    } else {
      merged[key] = value;
    }
  }

  return merged as AbstractIntlMessages;
}

function localeFromBrowser(): Locale {
  if (typeof navigator === "undefined") return "fr";
  const candidates = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  for (const candidate of candidates) {
    const language = candidate.toLowerCase().split("-")[0] as Locale;
    if (SUPPORTED_LOCALES.includes(language)) return language;
  }
  return "fr";
}

export function useLocalePreference() {
  return useContext(LocaleContext);
}

export function LanguageProvider({
  children,
  initialMessages,
}: {
  children: React.ReactNode;
  initialMessages: AbstractIntlMessages;
}) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const saved = window.localStorage.getItem("kairos-locale") as Locale | null;
    const detected = saved && SUPPORTED_LOCALES.includes(saved) ? saved : localeFromBrowser();
    setLocaleState(detected);
    document.documentElement.lang = detected;
    // Mémoriser aussi la détection automatique : sinon chaque retour ou
    // rechargement peut repartir de la langue du navigateur et remplacer la
    // langue choisie implicitement sur la page précédente.
    if (!saved) window.localStorage.setItem("kairos-locale", detected);
  }, []);

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    window.localStorage.setItem("kairos-locale", nextLocale);
    document.documentElement.lang = nextLocale;
  }

  const messages = useMemo(
    () => (locale === "fr" ? initialMessages : mergeMessages(initialMessages, MESSAGE_OVERRIDES[locale])),
    [initialMessages, locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, labels: LOCALE_LABELS }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
