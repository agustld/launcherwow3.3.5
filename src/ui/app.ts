import { bindSettings } from "../features/settings";
import { bindLaunchButton } from "../features/launch";
import { renderHero, bindHero } from "./hero";
import { bindAddonsView, renderAddonsView } from "./addons-view";
import { bindModsView, renderModsView } from "./mods-view";
import { bindKeybindsView, renderKeybindsView } from "./keybinds-view";
import { bindNavigation } from "./navigation";
import { renderSidebar, bindSidebar } from "./sidebar";
import { bindHomeServerSelector } from "./home-server-selector";
import { bindServersView, renderServersView } from "./servers-view";
import { renderSettingsView } from "./settings-view";
import { renderTitlebar, bindTitlebar } from "./titlebar";
import {
  bindUpdateUi,
  renderCriticalUpdateModal,
  renderUpdateBanner,
  renderUpdateProgressOverlay,
  triggerStartupUpdateCheck,
} from "./update-ui";
import { bindI18n } from "./i18n-controller";

/** Compositor principal de la interfaz. */

export async function renderApp(): Promise<string> {
  return `
    <div class="app-shell theme-classic">
      <div class="main-column">
        ${renderTitlebar()}
        ${renderUpdateBanner()}
        <div class="app-views">
          <div id="view-home" class="app-view app-view--active" data-view="home">
            <div class="portada-bg" aria-hidden="true"></div>
            <div class="home-layout">
              ${renderHero()}
            </div>
          </div>
          ${renderServersView()}
          ${renderAddonsView()}
          ${renderModsView()}
          ${renderKeybindsView()}
          ${renderSettingsView()}
        </div>
      </div>
      ${renderSidebar()}
      ${renderUpdateProgressOverlay()}
      ${renderCriticalUpdateModal()}
    </div>
  `;
}

export function bindApp(root: HTMLElement): void {
  bindTitlebar(root);
  bindSidebar(root);
  bindHomeServerSelector(root);
  bindLaunchButton(root);
  bindNavigation(root);
  bindHero(root);
  bindServersView(root);
  bindAddonsView(root);
  bindModsView(root);
  bindKeybindsView(root);
  bindSettings(root);
  bindUpdateUi(root);
  bindI18n(root);
  void triggerStartupUpdateCheck(root);
}
