/** Catálogo de mods MPQ (parches de texturas, mapas, modelos). */

export interface ModCatalogEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  /** Nombre exacto del .MPQ instalado en Data/ o Data/<locale>/. */
  file: string;
  /** "Data" o "Data/<locale>" (usa el locale del cliente). */
  target: string;
  downloads: Record<string, string>;
}

export interface ModCatalogFile {
  version?: number;
  updated_at?: string;
  mods: ModCatalogEntry[];
}

export type ModInstallState = "not_installed" | "active" | "disabled";

export interface ModStatusEntry {
  id: string;
  state: ModInstallState;
  catalog_version: string;
}

export interface ModDownloadProgress {
  mod_id: string;
  received: number;
  total: number | null;
  phase: "downloading" | "installing" | "done";
}

/** Evento tras refrescar catálogo o estado de mods. */
export const MODS_UPDATED_EVENT = "launcher:mods-updated";
