/**
 * Verifica que migrar datos v1 → v2 no pierde información del usuario.
 * Ejecutar: npx tsx scripts/verify-store-migration.ts
 */
import assert from "node:assert/strict";
import {
  migrateStoreSnapshot,
  readSchemaVersion,
  STORE_SCHEMA_VERSION,
} from "../src/config/store-schema.ts";

const legacyV1: Record<string, unknown> = {
  game_path: "D:\\Games\\WoW\\WoW.exe",
  client_locale: "esES",
  ui_language: "es",
  minimize_to_tray: true,
  user_servers: [
    {
      id: "user-abc",
      name: "Mi servidor",
      realmlist: "logon.test.com",
      preset: false,
    },
  ],
  active_server_id: "user-abc",
};

const { snapshot, fromVersion, toVersion, changed } =
  migrateStoreSnapshot(legacyV1);

assert.equal(fromVersion, 1);
assert.equal(toVersion, STORE_SCHEMA_VERSION);
assert.equal(changed, true);
assert.equal(readSchemaVersion(snapshot), STORE_SCHEMA_VERSION);

assert.equal(snapshot.game_path, legacyV1.game_path);
assert.equal(snapshot.client_locale, legacyV1.client_locale);
assert.equal(snapshot.ui_language, legacyV1.ui_language);
assert.equal(snapshot.minimize_to_tray, legacyV1.minimize_to_tray);
assert.equal(snapshot.active_server_id, legacyV1.active_server_id);
assert.deepEqual(snapshot.user_servers, legacyV1.user_servers);
assert.equal(snapshot.check_updates_on_start, true);

const reRun = migrateStoreSnapshot(snapshot);
assert.equal(reRun.changed, false, "second migration must be a no-op");

console.log("OK: store migration preserves user data (v1 → v2)");
