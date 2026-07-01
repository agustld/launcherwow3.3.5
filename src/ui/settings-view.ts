import { renderBackButton } from "./back-nav";

/** Vista de ajustes a pantalla completa (misma lógica que el drawer anterior). */

export function renderSettingsView(): string {
  return `
    <section class="settings-view app-view" id="view-settings" hidden>
      <header class="settings-view-header view-section-header">
        <h2 class="settings-view-title" data-i18n="settings.title">Ajustes</h2>
        <p class="settings-view-subtitle" data-i18n="settings.subtitle">Ruta del cliente, idioma y comportamiento del launcher.</p>
      </header>

      <form class="settings-form settings-view-form" id="settings-form">

        <!-- ── Tarjeta: Cliente ── -->
        <div class="settings-card">
          <div class="settings-card-header">
            <svg class="settings-card-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 15v2m6-2v2M5 17h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span class="settings-card-title" data-i18n="settings.clientSection">Cliente</span>
          </div>

          <div class="settings-field">
            <label class="settings-label" for="settings-game-path" data-i18n="settings.gamePath">Ruta global del cliente (WoW.exe)</label>
            <div class="settings-row">
              <input
                id="settings-game-path"
                class="settings-input"
                type="text"
                placeholder="C:\\Juegos\\WoW 3.3.5a\\WoW.exe"
                autocomplete="off"
                spellcheck="false"
              />
              <button type="button" class="btn-browse" id="settings-browse" data-i18n="settings.browse">Buscar…</button>
            </div>
            <p class="settings-hint" data-i18n="settings.gamePathHint">Usada cuando el servidor activo no define su propia ruta.</p>
          </div>

          <div class="settings-divider"></div>

          <div class="settings-field">
            <label class="settings-label" for="settings-client-locale" data-i18n="settings.clientLocale">Idioma del cliente</label>
            <div class="settings-locale-row">
              <select id="settings-client-locale" class="settings-input">
                <option value="" data-i18n="settings.localeChoose">— Elegir idioma —</option>
              </select>
              <button type="button" class="btn-browse settings-locale-detect" id="settings-detect-locale" data-i18n="settings.detectLocale">
                Detectar
              </button>
            </div>
            <p class="settings-locale-notice" id="settings-locale-notice" hidden></p>
            <p class="settings-hint" data-i18n="settings.clientLocaleHint">Se detecta escaneando Data/&lt;locale&gt;/ (locale-XXXX.MPQ + realmlist.wtf).</p>
          </div>
        </div>

        <!-- ── Tarjeta: Comportamiento ── -->
        <div class="settings-card">
          <div class="settings-card-header">
            <svg class="settings-card-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M5.05 5.05l1.06 1.06M13.89 13.89l1.06 1.06M14.95 5.05l-1.06 1.06M6.11 13.89l-1.06 1.06" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span class="settings-card-title" data-i18n="settings.behavior">Comportamiento</span>
          </div>

          <div class="settings-field">
            <label class="settings-label" for="settings-ui-lang" data-i18n="settings.uiLanguage">Idioma del launcher</label>
            <select id="settings-ui-lang" class="settings-input settings-input--select" data-i18n-aria="settings.uiLanguageAria">
              <option value="es" data-i18n="settings.langEs">Español</option>
              <option value="en" data-i18n="settings.langEn">English</option>
            </select>
            <p class="settings-hint" data-i18n="settings.uiLanguageHint">Por defecto usa el idioma de Windows la primera vez que abrís el launcher.</p>
          </div>

          <div class="settings-divider"></div>

          <label class="settings-toggle">
            <input type="checkbox" id="settings-autostart" />
            <span class="settings-toggle-ui" aria-hidden="true"></span>
            <span class="settings-toggle-text">
              <span class="settings-toggle-label" data-i18n="settings.autostart">Iniciar con Windows</span>
              <span class="settings-toggle-hint" data-i18n="settings.autostartHint">Abre el launcher al encender el PC.</span>
            </span>
          </label>

          <label class="settings-toggle">
            <input type="checkbox" id="settings-minimize-tray" />
            <span class="settings-toggle-ui" aria-hidden="true"></span>
            <span class="settings-toggle-text">
              <span class="settings-toggle-label" data-i18n="settings.minimizeTray">Minimizar a la bandeja al cerrar</span>
              <span class="settings-toggle-hint" data-i18n="settings.minimizeTrayHint">La X oculta el launcher; salí desde el icono de la bandeja.</span>
            </span>
          </label>
        </div>

        <!-- ── Tarjeta: Actualizaciones ── -->
        <div class="settings-card">
          <div class="settings-card-header">
            <svg class="settings-card-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 3a7 7 0 100 14A7 7 0 0010 3z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 7v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="settings-card-title" data-i18n="settings.updatesTitle">Actualizaciones</span>
            <div class="settings-version-badge">
              <span class="settings-version-label" data-i18n="settings.currentVersion">v</span><span class="settings-version-value" id="settings-app-version">—</span>
            </div>
          </div>

          <div class="settings-update-card" id="settings-update-status" hidden></div>

          <button
            type="button"
            class="btn-check-updates"
            id="settings-check-updates"
            data-i18n="settings.checkUpdates"
          >
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
              <path d="M13.5 8A5.5 5.5 0 112.5 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M13.5 4v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Buscar actualizaciones
          </button>

          <label class="settings-toggle">
            <input type="checkbox" id="settings-check-updates-start" />
            <span class="settings-toggle-ui" aria-hidden="true"></span>
            <span class="settings-toggle-text">
              <span class="settings-toggle-label" data-i18n="settings.checkUpdatesOnStart">Buscar actualizaciones al iniciar</span>
              <span class="settings-toggle-hint" data-i18n="settings.checkUpdatesOnStartHint">Comprueba si hay una versión nueva al abrir el launcher.</span>
            </span>
          </label>
        </div>

        <p class="settings-feedback" id="settings-feedback" aria-live="polite"></p>

        <button type="submit" class="btn-save-settings" id="settings-save" data-i18n="settings.save">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
            <path d="M13 4.5L6.5 11 3 7.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Guardar ajustes
        </button>

        ${renderBackButton()}
      </form>
    </section>
  `;
}
