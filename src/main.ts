import { bindApp, renderApp } from "./ui/app";
import { getActiveServerId, initUserStore } from "./config/store";
import { initUiLocale } from "./i18n";

window.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) return;

  void initUserStore()
    .then(() => initUiLocale())
    .then(() => getActiveServerId())
    .then(() =>
      renderApp().then((html) => {
        root.innerHTML = html;
        bindApp(root);
      }),
    );
});
