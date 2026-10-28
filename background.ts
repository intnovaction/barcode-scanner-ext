import { cargarAjustes, cargarIndice, guardarIndice, listaCodigos } from "./sidepanel/lib/ajustes.js";
import { leerEnPestana, ResultadoLectura } from "./sidepanel/lib/inyeccion.js";
import { avisarPanel } from "./sidepanel/lib/mensajes.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Atajo "Leer siguiente": lee sin sacar el foco de la página, así la aplicación puede mover el
// foco tras la lectura (p. ej. a una cantidad) y se sigue tecleando en ella sin hacer clic.
let leyendo = false;

chrome.commands.onCommand.addListener(async (comando, tab) => {
  if (comando !== "leer-siguiente" || leyendo || tab?.id === undefined) return;

  const ajustes = await cargarAjustes();
  const lista = listaCodigos(ajustes.codigos);
  if (lista.length === 0) return;
  const indice = (await cargarIndice()) % lista.length;
  const codigo = lista[indice];

  const fin = (resultado: ResultadoLectura, siguiente: number) =>
    avisarPanel({ tipo: "lectura-fin", indice, siguiente, resultado });

  if (!(await tienePermiso(tab.url))) {
    fin({ ok: false, mensaje: "Autoriza primero este sitio" }, indice);
    return;
  }

  leyendo = true;
  try {
    avisarPanel({ tipo: "lectura-inicio", indice, codigo });
    const resultado = await leerEnPestana(tab.id, codigo, ajustes);
    const siguiente = resultado.ok ? (indice + 1) % lista.length : indice;
    await guardarIndice(siguiente);
    fin(resultado, siguiente);
  } catch (e) {
    fin({ ok: false, mensaje: e instanceof Error ? e.message : String(e) }, indice);
  } finally {
    leyendo = false;
  }
});

async function tienePermiso(url: string | undefined): Promise<boolean> {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return await chrome.permissions.contains({ origins: [`${u.protocol}//${u.hostname}/*`] });
  } catch {
    return false;
  }
}
