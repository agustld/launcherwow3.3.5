import {
  dismissUpdateBanner,
  getUpdateDisponible,
  getUpdatePhase,
  getUpdateProgress,
  isUpdateBannerVisible,
  isUpdateInProgress,
  markCriticalModalShown,
  resetUpdatePhase,
  shouldShowCriticalModalOnStart,
  UPDATE_STATE_CHANGED_EVENT,
} from "../config/update-state";
import {
  checkForUpdates,
  downloadAndInstallUpdate,
  hasPendingUpdate,
  maybeCheckUpdatesOnStart,
  type UpdateProgressEvent,
} from "../features/updater";
import { t } from "../i18n";

let appRoot: HTMLElement | null = null;

export function renderUpdateBanner(): string {
  return `
    <div class="update-banner" id="update-banner" hidden>
      <p class="update-banner-text" id="update-banner-text"></p>
      <div class="update-banner-actions">
        <button type="button" class="update-banner-install" id="update-banner-install" data-i18n="updater.installNow">
          Actualizar ahora
        </button>
        <button
          type="button"
          class="update-banner-dismiss"
          id="update-banner-dismiss"
          data-i18n-aria="updater.bannerDismissAria"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M1 1 11 11M11 1 1 11" stroke="currentColor" stroke-width="1.4"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

export function renderUpdateProgressOverlay(): string {
  return `
    <div class="update-progress-overlay" id="update-progress-overlay" hidden>
      <div class="update-progress-card">
        <p class="update-progress-label" id="update-progress-status"></p>
        <div class="update-progress-track" aria-hidden="true">
          <div class="update-progress-bar" id="update-global-progress-bar"></div>
        </div>
      </div>
    </div>
  `;
}

export function renderCriticalUpdateModal(): string {
  return `
    <div class="update-modal update-modal--critical" id="update-critical-modal" hidden>
      <div class="update-modal-backdrop" id="update-critical-backdrop"></div>
      <div
        class="update-modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="update-critical-title"
      >
        <header class="update-modal-header">
          <h3 class="update-modal-title" id="update-critical-title" data-i18n="updater.criticalTitle">
            Actualización importante
          </h3>
        </header>
        <div class="update-modal-body">
          <p class="update-version" id="update-critical-version"></p>
          <p class="update-critical-hint" data-i18n="updater.criticalHint">
            Se recomienda actualizar antes de continuar.
          </p>
          <div id="update-critical-notes-wrap" hidden>
            <p class="update-notes-label" data-i18n="updater.notes">Notas de la versión</p>
            <pre class="update-notes" id="update-critical-notes"></pre>
          </div>
        </div>
        <footer class="update-modal-actions">
          <button type="button" class="btn-outline" id="update-critical-later" data-i18n="updater.later">
            Más tarde
          </button>
          <button type="button" class="btn-save-settings" id="update-critical-install" data-i18n="updater.installNow">
            Actualizar ahora
          </button>
        </footer>
      </div>
    </div>
  `;
}

function progressLabel(event: UpdateProgressEvent): string {
  switch (event.phase) {
    case "downloading":
      if (event.indeterminate || event.percent === null) {
        return t("updater.downloading");
      }
      return t("updater.downloadingPercent", {
        percent: String(event.percent),
      });
    case "installing":
      return t("updater.installing");
    case "restarting":
      return t("updater.restarting");
  }
}

function setGlobalProgress(event: UpdateProgressEvent): void {
  const root = appRoot;
  if (!root) return;

  const overlay = root.querySelector<HTMLElement>("#update-progress-overlay");
  const label = root.querySelector<HTMLElement>("#update-progress-status");
  const bar = root.querySelector<HTMLElement>("#update-global-progress-bar");
  if (!overlay || !label || !bar) return;

  overlay.removeAttribute("hidden");
  label.textContent = progressLabel(event);

  if (event.indeterminate || event.percent === null) {
    bar.style.width = "40%";
    bar.classList.add("indeterminate");
    return;
  }

  bar.classList.remove("indeterminate");
  bar.style.width = `${event.percent}%`;
}

function hideGlobalProgress(): void {
  const root = appRoot;
  if (!root) return;
  root.querySelector<HTMLElement>("#update-progress-overlay")?.setAttribute("hidden", "");
}

export async function startUpdateInstall(root: HTMLElement): Promise<void> {
  if (!hasPendingUpdate() && !getUpdateDisponible()) return;

  setAppUpdating(root, true);

  try {
    await downloadAndInstallUpdate((event) => {
      setGlobalProgress(event);
    });
  } catch {
    resetUpdatePhase();
    setAppUpdating(root, false);
    hideGlobalProgress();
    const feedback = root.querySelector<HTMLElement>("#settings-feedback");
    if (feedback) {
      feedback.textContent = t("updater.installFailed");
      feedback.classList.add("error");
    }
  }
}

function setAppUpdating(root: HTMLElement, updating: boolean): void {
  const shell = root.querySelector<HTMLElement>(".app-shell");
  if (!shell) return;
  shell.classList.toggle("app-shell--updating", updating);
}

function refreshNavBadge(root: HTMLElement): void {
  const badge = root.querySelector<HTMLElement>("#nav-update-badge");
  if (!badge) return;

  const visible = getUpdateDisponible() !== null && !isUpdateInProgress();
  badge.hidden = !visible;
}

function refreshBanner(root: HTMLElement): void {
  const banner = root.querySelector<HTMLElement>("#update-banner");
  const text = root.querySelector<HTMLElement>("#update-banner-text");
  if (!banner || !text) return;

  const info = getUpdateDisponible();
  if (!info || !isUpdateBannerVisible()) {
    banner.setAttribute("hidden", "");
    banner.classList.remove("visible");
    return;
  }

  text.textContent = t("updater.bannerText", { version: info.version });
  banner.removeAttribute("hidden");
  requestAnimationFrame(() => banner.classList.add("visible"));
}

function refreshProgressOverlay(root: HTMLElement): void {
  const overlay = root.querySelector<HTMLElement>("#update-progress-overlay");
  if (!overlay) return;

  if (!isUpdateInProgress()) {
    overlay.setAttribute("hidden", "");
    return;
  }

  const phase = getUpdatePhase();
  const percent = getUpdateProgress();
  setGlobalProgress({
    phase: phase === "idle" || phase === "error" ? "downloading" : phase,
    percent: phase === "downloading" ? percent : 100,
    indeterminate: phase === "downloading" && percent === 0,
  });
}

function refreshSettingsUpdateSection(root: HTMLElement): void {
  const card = root.querySelector<HTMLElement>("#settings-update-status");
  if (!card) return;

  const info = getUpdateDisponible();
  const versionEl = root.querySelector<HTMLElement>("#settings-app-version");

  if (info && !isUpdateInProgress()) {
    card.hidden = false;
    card.className = "settings-update-card settings-update-card--available";
    card.innerHTML = `
      <p class="settings-update-card-title">${t("settings.updateAvailableCard", { version: info.version })}</p>
      ${
        info.notes.trim()
          ? `<pre class="settings-update-notes">${escapeHtml(info.notes.trim())}</pre>`
          : ""
      }
      <button type="button" class="btn-save-settings settings-update-install" id="settings-update-install">
        ${t("updater.installNow")}
      </button>
    `;
    card.querySelector("#settings-update-install")?.addEventListener("click", () => {
      void startUpdateInstall(root);
    });
    return;
  }

  card.hidden = false;
  card.className = "settings-update-card settings-update-card--current";
  const currentVersion = versionEl?.textContent?.trim() || "—";
  card.innerHTML = `
    <p class="settings-update-card-title">${t("settings.upToDateWithVersion", { version: currentVersion })}</p>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function openCriticalModal(root: HTMLElement): void {
  const info = getUpdateDisponible();
  const modal = root.querySelector<HTMLElement>("#update-critical-modal");
  if (!info || !modal) return;

  const versionEl = root.querySelector<HTMLElement>("#update-critical-version");
  const notesEl = root.querySelector<HTMLElement>("#update-critical-notes");
  const notesWrap = root.querySelector<HTMLElement>("#update-critical-notes-wrap");

  if (versionEl) {
    versionEl.textContent = t("updater.versionAvailable", { version: info.version });
  }

  const trimmedNotes = info.notes.trim();
  if (notesEl && notesWrap) {
    notesWrap.hidden = !trimmedNotes;
    notesEl.textContent = trimmedNotes;
  }

  modal.removeAttribute("hidden");
  markCriticalModalShown();
}

function closeCriticalModal(root: HTMLElement): void {
  root.querySelector<HTMLElement>("#update-critical-modal")?.setAttribute("hidden", "");
}

export function refreshUpdateUi(root: HTMLElement): void {
  refreshNavBadge(root);
  refreshBanner(root);
  refreshProgressOverlay(root);
  refreshSettingsUpdateSection(root);

  const updating = isUpdateInProgress();
  setAppUpdating(root, updating);
}

export function bindUpdateUi(root: HTMLElement): void {
  appRoot = root;

  root.querySelector("#update-banner-install")?.addEventListener("click", () => {
    void startUpdateInstall(root);
  });

  root.querySelector("#update-banner-dismiss")?.addEventListener("click", () => {
    dismissUpdateBanner();
    refreshUpdateUi(root);
  });

  root.querySelector("#update-critical-install")?.addEventListener("click", () => {
    closeCriticalModal(root);
    void startUpdateInstall(root);
  });

  root.querySelector("#update-critical-later")?.addEventListener("click", () => {
    closeCriticalModal(root);
  });

  root.querySelector("#update-critical-backdrop")?.addEventListener("click", () => {
    closeCriticalModal(root);
  });

  window.addEventListener(UPDATE_STATE_CHANGED_EVENT, () => {
    refreshUpdateUi(root);
  });

  refreshUpdateUi(root);
}

export async function triggerStartupUpdateCheck(root: HTMLElement): Promise<void> {
  await maybeCheckUpdatesOnStart();
  refreshUpdateUi(root);

  if (shouldShowCriticalModalOnStart()) {
    openCriticalModal(root);
  }
}

export async function runManualUpdateCheck(
  root: HTMLElement,
  onUpToDate?: (message: string) => void,
  onError?: (message: string) => void,
): Promise<void> {
  const result = await checkForUpdates();
  refreshUpdateUi(root);

  if (result.status === "available") {
    if (result.critical) {
      openCriticalModal(root);
    }
    return;
  }

  if (result.status === "upToDate") {
    onUpToDate?.(t("updater.upToDate"));
    return;
  }

  onError?.(t("updater.checkFailed"));
}

export function refreshUpdateSettingsI18n(root: HTMLElement): void {
  refreshSettingsUpdateSection(root);
}
