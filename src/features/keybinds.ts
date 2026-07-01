import { invoke } from "@tauri-apps/api/core";
import {
  resolveActiveGamePath,
  resolveGameDirFromExe,
} from "../config/store";
import type { CopyKeybindsResult, WowAccountInfo } from "../config/keybind-types";

/** Feature: copiar bindings-cache.wtf entre cuentas del cliente activo. */

export async function resolveActiveGameDir(): Promise<string> {
  const gamePath = await resolveActiveGamePath();
  if (!gamePath.trim()) return "";
  return resolveGameDirFromExe(gamePath);
}

export async function listWowAccounts(
  gameDir: string,
): Promise<WowAccountInfo[]> {
  return invoke<WowAccountInfo[]>("list_wow_accounts", { gameDir });
}

export async function copyKeybinds(
  gameDir: string,
  sourceAccount: string,
  destinationAccounts: string[],
): Promise<CopyKeybindsResult> {
  return invoke<CopyKeybindsResult>("copy_keybinds", {
    gameDir,
    sourceAccount,
    destinationAccounts,
  });
}
