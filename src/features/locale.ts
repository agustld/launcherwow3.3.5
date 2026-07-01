import { invoke } from "@tauri-apps/api/core";
import {
  getConfig,
  resolveGameDirFromExe,
  saveConfig,
} from "../config/store";
import { LOCALE_UPDATED_EVENT } from "../config/types";
import { getGameDirFromExe } from "../config/path";

/** Feature: detección y persistencia del idioma del cliente WoW. */

export interface LocaleDetectionResult {
  locales: string[];
  /** Locale elegido automáticamente (solo si hay exactamente uno). */
  autoSelected: string | null;
  /** true si el usuario debe elegir manualmente. */
  needsChoice: boolean;
}

export async function detectLocalesFromGamePath(
  gamePath: string,
): Promise<LocaleDetectionResult> {
  const trimmed = gamePath.trim();
  if (!trimmed) {
    return { locales: [], autoSelected: null, needsChoice: false };
  }

  const gameDir = getGameDirFromExe(trimmed);
  const locales = await invoke<string[]>("detect_client_locales", { gameDir });

  if (locales.length === 1) {
    return {
      locales,
      autoSelected: locales[0],
      needsChoice: false,
    };
  }

  return {
    locales,
    autoSelected: null,
    needsChoice: locales.length !== 1,
  };
}

export async function saveClientLocale(locale: string): Promise<void> {
  const config = await getConfig();
  await saveConfig({ ...config, client_locale: locale.trim() });
  window.dispatchEvent(new CustomEvent(LOCALE_UPDATED_EVENT));
}

export async function detectAndApplyLocale(gamePath: string): Promise<LocaleDetectionResult> {
  const result = await detectLocalesFromGamePath(gamePath);

  if (result.autoSelected) {
    await saveClientLocale(result.autoSelected);
  }

  return result;
}

export function gameDirFromPath(gamePath: string): string {
  return resolveGameDirFromExe(gamePath);
}
