import es from "./es.json";
import en from "./en.json";
import { detectSystemUiLocale, isUiLocale } from "./system-locale";
import { getConfig, getStoredUiLanguage, saveConfig } from "../config/store";

export type UiLocale = "es" | "en";

export const UI_LOCALE_CHANGED_EVENT = "launcher:ui-locale-changed";

const dictionaries: Record<UiLocale, Record<string, unknown>> = {
  es: es as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

let currentLocale: UiLocale = "es";

function resolveKey(dict: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = dict;

  for (const part of parts) {
    if (typeof node !== "object" || node === null || !(part in node)) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }

  return typeof node === "string" ? node : undefined;
}

/** Traduce una clave con reemplazos opcionales `{name}`. */
export function t(key: string, params?: Record<string, string | number>): string {
  const value =
    resolveKey(dictionaries[currentLocale], key) ??
    resolveKey(dictionaries.es, key) ??
    key;

  if (!params) return value;

  return Object.entries(params).reduce(
    (text, [param, replacement]) =>
      text.replace(new RegExp(`\\{${param}\\}`, "g"), String(replacement)),
    value,
  );
}

export { detectSystemUiLocale } from "./system-locale";

export function getUiLocale(): UiLocale {
  return currentLocale;
}

export async function initUiLocale(): Promise<UiLocale> {
  try {
    const stored = await getStoredUiLanguage();
    if (stored) {
      currentLocale = stored;
      return currentLocale;
    }

    currentLocale = detectSystemUiLocale();
    const config = await getConfig();
    await saveConfig({ ...config, ui_language: currentLocale });
  } catch {
    currentLocale = detectSystemUiLocale();
  }
  return currentLocale;
}

export async function setUiLocale(locale: UiLocale): Promise<void> {
  if (!isUiLocale(locale)) return;

  currentLocale = locale;
  const config = await getConfig();
  await saveConfig({ ...config, ui_language: locale });
  window.dispatchEvent(new CustomEvent(UI_LOCALE_CHANGED_EVENT));
}

/** Aplica textos estáticos marcados con data-i18n en el DOM. */
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    el.textContent = t(key);
  });

  root.querySelectorAll<HTMLElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (!key || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      return;
    }
    el.placeholder = t(key);
  });

  root.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => {
    const key = el.dataset.i18nAria;
    if (!key) return;
    el.setAttribute("aria-label", t(key));
  });

  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (!key) return;
    el.title = t(key);
  });

  root.querySelectorAll<HTMLOptionElement>("option[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    el.textContent = t(key);
  });

  const langSelect = document.querySelector<HTMLSelectElement>("#settings-ui-lang");
  if (langSelect) {
    langSelect.value = currentLocale;
  }
}

export function userFacingError(
  messageKey: string,
  hintKey?: string,
): { message: string; hint?: string } {
  return {
    message: t(messageKey),
    hint: hintKey ? t(hintKey) : undefined,
  };
}
