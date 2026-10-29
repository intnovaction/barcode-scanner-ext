import { Ajustes, AJUSTES_POR_DEFECTO, cargarAjustes, cargarIndice, guardarAjustes, guardarIndice, listaCodigos } from "../comun/ajustes.js";
import { patronDesdeTexto, sitiosAutorizados } from "../comun/sitios.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO };

const mensajeError = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ---------- Sitios autorizados ----------

function mostrarErrorSitio(mensaje: string): void {
  const error = $("error-sitio");
  error.textContent = mensaje;
  error.hidden = false;
}

function anadirSitio(): void {
  const input = $("nuevo-sitio") as HTMLInputElement;
  const patron = patronDesdeTexto(input.value);
  if (!patron) {
    mostrarErrorSitio("URL no válida (solo http o https)");
    return;
  }
  $("error-sitio").hidden = true;
  // permissions.request exige gesto del usuario: se llama directamente en el clic, sin awaits antes
  chrome.permissions.request({ origins: [patron] })
    .then(concedido => {
      if (concedido) input.value = "";
      else mostrarErrorSitio("Permiso no concedido para " + patron.replace("/*", ""));
    })
    .catch(e => mostrarErrorSitio("No se pudo añadir: " + mensajeError(e)))
    .finally(pintarSitios);
}

async function pintarSitios(): Promise<void> {
  const origenes = await sitiosAutorizados();
  // Los declarados en host_permissions del manifest son obligatorios: Chrome no deja quitarlos
  const fijos = new Set(chrome.runtime.getManifest().host_permissions ?? []);
  const ul = $("sitios");
  ul.replaceChildren();
  if (origenes.length === 0) {
    const li = document.createElement("li");
    li.className = "vacio";
    li.textContent = "Ningún sitio autorizado";
    ul.append(li);
  }
  origenes.forEach(patron => {
    const li = document.createElement("li");
    const texto = document.createElement("span");
    texto.textContent = patron.replace("/*", "");
    if (fijos.has(patron)) {
      const fijo = document.createElement("span");
      fijo.className = "fijo";
      fijo.title = "Declarado en host_permissions del manifest";
      fijo.textContent = "Fijo";
      li.append(texto, fijo);
    } else {
      const quitar = document.createElement("button");
      quitar.type = "button";
      quitar.textContent = "Quitar";
      quitar.addEventListener("click", () => {
        $("error-sitio").hidden = true;
        chrome.permissions.remove({ origins: [patron] })
          .catch(e => mostrarErrorSitio("No se pudo quitar: " + mensajeError(e)))
          .finally(pintarSitios);
      });
      li.append(texto, quitar);
    }
    ul.append(li);
  });
}

// ---------- Pintado ----------

async function pintarPosicion(): Promise<void> {
  const total = listaCodigos(ajustes.codigos).length;
  const indice = (await cargarIndice()) % Math.max(1, total);
  $("posicion").textContent = total ? `Siguiente: ${indice + 1} de ${total}` : "Sin códigos";
}

// El atajo lo puede cambiar el usuario en chrome://extensions/shortcuts: se muestra el real
async function pintarAtajo(): Promise<void> {
  const atajo = (await chrome.commands.getAll()).find(c => c.name === "leer-siguiente")?.shortcut;
  const p = $("atajo");
  if (atajo) {
    const kbd = document.createElement("kbd");
    kbd.textContent = atajo;
    p.replaceChildren(kbd);
  } else {
    p.textContent = "Sin atajo asignado.";
  }
}

function pintarAjustes(): void {
  ($("texto-codigos") as HTMLTextAreaElement).value = ajustes.codigos;
  ($("selector") as HTMLInputElement).value = ajustes.selector;
  ($("retardo-min") as HTMLInputElement).value = String(ajustes.retardoMin);
  ($("retardo-max") as HTMLInputElement).value = String(ajustes.retardoMax);
  ($("pausa-inicial") as HTMLInputElement).value = String(ajustes.pausaInicial);
  ($("enviar-enter") as HTMLInputElement).checked = ajustes.enviarEnter;
  ($("sonido") as HTMLInputElement).checked = ajustes.sonido;
  ($("mostrar-widget") as HTMLInputElement).checked = ajustes.mostrarWidget;
}

async function cambiar(cambios: Partial<Ajustes>): Promise<void> {
  ajustes = { ...ajustes, ...cambios };
  await guardarAjustes(cambios);
}

// ---------- Arranque ----------

function enlazarEventos(): void {
  $("anadir-sitio").addEventListener("click", anadirSitio);
  $("nuevo-sitio").addEventListener("keydown", e => { if (e.key === "Enter") anadirSitio(); });

  $("texto-codigos").addEventListener("input", e => {
    cambiar({ codigos: (e.target as HTMLTextAreaElement).value }).then(pintarPosicion);
  });
  $("reiniciar-posicion").addEventListener("click", () => guardarIndice(0));
  $("selector").addEventListener("change", e => cambiar({ selector: (e.target as HTMLInputElement).value.trim() }));

  const numero = (id: string, clave: "retardoMin" | "retardoMax" | "pausaInicial") =>
    $(id).addEventListener("change", e => {
      const valor = Math.max(0, Number((e.target as HTMLInputElement).value) || 0);
      cambiar({ [clave]: valor });
    });
  numero("retardo-min", "retardoMin");
  numero("retardo-max", "retardoMax");
  numero("pausa-inicial", "pausaInicial");

  const casilla = (id: string, clave: "enviarEnter" | "sonido" | "mostrarWidget") =>
    $(id).addEventListener("change", e => cambiar({ [clave]: (e.target as HTMLInputElement).checked }));
  casilla("enviar-enter", "enviarEnter");
  casilla("sonido", "sonido");
  casilla("mostrar-widget", "mostrarWidget");

  $("restablecer").addEventListener("click", async () => {
    // Se conservan los códigos: solo se restablecen los ajustes
    await cambiar({ ...AJUSTES_POR_DEFECTO, codigos: ajustes.codigos });
    pintarAjustes();
  });

  // Cambios hechos desde el popup o el widget (posición de lectura, mostrar widget)
  chrome.storage.onChanged.addListener((cambios, area) => {
    if (area !== "local") return;
    if (cambios.indiceSiguiente) pintarPosicion();
    if (cambios.mostrarWidget) {
      ajustes.mostrarWidget = cambios.mostrarWidget.newValue as boolean;
      ($("mostrar-widget") as HTMLInputElement).checked = ajustes.mostrarWidget;
    }
  });
  chrome.permissions.onAdded.addListener(pintarSitios);
  chrome.permissions.onRemoved.addListener(pintarSitios);
}

(async () => {
  ajustes = await cargarAjustes();
  pintarAjustes();
  pintarAtajo();
  pintarPosicion();
  enlazarEventos();
  await pintarSitios();
})();
