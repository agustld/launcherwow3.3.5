import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  MODS_UPDATED_EVENT,
  type ModCatalogEntry,
  type ModDownloadProgress,
  type ModStatusEntry,
} from "../config/mod-types";
import {
  getConfig,
  getEmbeddedModCatalog,
  resolveActiveGamePath,
  resolveGameDirFromExe,
} from "../config/store";

/** Feature: catálogo e instalación de mods MPQ. */

export async function loadModCatalog(): Promise<ModCatalogEntry[]> {
  const config = await getConfig();

  if (config.mods_catalog_remote_enabled && config.mods_catalog_url.trim()) {
    try {
      const remote = await invoke<ModCatalogEntry[]>("fetch_mod_catalog", {
        catalogUrl: config.mods_catalog_url.trim(),
      });
      if (remote.length > 0) return remote;
    } catch {
      // Fallback al catálogo embebido.
    }
  }

  return getEmbeddedModCatalog();
}

export function resolveModDownloadUrl(
  mod: ModCatalogEntry,
  locale: string,
): string {
  const trimmedLocale = locale.trim();
  if (trimmedLocale && mod.downloads[trimmedLocale]) {
    return mod.downloads[trimmedLocale];
  }
  return mod.downloads.default ?? "";
}

export function resolveModFile(mod: ModCatalogEntry, locale: string): string {
  return mod.file.replace("<locale>", locale.trim() || "enUS");
}

export async function scanModStatuses(
  catalog: ModCatalogEntry[],
  clientLocale: string,
): Promise<ModStatusEntry[]> {
  const gamePath = await resolveActiveGamePath();
  if (!gamePath.trim()) return [];

  const gameDir = resolveGameDirFromExe(gamePath);
  const resolvedCatalog = catalog.map((mod) => ({
    ...mod,
    file: resolveModFile(mod, clientLocale),
  }));
  return invoke<ModStatusEntry[]>("scan_mod_status", {
    gameDir,
    clientLocale: clientLocale.trim(),
    mods: resolvedCatalog,
  });
}

export async function installMod(
  mod: ModCatalogEntry,
  locale: string,
): Promise<void> {
  const downloadUrl = resolveModDownloadUrl(mod, locale);
  if (!downloadUrl) {
    throw new Error("No hay URL de descarga para este mod e idioma.");
  }

  const gamePath = await resolveActiveGamePath();
  if (!gamePath.trim()) {
    throw new Error("Falta la ruta del cliente WoW.");
  }

  const gameDir = resolveGameDirFromExe(gamePath);

  await invoke("install_mod", {
    gameDir,
    clientLocale: locale.trim(),
    modId: mod.id,
    downloadUrl,
    file: resolveModFile(mod, locale),
    target: mod.target,
  });

  window.dispatchEvent(new CustomEvent(MODS_UPDATED_EVENT));
}

export async function setModEnabled(
  mod: ModCatalogEntry,
  locale: string,
  enabled: boolean,
): Promise<void> {
  const gamePath = await resolveActiveGamePath();
  if (!gamePath.trim()) {
    throw new Error("Falta la ruta del cliente WoW.");
  }

  const gameDir = resolveGameDirFromExe(gamePath);

  await invoke("set_mod_enabled", {
    gameDir,
    clientLocale: locale.trim(),
    file: resolveModFile(mod, locale),
    target: mod.target,
    enabled,
  });

  window.dispatchEvent(new CustomEvent(MODS_UPDATED_EVENT));
}

export async function deleteMod(
  mod: ModCatalogEntry,
  locale: string,
): Promise<void> {
  const gamePath = await resolveActiveGamePath();
  if (!gamePath.trim()) {
    throw new Error("Falta la ruta del cliente WoW.");
  }

  const gameDir = resolveGameDirFromExe(gamePath);

  await invoke("delete_mod", {
    gameDir,
    clientLocale: locale.trim(),
    file: resolveModFile(mod, locale),
    target: mod.target,
  });

  window.dispatchEvent(new CustomEvent(MODS_UPDATED_EVENT));
}

export function listenModDownloadProgress(
  handler: (progress: ModDownloadProgress) => void,
): Promise<UnlistenFn> {
  return listen<ModDownloadProgress>("mod-download-progress", (event) => {
    handler(event.payload);
  });
}

export function groupModsByCategory(
  catalog: ModCatalogEntry[],
): Map<string, ModCatalogEntry[]> {
  const groups = new Map<string, ModCatalogEntry[]>();

  for (const mod of catalog) {
    const category = mod.category.trim() || "Otros";
    const list = groups.get(category) ?? [];
    list.push(mod);
    groups.set(category, list);
  }

  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function findModStatus(
  modId: string,
  statuses: ModStatusEntry[],
): ModStatusEntry | undefined {
  return statuses.find((entry) => entry.id === modId);
}
