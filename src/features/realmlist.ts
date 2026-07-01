import { invoke } from "@tauri-apps/api/core";
import { formatRealmlistCommand } from "../config/path";
import { getActiveServer } from "../config/store";
import {
  ACTIVE_SERVER_CHANGED_EVENT,
  type ServerProfile,
} from "../config/types";
import { t } from "../i18n";

export async function applyRealmlist(
  gameDir: string,
  realmlist: string,
): Promise<void> {
  await invoke<void>("set_realmlist", {
    gameDir,
    realmlist,
  });
}

export function renderRealmlist(): string {
  return `
    <div class="realmlist-block">
      <label class="realmlist-label" for="realmlist-input" data-i18n="realmlist.label">Realmlist</label>
      <div class="realmlist-row">
        <input
          id="realmlist-input"
          class="realmlist-input"
          type="text"
          readonly
          value=""
          data-i18n-aria="realmlist.copyAria"
        />
        <button type="button" class="btn-copy" id="btn-copy-realmlist" data-i18n-title="realmlist.copy">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/>
            <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </button>
      </div>
      <span class="realmlist-hint" id="realmlist-hint" aria-live="polite"></span>
    </div>
  `;
}

function updateRealmlistInput(root: HTMLElement, server: ServerProfile | null): void {
  const input = root.querySelector<HTMLInputElement>("#realmlist-input");
  if (input) {
    input.value = server ? formatRealmlistCommand(server.realmlist) : "";
  }
}

export async function refreshRealmlistDisplay(root: HTMLElement): Promise<void> {
  const server = await getActiveServer();
  updateRealmlistInput(root, server);
}

export function refreshRealmlistI18n(root: HTMLElement): void {
  const label = root.querySelector<HTMLElement>(".realmlist-label");
  const copyBtn = root.querySelector<HTMLElement>("#btn-copy-realmlist");
  if (label) label.textContent = t("realmlist.label");
  if (copyBtn) copyBtn.title = t("realmlist.copy");
}

export function bindRealmlist(root: HTMLElement): void {
  const button = root.querySelector<HTMLButtonElement>("#btn-copy-realmlist");
  const hint = root.querySelector<HTMLElement>("#realmlist-hint");

  void refreshRealmlistDisplay(root);

  window.addEventListener(ACTIVE_SERVER_CHANGED_EVENT, () => {
    void refreshRealmlistDisplay(root);
  });

  button?.addEventListener("click", async () => {
    const input = root.querySelector<HTMLInputElement>("#realmlist-input");
    if (!input || !hint) return;

    try {
      await navigator.clipboard.writeText(input.value);
      hint.textContent = t("realmlist.copied");
      window.setTimeout(() => {
        hint.textContent = "";
      }, 2000);
    } catch {
      hint.textContent = t("realmlist.copyFailed");
    }
  });
}
