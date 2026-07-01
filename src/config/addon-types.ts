/** Catálogo de addons compatible con 3.3.5a. */

export interface AddonCatalogEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  folders: string[];
  downloads: Record<string, string>;
  exclude_locales?: string[];
  strip_zip_root?: boolean;
  auto_folders?: boolean;
  target_folder?: string;
}

export interface AddonCatalogFile {
  version?: number;
  updated_at?: string;
  addons: AddonCatalogEntry[];
}

export interface AddonStatusEntry {
  id: string;
  installed: boolean;
  installed_version: string | null;
  catalog_version: string;
  needs_update: boolean;
  existing_folders: string[];
}

export type AddonAction = "install" | "update" | "uninstall" | "none";

export interface AddonDownloadProgress {
  addon_id: string;
  received: number;
  total: number | null;
  phase: "downloading" | "extracting" | "done";
}

/** Evento al cambiar locale del cliente. */
export const LOCALE_UPDATED_EVENT = "launcher:locale-updated";

/** Evento tras refrescar catálogo o estado de addons. */
export const ADDONS_UPDATED_EVENT = "launcher:addons-updated";
