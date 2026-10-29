// Widget flotante que se pinta en los sitios autorizados. Es la "pistola": cada clic lee un código
// en la página.
//
// Clave: ningún clic en el widget se lleva el foco (se cancela el mousedown), así que el foco se
// queda donde lo dejó la aplicación tras la lectura anterior (p. ej. en la cantidad) y se puede
// seguir tecleando sin volver a hacer clic en la página, como con una pistola real.

import { Ajustes, AJUSTES_POR_DEFECTO, cargarAjustes, cargarIndice, guardarAjustes, guardarIndice, listaCodigos } from "../comun/ajustes.js";
import { MensajeFondo, MensajeWidget } from "../comun/mensajes.js";
import { elegirCampo } from "./elegir.js";
import { aplicarEstilos, ESTILOS } from "./estilos.js";
import { apuntar, Laser } from "./laser.js";
import { pitar, pitarError, teclear } from "./sonido.js";
import { describirCampo, generarSelector } from "./selector.js";
import { escribirCodigo, ResultadoLectura } from "./teclado.js";

const ID_ANFITRION = "emulador-pistola-widget";
const CLAVE_POSICION = "widgetPosicion";
const CLAVE_PLEGADO = "widgetPlegado";

interface Posicion { x: number; y: number; }

let ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO };
let indiceSiguiente = 0;
let leyendo = false;
let eligiendo = false;
// Resultado de la última lectura de cada código en esta pestaña (por posición en la lista)
const resultados = new Map<number, boolean>();
let ultimoResultado: ResultadoLectura | null = null;
let plegado = false;
// Atajo de teclado para disparar ("" si no hay). Se pide al montar: si se cambia en
// chrome://extensions/shortcuts, se ve al recargar la página.
let atajo = "";

let anfitrion: HTMLElement | null = null;
let raiz: ShadowRoot | null = null;

// ---------- Montaje ----------

// Lo llama el cargador cada vez que se inyecta; el módulo solo se evalúa una vez por pestaña,
// así que aquí se evita montar dos widgets
export async function montar(): Promise<void> {
  if (anfitrion?.isConnected) return;
  // Un widget huérfano de una versión anterior de la extensión (tras recargarla) se sustituye
  document.getElementById(ID_ANFITRION)?.remove();

  ajustes = await cargarAjustes();
  indiceSiguiente = await cargarIndice();
  const guardado = await chrome.storage.local.get({ [CLAVE_POSICION]: null, [CLAVE_PLEGADO]: false });
  plegado = guardado[CLAVE_PLEGADO] as boolean;
  atajo = await chrome.runtime.sendMessage<MensajeFondo, string>({ tipo: "pedir-atajo" }).catch(() => "") ?? "";

  anfitrion = document.createElement("div");
  anfitrion.id = ID_ANFITRION;
  raiz = anfitrion.attachShadow({ mode: "closed" });
  aplicarEstilos(raiz, ESTILOS);
  // Ningún clic en el widget debe quitarle el foco a la página
  raiz.addEventListener("mousedown", e => e.preventDefault());

  document.documentElement.append(anfitrion);
  colocar(guardado[CLAVE_POSICION] as Posicion | null);
  pintar();
}

function desmontar(): void {
  anfitrion?.remove();
  anfitrion = null;
  raiz = null;
}

// ---------- Lectura ----------

async function leer(indice: number): Promise<void> {
  const lista = listaCodigos(ajustes.codigos);
  const codigo = lista[indice];
  if (!codigo || leyendo) return;

  leyendo = true;
  indiceSiguiente = indice;
  pintar();
  let resultado: ResultadoLectura;
  let laser: Laser | null = null;
  try {
    if (ajustes.sonido) pitar();
    resultado = await escribirCodigo(codigo, ajustes, {
      alApuntar: campo => {
        if (ajustes.efectoLaser) laser = apuntar(campo, (ajustes.retardoMin + ajustes.retardoMax) / 2);
      },
      alTeclear: (tecleados, total) => {
        if (ajustes.sonido) teclear();
        (laser as Laser | null)?.avanzar(tecleados / total);
      },
    });
  } catch (e) {
    resultado = { ok: false, mensaje: e instanceof Error ? e.message : String(e) };
  }
  (laser as Laser | null)?.terminar(resultado.ok);

  resultados.set(indice, resultado.ok);
  ultimoResultado = resultado;
  if (resultado.ok) indiceSiguiente = (indice + 1) % lista.length;
  else if (ajustes.sonido) pitarError();
  leyendo = false;
  pintar();
  // La posición la comparten todas las pestañas
  await guardarIndice(indiceSiguiente);
}

// ---------- Elegir el campo destino ----------

