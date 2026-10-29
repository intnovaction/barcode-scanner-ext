import { MensajeFondo, MensajeWidget } from "./comun/mensajes.js";
import { inyectarWidget, sincronizarWidget, sitiosAutorizados } from "./comun/sitios.js";

// Al instalar o recargar la extensión: registrar el widget y montarlo en las pestañas ya abiertas
chrome.runtime.onInstalled.addListener(async () => {
  await sincronizarWidget();
  await inyectarWidget(await sitiosAutorizados());
});

chrome.permissions.onAdded.addListener(async ({ origins = [] }) => {
  await sincronizarWidget();
  await inyectarWidget(origins);
});

chrome.permissions.onRemoved.addListener(async ({ origins = [] }) => {
  await sincronizarWidget();
  // Sin permiso ya no se puede consultar la URL de esas pestañas: se avisa a todas y cada widget
  // decide si su sitio está entre los retirados
  const mensaje: MensajeWidget = { tipo: "permisos-retirados", origenes: origins };
  for (const tab of await chrome.tabs.query({})) {
    if (tab.id !== undefined) chrome.tabs.sendMessage(tab.id, mensaje).catch(() => { });
  }
});

// Atajo "Leer siguiente": lo hace el widget de la pestaña, sin sacar el foco de la página
chrome.commands.onCommand.addListener((comando, tab) => {
  if (comando !== "leer-siguiente" || tab?.id === undefined) return;
  const tabId = tab.id;
  const mensaje: MensajeWidget = { tipo: "leer-siguiente" };
  chrome.tabs.sendMessage(tabId, mensaje).catch(() => avisarSinWidget(tabId));
});

// No hay widget en la pestaña (sitio sin autorizar o página no compatible): "!" en el icono
function avisarSinWidget(tabId: number): void {
  chrome.action.setBadgeBackgroundColor({ color: "#dc2626", tabId });
  chrome.action.setBadgeText({ text: "!", tabId });
  chrome.action.setTitle({ title: "Esta página no está autorizada: pulsa aquí para autorizarla", tabId });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "", tabId }).catch(() => { });
    chrome.action.setTitle({ title: "", tabId }).catch(() => { });
  }, 3000);
}

chrome.runtime.onMessage.addListener((mensaje: MensajeFondo, _remitente, responder) => {
  if (mensaje.tipo === "abrir-opciones") {
    chrome.runtime.openOptionsPage();
  } else if (mensaje.tipo === "pedir-atajo") {
    chrome.commands.getAll().then(comandos =>
      responder(comandos.find(c => c.name === "leer-siguiente")?.shortcut ?? ""));
    // Respuesta asíncrona: mantiene abierto el canal hasta llamar a responder
    return true;
  }
});
