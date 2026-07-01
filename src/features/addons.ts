import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  ADDONS_UPDATED_EVENT,
  type AddonCatalogEntry,
  type AddonDownloadProgress,
  type AddonStatusEntry,
} from "../config/addon-types";
import {
  getConfig,
  getEmbeddedAddonCatalog,
  resolveActiveGamePath,
  resolveGameDirFromExe,
} from "../config/store";

/** Feature: catálogo e instalación de addons 3.3.5a. */

export async function loadAddonCatalog(): Promise<AddonCatalogEntry[]> {
  const config = await getConfig();

  if (config.addons_catalog_remote_enabled && config.addons_catalog_url.trim()) {
    try {
      const remote = await invoke<AddonCatalogEntry[]>("fetch_addon_catalog", {
        catalogUrl: config.addons_catalog_url.trim(),
      });
      if (remote.length > 0) return remote;
    } catch {
      // Fallback al catálogo embebido.
    }
  }

  return getEmbeddedAddonCatalog();
}

export function resolveAddonDownloadUrl(
  addon: AddonCatalogEntry,
  locale: string,
): string {
  const trimmedLocale = locale.trim();
  if (trimmedLocale && addon.exclude_locales?.includes(trimmedLocale)) return "";
  if (trimmedLocale && addon.downloads[trimmedLocale]) {
    return addon.downloads[trimmedLocale];
  }
  return addon.downloads.default ?? "";
}

export async function scanAddonStatuses(
  catalog: AddonCatalogEntry[],
): Promise<AddonStatusEntry[]> {
  const gamePath = await resolveActiveGamePath();
  if (!gamePath.trim()) return [];

  const gameDir = resolveGameDirFromExe(gamePath);
  return invoke<AddonStatusEntry[]>("scan_addon_status", {
    gameDir,
    addons: catalog,
  });
}

export async function installAddon(
  addon: AddonCatalogEntry,
  locale: string,
  overwrite = false,
): Promise<void> {
  const downloadUrl = resolveAddonDownloadUrl(addon, locale);
  if (!downloadUrl) {
    throw new Error("No hay URL de descarga para este addon e idioma.");
  }

  const gamePath = await resolveActiveGamePath();
  if (!gamePath.trim()) {
    throw new Error("Falta la ruta del cliente WoW.");
  }

  const gameDir = resolveGameDirFromExe(gamePath);

  await invoke("install_addon", {
    gameDir,
    addonId: addon.id,
    downloadUrl,
    folders: addon.folders,
    version: addon.version,
    overwrite,
    stripZipRoot: addon.strip_zip_root ?? false,
    autoFolders: addon.auto_folders ?? false,
    targetFolder: addon.target_folder ?? null,
  });

  window.dispatchEvent(new CustomEvent(ADDONS_UPDATED_EVENT));
}

export async function uninstallAddon(addon: AddonCatalogEntry): Promise<void> {
  const gamePath = await resolveActiveGamePath();
  if (!gamePath.trim()) {
    throw new Error("Falta la ruta del cliente WoW.");
  }

  const gameDir = resolveGameDirFromExe(gamePath);

  await invoke("uninstall_addon", {
    gameDir,
    addonId: addon.id,
    folders: addon.folders,
  });

  window.dispatchEvent(new CustomEvent(ADDONS_UPDATED_EVENT));
}

export function isFolderExistsError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  return message.startsWith("FOLDER_EXISTS:");
}

export function folderExistsMessage(error: unknown): string {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  return message.replace(/^FOLDER_EXISTS:/, "").trim();
}

export function listenAddonDownloadProgress(
  handler: (progress: AddonDownloadProgress) => void,
): Promise<UnlistenFn> {
  return listen<AddonDownloadProgress>("addon-download-progress", (event) => {
    handler(event.payload);
  });
}

export function groupAddonsByCategory(
  catalog: AddonCatalogEntry[],
): Map<string, AddonCatalogEntry[]> {
  const groups = new Map<string, AddonCatalogEntry[]>();

  for (const addon of catalog) {
    const category = addon.category.trim() || "Otros";
    const list = groups.get(category) ?? [];
    list.push(addon);
    groups.set(category, list);
  }

  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function resolveAddonAction(
  _addon: AddonCatalogEntry,
  status: AddonStatusEntry | undefined,
): "install" | "update" | "uninstall" | "none" {
  if (!status || !status.installed) return "install";
  if (status.needs_update) return "update";
  return "uninstall";
}
