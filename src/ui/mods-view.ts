import {
  deleteMod,
  groupModsByCategory,
  installMod,
  listenModDownloadProgress,
  loadModCatalog,
  scanModStatuses,
  setModEnabled,
} from "../features/mods";
import {
  formatLocaleLabel,
  CONFIG_UPDATED_EVENT,
  LOCALE_UPDATED_EVENT,
  ACTIVE_SERVER_CHANGED_EVENT,
  MODS_UPDATED_EVENT,
  type ModCatalogEntry,
  type ModInstallState,
  type ModStatusEntry,
} from "../config/types";
import { getConfig, resolveActiveGamePath } from "../config/store";
import {
  applyUserError,
  formatUserError,
  getModErrors,
} from "./status-message";
import { t, UI_LOCALE_CHANGED_EVENT } from "../i18n";
import { renderBackButton } from "./back-nav";

/** Vista de mods MPQ por categoría. */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderModsView(): string {
  return `
    <section class="mods-view app-view" id="view-mods" hidden>
      <header class="mods-header view-section-header">
        <div class="view-header-top">
          ${renderBackButton()}
          <button type="button" class="btn-outline" id="mods-refresh" data-i18n="modsView.refresh">Actualizar lista</button>
        </div>
        <div class="view-header-center">
          <h2 class="mods-title" data-i18n="modsView.title">Mods</h2>
          <p class="mods-subtitle" data-i18n="modsView.subtitle">Parches .MPQ de texturas, mapas y modelos para tu cliente 3.3.5a.</p>
        </div>
      </header>

      <p class="mods-warning" data-i18n="modsView.warning">
        Los parches pueden modificar archivos del cliente. Solo se instalan mods del catálogo oficial. Usalos bajo tu responsabilidad.
      </p>

      <div class="mods-locale-bar" id="mods-locale-bar">
        <span class="mods-locale-label" data-i18n="modsView.clientLocale">Idioma del cliente:</span>
        <strong class="mods-locale-value" id="mods-locale-value">—</strong>
        <span class="mods-locale-hint" id="mods-locale-hint"></span>
      </div>

      <p class="mods-feedback" id="mods-global-feedback" aria-live="polite"></p>

      <div class="mods-progress" id="mods-progress" hidden>
        <div class="mods-progress-bar" id="mods-progress-bar"></div>
        <span class="mods-progress-text" id="mods-progress-text"></span>
      </div>

      <div class="mods-catalog" id="mods-catalog">
        <p class="mods-loading" data-i18n="modsView.loading">Cargando catálogo…</p>
      </div>
    </section>
  `;
}

function renderModItem(
  mod: ModCatalogEntry,
  status: ModStatusEntry | undefined,
  busyId: string | null,
): string {
  const state: ModInstallState = status?.state ?? "not_installed";
  const isBusy = busyId === mod.id;
  const versionLine = t("modsView.version", { version: mod.version });
  const fileLine = t("modsView.fileTarget", {
    file: mod.file,
    target: mod.target,
  });

  let actions = "";

  if (state === "not_installed") {
    actions = `
      <button
        type="button"
        class="btn-outline mod-item-action"
        data-action="install"
        ${isBusy ? "disabled" : ""}
      >
        ${isBusy ? "…" : t("modsView.install")}
      </button>
    `;
  } else {
    const checked = state === "active";
    actions = `
      <label class="mod-item-toggle">
        <input type="checkbox" data-action="toggle" ${checked ? "checked" : ""} ${isBusy ? "disabled" : ""} />
        <span class="mod-item-toggle-ui" aria-hidden="true"></span>
        <span class="mod-item-toggle-label">${checked ? t("modsView.enabled") : t("modsView.disabled")}</span>
      </label>
      <button
        type="button"
        class="btn-outline btn-outline--danger mod-item-action"
        data-action="delete"
        ${isBusy ? "disabled" : ""}
      >
        ${t("modsView.delete")}
      </button>
    `;
  }

  return `
    <li class="mod-item" data-mod-id="${escapeHtml(mod.id)}">
      <div class="mod-item-body">
        <h4 class="mod-item-name">${escapeHtml(mod.name)}</h4>
        <p class="mod-item-desc">${escapeHtml(mod.description)}</p>
        <p class="mod-item-meta">${escapeHtml(versionLine)} · ${escapeHtml(fileLine)}</p>
      </div>
      <div class="mod-item-actions">${actions}</div>
    </li>
  `;
}

function setGlobalFeedback(
  el: HTMLElement,
  message: string,
  tone: "" | "error" | "info" = "",
): void {
  el.textContent = message;
  el.classList.remove("error", "info");
  if (tone) el.classList.add(tone);
}

function setProgress(
  root: HTMLElement,
  visible: boolean,
  percent: number,
  text: string,
): void {
  const wrap = root.querySelector<HTMLElement>("#mods-progress");
  const bar = root.querySelector<HTMLElement>("#mods-progress-bar");
  const label = root.querySelector<HTMLElement>("#mods-progress-text");
  if (!wrap || !bar || !label) return;

  wrap.hidden = !visible;
  bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  label.textContent = text;
}

