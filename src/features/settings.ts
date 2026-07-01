import { open } from "@tauri-apps/plugin-dialog";
import { getParentDir, isWowExePath } from "../config/path";
import { getConfig, saveConfig } from "../config/store";
import type { LauncherConfig } from "../config/types";
import { detectAndApplyLocale, saveClientLocale } from "./locale";
import { renderLocaleSelectOptions } from "../ui/locale-select";
import { getAutostartEnabled, setAutostartEnabled } from "./autostart";
import {
  formatUserError,
  getSettingsErrors,
} from "../ui/status-message";
import { getUiLocale, setUiLocale, t, UI_LOCALE_CHANGED_EVENT, type UiLocale } from "../i18n";
import { navigateToSettings } from "../ui/navigation";
import { getAppVersion } from "./updater";
import { refreshUpdateUi, runManualUpdateCheck } from "../ui/update-ui";
import { getUpdateDisponible } from "../config/update-state";

/** Feature: ajustes persistentes (store + diálogo de archivo). */

async function openSettingsView(root: HTMLElement): Promise<void> {
  const config = await getConfig();
  await fillForm(root, config);
  navigateToSettings(root);
  refreshUpdateUi(root);
}

function setFeedback(
  el: HTMLElement,
  message: string,
  tone: "ok" | "error" | "",
): void {
  el.textContent = message;
  el.classList.remove("ok", "error");
  if (tone) el.classList.add(tone);
}

function readForm(root: HTMLElement, current: LauncherConfig): LauncherConfig | null {
  const game_path =
    root.querySelector<HTMLInputElement>("#settings-game-path")?.value ?? "";
  const client_locale =
    root.querySelector<HTMLSelectElement>("#settings-client-locale")?.value ??
    "";
  const minimize_to_tray =
    root.querySelector<HTMLInputElement>("#settings-minimize-tray")?.checked ??
    false;
  const check_updates_on_start =
    root.querySelector<HTMLInputElement>("#settings-check-updates-start")
      ?.checked ?? true;
  const ui_language =
    root.querySelector<HTMLSelectElement>("#settings-ui-lang")?.value ?? "es";

  return {
    ...current,
    game_path,
    client_locale,
    minimize_to_tray,
    check_updates_on_start,
    ui_language: ui_language === "en" ? "en" : "es",
  };
}

function readAutostart(root: HTMLElement): boolean {
  return (
    root.querySelector<HTMLInputElement>("#settings-autostart")?.checked ??
    false
  );
}

async function fillForm(root: HTMLElement, config: LauncherConfig): Promise<void> {
  const gamePath = root.querySelector<HTMLInputElement>("#settings-game-path");
  const localeSelect = root.querySelector<HTMLSelectElement>(
    "#settings-client-locale",
  );
  const localeNotice = root.querySelector<HTMLElement>(
    "#settings-locale-notice",
  );
  const minimizeTray = root.querySelector<HTMLInputElement>(
    "#settings-minimize-tray",
  );
  const autostart = root.querySelector<HTMLInputElement>("#settings-autostart");
  const checkUpdatesStart = root.querySelector<HTMLInputElement>(
    "#settings-check-updates-start",
  );
  const uiLang = root.querySelector<HTMLSelectElement>("#settings-ui-lang");
  const appVersion = root.querySelector<HTMLElement>("#settings-app-version");
  const feedback = root.querySelector<HTMLElement>("#settings-feedback");

  if (gamePath) gamePath.value = config.game_path;
  if (localeSelect) {
    localeSelect.innerHTML = `<option value="">— Elegir idioma —</option>${renderLocaleSelectOptions(config.client_locale)}`;
  }
  if (localeNotice) {
    localeNotice.hidden = true;
    localeNotice.textContent = "";
    localeNotice.classList.remove("error");
  }
  if (minimizeTray) minimizeTray.checked = config.minimize_to_tray;
  if (checkUpdatesStart) {
    checkUpdatesStart.checked = config.check_updates_on_start;
  }
  if (uiLang) {
    uiLang.value = getUiLocale();
  }
  if (appVersion) {
    try {
      appVersion.textContent = await getAppVersion();
    } catch {
      appVersion.textContent = "—";
    }
  }
  if (autostart) {
    try {
      autostart.checked = await getAutostartEnabled();
    } catch {
      autostart.checked = false;
    }
  }
  if (feedback) setFeedback(feedback, "", "");
}

