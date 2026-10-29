// Popup del icono: autorizar o quitar el sitio de la pestaña activa y mostrar u ocultar el widget.
// La URL de la pestaña se ve gracias a activeTab (se concede al abrir el popup).

import { cargarAjustes, guardarAjustes } from "../comun/ajustes.js";
import { MensajeWidget } from "../comun/mensajes.js";
import { patronDeUrl } from "../comun/sitios.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let patron: string | null = null;
let pestanaId: number | undefined;

async function pintarSitio(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  pestanaId = tab?.id;
  patron = patronDeUrl(tab?.url);
  const autorizado = patron ? await chrome.permissions.contains({ origins: [patron] }) : false;

  $("pestana").textContent = tab?.url ? (patron ? new URL(tab.url).host : "Página no compatible") : "Sin pestaña activa";
  const estado = $("estado-sitio");
  estado.className = "estado-sitio " + (autorizado ? "ok" : "no");
  estado.textContent = !patron
    ? "La pistola solo funciona en páginas web normales, no en las internas del navegador."
    : autorizado
      ? "Página autorizada: la pistola aparece en ella."
      : "Esta página no está autorizada.";
  $("autorizar").hidden = !patron || autorizado;
  $("quitar").hidden = !patron || !autorizado;
  $("elegir-campo").hidden = !patron || !autorizado;
}

function mostrarError(e: unknown): void {
  const error = $("error");
  error.textContent = e instanceof Error ? e.message : String(e);
  error.hidden = false;
}

// El atajo lo puede cambiar el usuario en chrome://extensions/shortcuts: se muestra el real
async function pintarAtajo(): Promise<void> {
  const atajo = (await chrome.commands.getAll()).find(c => c.name === "leer-siguiente")?.shortcut;
  const p = $("atajo");
  if (atajo) {
    const kbd = document.createElement("kbd");
    kbd.textContent = atajo;
    p.append("Para disparar con el teclado: ", kbd);
  } else {
    p.textContent = "No hay atajo de teclado. Puedes ponerlo en chrome://extensions/shortcuts";
  }
}

// permissions.request exige gesto del usuario: se llama directamente en el clic, sin awaits antes.
// Si el popup se cierra al salir el diálogo de permiso, el background registra e inyecta el widget.
$("autorizar").addEventListener("click", () => {
  if (!patron) return;
  chrome.permissions.request({ origins: [patron] }).catch(mostrarError).finally(pintarSitio);
});

// Lo hace el widget de la página; el popup se cierra para dejar hacer clic en ella
$("elegir-campo").addEventListener("click", async () => {
  if (pestanaId === undefined) return;
  try {
    await chrome.tabs.sendMessage<MensajeWidget>(pestanaId, { tipo: "elegir-campo" });
    window.close();
  } catch {
    mostrarError("La pistola no está en esta página. Recarga la página y vuelve a probar.");
  }
});

$("quitar").addEventListener("click", () => {
  if (!patron) return;
  chrome.permissions.remove({ origins: [patron] }).catch(mostrarError).finally(pintarSitio);
});

$("mostrar-widget").addEventListener("change", e =>
  guardarAjustes({ mostrarWidget: (e.target as HTMLInputElement).checked }));

$("opciones").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

(async () => {
  ($("mostrar-widget") as HTMLInputElement).checked = (await cargarAjustes()).mostrarWidget;
  pintarAtajo();
  await pintarSitio();
})();
