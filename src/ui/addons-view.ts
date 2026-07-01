import {
  folderExistsMessage,
  groupAddonsByCategory,
  installAddon,
  isFolderExistsError,
  listenAddonDownloadProgress,
  loadAddonCatalog,
  resolveAddonAction,
  resolveAddonDownloadUrl,
  scanAddonStatuses,
  uninstallAddon,
} from "../features/addons";
import {
  formatLocaleLabel,
  CONFIG_UPDATED_EVENT,
  LOCALE_UPDATED_EVENT,
  ACTIVE_SERVER_CHANGED_EVENT,
  ADDONS_UPDATED_EVENT,
  type AddonCatalogEntry,
  type AddonStatusEntry,
} from "../config/types";
import { getConfig } from "../config/store";
import { getAddonErrors,
  applyUserError,
  formatUserError,
} from "./status-message";
import { t, UI_LOCALE_CHANGED_EVENT } from "../i18n";
import { renderBackButton } from "./back-nav";

/** Vista de addons por categoría con instalación según idioma del cliente. */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAddonsView(): string {
  return `
    <section class="addons-view app-view" id="view-addons" hidden>
      <header class="addons-header view-section-header">
        <div class="view-header-top">
          ${renderBackButton()}
          <button type="button" class="btn-outline" id="addons-refresh" data-i18n="addonsView.refresh">Actualizar lista</button>
        </div>
        <div class="view-header-center">
          <h2 class="addons-title" data-i18n="addonsView.title">Addons</h2>
          <p class="addons-subtitle" data-i18n="addonsView.subtitle">Instalá addons compatibles con 3.3.5a según el idioma de tu cliente.</p>
        </div>
      </header>

      <div class="addons-locale-bar" id="addons-locale-bar">
        <span class="addons-locale-label" data-i18n="addonsView.clientLocale">Idioma del cliente:</span>
        <strong class="addons-locale-value" id="addons-locale-value">—</strong>
        <span class="addons-locale-hint" id="addons-locale-hint"></span>
      </div>

      <div class="addons-search-bar">
        <input
          type="search"
          class="addons-search-input"
          id="addons-search"
          placeholder="Buscar addon…"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <div class="addons-tabs" id="addons-tabs" role="tablist"></div>

      <p class="addons-feedback" id="addons-global-feedback" aria-live="polite"></p>

      <div class="addons-catalog" id="addons-catalog">
        <p class="addons-loading" data-i18n="addonsView.loading">Cargando catálogo…</p>
      </div>
    </section>
  `;
}

