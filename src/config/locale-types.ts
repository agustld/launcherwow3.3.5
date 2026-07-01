/** Locales WoW 3.3.5a soportados por el launcher. */

export const WOW_LOCALES = [
  "enUS",
  "enGB",
  "esES",
  "esMX",
  "frFR",
  "deDE",
  "ruRU",
  "koKR",
  "zhCN",
  "zhTW",
] as const;

export type WowLocale = (typeof WOW_LOCALES)[number];

export const LOCALE_LABELS: Record<WowLocale, string> = {
  enUS: "English (US)",
  enGB: "English (UK)",
  esES: "Español (España)",
  esMX: "Español (Latinoamérica)",
  frFR: "Français",
  deDE: "Deutsch",
  ruRU: "Русский",
  koKR: "한국어",
  zhCN: "简体中文",
  zhTW: "繁體中文",
};

export function formatLocaleLabel(locale: string): string {
  if (locale in LOCALE_LABELS) {
    return LOCALE_LABELS[locale as WowLocale];
  }
  return locale || "Sin definir";
}

export function isWowLocale(value: string): value is WowLocale {
  return (WOW_LOCALES as readonly string[]).includes(value);
}