export async function refreshModsView(root: HTMLElement): Promise<void> {
  const catalogEl = root.querySelector<HTMLElement>("#mods-catalog");
  const localeValue = root.querySelector<HTMLElement>("#mods-locale-value");
  const localeHint = root.querySelector<HTMLElement>("#mods-locale-hint");
  const feedback = root.querySelector<HTMLElement>("#mods-global-feedback");

  if (!catalogEl || !localeValue || !localeHint || !feedback) return;

  const config = await getConfig();
  const locale = config.client_locale.trim();
  const gamePath = await resolveActiveGamePath();

  localeValue.textContent = locale
    ? `${formatLocaleLabel(locale)} (${locale})`
    : t("modsView.localeUnset");

  if (!gamePath.trim()) {
    localeHint.textContent = t("modsView.localeHintNoPath");
  } else if (!locale) {
    localeHint.textContent = t("modsView.localeHintUnset");
  } else {
    localeHint.textContent = "";
  }

  try {
    const catalog = await loadModCatalog();
    const statuses = gamePath.trim()
      ? await scanModStatuses(catalog, locale)
      : [];
    const statusMap = new Map(statuses.map((entry) => [entry.id, entry]));
    const groups = groupModsByCategory(catalog);

    if (catalog.length === 0) {
      catalogEl.innerHTML =
        `<p class="mods-empty">${escapeHtml(t("modsView.empty"))}</p>`;
      return;
    }

    const html = [...groups.entries()]
      .map(([category, mods]) => {
        const items = mods
          .map((mod) => renderModItem(mod, statusMap.get(mod.id), null))
          .join("");
        return `
          <section class="mods-category">
            <h3 class="mods-category-title">${escapeHtml(category)}</h3>
            <ul class="mods-list">${items}</ul>
          </section>
        `;
      })
      .join("");

    catalogEl.innerHTML = html;
    setGlobalFeedback(feedback, "", "");
  } catch {
    applyUserError(feedback, getModErrors().catalogFailed);
    catalogEl.innerHTML =
      `<p class="mods-empty">${escapeHtml(t("modsView.loadFailed"))}</p>`;
  }
}

async function handleModAction(
  root: HTMLElement,
  modId: string,
  action: "install" | "toggle" | "delete",
  enabled?: boolean,
): Promise<void> {
  const feedback = root.querySelector<HTMLElement>("#mods-global-feedback");
  if (!feedback) return;

  const config = await getConfig();
  const gamePath = await resolveActiveGamePath();
  if (!gamePath.trim()) {
    applyUserError(feedback, getModErrors().noGamePath);
    return;
  }

  const catalog = await loadModCatalog();
  const mod = catalog.find((entry) => entry.id === modId);
  if (!mod) return;

  if (action === "delete") {
    const ok = window.confirm(
      t("modsView.deleteConfirm", { name: mod.name, file: mod.file }),
    );
    if (!ok) return;
  }

  setGlobalFeedback(feedback, "", "");
  setProgress(root, action === "install", 0, t("modsView.preparing"));

  let unlisten: (() => void) | null = null;

  try {
    if (action === "install") {
      unlisten = await listenModDownloadProgress((progress) => {
        if (progress.mod_id !== mod.id) return;
        const total = progress.total ?? 0;
        const percent =
          total > 0 ? Math.round((progress.received / total) * 100) : 0;
        const phaseLabel =
          progress.phase === "installing"
            ? t("modsView.installing")
            : progress.phase === "done"
              ? t("modsView.done")
              : t("modsView.downloading");
        setProgress(root, true, percent, `${phaseLabel} ${percent}%`);
      });
      await installMod(mod, config.client_locale);
      setGlobalFeedback(
        feedback,
        t("modsView.installed", { name: mod.name }),
        "info",
      );
    } else if (action === "toggle") {
      await setModEnabled(mod, config.client_locale, enabled === true);
      setGlobalFeedback(
        feedback,
        enabled
          ? t("modsView.activated", { name: mod.name })
          : t("modsView.deactivated", { name: mod.name }),
        "info",
      );
    } else if (action === "delete") {
      await deleteMod(mod, config.client_locale);
      setGlobalFeedback(
        feedback,
        t("modsView.deleted", { name: mod.name }),
        "info",
      );
    }
  } catch (error) {
    const MOD_ERRORS = getModErrors();
    const key =
      action === "install"
        ? MOD_ERRORS.installFailed
        : action === "delete"
          ? MOD_ERRORS.deleteFailed
          : MOD_ERRORS.toggleFailed;
    const message =
      error instanceof Error ? error.message : key.message;
    setGlobalFeedback(feedback, formatUserError({ ...key, message }), "error");
  } finally {
    unlisten?.();
    setProgress(root, false, 0, "");
    await refreshModsView(root);
  }
}

export function refreshModsI18n(_root: HTMLElement): void {}

export function bindModsView(root: HTMLElement): void {
  void refreshModsView(root);

  const refresh = (): void => {
    void refreshModsView(root);
  };

  root.querySelector("#mods-refresh")?.addEventListener("click", refresh);

  root.querySelector("#mods-catalog")?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>(".mod-item");
    if (!item) return;

    const modId = item.dataset.modId;
    if (!modId) return;

    const button = target.closest<HTMLButtonElement>(".mod-item-action");
    if (button?.dataset.action === "install") {
      void handleModAction(root, modId, "install");
      return;
    }
    if (button?.dataset.action === "delete") {
      void handleModAction(root, modId, "delete");
    }
  });

  root.querySelector("#mods-catalog")?.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    if (!input.matches('[data-action="toggle"]')) return;

    const item = input.closest<HTMLElement>(".mod-item");
    const modId = item?.dataset.modId;
    if (!modId) return;

    void handleModAction(root, modId, "toggle", input.checked);
  });

  window.addEventListener(MODS_UPDATED_EVENT, refresh);
  window.addEventListener(LOCALE_UPDATED_EVENT, refresh);
  window.addEventListener(CONFIG_UPDATED_EVENT, refresh);
  window.addEventListener(ACTIVE_SERVER_CHANGED_EVENT, refresh);
  window.addEventListener(UI_LOCALE_CHANGED_EVENT, refresh);
}
