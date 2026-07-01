/** Configuración persistida del launcher. */

export type UiLocale = "es" | "en";

export interface LauncherConfig {
  /** Ruta global a WoW.exe (fallback si el servidor activo no define gamePath). */
  game_path: string;
  /** Locale del cliente (enUS, esES, …). Vacío hasta detectar o elegir. */
  client_locale: string;
  news_url: string;
  minimize_to_tray: boolean;
  /** URL remota de presets (feature apagada por defecto). */
  presets_remote_url: string;
  presets_remote_enabled: boolean;
  /** URL remota del catálogo de addons. */
  addons_catalog_url: string;
  /** Si true, el catálogo remoto reemplaza al embebido cuando responde OK. */
  addons_catalog_remote_enabled: boolean;
  /** URL remota del catálogo de mods MPQ. */
  mods_catalog_url: string;
  /** Si true, el catálogo remoto de mods reemplaza al embebido cuando responde OK. */
  mods_catalog_remote_enabled: boolean;
  /** Idioma de la interfaz del launcher (es | en). */
  ui_language: UiLocale;
  /** Si true, busca actualizaciones al iniciar la app. */
  check_updates_on_start: boolean;
}

export const CONFIG_KEYS = {
  game_path: "game_path",
  client_locale: "client_locale",
  news_url: "news_url",
  minimize_to_tray: "minimize_to_tray",
  presets_remote_url: "presets_remote_url",
  presets_remote_enabled: "presets_remote_enabled",
  addons_catalog_url: "addons_catalog_url",
  addons_catalog_remote_enabled: "addons_catalog_remote_enabled",
  mods_catalog_url: "mods_catalog_url",
  mods_catalog_remote_enabled: "mods_catalog_remote_enabled",
  ui_language: "ui_language",
  check_updates_on_start: "check_updates_on_start",
} as const satisfies Record<keyof LauncherConfig, keyof LauncherConfig>;

/** Evento disparado tras guardar ajustes generales. */
export const CONFIG_UPDATED_EVENT = "launcher:config-updated";

export type { ServerProfile } from "./server-types";
export {
  ACTIVE_SERVER_CHANGED_EVENT,
  SERVERS_UPDATED_EVENT,
  SERVER_STORE_KEYS,
} from "./server-types";
export type {
  AddonCatalogEntry,
  AddonCatalogFile,
  AddonStatusEntry,
  AddonDownloadProgress,
} from "./addon-types";
export {
  ADDONS_UPDATED_EVENT,
  LOCALE_UPDATED_EVENT,
} from "./addon-types";
export type {
  ModCatalogEntry,
  ModCatalogFile,
  ModDownloadProgress,
  ModInstallState,
  ModStatusEntry,
} from "./mod-types";
export { MODS_UPDATED_EVENT } from "./mod-types";
export { WOW_LOCALES, formatLocaleLabel, isWowLocale } from "./locale-types";
export type { WowLocale } from "./locale-types";
