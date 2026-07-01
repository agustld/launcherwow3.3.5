import {
  copyKeybinds,
  listWowAccounts,
  resolveActiveGameDir,
} from "../features/keybinds";
import type { WowAccountInfo } from "../config/keybind-types";
import {
  ACTIVE_SERVER_CHANGED_EVENT,
  CONFIG_UPDATED_EVENT,
} from "../config/types";
import { t, UI_LOCALE_CHANGED_EVENT } from "../i18n";
import { fromInvokeError } from "./status-message";
import { renderBackButton } from "./back-nav";

const ACCOUNT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.4"/>
  <path d="M5 19c0-3.3 2.7-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

const SHIELD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 3.5 5 6.5V12c0 4.2 3 7.4 7 8.5 4-1.1 7-4.3 7-8.5V6.5L12 3.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M12 8v5M9.5 10.5h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

const ARROW_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setFeedback(
  el: HTMLElement,
  message: string,
  tone: "ok" | "error" | "info" | "",
): void {
  el.textContent = message;
  el.classList.remove("ok", "error", "info");
  if (tone) el.classList.add(tone);
}

export function renderKeybindsView(): string {
  return `
    <section class="keybinds-view app-view" id="view-keybinds" hidden>
      <header class="keybinds-header view-section-header">
        <div class="view-header-top">
          ${renderBackButton()}
          <button type="button" class="btn-outline" id="keybinds-refresh" data-i18n="keybindsView.refresh">
            Actualizar cuentas
          </button>
        </div>
        <div class="view-header-center">
          <h2 class="keybinds-title" data-i18n="keybindsView.title">Keybinds</h2>
          <p class="keybinds-subtitle" data-i18n="keybindsView.subtitle">
            Copiá tus bindeos de teclado de una cuenta a otra (del cliente del servidor activo).
          </p>
        </div>
      </header>

      <p class="keybinds-feedback" id="keybinds-feedback" aria-live="polite"></p>

      <div class="keybinds-empty" id="keybinds-empty" hidden>
        <p class="keybinds-empty-message" id="keybinds-empty-message"></p>
      </div>

      <div class="keybinds-panel" id="keybinds-panel" hidden>
        <div class="keybinds-transfer">

          <div class="keybinds-transfer-from">
            <span class="keybinds-transfer-label" data-i18n="keybindsView.originLabel">DESDE</span>
            <div class="ref-select-wrap ref-select-wrap--shield">
              <span class="ref-select-icon">${SHIELD_ICON}</span>
              <select
                id="keybinds-origin"
                class="ref-select ref-select--shield"
                data-i18n-aria="keybindsView.originAria"
              ></select>
              <span class="ref-select-chevron" aria-hidden="true">
                <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1 5 5 9 1" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>
              </span>
            </div>
          </div>

          <div class="keybinds-transfer-arrow" aria-hidden="true">${ARROW_ICON}</div>

          <div class="keybinds-transfer-to">
            <div class="keybinds-transfer-to-head">
              <span class="keybinds-transfer-label" data-i18n="keybindsView.destLabel">HACIA</span>
              <div class="keybinds-dest-bulk">
                <button type="button" class="link-ice keybinds-bulk-btn" id="keybinds-select-all" data-i18n="keybindsView.selectAll">
                  Todas
                </button>
                <span class="keybinds-bulk-sep" aria-hidden="true">/</span>
                <button type="button" class="link-ice keybinds-bulk-btn" id="keybinds-select-none" data-i18n="keybindsView.selectNone">
                  Ninguna
                </button>
              </div>
            </div>
            <div class="keybinds-dest-chips" id="keybinds-dest-list" role="group"></div>
            <span class="keybinds-dest-summary" id="keybinds-dest-summary"></span>
          </div>

        </div>

        <div class="keybinds-actions">
          <button type="button" class="btn-copy-keybinds" id="keybinds-copy" data-i18n="keybindsView.copy" disabled>
            Copiar keybinds
          </button>
        </div>
      </div>

      <div class="keybinds-confirm-dialog" id="keybinds-confirm-dialog" hidden>
        <div class="keybinds-confirm-backdrop" id="keybinds-confirm-backdrop"></div>
        <div
          class="keybinds-confirm-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="keybinds-confirm-message"
        >
          <p class="keybinds-confirm-message" id="keybinds-confirm-message"></p>
          <div class="keybinds-confirm-actions">
            <button type="button" class="btn-outline" id="keybinds-confirm-cancel" data-i18n="keybindsView.cancel">
              Cancelar
            </button>
            <button type="button" class="btn-copy-keybinds btn-copy-keybinds--compact" id="keybinds-confirm-ok" data-i18n="keybindsView.confirmCopy">
              Copiar
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderOriginOptions(
  accounts: WowAccountInfo[],
  selected: string,
): string {
  const noBindingsLabel = t("keybindsView.noBindingsSuffix");

  return accounts
    .map((account) => {
      const suffix = account.has_bindings ? "" : noBindingsLabel;
      return `
        <option
          value="${escapeHtml(account.name)}"
          ${account.name === selected ? "selected" : ""}
          ${account.has_bindings ? "" : 'data-no-bindings="true"'}
        >
          ${escapeHtml(account.name)}${escapeHtml(suffix)}
        </option>
      `;
    })
    .join("");
}

function renderDestinationCheckboxes(
  accounts: WowAccountInfo[],
  origin: string,
  selected: Set<string>,
): string {
  const noBindingsLabel = t("keybindsView.noBindingsSuffix");

  return accounts
    .filter((account) => account.name !== origin)
    .map((account) => {
      const checked = selected.has(account.name) ? " checked" : "";
      const hasBindings = account.has_bindings;
      return `
        <label class="keybinds-chip${checked ? " is-selected" : ""}${!hasBindings ? " keybinds-chip--no-bind" : ""}" title="${escapeHtml(account.name)}${hasBindings ? "" : escapeHtml(noBindingsLabel)}">
          <input
            type="checkbox"
            class="keybinds-dest-check"
            name="keybinds-dest"
            value="${escapeHtml(account.name)}"
            ${checked}
          />
          <span class="keybinds-chip-icon" aria-hidden="true">${ACCOUNT_ICON}</span>
          <span class="keybinds-chip-name">${escapeHtml(account.name)}</span>
          ${checked ? '<span class="keybinds-chip-check" aria-hidden="true">✓</span>' : ""}
        </label>
      `;
    })
    .join("");
}

function getSelectedDestinations(root: HTMLElement): string[] {
  return Array.from(
    root.querySelectorAll<HTMLInputElement>(
      '#keybinds-dest-list input[name="keybinds-dest"]:checked',
    ),
  ).map((input) => input.value);
}

function closeConfirmDialog(root: HTMLElement): void {
  const dialog = root.querySelector<HTMLElement>("#keybinds-confirm-dialog");
  if (dialog) dialog.hidden = true;
}

function openConfirmDialog(root: HTMLElement, message: string): void {
  const dialog = root.querySelector<HTMLElement>("#keybinds-confirm-dialog");
  const messageEl = root.querySelector<HTMLElement>("#keybinds-confirm-message");
  if (!dialog || !messageEl) return;
  messageEl.textContent = message;
  dialog.hidden = false;
}

let cachedAccounts: WowAccountInfo[] = [];

function updateDestSelectionUi(root: HTMLElement): void {
  const copyButton = root.querySelector<HTMLButtonElement>("#keybinds-copy");
  const summary = root.querySelector<HTMLElement>("#keybinds-dest-summary");
  const destList = root.querySelector<HTMLElement>("#keybinds-dest-list");
  if (!copyButton || !summary || !destList) return;

  const all = destList.querySelectorAll<HTMLInputElement>(
    'input[name="keybinds-dest"]',
  );
  const checked = getSelectedDestinations(root);

  summary.textContent = t("keybindsView.selectedSummary", {
    selected: String(checked.length),
    total: String(all.length),
  });

  const panel = root.querySelector<HTMLElement>("#keybinds-panel");
  copyButton.disabled =
    !panel || panel.hidden || all.length === 0 || checked.length === 0;

  destList.querySelectorAll<HTMLLabelElement>(".keybinds-chip").forEach((chip) => {
    const input = chip.querySelector<HTMLInputElement>(".keybinds-dest-check");
    const isChecked = Boolean(input?.checked);
    chip.classList.toggle("is-selected", isChecked);
    // sync checkmark span
    let checkEl = chip.querySelector<HTMLElement>(".keybinds-chip-check");
    if (isChecked && !checkEl) {
      checkEl = document.createElement("span");
      checkEl.className = "keybinds-chip-check";
      checkEl.setAttribute("aria-hidden", "true");
      checkEl.textContent = "✓";
      chip.appendChild(checkEl);
    } else if (!isChecked && checkEl) {
      checkEl.remove();
    }
  });
}

function syncDestinationList(root: HTMLElement, preserveSelection = true): void {
  const originSelect = root.querySelector<HTMLSelectElement>("#keybinds-origin");
  const destList = root.querySelector<HTMLElement>("#keybinds-dest-list");
  if (!originSelect || !destList) return;

  const origin = originSelect.value;
  const previous = preserveSelection
    ? new Set(getSelectedDestinations(root))
    : new Set<string>();

  destList.innerHTML = renderDestinationCheckboxes(
    cachedAccounts,
    origin,
    previous,
  );
  updateDestSelectionUi(root);
}

export async function refreshKeybindsView(root: HTMLElement): Promise<void> {
  const panel = root.querySelector<HTMLElement>("#keybinds-panel");
  const empty = root.querySelector<HTMLElement>("#keybinds-empty");
  const emptyMessage = root.querySelector<HTMLElement>("#keybinds-empty-message");
  const feedback = root.querySelector<HTMLElement>("#keybinds-feedback");
  const originSelect = root.querySelector<HTMLSelectElement>("#keybinds-origin");
  const copyButton = root.querySelector<HTMLButtonElement>("#keybinds-copy");

  if (!panel || !empty || !emptyMessage || !feedback || !originSelect || !copyButton) {
    return;
  }

  setFeedback(feedback, "", "");
  panel.hidden = true;
  empty.hidden = true;
  copyButton.disabled = true;

  const gameDir = await resolveActiveGameDir();
  if (!gameDir) {
    empty.hidden = false;
    emptyMessage.textContent = t("keybindsView.noGamePath");
    return;
  }

  try {
    const accounts = await listWowAccounts(gameDir);
    cachedAccounts = accounts;

    if (accounts.length === 0) {
      empty.hidden = false;
      emptyMessage.textContent = t("keybindsView.noAccounts");
      return;
    }

    panel.hidden = false;

    const previousOrigin = originSelect.value;
    const preferredOrigin =
      accounts.find((account) => account.name === previousOrigin)?.name ??
      accounts.find((account) => account.has_bindings)?.name ??
      accounts[0]?.name ??
      "";

    originSelect.innerHTML = renderOriginOptions(accounts, preferredOrigin);
    syncDestinationList(root, Boolean(previousOrigin));
  } catch (error) {
    empty.hidden = false;
    emptyMessage.textContent = fromInvokeError(error, {
      message: t("keybindsView.loadFailed"),
    }).message;
  }
}

async function performCopy(root: HTMLElement): Promise<void> {
  const feedback = root.querySelector<HTMLElement>("#keybinds-feedback");
  const originSelect = root.querySelector<HTMLSelectElement>("#keybinds-origin");
  const copyButton = root.querySelector<HTMLButtonElement>("#keybinds-copy");
  const confirmOk = root.querySelector<HTMLButtonElement>("#keybinds-confirm-ok");

  if (!feedback || !originSelect || !copyButton) return;

  const gameDir = await resolveActiveGameDir();
  if (!gameDir) {
    setFeedback(feedback, t("keybindsView.noGamePath"), "error");
    return;
  }

  const sourceAccount = originSelect.value;
  const destinations = getSelectedDestinations(root);

  if (!sourceAccount) {
    setFeedback(feedback, t("keybindsView.pickOrigin"), "error");
    return;
  }

  const source = cachedAccounts.find((account) => account.name === sourceAccount);
  if (!source?.has_bindings) {
    setFeedback(feedback, t("keybindsView.originMissingBindings"), "error");
    return;
  }

  if (destinations.length === 0) {
    setFeedback(feedback, t("keybindsView.pickDestinations"), "error");
    return;
  }

  copyButton.disabled = true;
  if (confirmOk) confirmOk.disabled = true;
  setFeedback(feedback, t("keybindsView.copying"), "info");

  try {
    const result = await copyKeybinds(gameDir, sourceAccount, destinations);
    setFeedback(
      feedback,
      t("keybindsView.copySuccess", { count: String(result.copied) }),
      "ok",
    );
    closeConfirmDialog(root);
    await refreshKeybindsView(root);
  } catch (error) {
    setFeedback(
      feedback,
      fromInvokeError(error, { message: t("keybindsView.copyFailed") }).message,
      "error",
    );
  } finally {
    updateDestSelectionUi(root);
    if (confirmOk) confirmOk.disabled = false;
  }
}

function requestCopy(root: HTMLElement): void {
  const originSelect = root.querySelector<HTMLSelectElement>("#keybinds-origin");
  const feedback = root.querySelector<HTMLElement>("#keybinds-feedback");
  if (!originSelect || !feedback) return;

  const sourceAccount = originSelect.value;
  const destinations = getSelectedDestinations(root);

  if (!sourceAccount) {
    setFeedback(feedback, t("keybindsView.pickOrigin"), "error");
    return;
  }

  if (destinations.length === 0) {
    setFeedback(feedback, t("keybindsView.pickDestinations"), "error");
    return;
  }

  openConfirmDialog(
    root,
    t("keybindsView.confirmMessage", {
      origin: sourceAccount,
      count: String(destinations.length),
    }),
  );
}

export function refreshKeybindsI18n(root: HTMLElement): void {
  void refreshKeybindsView(root);
}

export function bindKeybindsView(root: HTMLElement): void {
  void refreshKeybindsView(root);

  root.querySelector("#keybinds-refresh")?.addEventListener("click", () => {
    void refreshKeybindsView(root);
  });

  root.querySelector("#keybinds-origin")?.addEventListener("change", () => {
    syncDestinationList(root, true);
  });

  root.querySelector("#keybinds-dest-list")?.addEventListener("change", () => {
    updateDestSelectionUi(root);
  });

  root.querySelector("#keybinds-select-all")?.addEventListener("click", () => {
    const destList = root.querySelector<HTMLElement>("#keybinds-dest-list");
    destList
      ?.querySelectorAll<HTMLInputElement>('input[name="keybinds-dest"]')
      .forEach((input) => {
        input.checked = true;
      });
    updateDestSelectionUi(root);
  });

  root.querySelector("#keybinds-select-none")?.addEventListener("click", () => {
    const destList = root.querySelector<HTMLElement>("#keybinds-dest-list");
    destList
      ?.querySelectorAll<HTMLInputElement>('input[name="keybinds-dest"]')
      .forEach((input) => {
        input.checked = false;
      });
    updateDestSelectionUi(root);
  });

  root.querySelector("#keybinds-copy")?.addEventListener("click", () => {
    requestCopy(root);
  });

  root.querySelector("#keybinds-confirm-cancel")?.addEventListener("click", () => {
    closeConfirmDialog(root);
  });

  root.querySelector("#keybinds-confirm-backdrop")?.addEventListener("click", () => {
    closeConfirmDialog(root);
  });

  root.querySelector("#keybinds-confirm-ok")?.addEventListener("click", () => {
    void performCopy(root);
  });

  root.querySelector('[data-nav="keybinds"]')?.addEventListener("click", () => {
    void refreshKeybindsView(root);
  });

  window.addEventListener(ACTIVE_SERVER_CHANGED_EVENT, () => {
    const view = root.querySelector<HTMLElement>("#view-keybinds");
    if (view && !view.hidden) {
      void refreshKeybindsView(root);
    }
  });

  window.addEventListener(CONFIG_UPDATED_EVENT, () => {
    const view = root.querySelector<HTMLElement>("#view-keybinds");
    if (view && !view.hidden) {
      void refreshKeybindsView(root);
    }
  });

  window.addEventListener(UI_LOCALE_CHANGED_EVENT, () => {
    const view = root.querySelector<HTMLElement>("#view-keybinds");
    if (view && !view.hidden) {
      void refreshKeybindsView(root);
    }
  });
}
