import { formatLocaleLabel, WOW_LOCALES } from "../config/types";

/** Opciones HTML para el selector de locale del cliente. */
export function renderLocaleSelectOptions(selected: string): string {
  return WOW_LOCALES.map(
    (locale) =>
      `<option value="${locale}"${locale === selected ? " selected" : ""}>${formatLocaleLabel(locale)} (${locale})</option>`,
  ).join("");
}
