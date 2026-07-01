/** Navegación portada ↔ secciones. */

import { setShellViewMode } from "./sidebar";

export type AppView = "home" | "servers" | "addons" | "mods" | "keybinds" | "settings";

const VIEW_IDS: Record<AppView, string> = {
  home: "view-home",
  servers: "view-servers",
  addons: "view-addons",
  mods: "view-mods",
  keybinds: "view-keybinds",
  settings: "view-settings",
};

export function showView(root: HTMLElement, view: AppView): void {
  root.querySelectorAll<HTMLElement>(".app-view").forEach((el) => {
    el.classList.remove("app-view--active");
    el.hidden = true;
  });

  const targetId = VIEW_IDS[view];
  const target = root.querySelector<HTMLElement>(`#${targetId}`);
  if (target) {
    target.classList.add("app-view--active");
    target.hidden = false;
  }

  setSettingsNavActive(root, view === "settings");
  setShellViewMode(root, view);
}

export function navigateToHome(root: HTMLElement): void {
  showView(root, "home");
}

export function bindNavigation(root: HTMLElement): void {
  showView(root, "home");
  setShellViewMode(root, "home");

  root.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((button) => {
    const view = button.dataset.nav as AppView | undefined;
    if (!view || view === "settings") return;

    button.addEventListener("click", () => {
      showView(root, view);
    });
  });
}

export function navigateToServers(root: HTMLElement): void {
  showView(root, "servers");
}

export function navigateToAddons(root: HTMLElement): void {
  showView(root, "addons");
}

export function navigateToSettings(root: HTMLElement): void {
  showView(root, "settings");
}

export function setSettingsNavActive(root: HTMLElement, active: boolean): void {
  root.querySelector<HTMLElement>("#btn-settings")?.classList.toggle("active", active);
}