async function browseGamePath(root: HTMLElement): Promise<void> {
  const input = root.querySelector<HTMLInputElement>("#settings-game-path");
  const feedback = root.querySelector<HTMLElement>("#settings-feedback");
  if (!input || !feedback) return;

  const current = input.value.trim();
  const defaultPath = current ? getParentDir(current) : undefined;

  const selected = await open({
    title: "Seleccionar WoW.exe",
    multiple: false,
    directory: false,
    defaultPath,
    filters: [{ name: "World of Warcraft", extensions: ["exe"] }],
  });

  if (!selected || Array.isArray(selected)) return;

  if (!isWowExePath(selected)) {
    setFeedback(
      feedback,
      formatUserError(getSettingsErrors().invalidExe),
      "error",
    );
    return;
  }

  input.value = selected;
  setFeedback(feedback, "", "");

  void detectAndApplyLocale(selected).then((result) => {
    updateLocaleNotice(root, result);
    if (result.autoSelected) {
      const localeSelect = root.querySelector<HTMLSelectElement>(
        "#settings-client-locale",
      );
      if (localeSelect) {
        localeSelect.innerHTML = `<option value="">— Elegir idioma —</option>${renderLocaleSelectOptions(result.autoSelected)}`;
      }
    } else if (result.needsChoice) {
      const localeSelect = root.querySelector<HTMLSelectElement>(
        "#settings-client-locale",
      );
      if (localeSelect && result.locales.length > 0) {
        localeSelect.innerHTML =
          `<option value="">— Elegir idioma —</option>` +
          result.locales
            .map(
              (locale) =>
                `<option value="${locale}">${locale}</option>`,
            )
            .join("");
      }
    }
  });
}

function updateLocaleNotice(
  root: HTMLElement,
  result: { locales: string[]; autoSelected: string | null; needsChoice: boolean },
): void {
  const notice = root.querySelector<HTMLElement>("#settings-locale-notice");
  if (!notice) return;

  if (result.autoSelected) {
    notice.hidden = false;
    notice.classList.remove("error");
    notice.textContent = t("settings.localeDetected", { locale: result.autoSelected });
    return;
  }

  if (result.locales.length === 0) {
    notice.hidden = false;
    notice.classList.add("error");
    notice.textContent = t("settings.localeNone");
    return;
  }

  if (result.needsChoice) {
    notice.hidden = false;
    notice.classList.remove("error");
    notice.textContent = t("settings.localeMultiple", {
      list: result.locales.join(", "),
    });
  }
}

async function detectLocaleFromSettings(root: HTMLElement): Promise<void> {
  const input = root.querySelector<HTMLInputElement>("#settings-game-path");
  const feedback = root.querySelector<HTMLElement>("#settings-feedback");
  if (!input || !feedback) return;

  const path = input.value.trim();
  if (!path || !isWowExePath(path)) {
    setFeedback(
      feedback,
      formatUserError(getSettingsErrors().invalidExe),
      "error",
    );
    return;
  }

  try {
    const result = await detectAndApplyLocale(path);
    updateLocaleNotice(root, result);

    const localeSelect = root.querySelector<HTMLSelectElement>(
      "#settings-client-locale",
    );
    if (localeSelect) {
      if (result.locales.length > 0) {
        const options = result.locales
          .map(
            (locale) =>
              `<option value="${locale}"${locale === result.autoSelected ? " selected" : ""}>${locale}</option>`,
          )
          .join("");
        localeSelect.innerHTML = `<option value="">— Elegir idioma —</option>${options}`;
      } else {
        localeSelect.innerHTML = `<option value="">— Elegir idioma —</option>${renderLocaleSelectOptions("")}`;
      }
    }

    setFeedback(feedback, "", "");
  } catch {
    setFeedback(
      feedback,
      formatUserError(getSettingsErrors().localeDetectFailed),
      "error",
    );
  }
}

