// Modo "elegir campo": al pasar el ratón por la página se recuadran los campos de texto y el clic
// elige uno, sin que la página llegue a ver ese clic. Esc o "Cancelar" salen sin elegir.

import { aplicarEstilos } from "./estilos.js";
import { MARGEN_X, MARGEN_Y } from "./laser.js";
import { CampoTexto, describirCampo, esCampoTexto } from "./selector.js";

const ESTILOS_ELEGIR = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483646;
  font: 13px/1.4 -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
}

.aviso {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 8px 14px;
  border-radius: 8px;
  background: #1f2937;
  color: #fff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, .25);
  pointer-events: auto;
}
/* Si el ratón se acerca al aviso, se va abajo para no tapar los campos de arriba */
.aviso.abajo { top: auto; bottom: 12px; }
.aviso kbd {
  padding: 0 4px;
  border: 1px solid rgba(255, 255, 255, .4);
  border-radius: 3px;
  font: 11px Consolas, "Courier New", monospace;
}
.aviso button {
  font: inherit;
  padding: 3px 10px;
  border: 1px solid rgba(255, 255, 255, .4);
  border-radius: 6px;
  background: none;
  color: inherit;
  cursor: pointer;
}

/* Mismo marco que el destello del láser, en azul */
.marco {
  position: fixed;
  border-radius: 4px;
  background: rgba(37, 99, 235, .16);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, .85), 0 0 10px rgba(37, 99, 235, .5);
}
.etiqueta {
  position: absolute;
  left: 0;
  bottom: 100%;
  margin-bottom: 5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  white-space: nowrap;
}
[hidden] { display: none !important; }
`;

// Eventos de puntero que la página no debe ver mientras se elige (ni el foco ni el clic)
const EVENTOS_BLOQUEADOS = ["pointerdown", "mousedown", "pointerup", "mouseup", "click", "dblclick"] as const;

// ignorar: el widget, que sigue funcionando con normalidad mientras se elige
export function elegirCampo(ignorar: Element): Promise<CampoTexto | null> {
  return new Promise(resolver => {
    const anfitrion = document.createElement("div");
    const raiz = anfitrion.attachShadow({ mode: "closed" });
    aplicarEstilos(raiz, ESTILOS_ELEGIR);

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.textContent = "Cancelar";
    const aviso = document.createElement("div");
    aviso.className = "aviso";
    const texto = document.createElement("span");
    const esc = document.createElement("kbd");
    esc.textContent = "Esc";
    texto.append("Haz clic en el campo donde debe escribir la pistola · ", esc, " para salir");
    aviso.append(texto, cancelar);

    const marco = document.createElement("div");
    marco.className = "marco";
    marco.hidden = true;
    const etiqueta = document.createElement("span");
    etiqueta.className = "etiqueta";
    marco.append(etiqueta);
    raiz.append(marco, aviso);
    document.documentElement.append(anfitrion);

    // Campo bajo el ratón, entrando en los shadow roots abiertos de la página. null si está sobre
    // el widget o el aviso.
    const campoDe = (e: Event): CampoTexto | null => {
      const camino = e.composedPath();
      if (camino.includes(ignorar) || camino.includes(anfitrion)) return null;
      return esCampoTexto(camino[0]) ? camino[0] : null;
    };
    const esNuestro = (e: Event) => {
      const camino = e.composedPath();
      return camino.includes(ignorar) || camino.includes(anfitrion);
    };

    const resaltar = (e: MouseEvent) => {
      if (!esNuestro(e)) {
        const caja = aviso.getBoundingClientRect();
        const cerca = e.clientY > caja.top - 40 && e.clientY < caja.bottom + 40;
        if (cerca) aviso.classList.toggle("abajo");
      }
      const campo = campoDe(e);
      marco.hidden = !campo;
      if (!campo) return;
      const caja = campo.getBoundingClientRect();
      Object.assign(marco.style, {
        left: `${caja.left - MARGEN_X}px`,
        top: `${caja.top - MARGEN_Y}px`,
        width: `${caja.width + MARGEN_X * 2}px`,
        height: `${caja.height + MARGEN_Y * 2}px`,
      });
      etiqueta.textContent = describirCampo(campo);
    };

    const bloquear = (e: Event) => {
      if (esNuestro(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === "click") {
        const campo = campoDe(e);
        if (campo) terminar(campo);
      }
    };

    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      terminar(null);
    };

    function terminar(campo: CampoTexto | null): void {
      window.removeEventListener("mousemove", resaltar, true);
      window.removeEventListener("keydown", tecla, true);
      EVENTOS_BLOQUEADOS.forEach(tipo => window.removeEventListener(tipo, bloquear, true));
      anfitrion.remove();
      resolver(campo);
    }

    cancelar.addEventListener("click", () => terminar(null));
    window.addEventListener("mousemove", resaltar, true);
    window.addEventListener("keydown", tecla, true);
    EVENTOS_BLOQUEADOS.forEach(tipo => window.addEventListener(tipo, bloquear, true));
  });
}
