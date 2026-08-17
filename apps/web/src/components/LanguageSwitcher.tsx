"use client";

import { useLocalePreference, SUPPORTED_LOCALES } from "@/components/LanguageProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, labels } = useLocalePreference();

  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-ink-muted)]">
      <span className="sr-only">Langue</span>
      <span aria-hidden className="font-[family-name:var(--font-mono)]">A/文</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as (typeof SUPPORTED_LOCALES)[number])}
        className="rounded-lg border bg-transparent px-1.5 py-1 text-xs font-semibold"
        style={{ borderColor: "var(--color-border)" }}
        aria-label="Langue"
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {labels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