async function elegir(): Promise<void> {
  if (!anfitrion || eligiendo || leyendo) return;
  eligiendo = true;
  pintar();
  const campo = await elegirCampo(anfitrion);
  eligiendo = false;
  if (campo) {
    const selector = generarSelector(campo);
    if (selector) {
      const descripcionCampo = describirCampo(campo);
      ajustes = { ...ajustes, selector, descripcionCampo };
      ultimoResultado = { ok: true, mensaje: `Campo elegido: ${descripcionCampo}` };
      if (ajustes.efectoLaser) apuntar(campo, 0).terminar(true);
      await guardarAjustes({ selector, descripcionCampo });
    } else {
      ultimoResultado = { ok: false, mensaje: "Ese campo no se puede elegir. En Opciones, elige «Donde esté el cursor»." };
    }
  }
  pintar();
}

// ---------- Pintado ----------

// Crea un elemento con sus propiedades e hijos (sin innerHTML: algunas páginas imponen Trusted Types)
function h<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...hijos: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const elemento = Object.assign(document.createElement(etiqueta), props);
  elemento.append(...hijos);
  return elemento;
}

function pintar(): void {
  if (!raiz || !anfitrion) return;
  anfitrion.hidden = !ajustes.mostrarWidget;

  const lista = listaCodigos(ajustes.codigos);
  if (indiceSiguiente >= lista.length) indiceSiguiente = 0;

  const plegar = h("button", { type: "button", title: plegado ? "Desplegar" : "Plegar", textContent: plegado ? "▴" : "▾" });
  plegar.addEventListener("click", () => {
    plegado = !plegado;
    chrome.storage.local.set({ [CLAVE_PLEGADO]: plegado });
    pintar();
  });
  // Solo si se ha movido: devuelve la pistola a su sitio (abajo a la derecha)
  const recolocar = h("button", {
    type: "button",
    title: "Volver a colocarla abajo a la derecha",
    textContent: "↘",
    hidden: !estaMovida(),
  });
  recolocar.addEventListener("click", volverASuSitio);
  const cabecera = h("div", { className: "cabecera", title: "Arrastra para mover · doble clic para volver a su sitio" },
    h("img", { src: chrome.runtime.getURL("icons/icon16.png"), alt: "" }),
    h("span", { className: "titulo", textContent: "Pistola" }),
    recolocar,
    plegar);
  hacerArrastrable(cabecera);
  cabecera.addEventListener("dblclick", e => {
    if (!(e.target as Element).closest("button")) volverASuSitio();
  });

  const disparar = h("button", {
    type: "button",
    className: "disparar" + (leyendo ? " leyendo" : ""),
    disabled: leyendo || eligiendo || lista.length === 0,
    title: "Escribe el código en el campo y pulsa Enter" + (atajo ? `. Sin tocar el ratón: ${atajo}` : ""),
  },
    h("span", { className: "etiqueta", textContent: leyendo ? "Leyendo…" : "Disparar" }),
    h("span", { className: "codigo", textContent: lista[indiceSiguiente] ?? "Sin códigos" }));
  disparar.addEventListener("click", () => leer(indiceSiguiente));

  const info = h("div", { className: "info" },
    h("span", { textContent: lista.length ? `${indiceSiguiente + 1} de ${lista.length}` : "" }),
    h("span", { className: "atajo", hidden: !atajo, title: "Dispara sin tocar el ratón: pulsa estas teclas en la página" },
      "Sin ratón: ", h("kbd", { textContent: atajo })));

  const nombreCampo = ajustes.descripcionCampo || ajustes.selector || "donde esté el cursor";
  const campo = h("button", {
    type: "button",
    className: "campo" + (eligiendo ? " eligiendo" : ""),
    disabled: leyendo,
    title: eligiendo
      ? "Haz clic en un campo de la página (Esc para salir)"
      : "Campo donde escribe la pistola. Pulsa para elegir otro.",
  },
    h("span", { className: "diana", textContent: "◎" }),
    h("span", { className: "nombre", textContent: eligiendo ? "Haz clic en un campo…" : `Campo: ${nombreCampo}` }));
  campo.addEventListener("click", elegir);

  const codigos = h("ul", { className: "codigos" });
  if (lista.length === 0) codigos.append(h("li", { className: "vacio", textContent: "Añade códigos en Opciones" }));
  lista.forEach((codigo, i) => {
    const boton = h("button", { type: "button", disabled: leyendo }, h("span", { textContent: codigo }));
    if (resultados.has(i)) {
      const ok = resultados.get(i)!;
      boton.append(h("span", { className: ok ? "ok" : "error", textContent: ok ? "✓" : "✗" }));
    }
    boton.addEventListener("click", () => leer(i));
    codigos.append(h("li", { className: i === indiceSiguiente ? "actual" : "" }, boton));
  });

  const estado = h("div", {
    className: "estado " + (ultimoResultado?.ok ? "ok" : "error"),
    hidden: !ultimoResultado,
    textContent: ultimoResultado?.mensaje ?? "",
  });

  const opciones = h("button", { type: "button", className: "enlace", textContent: "Más opciones" });
  opciones.addEventListener("click", () => chrome.runtime.sendMessage<MensajeFondo>({ tipo: "abrir-opciones" }));

  const widget = h("div", { className: "widget" + (plegado ? " plegado" : "") },
    cabecera,
    h("div", { className: "cuerpo" }, disparar, info, campo, codigos, estado, h("div", { className: "pie" }, opciones)));

  // Se conserva la hoja de estilos de respaldo (<style>) si la hay
  raiz.querySelectorAll(".widget").forEach(e => e.remove());
  raiz.append(widget);
}