async function handleSave(root: HTMLElement): Promise<void> {
  const feedback = root.querySelector<HTMLElement>("#settings-feedback");
  if (!feedback) return;

  const current = await getConfig();
  const config = readForm(root, current);
  if (!config) return;

  if (config.game_path && !isWowExePath(config.game_path)) {
    setFeedback(
      feedback,
      formatUserError(getSettingsErrors().invalidExe),
      "error",
    );
    return;
  }

  if (config.game_path && !config.client_locale.trim()) {
    setFeedback(
      feedback,
      formatUserError(getSettingsErrors().localeRequired),
      "error",
    );
    return;
  }

  const autostart = readAutostart(root);

  try {
    await saveConfig({
      ...config,
      game_path: config.game_path.trim(),
      client_locale: config.client_locale.trim(),
    });

    if (config.ui_language !== getUiLocale()) {
      await setUiLocale(config.ui_language);
    }

    try {
      await setAutostartEnabled(autostart);
    } catch {
      setFeedback(
        feedback,
        formatUserError(getSettingsErrors().autostartFailed),
        "error",
      );
      return;
    }

    setFeedback(feedback, t("settings.saved"), "ok");
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : getSettingsErrors().saveFailed.message;
    setFeedback(
      feedback,
      formatUserError({ ...getSettingsErrors().saveFailed, message: detail }),
      "error",
    );
  }
}

async function handleCheckUpdates(root: HTMLElement): Promise<void> {
  const feedback = root.querySelector<HTMLElement>("#settings-feedback");
  const button = root.querySelector<HTMLButtonElement>("#settings-check-updates");
  if (!feedback) return;

  if (button) button.disabled = true;
  setFeedback(feedback, t("updater.checking"), "");

  await runManualUpdateCheck(
    root,
    (message) => setFeedback(feedback, message, "ok"),
    (message) => setFeedback(feedback, message, "error"),
  );

  if (getUpdateDisponible()) {
    setFeedback(feedback, "", "");
  }

  if (button) button.disabled = false;
}

export function bindSettings(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>("#settings-form");

  root.querySelector("#btn-settings")?.addEventListener("click", () => {
    void openSettingsView(root);
  });

  root.querySelector("#settings-browse")?.addEventListener("click", () => {
    void browseGamePath(root);
  });

  root.querySelector("#settings-detect-locale")?.addEventListener("click", () => {
    void detectLocaleFromSettings(root);
  });

  root.querySelector("#settings-check-updates")?.addEventListener("click", () => {
    void handleCheckUpdates(root);
  });

  root.querySelector("#settings-client-locale")?.addEventListener("change", () => {
    const select = root.querySelector<HTMLSelectElement>("#settings-client-locale");
    if (select?.value) {
      void saveClientLocale(select.value);
    }
  });

  root.querySelector("#settings-ui-lang")?.addEventListener("change", () => {
    const select = root.querySelector<HTMLSelectElement>("#settings-ui-lang");
    const value = select?.value;
    if (value === "es" || value === "en") {
      void setUiLocale(value as UiLocale);
    }
  });

  window.addEventListener(UI_LOCALE_CHANGED_EVENT, () => {
    const select = root.querySelector<HTMLSelectElement>("#settings-ui-lang");
    if (select) {
      select.value = getUiLocale();
    }
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSave(root);
  });
}

export function refreshSettingsI18n(_root: HTMLElement): void {
  // Textos estáticos vía applyI18n en i18n-controller.
}

export function promptOpenSettings(root: HTMLElement): void {
  void openSettingsView(root);
}
