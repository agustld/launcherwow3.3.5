/** Selector de servidor activo (barra inferior). */

import {
  getActiveServer,
  getActiveServerId,
  listAllServers,
  setActiveServerId,
} from "../config/store";
import {
  ACTIVE_SERVER_CHANGED_EVENT,
  SERVERS_UPDATED_EVENT,
  type ServerProfile,
} from "../config/types";
import { t, UI_LOCALE_CHANGED_EVENT } from "../i18n";

const SHIELD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 3.5 5 6.5V12c0 4.2 3 7.4 7 8.5 4-1.1 7-4.3 7-8.5V6.5L12 3.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M12 8v5M9.5 10.5h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

export function renderHomeServerSelector(): string {
  return `
    <div class="bottom-bar-field bottom-bar-field--server">
      <label class="bottom-bar-field-label" for="home-server-select" data-i18n="hero.serverLabel">Seleccionar servidor</label>
      <div class="ref-select-wrap ref-select-wrap--shield">
        <span class="ref-select-icon">${SHIELD_ICON}</span>
        <select id="home-server-select" class="ref-select ref-select--shield bottom-bar-select" data-i18n-aria="hero.serverSelectAria"></select>
        <span class="ref-select-chevron" aria-hidden="true">
          <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1 5 5 9 1" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>
        </span>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function refreshHomeServerSelector(root: HTMLElement): Promise<void> {
  const select = root.querySelector<HTMLSelectElement>("#home-server-select");
  if (!select) return;

  const [servers, activeId] = await Promise.all([
    listAllServers(),
    getActiveServerId(),
  ]);

  const presetSuffix = t("hero.presetSuffix");

  select.innerHTML = servers
    .map(
      (server) => `
        <option value="${escapeHtml(server.id)}"${server.id === activeId ? " selected" : ""}>
          ${escapeHtml(server.name)}${server.preset ? escapeHtml(presetSuffix) : ""}
        </option>
      `,
    )
    .join("");
}

export async function refreshActiveServerLabel(root: HTMLElement): Promise<void> {
  const label = root.querySelector<HTMLElement>("#hero-wordmark");
  if (!label) return;

  const active = await getActiveServer();
  label.textContent = active ? serverWordmark(active) : t("hero.noServerWordmark");
}

export function bindHomeServerSelector(root: HTMLElement): void {
  const select = root.querySelector<HTMLSelectElement>("#home-server-select");

  void refreshHomeServerSelector(root);
  void refreshActiveServerLabel(root);

  select?.addEventListener("change", () => {
    const id = select.value;
    if (id) void setActiveServerId(id);
  });

  window.addEventListener(ACTIVE_SERVER_CHANGED_EVENT, () => {
    void refreshHomeServerSelector(root);
    void refreshActiveServerLabel(root);
  });

  window.addEventListener(SERVERS_UPDATED_EVENT, () => {
    void refreshHomeServerSelector(root);
  });

  window.addEventListener(UI_LOCALE_CHANGED_EVENT, () => {
    void refreshHomeServerSelector(root);
    void refreshActiveServerLabel(root);
  });
}

export function serverWordmark(server: ServerProfile): string {
  return server.name.toUpperCase();
}
