/** Estado global de actualizaciones (UI + updater). */

export interface UpdateDisponible {
  version: string;
  notes: string;
  critical: boolean;
}

export type UpdatePhase =
  | "idle"
  | "downloading"
  | "installing"
  | "restarting"
  | "error";

export const UPDATE_STATE_CHANGED_EVENT = "launcher:update-state-changed";

/**
 * Simular update disponible sin release real.
 * - Poné `true` acá, o
 * - En la consola del devtools: `localStorage.setItem('debug-update','1'); location.reload()`
 */
export const DEBUG_SIMULATE_UPDATE = false;

export function isDebugUpdateEnabled(): boolean {
  if (DEBUG_SIMULATE_UPDATE) return true;
  try {
    return import.meta.env.DEV && localStorage.getItem("debug-update") === "1";
  } catch {
    return false;
  }
}

let updateDisponible: UpdateDisponible | null = null;
let bannerDismissed = false;
let updatePhase: UpdatePhase = "idle";
let updateProgress = 0;
let criticalModalShown = false;

function emitStateChange(): void {
  window.dispatchEvent(new CustomEvent(UPDATE_STATE_CHANGED_EVENT));
}

export function getUpdateDisponible(): UpdateDisponible | null {
  return updateDisponible;
}

export function setUpdateDisponible(info: UpdateDisponible | null): void {
  updateDisponible = info;
  if (info) {
    bannerDismissed = false;
  }
  emitStateChange();
}

export function clearUpdateDisponible(): void {
  updateDisponible = null;
  bannerDismissed = false;
  emitStateChange();
}

export function dismissUpdateBanner(): void {
  bannerDismissed = true;
  emitStateChange();
}

export function isUpdateBannerVisible(): boolean {
  return updateDisponible !== null && !bannerDismissed && updatePhase === "idle";
}

export function getUpdatePhase(): UpdatePhase {
  return updatePhase;
}

export function getUpdateProgress(): number {
  return updateProgress;
}

export function isUpdateInProgress(): boolean {
  return (
    updatePhase === "downloading" ||
    updatePhase === "installing" ||
    updatePhase === "restarting"
  );
}

export function setUpdatePhase(phase: UpdatePhase, progress = 0): void {
  updatePhase = phase;
  updateProgress = progress;
  emitStateChange();
}

export function resetUpdatePhase(): void {
  updatePhase = "idle";
  updateProgress = 0;
  emitStateChange();
}

export function shouldShowCriticalModalOnStart(): boolean {
  return (
    updateDisponible?.critical === true &&
    !criticalModalShown &&
    updatePhase === "idle"
  );
}

export function markCriticalModalShown(): void {
  criticalModalShown = true;
}

/** Vista previa del badge, banner y progreso en dev. */
export function simulateUpdateForDebug(): void {
  setUpdateDisponible({
    version: "0.2.0",
    notes:
      "• Mejoras de rendimiento\n• Corrección de keybinds\n• Nuevo banner de actualizaciones",
    critical: false,
  });
}

export function simulateCriticalUpdateForDebug(): void {
  setUpdateDisponible({
    version: "0.2.0",
    notes: "Actualización de seguridad recomendada.",
    critical: true,
  });
  criticalModalShown = false;
}
