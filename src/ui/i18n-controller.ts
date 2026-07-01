import { applyI18n } from "../i18n";
import { refreshAddonsI18n, refreshAddonsView } from "./addons-view";
import { refreshModsI18n, refreshModsView } from "./mods-view";
import { refreshKeybindsI18n } from "./keybinds-view";
import { refreshHeroI18n } from "./hero";
import { refreshHomeServerSelector } from "./home-server-selector";
import { refreshRealmlistI18n } from "../features/realmlist";
import { refreshServersI18n, refreshServerLists } from "./servers-view";
import { refreshUpdateSettingsI18n, refreshUpdateUi } from "./update-ui";
import { refreshSettingsI18n } from "../features/settings";
import { refreshTitlebarI18n } from "./titlebar";
import { UI_LOCALE_CHANGED_EVENT } from "../i18n";

/** Refresco central de textos al cambiar idioma. */

export function refreshAllI18n(root: HTMLElement): void {
  applyI18n(root);
  refreshHeroI18n(root);
  refreshHomeServerSelector(root);
  refreshRealmlistI18n(root);
  refreshServersI18n(root);
  void refreshServerLists(root);
  refreshAddonsI18n(root);
  void refreshAddonsView(root);
  refreshModsI18n(root);
  void refreshModsView(root);
  refreshKeybindsI18n(root);
  refreshSettingsI18n(root);
  refreshUpdateSettingsI18n(root);
  refreshUpdateUi(root);
  refreshTitlebarI18n(root);
}

export function bindI18n(root: HTMLElement): void {
  refreshAllI18n(root);

  window.addEventListener(UI_LOCALE_CHANGED_EVENT, () => {
    refreshAllI18n(root);
  });
}
