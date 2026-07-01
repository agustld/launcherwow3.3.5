/** Barra inferior de la portada (sin sidebar lateral). */

import { renderLaunchButton, renderLaunchStatus } from "../features/launch";
import { renderHomeServerSelector } from "./home-server-selector";

const DISCORD_URL = "https://discord.gg/TU_INVITE_AQUI";

const SETTINGS_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" stroke="currentColor" stroke-width="1.5"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const DISCORD_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.98 19.98 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.201 13.201 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/>
</svg>`;

function renderContactPopup(): string {
  return `
    <div class="contact-popup" id="contact-popup" hidden aria-modal="true" role="dialog" aria-label="Contacto">
      <div class="contact-popup-backdrop" id="contact-popup-backdrop"></div>
      <div class="contact-popup-panel">
        <button class="contact-popup-close" id="contact-popup-close" aria-label="Cerrar">✕</button>
        <h3 class="contact-popup-title">Contacto & Soporte</h3>
        <p class="contact-popup-desc">¿Tenés alguna duda o problema? Unite a nuestro servidor de Discord.</p>
        <button class="contact-discord-btn" id="contact-discord-btn">
          <span class="contact-discord-icon">${DISCORD_ICON}</span>
          <span class="contact-discord-label">Unirse al Discord</span>
        </button>
      </div>
    </div>
  `;
}

export function renderSidebar(): string {
  return renderBottomBar() + renderContactPopup();
}

export function renderBottomBar(): string {
  return `
    <footer class="bottom-bar" aria-label="Barra de acciones">
      <div class="bottom-bar-left">
        <button
          type="button"
          class="bottom-bar-options"
          id="btn-settings"
          data-i18n-title="nav.settings"
          data-i18n-aria="nav.settings"
        >
          <span class="btn-settings bottom-bar-options-icon" aria-hidden="true">${SETTINGS_ICON}</span>
          <span class="bottom-bar-options-label" data-i18n="nav.settings">Ajustes</span>
        </button>
        <button type="button" class="bottom-bar-help" id="dock-help" title="Contacto" aria-label="Contacto">?</button>
      </div>

      <div class="bottom-bar-right">
        <div class="bottom-bar-play-cluster">
          ${renderHomeServerSelector()}
          <div class="bottom-bar-play-wrap">
            ${renderLaunchButton()}
          </div>
        </div>
      </div>

      ${renderLaunchStatus()}
      <span class="nav-update-badge nav-update-badge--bar" id="nav-update-badge" hidden aria-hidden="true"></span>
    </footer>
  `;
}

export function bindSidebar(root: HTMLElement): void {
  const helpBtn = root.querySelector<HTMLButtonElement>("#dock-help");
  const popup = root.querySelector<HTMLElement>("#contact-popup");
  const backdrop = root.querySelector<HTMLElement>("#contact-popup-backdrop");
  const closeBtn = root.querySelector<HTMLButtonElement>("#contact-popup-close");
  const discordBtn = root.querySelector<HTMLButtonElement>("#contact-discord-btn");

  function openPopup(): void {
    if (!popup) return;
    popup.hidden = false;
    closeBtn?.focus();
  }

  function closePopup(): void {
    if (!popup) return;
    popup.hidden = true;
    helpBtn?.focus();
  }

  helpBtn?.addEventListener("click", openPopup);
  backdrop?.addEventListener("click", closePopup);
  closeBtn?.addEventListener("click", closePopup);

  discordBtn?.addEventListener("click", () => {
    void import("@tauri-apps/plugin-opener").then((mod) => mod.openUrl(DISCORD_URL));
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popup && !popup.hidden) closePopup();
  });
}

export function setShellViewMode(root: HTMLElement, view: string): void {
  const shell = root.querySelector<HTMLElement>(".app-shell");
  const isHome = view === "home";
  shell?.classList.toggle("shell-view-home", isHome);
  shell?.classList.toggle("shell-view-section", !isHome);
}