// ---------- Posición ----------

// Sin posición guardada la pistola va abajo a la derecha (lo marca :host en los estilos)
const estaMovida = () => !!anfitrion?.style.left;

function volverASuSitio(): void {
  if (!anfitrion) return;
  Object.assign(anfitrion.style, { left: "", top: "", right: "", bottom: "" });
  // El cambio llega a las demás pestañas por storage.onChanged
  chrome.storage.local.remove(CLAVE_POSICION);
  pintar();
}

// Coloca el widget en una posición guardada, sin dejar que se salga de la ventana
function colocar(posicion: Posicion | null): void {
  if (!anfitrion || !posicion) return;
  const ancho = anfitrion.offsetWidth || 230;
  const alto = anfitrion.offsetHeight || 40;
  const x = Math.min(Math.max(0, posicion.x), window.innerWidth - ancho);
  const y = Math.min(Math.max(0, posicion.y), window.innerHeight - Math.min(alto, 40));
  Object.assign(anfitrion.style, { left: `${x}px`, top: `${y}px`, right: "auto", bottom: "auto" });
}

function hacerArrastrable(asa: HTMLElement): void {
  asa.addEventListener("mousedown", inicio => {
    if (!anfitrion || (inicio.target as Element).closest("button")) return;
    const caja = anfitrion.getBoundingClientRect();
    const dx = inicio.clientX - caja.left;
    const dy = inicio.clientY - caja.top;
    let posicion: Posicion | null = null;

    const mover = (e: MouseEvent) => {
      posicion = { x: e.clientX - dx, y: e.clientY - dy };
      colocar(posicion);
    };
    const soltar = () => {
      window.removeEventListener("mousemove", mover, true);
      window.removeEventListener("mouseup", soltar, true);
      // Un clic sin arrastrar (o el doble clic) no cuenta como moverla
      if (posicion) chrome.storage.local.set({ [CLAVE_POSICION]: posicion });
    };
    window.addEventListener("mousemove", mover, true);
    window.addEventListener("mouseup", soltar, true);
  });
}

// ---------- Eventos ----------

// Ajustes, códigos o posición cambiados en Opciones, en el popup o en otra pestaña
chrome.storage.onChanged.addListener((cambios, area) => {
  if (area !== "local" || !anfitrion) return;
  if (cambios.codigos) resultados.clear();
  for (const clave of Object.keys(AJUSTES_POR_DEFECTO) as (keyof Ajustes)[]) {
    if (cambios[clave]) (ajustes as unknown as Record<string, unknown>)[clave] = cambios[clave].newValue ?? AJUSTES_POR_DEFECTO[clave];
  }
  if (cambios.indiceSiguiente && !leyendo) indiceSiguiente = cambios.indiceSiguiente.newValue as number;
  if (cambios[CLAVE_PLEGADO]) plegado = cambios[CLAVE_PLEGADO].newValue as boolean;
  if (cambios[CLAVE_POSICION]) {
    const posicion = cambios[CLAVE_POSICION].newValue as Posicion | undefined;
    if (posicion) colocar(posicion);
    else Object.assign(anfitrion.style, { left: "", top: "", right: "", bottom: "" });
  }
  pintar();
});

chrome.runtime.onMessage.addListener((mensaje: MensajeWidget, _remitente, responder) => {
  if (mensaje.tipo === "leer-siguiente" && anfitrion) {
    leer(indiceSiguiente);
    responder(true);
  } else if (mensaje.tipo === "elegir-campo" && anfitrion) {
    elegir();
    responder(true);
  } else if (mensaje.tipo === "permisos-retirados") {
    if (mensaje.origenes.includes(`${location.protocol}//${location.hostname}/*`)) desmontar();
  }
});

window.addEventListener("resize", () => {
  if (anfitrion?.style.left) colocar({ x: parseFloat(anfitrion.style.left), y: parseFloat(anfitrion.style.top) });
});
