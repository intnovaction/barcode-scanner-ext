// Sitios autorizados: patrones de permiso y registro del widget en ellos.

const ID_WIDGET = "widget";
const CARGADOR_WIDGET = "widget/cargador.js";

// Patrón de permiso del host de una URL. Las match patterns no llevan puerto: el permiso vale para
// cualquier puerto y ruta del host. null si no es http(s).
export function patronDeUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol}//${u.hostname}/*`;
  } catch {
    return null;
  }
}

// "localhost:5002", "https://mi-app.com/ruta"... → "https://localhost/*" (sin protocolo, https)
export function patronDesdeTexto(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  return patronDeUrl(/^[a-z]+:\/\//i.test(limpio) ? limpio : "https://" + limpio);
}

export async function sitiosAutorizados(): Promise<string[]> {
  const { origins = [] } = await chrome.permissions.getAll();
  return origins.sort();
}

// Registra el widget como content script en todos los sitios autorizados. Se encadenan las
// llamadas: dos registros simultáneos con el mismo id fallarían.
let sincronizacion: Promise<void> = Promise.resolve();

export function sincronizarWidget(): Promise<void> {
  sincronizacion = sincronizacion.catch(() => { }).then(async () => {
    const origenes = await sitiosAutorizados();
    const registrados = await chrome.scripting.getRegisteredContentScripts({ ids: [ID_WIDGET] });
    if (registrados.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [ID_WIDGET] });
    if (origenes.length > 0) {
      await chrome.scripting.registerContentScripts([{
        id: ID_WIDGET,
        js: [CARGADOR_WIDGET],
        matches: origenes,
        runAt: "document_idle",
      }]);
    }
  });
  return sincronizacion;
}

// El content script registrado solo entra en las páginas que se cargan después: en las que ya
// están abiertas se inyecta a mano (el widget no se monta dos veces)
export async function inyectarWidget(origenes: string[]): Promise<void> {
  if (origenes.length === 0) return;
  const pestanas = await chrome.tabs.query({ url: origenes });
  await Promise.all(pestanas.map(tab => tab.id === undefined
    ? Promise.resolve()
    : chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [CARGADOR_WIDGET] }).catch(() => { })));
}
