import { Ajustes, AJUSTES_POR_DEFECTO, cargarAjustes, cargarIndice, guardarAjustes, guardarIndice, listaCodigos } from "./lib/ajustes.js";
import { leerEnPestana } from "./lib/inyeccion.js";
import { MensajeLectura } from "./lib/mensajes.js";
import { pitar, pitarError, teclear } from "./lib/sonido.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO };
let indiceSiguiente = 0;
let leyendo = false;
// Resultado de la última lectura de cada código (por posición en la lista)
const resultados = new Map<number, boolean>();

// Pestaña activa y patrón de permiso de su host (las match patterns no llevan puerto)
let pestanaId: number | null = null;
let patronHost: string | null = null;
let tienePermiso = false;

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

// ---------- Pestaña activa y permisos ----------

async function actualizarPestana(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  pestanaId = tab?.id ?? null;
  patronHost = null;
  tienePermiso = false;

  let texto = "Sin pestaña activa";
  if (tab?.url) {
    try {
      const url = new URL(tab.url);
      if (url.protocol === "http:" || url.protocol === "https:") {
        patronHost = `${url.protocol}//${url.hostname}/*`;
        tienePermiso = await chrome.permissions.contains({ origins: [patronHost] });
        texto = url.host;
      } else {
        texto = "Página no compatible (" + url.protocol.replace(":", "") + ")";
      }
    } catch {
      texto = "Página no compatible";
    }
  }

  $("pestana").textContent = texto;
  $("permiso-origen").textContent = patronHost?.replace("/*", "") ?? "";
  $("permiso").hidden = !patronHost || tienePermiso;
  pintarCodigos();
}

function autorizar(): void {
  if (!patronHost) return;
  // permissions.request exige gesto del usuario: se llama directamente en el clic, sin awaits antes
  chrome.permissions.request({ origins: [patronHost] })
    .catch(e => mostrarErrorSitio("No se pudo autorizar: " + mensajeError(e)))
    .finally(refrescarPermisos);
}

// Se refresca a mano tras cada request/remove: permissions.onAdded/onRemoved no siempre llegan
// al panel lateral
const refrescarPermisos = () => Promise.all([actualizarPestana(), pintarSitios()]);

const mensajeError = (e: unknown) => (e instanceof Error ? e.message : String(e));

function mostrarErrorSitio(mensaje: string): void {
  const error = $("error-sitio");
  error.textContent = mensaje;
  error.hidden = false;
}

// ---------- Sitios autorizados ----------

