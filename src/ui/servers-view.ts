import {
  activateServer,
  addUserServer,
  browseServerGamePath,
  deleteUserServer,
  updateUserServer,
} from "../features/servers";
import { formatRealmlistCommand } from "../config/path";
import {
  getActiveServerId,
  listAllServers,
} from "../config/store";
import { t, UI_LOCALE_CHANGED_EVENT } from "../i18n";
import { bindRealmlist, renderRealmlist } from "../features/realmlist";
import {
  ACTIVE_SERVER_CHANGED_EVENT,
  SERVERS_UPDATED_EVENT,
  type ServerProfile,
} from "../config/types";
import { renderBackButton } from "./back-nav";

/** Vista completa de gestión de servidores. */

type FormMode = "add" | "edit" | null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderServersView(): string {
  return `
    <section class="servers-view app-view" id="view-servers" hidden>
      <header class="servers-header view-section-header">
        <div class="view-header-top">
          ${renderBackButton()}
          <button type="button" class="btn-outline" id="btn-add-server" data-i18n="realmlistView.addServer">Agregar servidor</button>
        </div>
        <div class="view-header-center">
          <h2 class="servers-title" data-i18n="realmlistView.title">Realmlist</h2>
          <p class="servers-subtitle" data-i18n="realmlistView.subtitle">Elegí un reino o agregá el tuyo. Los oficiales vienen con el launcher.</p>
        </div>
      </header>

      <div class="servers-realmlist-panel">
        ${renderRealmlist()}
      </div>

      <div class="servers-list-wrap">
        <h3 class="servers-section-label" data-i18n="realmlistView.official">Oficiales</h3>
        <ul class="servers-list" id="servers-list-presets" data-i18n-aria="realmlistView.officialAria"></ul>

        <h3 class="servers-section-label" data-i18n="realmlistView.user">Mis servidores</h3>
        <ul class="servers-list" id="servers-list-user" data-i18n-aria="realmlistView.userAria"></ul>
      </div>

      <div class="server-form-modal" id="server-form-modal" hidden>
        <div class="server-form-backdrop" id="server-form-backdrop"></div>
        <div
          class="server-form-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="server-form-title"
        >
          <header class="server-form-header">
            <h3 class="server-form-title" id="server-form-title" data-i18n="realmlistView.formAdd">
              Agregar servidor
            </h3>
            <button
              type="button"
              class="server-form-close"
              id="server-form-close"
              data-i18n-aria="realmlistView.formCloseAria"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M1 1 11 11M11 1 1 11" stroke="currentColor" stroke-width="1.4"/>
              </svg>
            </button>
          </header>

          <form class="server-form" id="server-form">
            <input type="hidden" id="server-form-id" value="" />

            <div class="server-form-body">
              <div class="settings-field">
                <label class="settings-label" for="server-form-name" data-i18n="realmlistView.name">Nombre</label>
                <input id="server-form-name" class="settings-input" type="text" required />
              </div>

              <div class="settings-field">
                <label class="settings-label" for="server-form-realmlist" data-i18n="realmlistView.realmlist">Realmlist</label>
                <input id="server-form-realmlist" class="settings-input" type="text" placeholder="logon.tuservidor.com" required />
                <p class="settings-hint" data-i18n="realmlistView.realmlistHint">Podés pegar solo el host o la línea completa set realmlist …</p>
              </div>

              <div class="settings-field">
                <label class="settings-label" for="server-form-description" data-i18n="realmlistView.description">Descripción</label>
                <input id="server-form-description" class="settings-input" type="text" data-i18n-placeholder="realmlistView.description" placeholder="Opcional" />
              </div>

              <div class="settings-field">
                <label class="settings-label" for="server-form-game-path" data-i18n="realmlistView.gamePath">Ruta del cliente (opcional)</label>
                <div class="settings-row">
                  <input id="server-form-game-path" class="settings-input" type="text" data-i18n-placeholder="realmlistView.gamePathPlaceholder" placeholder="Usa la ruta global si está vacío" />
                  <button type="button" class="btn-browse" id="server-form-browse" data-i18n="realmlistView.browse">Buscar…</button>
                </div>
              </div>

              <p class="settings-feedback" id="server-form-feedback" aria-live="polite"></p>
            </div>

            <div class="server-form-actions">
              <button type="button" class="btn-outline" id="server-form-cancel" data-i18n="realmlistView.cancel">Cancelar</button>
              <button type="submit" class="btn-save-settings" id="server-form-save" data-i18n="realmlistView.save">Guardar</button>
            </div>
          </form>
        </div>
      </div>

      <div class="server-delete-dialog" id="server-delete-dialog" hidden>
        <div class="server-delete-backdrop" id="server-delete-backdrop"></div>
        <div
          class="server-delete-panel"
          role="alertdialog"
          aria-labelledby="server-delete-message"
          aria-modal="true"
        >
          <p class="server-delete-message" id="server-delete-message"></p>
          <div class="server-delete-actions">
            <button type="button" class="btn-outline" id="server-delete-cancel" data-i18n="realmlistView.cancel">
              Cancelar
            </button>
            <button type="button" class="btn-danger" id="server-delete-confirm" data-i18n="realmlistView.deleteConfirmAction">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function iconEdit(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M11.3 2.7l2 2-8 8-3.3.3.3-3.3 8-8z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;
}

function iconDelete(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 4.5h10M6 4.5V3.5h4v1M5.5 4.5v7h5v-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function serverInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

function renderServerItem(server: ServerProfile, activeId: string): string {
  const isActive = server.id === activeId;
  const realmlistLine = formatRealmlistCommand(server.realmlist);

  return `
    <li class="server-item${isActive ? " server-item--active" : ""}" data-server-id="${escapeHtml(server.id)}">
      <button type="button" class="server-item-main" data-action="activate">
        <span class="server-item-avatar" aria-hidden="true">${escapeHtml(serverInitial(server.name))}</span>
        <span class="server-item-body">
          <span class="server-item-name-row">
            <span class="server-item-name">${escapeHtml(server.name)}</span>
            <span class="server-item-badges">
              ${isActive ? `<span class="server-item-badge server-item-badge--active">${escapeHtml(t("realmlistView.active"))}</span>` : ""}
              ${server.preset ? `<span class="server-item-badge server-item-badge--preset">${escapeHtml(t("realmlistView.presetBadge"))}</span>` : ""}
            </span>
          </span>
          <span class="server-item-realmlist">${escapeHtml(realmlistLine)}</span>
          ${server.description ? `<span class="server-item-desc">${escapeHtml(server.description)}</span>` : ""}
          ${server.gamePath ? `<span class="server-item-path">📁 ${escapeHtml(server.gamePath)}</span>` : ""}
        </span>
        <span class="server-item-status" aria-hidden="true">
          <span class="server-item-dot${isActive ? " server-item-dot--active" : ""}"></span>
        </span>
      </button>
      ${
        server.preset
          ? ""
          : `<div class="server-item-actions">
              <button type="button" class="server-item-icon-btn" data-action="edit"
                data-i18n-title="realmlistView.edit" data-i18n-aria="realmlistView.editAria">
                ${iconEdit()}
              </button>
              <button type="button" class="server-item-icon-btn server-item-icon-btn--danger" data-action="delete"
                data-i18n-title="realmlistView.delete" data-i18n-aria="realmlistView.deleteAria">
                ${iconDelete()}
              </button>
            </div>`
      }
    </li>
  `;
}

export async function refreshServerLists(root: HTMLElement): Promise<void> {
  const presetsEl = root.querySelector<HTMLElement>("#servers-list-presets");
  const userEl = root.querySelector<HTMLElement>("#servers-list-user");
  if (!presetsEl || !userEl) return;

  const [servers, activeId] = await Promise.all([
    listAllServers(),
    getActiveServerId(),
  ]);

  const presets = servers.filter((server) => server.preset);
  const user = servers.filter((server) => !server.preset);

  presetsEl.innerHTML =
    presets.map((server) => renderServerItem(server, activeId)).join("") ||
    `<li class="servers-empty">${escapeHtml(t("realmlistView.emptyPresets"))}</li>`;

  userEl.innerHTML =
    user.map((server) => renderServerItem(server, activeId)).join("") ||
    `<li class="servers-empty">${escapeHtml(t("realmlistView.emptyUser"))}</li>`;
}

export function refreshServersI18n(_root: HTMLElement): void {}

function setFormFeedback(el: HTMLElement, message: string, tone: "" | "error"): void {
  el.textContent = message;
  el.classList.toggle("error", tone === "error");
}

function openForm(root: HTMLElement, mode: FormMode, server?: ServerProfile): void {
  const modal = root.querySelector<HTMLElement>("#server-form-modal");
  const title = root.querySelector<HTMLElement>("#server-form-title");
  const idInput = root.querySelector<HTMLInputElement>("#server-form-id");
  const nameInput = root.querySelector<HTMLInputElement>("#server-form-name");
  const realmlistInput = root.querySelector<HTMLInputElement>("#server-form-realmlist");
  const descInput = root.querySelector<HTMLInputElement>("#server-form-description");
  const pathInput = root.querySelector<HTMLInputElement>("#server-form-game-path");
  const feedback = root.querySelector<HTMLElement>("#server-form-feedback");

  if (!modal || !title || !idInput || !nameInput || !realmlistInput || !pathInput) return;

  modal.hidden = false;
  if (feedback) setFormFeedback(feedback, "", "");

  if (mode === "edit" && server) {
    title.textContent = t("realmlistView.formEdit");
    idInput.value = server.id;
    nameInput.value = server.name;
    realmlistInput.value = server.realmlist;
    if (descInput) descInput.value = server.description ?? "";
    pathInput.value = server.gamePath ?? "";
  } else {
    title.textContent = t("realmlistView.formAdd");
    idInput.value = "";
    nameInput.value = "";
    realmlistInput.value = "";
    if (descInput) descInput.value = "";
    pathInput.value = "";
  }

  nameInput.focus();
}

function closeForm(root: HTMLElement): void {
  const modal = root.querySelector<HTMLElement>("#server-form-modal");
  if (modal) modal.hidden = true;
}

let pendingDeleteId: string | null = null;

function openDeleteDialog(root: HTMLElement, server: ServerProfile): void {
  const dialog = root.querySelector<HTMLElement>("#server-delete-dialog");
  const message = root.querySelector<HTMLElement>("#server-delete-message");
  if (!dialog || !message) return;

  pendingDeleteId = server.id;
  message.textContent = t("realmlistView.deleteConfirm", { name: server.name });
  dialog.hidden = false;
}

function closeDeleteDialog(root: HTMLElement): void {
  const dialog = root.querySelector<HTMLElement>("#server-delete-dialog");
  if (dialog) dialog.hidden = true;
  pendingDeleteId = null;
}

export function bindServersView(root: HTMLElement): void {
  bindRealmlist(root);
  void refreshServerLists(root);

  const refresh = (): void => {
    void refreshServerLists(root);
  };

  window.addEventListener(UI_LOCALE_CHANGED_EVENT, refresh);

  window.addEventListener(ACTIVE_SERVER_CHANGED_EVENT, refresh);
  window.addEventListener(SERVERS_UPDATED_EVENT, refresh);

  root.querySelector("#btn-add-server")?.addEventListener("click", () => {
    openForm(root, "add");
  });

  root.querySelector("#server-form-cancel")?.addEventListener("click", () => {
    closeForm(root);
  });

  root.querySelector("#server-form-close")?.addEventListener("click", () => {
    closeForm(root);
  });

  root.querySelector("#server-form-backdrop")?.addEventListener("click", () => {
    closeForm(root);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const modal = root.querySelector<HTMLElement>("#server-form-modal");
    if (modal && !modal.hidden) closeForm(root);
  });

  root.querySelector("#server-delete-cancel")?.addEventListener("click", () => {
    closeDeleteDialog(root);
  });

  root.querySelector("#server-delete-backdrop")?.addEventListener("click", () => {
    closeDeleteDialog(root);
  });

  root.querySelector("#server-delete-confirm")?.addEventListener("click", () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    closeDeleteDialog(root);

    void deleteUserServer(id).then((error) => {
      if (error) {
        pendingDeleteId = id;
        const message = root.querySelector<HTMLElement>("#server-delete-message");
        const dialog = root.querySelector<HTMLElement>("#server-delete-dialog");
        if (message && dialog) {
          message.textContent = error;
          dialog.hidden = false;
        }
        return;
      }
      refresh();
    });
  });

  root.querySelector("#server-form-browse")?.addEventListener("click", () => {
    const pathInput = root.querySelector<HTMLInputElement>("#server-form-game-path");
    const feedback = root.querySelector<HTMLElement>("#server-form-feedback");
    if (!pathInput || !feedback) return;

    browseServerGamePath(pathInput.value)
      .then((path) => {
        if (path) pathInput.value = path;
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "No se pudo seleccionar el archivo.";
        setFormFeedback(feedback, message, "error");
      });
  });

  root.querySelector("#server-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const feedback = root.querySelector<HTMLElement>("#server-form-feedback");
    const idInput = root.querySelector<HTMLInputElement>("#server-form-id");
    const nameInput = root.querySelector<HTMLInputElement>("#server-form-name");
    const realmlistInput = root.querySelector<HTMLInputElement>("#server-form-realmlist");
    const descInput = root.querySelector<HTMLInputElement>("#server-form-description");
    const pathInput = root.querySelector<HTMLInputElement>("#server-form-game-path");

    if (!feedback || !nameInput || !realmlistInput || !pathInput) return;

    const payload = {
      name: nameInput.value,
      realmlist: realmlistInput.value,
      description: descInput?.value,
      gamePath: pathInput.value.trim() || null,
    };

    const savePromise = idInput?.value
      ? updateUserServer(idInput.value, payload)
      : addUserServer(payload);

    void savePromise.then((error) => {
      if (error) {
        setFormFeedback(feedback, error, "error");
        return;
      }
      closeForm(root);
      refresh();
    });
  });

  root.querySelector("#servers-list-presets")?.addEventListener("click", handleListClick(root));
  root.querySelector("#servers-list-user")?.addEventListener("click", handleListClick(root));
}

function handleListClick(root: HTMLElement) {
  return async (event: Event): Promise<void> => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;

    const li = target.closest<HTMLElement>(".server-item");
    const serverId = li?.dataset.serverId;
    if (!serverId) return;

    const action = target.dataset.action;
    const servers = await listAllServers();
    const server = servers.find((item) => item.id === serverId);

    if (action === "activate") {
      await activateServer(serverId);
      return;
    }

    if (!server || server.preset) return;

    if (action === "edit") {
      event.stopPropagation();
      openForm(root, "edit", server);
      return;
    }

    if (action === "delete") {
      event.stopPropagation();
      openDeleteDialog(root, server);
    }
  };
}

export async function getServersListSummary(): Promise<string> {
  const servers = await listAllServers();
  const activeId = await getActiveServerId();
  const lines = servers.map((server) => {
    const tags = [
      server.preset ? "preset" : "usuario",
      server.id === activeId ? "ACTIVO" : "",
    ]
      .filter(Boolean)
      .join(", ");
    return `- ${server.name} (${tags}) → ${formatRealmlistCommand(server.realmlist)}`;
  });
  return lines.join("\n");
}
