import { getCurrentWindow } from "@tauri-apps/api/window";
import { getConfig } from "../config/store";
import { CONFIG_UPDATED_EVENT } from "../config/types";
import { t } from "../i18n";

export function renderTitlebar(): string {
  return `
    <header class="titlebar">
      <div class="titlebar-drag" data-tauri-drag-region>
        <span class="titlebar-app-name" id="titlebar-app-name" data-i18n="titlebar.appName">World of Warcraft 3.3.5a</span>
      </div>
      <div class="titlebar-actions">
        <div class="window-controls">
          <button type="button" class="win-btn" id="btn-minimize" data-i18n-title="titlebar.minimize" data-i18n-aria="titlebar.minimize">
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button type="button" class="win-btn win-btn-close" id="btn-close" data-i18n-title="titlebar.close" data-i18n-aria="titlebar.close">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 1 9 9M9 1 1 9" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  `;
}

async function updateTitlebarName(root: HTMLElement): Promise<void> {
  const label = root.querySelector<HTMLElement>("#titlebar-app-name");
  if (!label) return;
  label.textContent = t("titlebar.appName");
}

async function updateCloseButtonHint(root: HTMLElement): Promise<void> {
  const closeBtn = root.querySelector<HTMLButtonElement>("#btn-close");
  if (!closeBtn) return;

  const config = await getConfig();
  if (config.minimize_to_tray) {
    closeBtn.title = t("titlebar.hideTray");
    closeBtn.setAttribute("aria-label", t("titlebar.hideTray"));
  } else {
    closeBtn.title = t("titlebar.close");
    closeBtn.setAttribute("aria-label", t("titlebar.close"));
  }
}

export function refreshTitlebarI18n(root: HTMLElement): void {
  void updateTitlebarName(root);
  void updateCloseButtonHint(root);
}

export function bindTitlebar(root: HTMLElement): void {
  const appWindow = getCurrentWindow();

  void updateTitlebarName(root);
  void updateCloseButtonHint(root);

  window.addEventListener(CONFIG_UPDATED_EVENT, () => {
    void updateCloseButtonHint(root);
  });

  root.querySelector("#btn-minimize")?.addEventListener("click", () => {
    void appWindow.minimize();
  });

  root.querySelector("#btn-close")?.addEventListener("click", () => {
    void appWindow.close();
  });
}