// "localhost:5002", "https://mi-app.com/ruta"... → "https://localhost/*" (las match patterns no
// llevan puerto: el permiso vale para cualquier puerto y ruta del host)
function patronDesdeTexto(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(limpio) ? limpio : "https://" + limpio);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.hostname}/*`;
  } catch {
    return null;
  }
}

function anadirSitio(): void {
  const input = $("nuevo-sitio") as HTMLInputElement;
  const patron = patronDesdeTexto(input.value);
  if (!patron) {
    mostrarErrorSitio("URL no válida (solo http o https)");
    return;
  }
  $("error-sitio").hidden = true;
  // Igual que en autorizar(): la petición va directa en el clic para conservar el gesto del usuario
  chrome.permissions.request({ origins: [patron] })
    .then(concedido => {
      if (concedido) input.value = "";
      else mostrarErrorSitio("Permiso no concedido para " + patron.replace("/*", ""));
    })
    .catch(e => mostrarErrorSitio("No se pudo añadir: " + mensajeError(e)))
    .finally(refrescarPermisos);
}

async function pintarSitios(): Promise<void> {
  const { origins = [] } = await chrome.permissions.getAll();
  // Los declarados en host_permissions del manifest son obligatorios: Chrome no deja quitarlos
  const fijos = new Set(chrome.runtime.getManifest().host_permissions ?? []);
  const ul = $("sitios");
  ul.replaceChildren();
  if (origins.length === 0) {
    const li = document.createElement("li");
    li.className = "vacio";
    li.textContent = "Ningún sitio autorizado";
    ul.append(li);
  }
  origins.sort().forEach(patron => {
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
          .finally(refrescarPermisos);
      });
      li.append(texto, quitar);
    }
    ul.append(li);
  });
}

// ---------- Lectura ----------

async function leer(indice: number): Promise<void> {
  const codigo = listaCodigos(ajustes.codigos)[indice];
  if (!codigo || leyendo || pestanaId === null) return;

  if (!tienePermiso) {
    mostrarEstado(false, patronHost ? "Autoriza primero este sitio" : "Esta página no admite la pistola");
    if (ajustes.sonido) pitarError();
    return;
  }

  leyendo = true;
  indiceSiguiente = indice;
  await guardarIndice(indice);
  pintarCodigos();
  try {
    if (ajustes.sonido) {
      pitar();
      // El tecleo ocurre en la página; aquí solo se acompaña con el sonido al mismo ritmo
      sonarTecleo(codigo.length);
    }
    const resultado = await leerEnPestana(pestanaId, codigo, ajustes);
    resultados.set(indice, resultado.ok);
    mostrarEstado(resultado.ok, resultado.mensaje);
    if (resultado.ok) {
      indiceSiguiente = (indice + 1) % listaCodigos(ajustes.codigos).length;
      await guardarIndice(indiceSiguiente);
    } else if (ajustes.sonido) {
      pitarError();
    }
  } catch (e) {
    resultados.set(indice, false);
    mostrarEstado(false, e instanceof Error ? e.message : String(e));
    if (ajustes.sonido) pitarError();
  } finally {
    leyendo = false;
    pintarCodigos();
  }
}

// Lecturas lanzadas con el atajo de teclado (las hace el background): aquí solo se acompañan
// con el sonido y se pinta el resultado
function alRecibirMensaje(mensaje: MensajeLectura): void {
  if (mensaje.tipo === "lectura-inicio") {
    leyendo = true;
    indiceSiguiente = mensaje.indice;
    if (ajustes.sonido) {
      pitar();
      sonarTecleo(mensaje.codigo.length);
    }
  } else if (mensaje.tipo === "lectura-fin") {
    leyendo = false;
    resultados.set(mensaje.indice, mensaje.resultado.ok);
    indiceSiguiente = mensaje.siguiente;
    mostrarEstado(mensaje.resultado.ok, mensaje.resultado.mensaje);
    if (!mensaje.resultado.ok && ajustes.sonido) pitarError();
  }
  pintarCodigos();
}

async function sonarTecleo(caracteres: number): Promise<void> {
  await esperar(ajustes.pausaInicial);
  for (let i = 0; i < caracteres; i++) {
    teclear();
    await esperar(ajustes.retardoMin + Math.random() * Math.max(0, ajustes.retardoMax - ajustes.retardoMin));
  }
}

// ---------- Pintado ----------

function mostrarEstado(ok: boolean, mensaje: string): void {
  const estado = $("estado");
  estado.hidden = false;
  estado.className = "estado " + (ok ? "ok" : "error");
  estado.textContent = mensaje;
}

function pintarCodigos(): void {
  const lista = listaCodigos(ajustes.codigos);
  if (indiceSiguiente >= lista.length) indiceSiguiente = 0;

  const ul = $("codigos");
  ul.replaceChildren();
  if (lista.length === 0) {
    const li = document.createElement("li");
    li.className = "vacio";
    li.textContent = "Sin códigos: añádelos en la sección Códigos";
    ul.append(li);
  }
  lista.forEach((codigo, i) => {
    const li = document.createElement("li");
    if (i === indiceSiguiente) li.className = "actual";
    const boton = document.createElement("button");
    boton.type = "button";
    boton.disabled = leyendo;
    boton.addEventListener("click", () => leer(i));
    const texto = document.createElement("span");
    texto.textContent = codigo;
    boton.append(texto);
    if (resultados.has(i)) {
      const marca = document.createElement("span");
      marca.className = resultados.get(i) ? "marca-ok" : "marca-error";
      marca.textContent = resultados.get(i) ? "✓" : "✗";
      boton.append(marca);
    }
    li.append(boton);
    ul.append(li);
  });

  ($("siguiente") as HTMLButtonElement).disabled = leyendo || lista.length === 0;
  $("posicion").textContent = lista.length ? `${indiceSiguiente + 1} de ${lista.length}` : "";
}

// El atajo lo puede cambiar el usuario en chrome://extensions/shortcuts: se muestra el real
async function pintarAtajo(): Promise<void> {
  const comandos = await chrome.commands.getAll();
  const atajo = comandos.find(c => c.name === "leer-siguiente")?.shortcut;
  $("atajo").innerHTML = atajo
    ? `Desde la página: <kbd></kbd> (lee sin quitarle el foco)`
    : "Sin atajo de teclado: asígnalo en chrome://extensions/shortcuts";
  const kbd = $("atajo").querySelector("kbd");
  if (kbd && atajo) kbd.textContent = atajo;
}

function pintarAjustes(): void {
  ($("texto-codigos") as HTMLTextAreaElement).value = ajustes.codigos;
  ($("selector") as HTMLInputElement).value = ajustes.selector;
  ($("retardo-min") as HTMLInputElement).value = String(ajustes.retardoMin);
  ($("retardo-max") as HTMLInputElement).value = String(ajustes.retardoMax);
  ($("pausa-inicial") as HTMLInputElement).value = String(ajustes.pausaInicial);
  ($("enviar-enter") as HTMLInputElement).checked = ajustes.enviarEnter;
  ($("sonido") as HTMLInputElement).checked = ajustes.sonido;
}

async function cambiar(cambios: Partial<Ajustes>): Promise<void> {
  ajustes = { ...ajustes, ...cambios };
  await guardarAjustes(cambios);
}

// ---------- Arranque ----------

function enlazarEventos(): void {
  $("autorizar").addEventListener("click", autorizar);
  $("anadir-sitio").addEventListener("click", anadirSitio);
  $("nuevo-sitio").addEventListener("keydown", e => { if (e.key === "Enter") anadirSitio(); });
  $("siguiente").addEventListener("click", () => leer(indiceSiguiente));

  $("texto-codigos").addEventListener("input", e => {
    resultados.clear();
    cambiar({ codigos: (e.target as HTMLTextAreaElement).value }).then(pintarCodigos);
  });
  $("selector").addEventListener("change", e => cambiar({ selector: (e.target as HTMLInputElement).value.trim() }));

  const numero = (id: string, clave: "retardoMin" | "retardoMax" | "pausaInicial") =>
    $(id).addEventListener("change", e => {
      const valor = Math.max(0, Number((e.target as HTMLInputElement).value) || 0);
      cambiar({ [clave]: valor });
    });
  numero("retardo-min", "retardoMin");
  numero("retardo-max", "retardoMax");
  numero("pausa-inicial", "pausaInicial");

  $("enviar-enter").addEventListener("change", e => cambiar({ enviarEnter: (e.target as HTMLInputElement).checked }));
  $("sonido").addEventListener("change", e => cambiar({ sonido: (e.target as HTMLInputElement).checked }));

  $("restablecer").addEventListener("click", async () => {
    // Se conservan los códigos: solo se restablecen los ajustes
    await cambiar({ ...AJUSTES_POR_DEFECTO, codigos: ajustes.codigos });
    pintarAjustes();
  });

  // Seguir la pestaña activa: cambio de pestaña, navegación y permisos concedidos/retirados
  chrome.tabs.onActivated.addListener(() => actualizarPestana());
  chrome.tabs.onUpdated.addListener((_id, cambio) => { if (cambio.url) actualizarPestana(); });
  chrome.windows.onFocusChanged.addListener(() => actualizarPestana());
  chrome.runtime.onMessage.addListener(alRecibirMensaje);

  const alCambiarPermisos = () => { actualizarPestana(); pintarSitios(); };
  chrome.permissions.onAdded.addListener(alCambiarPermisos);
  chrome.permissions.onRemoved.addListener(alCambiarPermisos);
}

(async () => {
  ajustes = await cargarAjustes();
  indiceSiguiente = await cargarIndice();
  pintarAtajo();
  pintarAjustes();
  enlazarEventos();
  await Promise.all([actualizarPestana(), pintarSitios()]);
})();
