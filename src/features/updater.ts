import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import {
  clearUpdateDisponible,
  isDebugUpdateEnabled,
  resetUpdatePhase,
  setUpdateDisponible,
  setUpdatePhase,
  type UpdateDisponible,
} from "../config/update-state";
import { getConfig } from "../config/store";

export type UpdateCheckResult =
  | { status: "available"; version: string; notes: string; critical: boolean }
  | { status: "upToDate" }
  | { status: "error" };

export type UpdateProgressEvent = {
  phase: "downloading" | "installing" | "restarting";
  percent: number | null;
  indeterminate: boolean;
};

let pendingUpdate: Update | null = null;

function parseCritical(rawJson: Record<string, unknown>): boolean {
  return rawJson.critical === true;
}

function toUpdateDisponible(update: Update): UpdateDisponible {
  return {
    version: update.version,
    notes: update.body ?? "",
    critical: parseCritical(update.rawJson),
  };
}

export async function getAppVersion(): Promise<string> {
  return getVersion();
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (isDebugUpdateEnabled()) {
    const info = {
      version: "0.2.0",
      notes:
        "• Mejoras de rendimiento\n• Corrección de keybinds\n• Nuevo banner de actualizaciones",
      critical: localStorage.getItem("debug-update-critical") === "1",
    };
    setUpdateDisponible(info);
    return { status: "available", ...info };
  }

  try {
    const update = await check();
    if (!update) {
      pendingUpdate = null;
      clearUpdateDisponible();
      return { status: "upToDate" };
    }

    pendingUpdate = update;
    const info = toUpdateDisponible(update);
    setUpdateDisponible(info);
    return { status: "available", ...info };
  } catch {
    pendingUpdate = null;
    return { status: "error" };
  }
}

export async function downloadAndInstallUpdate(
  onProgress: (event: UpdateProgressEvent) => void,
): Promise<void> {
  if (isDebugUpdateEnabled()) {
    setUpdatePhase("downloading", 0);
    for (let p = 0; p <= 100; p += 20) {
      await delay(350);
      onProgress({
        phase: "downloading",
        percent: p,
        indeterminate: false,
      });
      setUpdatePhase("downloading", p);
    }
    onProgress({ phase: "installing", percent: 100, indeterminate: false });
    setUpdatePhase("installing", 100);
    await delay(800);
    onProgress({ phase: "restarting", percent: 100, indeterminate: false });
    setUpdatePhase("restarting", 100);
    await delay(600);
    clearUpdateDisponible();
    resetUpdatePhase();
    return;
  }

  if (!pendingUpdate) {
    throw new Error("No pending update");
  }

  let downloaded = 0;
  let contentLength = 0;

  setUpdatePhase("downloading", 0);

  await pendingUpdate.download((event) => {
    switch (event.event) {
      case "Started":
        contentLength = event.data.contentLength ?? 0;
        onProgress({
          phase: "downloading",
          percent: contentLength ? 0 : null,
          indeterminate: contentLength === 0,
        });
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        {
          const percent = contentLength
            ? Math.min(100, Math.round((downloaded / contentLength) * 100))
            : null;
          if (percent !== null) setUpdatePhase("downloading", percent);
          onProgress({
            phase: "downloading",
            percent,
            indeterminate: contentLength === 0,
          });
        }
        break;
      case "Finished":
        onProgress({
          phase: "downloading",
          percent: 100,
          indeterminate: false,
        });
        setUpdatePhase("downloading", 100);
        break;
    }
  });

  onProgress({ phase: "installing", percent: 100, indeterminate: false });
  setUpdatePhase("installing", 100);
  await pendingUpdate.install();

  onProgress({ phase: "restarting", percent: 100, indeterminate: false });
  setUpdatePhase("restarting", 100);

  clearUpdateDisponible();
  await pendingUpdate.close();
  pendingUpdate = null;
  await relaunch();
}

export function hasPendingUpdate(): boolean {
  return pendingUpdate !== null || isDebugUpdateEnabled();
}

export function clearPendingUpdate(): void {
  pendingUpdate = null;
}

export async function maybeCheckUpdatesOnStart(): Promise<void> {
  try {
    const config = await getConfig();
    if (!config.check_updates_on_start && !isDebugUpdateEnabled()) return;
    await checkForUpdates();
  } catch {
    // Ignorar errores de red al iniciar.
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
