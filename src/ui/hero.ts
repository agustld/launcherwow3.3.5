import { HERO_ASSETS } from "../config/hero-assets";
import type { AppView } from "./navigation";

const PUZZLE_ICON = `<path d="M12 2 2 7l10 5 10-5-10-5Z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5" fill="none"/>`;

const EXTERNAL_ICON = `<path d="M14 3h7v7M10 14 21 3M21 14v7h-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

const QUICK_TILES: { id: AppView; icon: string; titleKey: string; descKey: string }[] = [
  {
    id: "servers",
    titleKey: "hero.quickRealmlist",
    descKey: "hero.quickRealmlistDesc",
    icon: `<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
  },
  {
    id: "addons",
    titleKey: "hero.quickAddons",
    descKey: "hero.quickAddonsDesc",
    icon: PUZZLE_ICON,
  },
  {
    id: "mods",
    titleKey: "hero.quickMods",
    descKey: "hero.quickModsDesc",
    icon: `<rect x="3" y="5" width="18" height="14" rx="1" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M7 10h10M7 14h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  },
  {
    id: "keybinds",
    titleKey: "hero.quickKeybinds",
    descKey: "hero.quickKeybindsDesc",
    icon: `<rect x="2" y="6" width="20" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M6 11h2.5M10 11h2.5M14 11h2M6 14.5h3M11.5 14.5h2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  },
];

function renderQuickTiles(): string {
  const defaults: Record<string, { title: string; desc: string }> = {
    "hero.quickRealmlist": { title: "REALMLIST", desc: "Servidores y reino activo" },
    "hero.quickAddons": { title: "ADDONS", desc: "Instalá y gestioná addons" },
    "hero.quickMods": { title: "MODS", desc: "Parches del catálogo" },
    "hero.quickKeybinds": { title: "KEYBINDS", desc: "Copiá bindeos entre cuentas" },
  };

  return QUICK_TILES.map((tile) => {
    const fallback = defaults[tile.titleKey];
    return `
      <button type="button" class="portada-card" data-nav="${tile.id}">
        <span class="portada-card-icon" aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none">${tile.icon}</svg>
        </span>
        <span class="portada-card-body">
          <span class="portada-card-title" data-i18n="${tile.titleKey}">${fallback.title}</span>
          <span class="portada-card-desc" data-i18n="${tile.descKey}">${fallback.desc}</span>
        </span>
      </button>
    `;
  }).join("");
}

export function renderHero(): string {
  return `
    <section class="portada hero hero--full">
      <div class="portada-glow" aria-hidden="true"></div>
      <div class="portada-mist" aria-hidden="true"></div>

      <header class="portada-top">
        <img
          class="portada-logo"
          src="${HERO_ASSETS.logo}"
          alt="World of Warcraft: Wrath of the Lich King"
          decoding="async"
        />
      </header>

      <div class="portada-ui-head">
        <button
          type="button"
          class="portada-addons-mods-btn"
          data-nav="addons"
          data-i18n-aria="hero.addonsModsShortcut"
        >
          <span class="portada-addons-mods-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">${PUZZLE_ICON}</svg>
          </span>
          <span class="portada-addons-mods-label" data-i18n="hero.addonsModsShortcut">Addons & Mods</span>
          <span class="portada-addons-mods-external" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">${EXTERNAL_ICON}</svg>
          </span>
        </button>
      </div>

      <div class="portada-body">
        <div class="portada-art-column" aria-hidden="true"></div>

        <div class="portada-ui-column">
          <div class="portada-panel wow-frame">
            <div class="portada-panel-header">
              <div class="portada-panel-watermark" aria-hidden="true"></div>
              <h2 class="portada-panel-title" data-i18n="hero.quickAccess">Acceso rápido</h2>
              <p class="portada-panel-subtitle" data-i18n="hero.quickAccessSub">
                Todo lo que necesitás, en un solo lugar
              </p>
            </div>
            <div class="portada-cards portada-cards--row">
              ${renderQuickTiles()}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function refreshHeroI18n(_root: HTMLElement): void {}

export function bindHero(_root: HTMLElement): void {}
