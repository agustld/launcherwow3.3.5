import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

/** Feature: inicio automático con Windows (tauri-plugin-autostart). */

export async function getAutostartEnabled(): Promise<boolean> {
  return isEnabled();
}

export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await enable();
  } else {
    await disable();
  }
}
