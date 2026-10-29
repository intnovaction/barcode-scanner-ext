import { Ajustes, AJUSTES_POR_DEFECTO, cargarAjustes, cargarIndice, guardarAjustes, guardarIndice, listaCodigos } from "../comun/ajustes.js";
import { patronDesdeTexto, sitiosAutorizados } from "../comun/sitios.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO };

// Último campo concreto que se eligió, para poder volver a él tras pasar a "donde esté el cursor"
const CLAVE_CAMPO_ANTERIOR = "campoAnterior";
type CampoGuardado = Pick<Ajustes, "selector" | "descripcionCampo">;
let campoAnterior: CampoGuardado | null = null;

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
    mostrarErrorSitio("Esa dirección no es válida. Escribe una dirección web, por ejemplo localhost:5002 o https://mi-app.com");
    return;
  }
  $("error-sitio").hidden = true;
  // permissions.request exige gesto del usuario: se llama directamente en el clic, sin awaits antes
  chrome.permissions.request({ origins: [patron] })
    .then(concedido => {
      if (concedido) input.value = "";
      else mostrarErrorSitio("No se ha autorizado " + patron.replace("/*", ""));
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
    li.textContent = "Todavía no hay ninguna página autorizada";
    ul.append(li);
  }
  origenes.forEach(patron => {
    const li = document.createElement("li");
    const texto = document.createElement("span");
    texto.textContent = patron.replace("/*", "");
    if (fijos.has(patron)) {
      const fijo = document.createElement("span");
      fijo.className = "fijo";
      fijo.title = "Viene autorizada de serie con la extensión";
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
    p.textContent = "No hay atajo asignado.";
  }
}

function pintarAjustes(): void {
  ($("texto-codigos") as HTMLTextAreaElement).value = ajustes.codigos;
  ($("selector") as HTMLInputElement).value = ajustes.selector;
  pintarCampo();
  ($("retardo-min") as HTMLInputElement).value = String(ajustes.retardoMin);
  ($("retardo-max") as HTMLInputElement).value = String(ajustes.retardoMax);
  ($("pausa-inicial") as HTMLInputElement).value = String(ajustes.pausaInicial);
  ($("enviar-enter") as HTMLInputElement).checked = ajustes.enviarEnter;
  ($("sonido") as HTMLInputElement).checked = ajustes.sonido;
  ($("efecto-laser") as HTMLInputElement).checked = ajustes.efectoLaser;
  ($("mostrar-widget") as HTMLInputElement).checked = ajustes.mostrarWidget;
}

function pintarCampo(): void {
  const fijo = !!ajustes.selector;
  const campo: CampoGuardado | null = fijo ? ajustes : campoAnterior;
  const nombre = campo ? campo.descripcionCampo || campo.selector : "";

  const chip = $("campo-nombre");
  chip.textContent = nombre;
  chip.hidden = !nombre;
  // El selector solo al pasar el ratón: para la mayoría basta con el nombre (también está en Avanzado)
  chip.title = campo?.selector ?? "";
  $("ayuda-fijo").textContent = campo
    ? "Para cambiarlo, pulsa ◎ Campo en la pistola y haz clic en otro campo."
    : "Todavía no has elegido ninguno: pulsa ◎ Campo en la pistola y haz clic en el campo.";

  for (const [id, activa] of [["modo-fijo", fijo], ["modo-cursor", !fijo]] as const) {
    $(id).classList.toggle("activa", activa);
    $(id).setAttribute("aria-checked", String(activa));
  }
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
  // Escrito a mano: ya no hay nombre legible, se muestra el selector
  $("selector").addEventListener("change", e =>
    cambiar({ selector: (e.target as HTMLInputElement).value.trim(), descripcionCampo: "" }).then(pintarCampo));
  $("modo-cursor").addEventListener("click", async () => {
    if (!ajustes.selector) return;
    campoAnterior = { selector: ajustes.selector, descripcionCampo: ajustes.descripcionCampo };
    await chrome.storage.local.set({ [CLAVE_CAMPO_ANTERIOR]: campoAnterior });
    ($("selector") as HTMLInputElement).value = "";
    await cambiar({ selector: "", descripcionCampo: "" });
    pintarCampo();
  });
  // Solo se puede volver a un campo ya elegido: elegir uno nuevo se hace en la página
  $("modo-fijo").addEventListener("click", async () => {
    if (ajustes.selector || !campoAnterior) return;
    ($("selector") as HTMLInputElement).value = campoAnterior.selector;
    await cambiar(campoAnterior);
    pintarCampo();
  });

  const numero = (id: string, clave: "retardoMin" | "retardoMax" | "pausaInicial") =>
    $(id).addEventListener("change", e => {
      const valor = Math.max(0, Number((e.target as HTMLInputElement).value) || 0);
      cambiar({ [clave]: valor });
    });
  numero("retardo-min", "retardoMin");
  numero("retardo-max", "retardoMax");
  numero("pausa-inicial", "pausaInicial");

  const casilla = (id: string, clave: "enviarEnter" | "sonido" | "efectoLaser" | "mostrarWidget") =>
    $(id).addEventListener("change", e => cambiar({ [clave]: (e.target as HTMLInputElement).checked }));
  casilla("enviar-enter", "enviarEnter");
  casilla("sonido", "sonido");
  casilla("efecto-laser", "efectoLaser");
  casilla("mostrar-widget", "mostrarWidget");

  $("restablecer").addEventListener("click", async () => {
    // Solo los de su sección (velocidad y efectos): los códigos, el campo y mostrar la pistola se conservan
    await cambiar({
      ...AJUSTES_POR_DEFECTO,
      codigos: ajustes.codigos,
      selector: ajustes.selector,
      descripcionCampo: ajustes.descripcionCampo,
      mostrarWidget: ajustes.mostrarWidget,
    });
    pintarAjustes();
  });

  // Cambios hechos desde el popup o el widget (posición de lectura, mostrar widget)
  chrome.storage.onChanged.addListener((cambios, area) => {
    if (area !== "local") return;
    if (cambios.indiceSiguiente) pintarPosicion();
    // Campo elegido con el ratón en el widget
    if (cambios.selector || cambios.descripcionCampo) {
      ajustes.selector = (cambios.selector?.newValue as string | undefined) ?? ajustes.selector;
      ajustes.descripcionCampo = (cambios.descripcionCampo?.newValue as string | undefined) ?? ajustes.descripcionCampo;
      ($("selector") as HTMLInputElement).value = ajustes.selector;
      pintarCampo();
    }
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
  campoAnterior = (await chrome.storage.local.get({ [CLAVE_CAMPO_ANTERIOR]: null }))[CLAVE_CAMPO_ANTERIOR] as CampoGuardado | null;
  pintarAjustes();
  pintarAtajo();
  pintarPosicion();
  enlazarEventos();
  await pintarSitios();
})();
