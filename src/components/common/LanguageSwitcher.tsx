"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return <label className="language-switcher" data-i18n-skip>
    <Languages size={16} aria-hidden="true" />
    <span className="sr-only">Language / Dil</span>
    <select value={locale} onChange={(event) => setLocale(event.target.value as "tr" | "en")} aria-label="Language / Dil">
      <option value="tr">TR</option>
      <option value="en">EN</option>
    </select>
  </label>;
}
