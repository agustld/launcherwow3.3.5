export type SystemUiLocale = "es" | "en";

/** Infiere es/en desde el idioma del sistema (Windows / navegador). */
export function detectSystemUiLocale(): SystemUiLocale {
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean) as string[];

  for (const tag of candidates) {
    const primary = tag.toLowerCase().split("-")[0];
    if (primary === "es") return "es";
    if (primary === "en") return "en";
  }

  return "en";
}

export function isUiLocale(value: unknown): value is SystemUiLocale {
  return value === "es" || value === "en";
}
