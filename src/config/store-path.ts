import { appDataDir, join } from "@tauri-apps/api/path";
import { STORE_FILE } from "./store";

/** Ruta absoluta al archivo de datos del usuario (app_data_dir, no junto al .exe). */
export async function getUserStoreFilePath(): Promise<string> {
  return join(await appDataDir(), STORE_FILE);
}
