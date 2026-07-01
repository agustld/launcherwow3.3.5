import { invoke } from "@tauri-apps/api/core";
import { getGameDirFromExe } from "../config/path";
import {
  getActiveServer,
  getConfig,
  resolveServerGamePath,
  saveConfig,
  setActiveServerId,
} from "../config/store";
import { t } from "../i18n";
import { navigateToServers } from "../ui/navigation";
import { motionDelayMs } from "../ui/motion";
import {
  applyStatusLine,
  applyUserError,
  fromInvokeError,
  getLaunchErrors,
  getServerErrors,
} from "../ui/status-message";
import { applyRealmlist } from "./realmlist";
import { promptOpenSettings } from "./settings";
const VERIFY_MS = 450;
const STARTING_MS = 350;

export function renderLaunchButton(): string {
  return `
    <div class="btn-play-state" id="btn-play-state">
      <button type="button" class="btn-play" id="btn-play" data-i18n-aria="hero.playAria">
        JUGAR
      </button>
      <button type="button" class="btn-browse-wow" id="btn-browse-wow">
        Buscar ubicación
      </button>
    </div>
  `;
}

export function renderLaunchStatus(): string {
  return `
    <p class="launch-status-line" id="launch-status-line" aria-live="polite"></p>
  `;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function launchGame(appRoot: HTMLElement): Promise<void> {
  const button = appRoot.querySelector<HTMLButtonElement>("#btn-play");
  const statusLine = appRoot.querySelector<HTMLElement>("#launch-status-line");
  const LAUNCH_ERRORS = getLaunchErrors();
  const SERVER_ERRORS = getServerErrors();

  if (!button || !statusLine) return;

  const [config, activeServer] = await Promise.all([
    getConfig(),
    getActiveServer(),
  ]);

  if (!activeServer) {
    applyUserError(statusLine, SERVER_ERRORS.noActive);
    navigateToServers(appRoot);
    return;
  }

  const gamePath = resolveServerGamePath(activeServer, config.game_path);

  if (!gamePath) {
    applyUserError(statusLine, {
      ...LAUNCH_ERRORS.missingGamePath,
      hint: activeServer.gamePath
        ? LAUNCH_ERRORS.missingGamePathServerHint
        : LAUNCH_ERRORS.missingGamePath.hint,
    });
    if (activeServer.gamePath) {
      navigateToServers(appRoot);
    } else {
      promptOpenSettings(appRoot);
    }
    return;
  }

  button.disabled = true;
  applyStatusLine(statusLine, t("launch.verifying"), "pending");

  await delay(motionDelayMs(VERIFY_MS));

  try {
    const gameDir = getGameDirFromExe(gamePath);

    await applyRealmlist(gameDir, activeServer.realmlist);

    applyStatusLine(statusLine, t("launch.starting"), "pending");
    await delay(motionDelayMs(STARTING_MS));

    await invoke<void>("launch_game", { gamePath });
    await setActiveServerId(activeServer.id);
    applyStatusLine(statusLine, t("launch.started"), "ok");
    window.setTimeout(() => {
      applyStatusLine(statusLine, "", "idle");
    }, motionDelayMs(2500));
  } catch (error) {
    applyUserError(
      statusLine,
      fromInvokeError(error, LAUNCH_ERRORS.genericLaunch),
    );
  } finally {
    button.disabled = false;
  }
}

// ── Bind ───────────────────────────────────────────────────────────────────

export function bindLaunchButton(root: HTMLElement): void {
  const appRoot = root.closest<HTMLElement>("#app") ?? root;

  root.querySelector<HTMLButtonElement>("#btn-play")?.addEventListener("click", () => {
    void launchGame(appRoot);
  });

  root.querySelector<HTMLButtonElement>("#btn-browse-wow")?.addEventListener("click", () => {
    void (async () => {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        title: "Seleccionar WoW.exe",
        filters: [{ name: "World of Warcraft", extensions: ["exe"] }],
        multiple: false,
        directory: false,
      });
      if (typeof selected === "string" && selected) {
        const config = await getConfig();
        await saveConfig({ ...config, game_path: selected });
      }
    })();
  });
}
