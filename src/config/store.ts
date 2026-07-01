import { load, type Store } from "@tauri-apps/plugin-store";
import embeddedPresets from "../data/presets.json";
import embeddedAddonsCatalog from "../data/addons-catalog.json";
import embeddedModsCatalog from "../data/mods-catalog.json";
import { DEFAULT_CONFIG } from "./defaults";
import { detectSystemUiLocale } from "../i18n/system-locale";
import type { UiLocale } from "./types";
import { normalizeRealmlistHost } from "./path";
import {
  migrateStoreSnapshot,
  SCHEMA_VERSION_KEY,
  STORE_SCHEMA_VERSION,
} from "./store-schema";
import type { AddonCatalogEntry, AddonCatalogFile } from "./addon-types";
import type { ModCatalogEntry, ModCatalogFile } from "./mod-types";
import {
  ACTIVE_SERVER_CHANGED_EVENT,
  CONFIG_KEYS,
  CONFIG_UPDATED_EVENT,
  SERVER_STORE_KEYS,
  SERVERS_UPDATED_EVENT,
  type LauncherConfig,
  type ServerProfile,
} from "./types";

const STORE_FILE = "launcher-config.json";

/** Servidor activo por defecto (primer arranque). */
export const DEFAULT_ACTIVE_SERVER_ID = "preset-warmane";

export { STORE_FILE, STORE_SCHEMA_VERSION, SCHEMA_VERSION_KEY };

let storePromise: Promise<Store> | null = null;
let storeInitPromise: Promise<void> | null = null;

async function runStoreMigrations(store: Store): Promise<void> {
  const entries = await store.entries<unknown>();
  const snapshot = Object.fromEntries(entries) as Record<string, unknown>;
  const { snapshot: migrated, changed } = migrateStoreSnapshot(snapshot);

  if (!changed) return;

  for (const [key, value] of Object.entries(migrated)) {
    await store.set(key, value);
  }
  await store.save();
}

async function getStoreValue<T>(key: string, fallback: T): Promise<T> {
  const store = await getStore();
  if (!(await store.has(key))) return fallback;
  const value = await store.get<T>(key);
  return value !== undefined ? value : fallback;
}

/** Idioma de UI persistido por el usuario, o null si nunca se guardó. */
export async function getStoredUiLanguage(): Promise<UiLocale | null> {
  const store = await getStore();
  if (!(await store.has(CONFIG_KEYS.ui_language))) return null;
  const value = await store.get<unknown>(CONFIG_KEYS.ui_language);
  if (value === "es" || value === "en") return value;
  return null;
}

async function resolveUiLanguage(): Promise<UiLocale> {
  return (await getStoredUiLanguage()) ?? detectSystemUiLocale();
}

async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(STORE_FILE, {
      autoSave: false,
      defaults: {
        [SCHEMA_VERSION_KEY]: STORE_SCHEMA_VERSION,
        [CONFIG_KEYS.game_path]: DEFAULT_CONFIG.game_path,
        [CONFIG_KEYS.client_locale]: DEFAULT_CONFIG.client_locale,
        [CONFIG_KEYS.news_url]: DEFAULT_CONFIG.news_url,
        [CONFIG_KEYS.minimize_to_tray]: DEFAULT_CONFIG.minimize_to_tray,
        [CONFIG_KEYS.presets_remote_url]: DEFAULT_CONFIG.presets_remote_url,
        [CONFIG_KEYS.presets_remote_enabled]:
          DEFAULT_CONFIG.presets_remote_enabled,
        [CONFIG_KEYS.addons_catalog_url]: DEFAULT_CONFIG.addons_catalog_url,
        [CONFIG_KEYS.addons_catalog_remote_enabled]:
          DEFAULT_CONFIG.addons_catalog_remote_enabled,
        [CONFIG_KEYS.mods_catalog_url]: DEFAULT_CONFIG.mods_catalog_url,
        [CONFIG_KEYS.mods_catalog_remote_enabled]:
          DEFAULT_CONFIG.mods_catalog_remote_enabled,
        [CONFIG_KEYS.check_updates_on_start]:
          DEFAULT_CONFIG.check_updates_on_start,
        [SERVER_STORE_KEYS.user_servers]: [] as ServerProfile[],
        [SERVER_STORE_KEYS.active_server_id]: DEFAULT_ACTIVE_SERVER_ID,
      },
    });
    storeInitPromise = storePromise.then((store) => runStoreMigrations(store));
  }

  if (storeInitPromise) {
    await storeInitPromise;
  }

  return storePromise;
}