function renderAddonItem(
  addon: AddonCatalogEntry,
  status: AddonStatusEntry | undefined,
  busyId: string | null,
  locale: string,
): string {
  const available = !!resolveAddonDownloadUrl(addon, locale);
  const baseAction = available ? resolveAddonAction(addon, status) : "none";
  const installedVersion = status?.installed_version;

  // "update" collapses into "uninstall" — no update button, just delete
  const action = baseAction === "update" ? "uninstall" : baseAction;

  const versionLine =
    baseAction === "update"
      ? t("addonsView.installedVersion", {
          installed: installedVersion ?? "?",
          catalog: addon.version,
        })
      : t("addonsView.version", { version: addon.version });

  const buttonLabel = !available
    ? t("addonsView.unavailable")
    : action === "install"
      ? t("addonsView.install")
      : action === "uninstall"
        ? t("addonsView.uninstall")
        : "—";

  const buttonClass =
    action === "uninstall" ? "btn-outline btn-outline--danger" : "btn-outline";

  const isBusy = busyId === addon.id;

  return `
    <li class="addon-item" data-addon-id="${escapeHtml(addon.id)}">
      <div class="addon-item-body">
        <h4 class="addon-item-name">${escapeHtml(addon.name)}</h4>
        <p class="addon-item-desc">${escapeHtml(addon.description)}</p>
        <p class="addon-item-version">${escapeHtml(versionLine)}</p>
      </div>
      <button
        type="button"
        class="${buttonClass} addon-item-action"
        data-action="${action}"
        ${action === "none" || isBusy ? "disabled" : ""}
      >
        ${isBusy ? "…" : buttonLabel}
      </button>
      <div class="addon-item-progress" ${isBusy ? "" : "hidden"}>
        <div class="addon-item-progress-bar" style="width:0%"></div>
        <span class="addon-item-progress-text"></span>
      </div>
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

function setItemProgress(
  root: HTMLElement,
  addonId: string,
  visible: boolean,
  percent: number,
  text: string,
): void {
  const item = root.querySelector<HTMLElement>(
    `[data-addon-id="${CSS.escape(addonId)}"]`,
  );
  if (!item) return;

  const wrap = item.querySelector<HTMLElement>(".addon-item-progress");
  const bar = item.querySelector<HTMLElement>(".addon-item-progress-bar");
  const label = item.querySelector<HTMLElement>(".addon-item-progress-text");
  if (!wrap || !bar || !label) return;

  wrap.hidden = !visible;
  bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  label.textContent = text;
}

function getActiveTab(root: HTMLElement): string {
  return root.querySelector<HTMLElement>(".addons-tab--active")?.dataset.category ?? "todos";
}

function applyTabFilter(root: HTMLElement, category: string): void {
  root.querySelectorAll<HTMLElement>(".addons-tab").forEach((btn) => {
    btn.classList.toggle("addons-tab--active", btn.dataset.category === category);
    btn.setAttribute("aria-selected", String(btn.dataset.category === category));
  });

  root.querySelectorAll<HTMLDetailsElement>("details.addons-category").forEach((section) => {
    const matches = category === "todos" || section.dataset.category === category;
    section.hidden = !matches;
  });

  applySearchFilter(root);
}

function applySearchFilter(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>("#addons-search");
  const query = (input?.value ?? "").trim().toLowerCase();
  const activeTab = getActiveTab(root);

  root.querySelectorAll<HTMLDetailsElement>("details.addons-category").forEach((section) => {
    const tabMatch = activeTab === "todos" || section.dataset.category === activeTab;
    if (!tabMatch) {
      section.hidden = true;
      return;
    }

    let hasVisible = false;
    section.querySelectorAll<HTMLElement>(".addon-item").forEach((item) => {
      const name = item.querySelector(".addon-item-name")?.textContent?.toLowerCase() ?? "";
      const desc = item.querySelector(".addon-item-desc")?.textContent?.toLowerCase() ?? "";
      const show = query === "" || name.includes(query) || desc.includes(query);
      item.hidden = !show;
      if (show) hasVisible = true;
    });

    section.hidden = !hasVisible;
  });
}

export async function refreshAddonsView(root: HTMLElement): Promise<void> {
  const catalogEl = root.querySelector<HTMLElement>("#addons-catalog");
  const localeValue = root.querySelector<HTMLElement>("#addons-locale-value");
  const localeHint = root.querySelector<HTMLElement>("#addons-locale-hint");
  const feedback = root.querySelector<HTMLElement>("#addons-global-feedback");

  if (!catalogEl || !localeValue || !localeHint || !feedback) return;

  const config = await getConfig();
  const locale = config.client_locale.trim();

  localeValue.textContent = locale
    ? `${formatLocaleLabel(locale)} (${locale})`
    : t("addonsView.localeUnset");

  if (!locale) {
    localeHint.textContent = t("addonsView.localeHintUnset");
  } else if (!config.game_path.trim()) {
    localeHint.textContent = t("addonsView.localeHintNoPath");
  } else {
    localeHint.textContent = "";
  }

  try {
    const catalog = await loadAddonCatalog();
    const statuses = await scanAddonStatuses(catalog);
    const statusMap = new Map(statuses.map((entry) => [entry.id, entry]));
    const groups = groupAddonsByCategory(catalog);

    if (catalog.length === 0) {
      catalogEl.innerHTML =
        `<p class="addons-empty">${escapeHtml(t("addonsView.empty"))}</p>`;
      return;
    }

    // Build tabs
    const tabsEl = root.querySelector<HTMLElement>("#addons-tabs");
    const activeTab = getActiveTab(root);
    const categories = [...groups.keys()];

    if (tabsEl) {
      const allLabel = "Todos";
      const totalInstalled = statuses.filter((s) => s.installed).length;
      const tabsHtml = [
        `<button type="button" class="addons-tab${activeTab === "todos" ? " addons-tab--active" : ""}" data-category="todos" role="tab" aria-selected="${activeTab === "todos"}">${escapeHtml(allLabel)} <span class="addons-tab-count">${totalInstalled}/${catalog.length}</span></button>`,
        ...categories.map((cat) => {
          const catAddons = groups.get(cat)!;
          const catInstalled = catAddons.filter((a) => statusMap.get(a.id)?.installed).length;
          const isActive = activeTab === cat;
          return `<button type="button" class="addons-tab${isActive ? " addons-tab--active" : ""}" data-category="${escapeHtml(cat)}" role="tab" aria-selected="${isActive}">${escapeHtml(cat)} <span class="addons-tab-count">${catInstalled}/${catAddons.length}</span></button>`;
        }),
      ].join("");
      tabsEl.innerHTML = tabsHtml;
    }

    // Build accordion catalog
    const html = [...groups.entries()]
      .map(([category, addons]) => {
        const installed = addons.filter((a) => statusMap.get(a.id)?.installed).length;
        const items = addons
          .map((addon) =>
            renderAddonItem(addon, statusMap.get(addon.id), null, locale),
          )
          .join("");
        const tabMatch = activeTab === "todos" || activeTab === category;
        return `
          <details class="addons-category" data-category="${escapeHtml(category)}"${tabMatch ? " open" : ""}>
            <summary class="addons-category-summary">
              <h3 class="addons-category-title">${escapeHtml(category)}</h3>
              <span class="addons-category-counter">${installed}/${addons.length} instalados</span>
            </summary>
            <ul class="addons-list">${items}</ul>
          </details>
        `;
      })
      .join("");

    catalogEl.innerHTML = html;
    setGlobalFeedback(feedback, "", "");
    applyTabFilter(root, activeTab);
  } catch (error) {
    applyUserError(
      feedback,
      getAddonErrors().catalogFailed,
    );
    catalogEl.innerHTML =
      `<p class="addons-empty">${escapeHtml(t("addonsView.loadFailed"))}</p>`;
    void error;
  }
}

export function refreshAddonsI18n(_root: HTMLElement): void {}

async function handleAddonAction(
  root: HTMLElement,
  addonId: string,
  action: "install" | "uninstall",
): Promise<void> {
  const feedback = root.querySelector<HTMLElement>("#addons-global-feedback");
  if (!feedback) return;

  const config = await getConfig();
  if (!config.client_locale.trim()) {
    applyUserError(feedback, getAddonErrors().noLocale);
    return;
  }

  const catalog = await loadAddonCatalog();
  const addon = catalog.find((entry) => entry.id === addonId);
  if (!addon) return;

  setGlobalFeedback(feedback, "", "");
  setItemProgress(root, addonId, action === "install", 0, t("addonsView.preparing"));

  let unlisten: (() => void) | null = null;

  try {
    if (action === "install") {
      unlisten = await listenAddonDownloadProgress((progress) => {
        if (progress.addon_id !== addon.id) return;
        const total = progress.total ?? 0;
        const percent =
          total > 0 ? Math.round((progress.received / total) * 100) : 0;
        const phaseLabel =
          progress.phase === "extracting"
            ? t("addonsView.extracting")
            : progress.phase === "done"
              ? t("addonsView.done")
              : t("addonsView.downloading");
        setItemProgress(root, addonId, true, percent, `${phaseLabel} ${percent}%`);
      });

      await tryInstall(root, addon, config.client_locale, false);
      setGlobalFeedback(
        feedback,
        t("addonsView.installed", { name: addon.name }),
        "info",
      );
    } else {
      await uninstallAddon(addon);
      setGlobalFeedback(feedback, t("addonsView.uninstalled", { name: addon.name }), "info");
    }
  } catch (error) {
    if (isFolderExistsError(error)) {
      const detail = folderExistsMessage(error);
      setGlobalFeedback(feedback, `${detail} ¿Sobrescribir?`, "error");
      const btn = root.querySelector<HTMLElement>(
        `[data-addon-id="${addon.id}"] .addon-item-action`,
      );
      if (btn) {
        btn.dataset.pendingOverwrite = "true";
        btn.textContent = t("addonsView.overwrite");
        btn.dataset.action = "overwrite";
      }
    } else {
      const ADDON_ERRORS = getAddonErrors();
      const message =
        error instanceof Error ? error.message : ADDON_ERRORS.installFailed.message;
      setGlobalFeedback(
        feedback,
        formatUserError({ ...ADDON_ERRORS.installFailed, message }),
        "error",
      );
    }
  } finally {
    unlisten?.();
    setItemProgress(root, addonId, false, 0, "");
    await refreshAddonsView(root);
  }
}

async function tryInstall(
  root: HTMLElement,
  addon: AddonCatalogEntry,
  locale: string,
  overwrite: boolean,
): Promise<void> {
  await installAddon(addon, locale, overwrite);
  void root;
}

export function bindAddonsView(root: HTMLElement): void {
  void refreshAddonsView(root);

  const refresh = (): void => {
    void refreshAddonsView(root);
  };

  window.addEventListener(ADDONS_UPDATED_EVENT, refresh);
  window.addEventListener(LOCALE_UPDATED_EVENT, refresh);
  window.addEventListener(CONFIG_UPDATED_EVENT, refresh);
  window.addEventListener(ACTIVE_SERVER_CHANGED_EVENT, refresh);
  window.addEventListener(UI_LOCALE_CHANGED_EVENT, refresh);

  root.querySelector("#addons-refresh")?.addEventListener("click", refresh);

  root.querySelector("#addons-search")?.addEventListener("input", () => {
    applySearchFilter(root);
  });

  root.querySelector("#addons-tabs")?.addEventListener("click", (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>(".addons-tab");
    if (!btn) return;
    applyTabFilter(root, btn.dataset.category ?? "todos");
  });

  root.querySelector("#addons-catalog")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      ".addon-item-action",
    );
    if (!button || button.disabled) return;

    const li = button.closest<HTMLElement>(".addon-item");
    const addonId = li?.dataset.addonId;
    if (!addonId) return;

    const action = button.dataset.action as
      | "install"
      | "uninstall"
      | "overwrite"
      | undefined;

    if (action === "overwrite") {
      void (async () => {
        const config = await getConfig();
        const catalog = await loadAddonCatalog();
        const addon = catalog.find((entry) => entry.id === addonId);
        if (!addon) return;
        await tryInstall(root, addon, config.client_locale, true);
        await refreshAddonsView(root);
      })();
      return;
    }

    if (action === "install" || action === "uninstall") {
      void handleAddonAction(root, addonId, action);
    }
  });
}
