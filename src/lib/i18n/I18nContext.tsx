"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { translateMessage, type Locale } from "./dictionaries";

const STORAGE_KEY = "system-lab:locale";
const LOCALE_CHANGE_EVENT = "system-lab:locale-change";
const TRANSLATED_ATTRIBUTES = ["aria-label", "placeholder", "title"] as const;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (message: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function readLocale(): Locale {
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "tr";
}

function readServerLocale(): Locale {
  return "tr";
}

function subscribeToLocale(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore<Locale>(subscribeToLocale, readLocale, readServerLocale);
  const textRecordsRef = useRef(new WeakMap<Text, { source: string; translated: string }>());
  const attributeRecordsRef = useRef(new WeakMap<Element, Map<string, { source: string; translated: string }>>());

  useEffect(() => {
    document.documentElement.lang = locale;

    const textRecords = textRecordsRef.current;
    const attributeRecords = attributeRecordsRef.current;
    const shouldSkip = (element: Element | null) => Boolean(element?.closest("[data-i18n-skip], script, style, noscript"));

    const translateTextNode = (node: Text) => {
      if (shouldSkip(node.parentElement)) return;
      const current = node.nodeValue ?? "";
      const previous = textRecords.get(node);
      const source = previous && current === previous.translated ? previous.source : current;
      const translated = translateMessage(source, locale);
      textRecords.set(node, { source, translated });
      if (current !== translated) node.nodeValue = translated;
    };

    const translateElementAttributes = (element: Element) => {
      if (shouldSkip(element)) return;
      let records = attributeRecords.get(element);
      for (const attribute of TRANSLATED_ATTRIBUTES) {
        const current = element.getAttribute(attribute);
        if (current === null) continue;
        const previous = records?.get(attribute);
        const source = previous && current === previous.translated ? previous.source : current;
        const translated = translateMessage(source, locale);
        if (!records) {
          records = new Map();
          attributeRecords.set(element, records);
        }
        records.set(attribute, { source, translated });
        if (current !== translated) element.setAttribute(attribute, translated);
      }
    };

    const translateTree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
      if (root.nodeType === Node.ELEMENT_NODE) translateElementAttributes(root as Element);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let current = walker.nextNode();
      while (current) {
        if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text);
        else translateElementAttributes(current as Element);
        current = walker.nextNode();
      }
    };

    translateTree(document.body);
    document.title = translateMessage("Sistem Laboratuvarı", locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTextNode(mutation.target as Text);
        if (mutation.type === "attributes") translateElementAttributes(mutation.target as Element);
        mutation.addedNodes.forEach(translateTree);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...TRANSLATED_ATTRIBUTES] });
    return () => observer.disconnect();
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }, []);
  const t = useCallback((message: string) => translateMessage(message, locale), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