/**
 * Inicializa el store del usuario: carga desde app_data_dir y aplica migraciones.
 * Debe llamarse al arrancar, antes de renderizar la UI.
 */
export async function initUserStore(): Promise<void> {
  await getStore();
}

/** Presets embebidos en la app (editables en src/data/presets.json). */
export function getEmbeddedPresets(): ServerProfile[] {
  return (embeddedPresets as ServerProfile[]).map((preset) => ({
    ...preset,
    preset: true,
    realmlist: normalizeRealmlistHost(preset.realmlist),
    gamePath: preset.gamePath?.trim() || null,
  }));
}

/**
 * Presets remotos (preparado, apagado por defecto).
 * Devuelve [] si presets_remote_enabled es false.
 */
export async function getRemotePresets(): Promise<ServerProfile[]> {
  const config = await getConfig();
  if (!config.presets_remote_enabled || !config.presets_remote_url.trim()) {
    return [];
  }
  // Fase futura: fetch JSON desde presets_remote_url vía fetch_news-like command.
  return [];
}

export async function getPresetServers(): Promise<ServerProfile[]> {
  const remote = await getRemotePresets();
  if (remote.length > 0) return remote;
  return getEmbeddedPresets();
}

export async function getUserServers(): Promise<ServerProfile[]> {
  const store = await getStore();
  const servers =
    (await store.get<ServerProfile[]>(SERVER_STORE_KEYS.user_servers)) ?? [];
  return servers.map((server) => ({
    ...server,
    preset: false,
    realmlist: normalizeRealmlistHost(server.realmlist),
    gamePath: server.gamePath?.trim() || null,
  }));
}

export async function saveUserServers(servers: ServerProfile[]): Promise<void> {
  const store = await getStore();
  const sanitized = servers.map((server) => ({
    ...server,
    preset: false,
    realmlist: normalizeRealmlistHost(server.realmlist),
    gamePath: server.gamePath?.trim() || null,
  }));
  await store.set(SERVER_STORE_KEYS.user_servers, sanitized);
  await store.set(SCHEMA_VERSION_KEY, STORE_SCHEMA_VERSION);
  await store.save();
  window.dispatchEvent(new CustomEvent(SERVERS_UPDATED_EVENT));
}

/** Presets primero, luego servidores del usuario. */
export async function listAllServers(): Promise<ServerProfile[]> {
  const presets = await getPresetServers();
  const user = await getUserServers();
  return [...presets, ...user];
}

async function resolveDefaultActiveServerId(): Promise<string> {
  const presets = await getPresetServers();
  return (
    presets.find((preset) => preset.id === DEFAULT_ACTIVE_SERVER_ID)?.id ??
    presets[0]?.id ??
    DEFAULT_ACTIVE_SERVER_ID
  );
}

export async function getActiveServerId(): Promise<string> {
  const store = await getStore();
  const stored =
    (await store.get<string>(SERVER_STORE_KEYS.active_server_id)) ?? "";
  const all = await listAllServers();

  if (stored && all.some((server) => server.id === stored)) {
    return stored;
  }

  const fallback = await resolveDefaultActiveServerId();
  if (stored !== fallback) {
    await store.set(SERVER_STORE_KEYS.active_server_id, fallback);
    await store.save();
    window.dispatchEvent(new CustomEvent(ACTIVE_SERVER_CHANGED_EVENT));
  }

  return fallback;
}

export async function setActiveServerId(id: string): Promise<void> {
  const store = await getStore();
  await store.set(SERVER_STORE_KEYS.active_server_id, id);
  await store.set(SCHEMA_VERSION_KEY, STORE_SCHEMA_VERSION);
  await store.save();
  window.dispatchEvent(new CustomEvent(ACTIVE_SERVER_CHANGED_EVENT));
}

export async function getActiveServer(): Promise<ServerProfile | null> {
  const id = await getActiveServerId();
  const all = await listAllServers();
  return all.find((server) => server.id === id) ?? null;
}

/** Catálogo embebido (fallback). */
export function getEmbeddedAddonCatalog(): AddonCatalogEntry[] {
  const file = embeddedAddonsCatalog as AddonCatalogFile;
  return file.addons ?? [];
}

/** Catálogo embebido de mods MPQ (fallback). */
export function getEmbeddedModCatalog(): ModCatalogEntry[] {
  const file = embeddedModsCatalog as ModCatalogFile;
  return file.mods ?? [];
}

/** Resuelve la ruta efectiva del cliente para el servidor activo. */
export async function resolveActiveGamePath(): Promise<string> {
  const [config, server] = await Promise.all([getConfig(), getActiveServer()]);
  if (!server) return config.game_path.trim();
  return resolveServerGamePath(server, config.game_path);
}

