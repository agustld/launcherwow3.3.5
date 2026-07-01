/** Utilidades de rutas y formato realmlist (sin valores hardcodeados). */

/** Carpeta raíz del juego a partir de la ruta del ejecutable. */
export function getGameDirFromExe(exePath: string): string {
  const slash = exePath.lastIndexOf("/");
  const backslash = exePath.lastIndexOf("\\");
  const cut = Math.max(slash, backslash);
  return cut > 0 ? exePath.slice(0, cut) : exePath;
}

/** Normaliza el host (quita `set realmlist` si viene incluido). */
export function normalizeRealmlistHost(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/^set\s+realmlist\s+/i, "").trim();
}

/** Línea completa para mostrar / copiar al portapapeles. */
export function formatRealmlistCommand(value: string): string {
  const host = normalizeRealmlistHost(value);
  return host ? `set realmlist ${host}` : "";
}

/** Verifica que la ruta seleccionada apunte a WoW.exe. */
export function isWowExePath(filePath: string): boolean {
  const name = filePath.split(/[/\\]/).pop() ?? "";
  return name.toLowerCase() === "wow.exe";
}

/** Directorio padre de una ruta (para abrir el diálogo en la carpeta actual). */
export function getParentDir(filePath: string): string | undefined {
  const dir = getGameDirFromExe(filePath);
  return dir || undefined;
}
