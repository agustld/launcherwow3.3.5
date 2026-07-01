/** Versión actual del esquema persistido en launcher-config.json. */
export const STORE_SCHEMA_VERSION = 2;

export const SCHEMA_VERSION_KEY = "schema_version";

export type StoreSnapshot = Record<string, unknown>;

function parseSchemaVersion(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Detecta la versión del snapshot (sin schema = v1 si hay datos de usuario). */
export function readSchemaVersion(snapshot: StoreSnapshot): number {
  const explicit = parseSchemaVersion(snapshot[SCHEMA_VERSION_KEY]);
  if (explicit !== null) return explicit;

  const hasUserData = Object.keys(snapshot).some(
    (key) => key !== SCHEMA_VERSION_KEY && snapshot[key] !== undefined,
  );
  return hasUserData ? 1 : 0;
}

function migrateV1ToV2(snapshot: StoreSnapshot): StoreSnapshot {
  const next = { ...snapshot };

  if (!("check_updates_on_start" in next)) {
    next.check_updates_on_start = true;
  }

  next[SCHEMA_VERSION_KEY] = 2;
  return next;
}

/**
 * Migra un snapshot en memoria al esquema actual sin borrar datos existentes.
 * Solo agrega/transforma campos faltantes.
 */
export function migrateStoreSnapshot(snapshot: StoreSnapshot): {
  snapshot: StoreSnapshot;
  fromVersion: number;
  toVersion: number;
  changed: boolean;
} {
  const fromVersion = readSchemaVersion(snapshot);
  let current = { ...snapshot };
  let version = fromVersion;
  let changed = false;

  if (version === 0) {
    current[SCHEMA_VERSION_KEY] = STORE_SCHEMA_VERSION;
    return {
      snapshot: current,
      fromVersion: 0,
      toVersion: STORE_SCHEMA_VERSION,
      changed: true,
    };
  }

  while (version < STORE_SCHEMA_VERSION) {
    if (version === 1) {
      current = migrateV1ToV2(current);
      version = 2;
      changed = true;
      continue;
    }
    break;
  }

  if (current[SCHEMA_VERSION_KEY] !== STORE_SCHEMA_VERSION) {
    current[SCHEMA_VERSION_KEY] = STORE_SCHEMA_VERSION;
    changed = true;
  }

  return {
    snapshot: current,
    fromVersion,
    toVersion: STORE_SCHEMA_VERSION,
    changed,
  };
}