/** Resuelve el directorio del juego (padre de WoW.exe). */
export function resolveGameDirFromExe(gamePath: string): string {
  const trimmed = gamePath.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/[/\\]/);
  parts.pop();
  return parts.join("\\");
}

/** Ruta efectiva del cliente para un servidor. */
export function resolveServerGamePath(
  server: ServerProfile,
  globalGamePath: string,
): string {
  const override = server.gamePath?.trim();
  return override || globalGamePath.trim();
}

export function validateUserServer(input: {
  name: string;
  realmlist: string;
}): string | null {
  if (!input.name.trim()) return "El nombre del servidor no puede estar vacío.";
  const host = normalizeRealmlistHost(input.realmlist);
  if (!host) return "El realmlist no puede estar vacío.";
  return null;
}

export function createUserServerId(): string {
  return `user-${crypto.randomUUID()}`;
}

/** Lee la configuración general persistida. */
export async function getConfig(): Promise<LauncherConfig> {
  await getStore();

  return {
    game_path: await getStoreValue(
      CONFIG_KEYS.game_path,
      DEFAULT_CONFIG.game_path,
    ),
    client_locale: await getStoreValue(
      CONFIG_KEYS.client_locale,
      DEFAULT_CONFIG.client_locale,
    ),
    news_url: await getStoreValue(
      CONFIG_KEYS.news_url,
      DEFAULT_CONFIG.news_url,
    ),
    minimize_to_tray: await getStoreValue(
      CONFIG_KEYS.minimize_to_tray,
      DEFAULT_CONFIG.minimize_to_tray,
    ),
    presets_remote_url: await getStoreValue(
      CONFIG_KEYS.presets_remote_url,
      DEFAULT_CONFIG.presets_remote_url,
    ),
    presets_remote_enabled: await getStoreValue(
      CONFIG_KEYS.presets_remote_enabled,
      DEFAULT_CONFIG.presets_remote_enabled,
    ),
    addons_catalog_url: await getStoreValue(
      CONFIG_KEYS.addons_catalog_url,
      DEFAULT_CONFIG.addons_catalog_url,
    ),
    addons_catalog_remote_enabled: await getStoreValue(
      CONFIG_KEYS.addons_catalog_remote_enabled,
      DEFAULT_CONFIG.addons_catalog_remote_enabled,
    ),
    mods_catalog_url: await getStoreValue(
      CONFIG_KEYS.mods_catalog_url,
      DEFAULT_CONFIG.mods_catalog_url,
    ),
    mods_catalog_remote_enabled: await getStoreValue(
      CONFIG_KEYS.mods_catalog_remote_enabled,
      DEFAULT_CONFIG.mods_catalog_remote_enabled,
    ),
    ui_language: await resolveUiLanguage(),
    check_updates_on_start: await getStoreValue(
      CONFIG_KEYS.check_updates_on_start,
      DEFAULT_CONFIG.check_updates_on_start,
    ),
  };
}

/** Persiste ajustes generales (sin servidores). */
export async function saveConfig(config: LauncherConfig): Promise<void> {
  const store = await getStore();

  await store.set(SCHEMA_VERSION_KEY, STORE_SCHEMA_VERSION);
  await store.set(CONFIG_KEYS.client_locale, config.client_locale.trim());
  await store.set(CONFIG_KEYS.news_url, config.news_url.trim());
  await store.set(CONFIG_KEYS.minimize_to_tray, config.minimize_to_tray);
  await store.set(
    CONFIG_KEYS.presets_remote_url,
    config.presets_remote_url.trim(),
  );
  await store.set(
    CONFIG_KEYS.presets_remote_enabled,
    config.presets_remote_enabled,
  );
  await store.set(
    CONFIG_KEYS.addons_catalog_url,
    config.addons_catalog_url.trim(),
  );
  await store.set(
    CONFIG_KEYS.addons_catalog_remote_enabled,
    config.addons_catalog_remote_enabled,
  );
  await store.set(CONFIG_KEYS.mods_catalog_url, config.mods_catalog_url.trim());
  await store.set(
    CONFIG_KEYS.mods_catalog_remote_enabled,
    config.mods_catalog_remote_enabled,
  );
  await store.set(CONFIG_KEYS.ui_language, config.ui_language);
  await store.set(CONFIG_KEYS.game_path, config.game_path.trim());
  await store.set(
    CONFIG_KEYS.check_updates_on_start,
    config.check_updates_on_start,
  );
  await store.save();

  window.dispatchEvent(
    new CustomEvent<LauncherConfig>(CONFIG_UPDATED_EVENT, { detail: config }),
  );
}
