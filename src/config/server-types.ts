/** Perfil de servidor (preset del developer o agregado por el usuario). */

export interface ServerProfile {
  id: string;
  name: string;
  realmlist: string;
  description?: string;
  /** Ruta a WoW.exe; null/ vacío → usa game_path global. */
  gamePath?: string | null;
  /** true = preset embebido; no editable ni borrable. */
  preset: boolean;
}

export const SERVER_STORE_KEYS = {
  user_servers: "user_servers",
  active_server_id: "active_server_id",
} as const;

/** Servidor activo cambió (actualiza Inicio, realmlist, JUGAR). */
export const ACTIVE_SERVER_CHANGED_EVENT = "launcher:active-server-changed";

/** Lista de servidores del usuario cambió. */
export const SERVERS_UPDATED_EVENT = "launcher:servers-updated";
