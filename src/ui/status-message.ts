/** Mensajes de estado unificados (sin alerts nativos). */

import { t, userFacingError } from "../i18n";

export type StatusTone = "idle" | "pending" | "ok" | "error" | "info";

export interface UserFacingError {
  message: string;
  hint?: string;
}

export function formatUserError(error: UserFacingError): string {
  if (error.hint) {
    return `${error.message} ${error.hint}`;
  }
  return error.message;
}

export function fromInvokeError(
  error: unknown,
  fallback: UserFacingError,
): UserFacingError {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  if (!raw) return fallback;
  return { message: raw, hint: fallback.hint };
}

export function applyStatusLine(
  element: HTMLElement,
  text: string,
  tone: StatusTone,
): void {
  element.textContent = text;
  element.classList.remove("pending", "ok", "error", "info");
  if (tone !== "idle") {
    element.classList.add(tone);
  }
}

export function applyUserError(element: HTMLElement, error: UserFacingError): void {
  applyStatusLine(element, formatUserError(error), "error");
}

export function getLaunchErrors() {
  return {
    missingGamePath: userFacingError(
      "errors.launch.missingGamePath",
      "errors.launch.missingGamePathHint",
    ),
    genericLaunch: userFacingError(
      "errors.launch.generic",
      "errors.launch.genericHint",
    ),
    missingGamePathServerHint: t("errors.launch.missingGamePathServerHint"),
  };
}

export function getServerErrors() {
  return {
    noActive: userFacingError(
      "errors.server.noActive",
      "errors.server.noActiveHint",
    ),
    invalidRealmlist: userFacingError(
      "errors.server.invalidRealmlist",
      "errors.server.invalidRealmlistHint",
    ),
  };
}

export function getSettingsErrors() {
  return {
    invalidExe: userFacingError(
      "errors.settings.invalidExe",
      "errors.settings.invalidExeHint",
    ),
    saveFailed: userFacingError(
      "errors.settings.saveFailed",
      "errors.settings.saveFailedHint",
    ),
    autostartFailed: userFacingError(
      "errors.settings.autostartFailed",
      "errors.settings.autostartFailedHint",
    ),
    localeRequired: userFacingError(
      "errors.settings.localeRequired",
      "errors.settings.localeRequiredHint",
    ),
    localeDetectFailed: userFacingError(
      "errors.settings.localeDetectFailed",
      "errors.settings.localeDetectFailedHint",
    ),
  };
}

export function getAddonErrors() {
  return {
    noLocale: userFacingError(
      "errors.addons.noLocale",
      "errors.addons.noLocaleHint",
    ),
    noGamePath: userFacingError(
      "errors.addons.noGamePath",
      "errors.addons.noGamePathHint",
    ),
    catalogFailed: userFacingError(
      "errors.addons.catalogFailed",
      "errors.addons.catalogFailedHint",
    ),
    installFailed: userFacingError(
      "errors.addons.installFailed",
      "errors.addons.installFailedHint",
    ),
    uninstallFailed: userFacingError(
      "errors.addons.uninstallFailed",
      "errors.addons.uninstallFailedHint",
    ),
  };
}

export function getModErrors() {
  return {
    noGamePath: userFacingError(
      "errors.mods.noGamePath",
      "errors.mods.noGamePathHint",
    ),
    catalogFailed: userFacingError(
      "errors.mods.catalogFailed",
      "errors.mods.catalogFailedHint",
    ),
    installFailed: userFacingError(
      "errors.mods.installFailed",
      "errors.mods.installFailedHint",
    ),
    toggleFailed: userFacingError(
      "errors.mods.toggleFailed",
      "errors.mods.toggleFailedHint",
    ),
    deleteFailed: userFacingError(
      "errors.mods.deleteFailed",
      "errors.mods.deleteFailedHint",
    ),
  };
}
