import { open } from "@tauri-apps/plugin-dialog";
import {
  createUserServerId,
  getActiveServerId,
  getPresetServers,
  getUserServers,
  saveUserServers,
  setActiveServerId,
  validateUserServer,
} from "../config/store";
import { getParentDir, isWowExePath } from "../config/path";
import type { ServerProfile } from "../config/types";

/** Feature: gestión de servidores (CRUD usuario + activación). */

export async function activateServer(id: string): Promise<void> {
  await setActiveServerId(id);
}

export async function addUserServer(
  input: Omit<ServerProfile, "id" | "preset">,
): Promise<string | null> {
  const error = validateUserServer(input);
  if (error) return error;

  if (input.gamePath?.trim() && !isWowExePath(input.gamePath)) {
    return "La ruta del cliente debe terminar en WoW.exe.";
  }

  const servers = await getUserServers();
  const newServer: ServerProfile = {
    id: createUserServerId(),
    name: input.name.trim(),
    realmlist: input.realmlist.trim(),
    description: input.description?.trim() || undefined,
    gamePath: input.gamePath?.trim() || null,
    preset: false,
  };

  await saveUserServers([...servers, newServer]);
  await setActiveServerId(newServer.id);
  return null;
}

export async function updateUserServer(
  id: string,
  input: Omit<ServerProfile, "id" | "preset">,
): Promise<string | null> {
  const error = validateUserServer(input);
  if (error) return error;

  if (input.gamePath?.trim() && !isWowExePath(input.gamePath)) {
    return "La ruta del cliente debe terminar en WoW.exe.";
  }

  const servers = await getUserServers();
  const index = servers.findIndex((server) => server.id === id);
  if (index < 0) return "No se encontró el servidor a editar.";

  servers[index] = {
    ...servers[index],
    name: input.name.trim(),
    realmlist: input.realmlist.trim(),
    description: input.description?.trim() || undefined,
    gamePath: input.gamePath?.trim() || null,
  };

  await saveUserServers(servers);
  return null;
}

export async function deleteUserServer(id: string): Promise<string | null> {
  const servers = await getUserServers();
  const next = servers.filter((server) => server.id !== id);
  if (next.length === servers.length) {
    return "No se encontró el servidor a eliminar.";
  }

  await saveUserServers(next);

  const activeId = await getActiveServerId();
  if (activeId === id) {
    const presets = await getPresetServers();
    await setActiveServerId(presets[0]?.id ?? "");
  }

  return null;
}

export async function browseServerGamePath(
  currentPath?: string | null,
): Promise<string | null> {
  const defaultPath = currentPath?.trim()
    ? getParentDir(currentPath)
    : undefined;

  const selected = await open({
    title: "Seleccionar WoW.exe del servidor",
    multiple: false,
    directory: false,
    defaultPath,
    filters: [{ name: "World of Warcraft", extensions: ["exe"] }],
  });

  if (!selected || Array.isArray(selected)) return null;
  if (!isWowExePath(selected)) {
    throw new Error("Seleccioná el archivo WoW.exe del cliente 3.3.5a.");
  }
  return selected;
}
