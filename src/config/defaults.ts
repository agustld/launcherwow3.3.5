import type { LauncherConfig } from "./types";

/** Valores por defecto cuando no hay config guardada en disco. */
export const DEFAULT_CONFIG: LauncherConfig = {
  game_path: "",
  client_locale: "",
  news_url: "",
  minimize_to_tray: false,
  presets_remote_url: "",
  presets_remote_enabled: false,
  addons_catalog_url: "",
  addons_catalog_remote_enabled: false,
  mods_catalog_url: "",
  mods_catalog_remote_enabled: false,
  ui_language: "es",
  check_updates_on_start: true,
};
