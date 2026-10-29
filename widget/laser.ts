// Efecto visual de la lectura: el haz rojo de la pistola cruza el campo destino de izquierda a
// derecha al ritmo del tecleo (llega al final justo con el último carácter, antes del Enter) y deja
// iluminada la parte ya leída. Al terminar, un destello verde (leído) o rojo (error). Es solo
// decoración: no recibe clics (pointer-events: none) y va en su propio shadow root para no tocar
// los estilos de la página.

import { aplicarEstilos } from "./estilos.js";

// Holgura del marco alrededor del campo: justa para que el brillo no tape el borde
export const MARGEN_X = 3;
export const MARGEN_Y = 2;
const DURACION_FIN = 600;

const ESTILOS_LASER = `
:host {
  all: initial;
  position: fixed;
  pointer-events: none;
  z-index: 2147483646;
}

.zona {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: rgba(255, 0, 0, .04);
  box-shadow: 0 0 0 1px rgba(255, 40, 40, .5), 0 0 8px rgba(255, 0, 0, .25);
  overflow: hidden;
  animation: encender 120ms ease-out;
}

/* Parte ya leída: se ilumina tras el haz */
.leido {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 0;
  background: linear-gradient(90deg, rgba(255, 0, 0, .03), rgba(255, 0, 0, .12));
  transition: width var(--paso, 40ms) linear;
}

/* Haz: línea vertical roja con resplandor. Antes del primer carácter parpadea en el borde
   izquierdo (apuntando); luego avanza con cada carácter. */
.haz {
  position: absolute;
  top: 22%;
  bottom: 22%;
  left: 0;
  width: 2px;
  border-radius: 1px;
  margin-left: -1px;
  background: #ff2020;
  box-shadow: 0 0 3px 1px rgba(255, 0, 0, .9), 0 0 10px 3px rgba(255, 0, 0, .4);
  transition: left var(--paso, 40ms) linear;
  animation: apuntar 200ms ease-in-out infinite alternate;
}
.avanzando .haz { animation: none; }

.ok .zona {
  background: rgba(16, 185, 129, .16);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, .85), 0 0 10px rgba(16, 185, 129, .5);
}
.error .zona {
  background: rgba(220, 38, 38, .16);
  box-shadow: 0 0 0 2px rgba(220, 38, 38, .85), 0 0 10px rgba(220, 38, 38, .5);
}
.ok .haz, .error .haz, .ok .leido, .error .leido { display: none; }
.ok, .error { animation: apagar ${DURACION_FIN}ms ease-in forwards; }

@keyframes encender { from { opacity: 0; } }
@keyframes apuntar { from { opacity: .45; } }
@keyframes apagar { 0%, 40% { opacity: 1; } 100% { opacity: 0; } }
`;

export interface Laser {
  // Lleva el haz a esa fracción del campo (0-1), en el tiempo de un carácter
  avanzar(fraccion: number): void;
  // Pasa a destello verde (ok) o rojo y desaparece
  terminar(ok: boolean): void;
}

// msPorCaracter: lo que tarda el haz en avanzar un carácter (el retardo medio del tecleo)
export function apuntar(campo: Element, msPorCaracter: number): Laser {
  const anfitrion = document.createElement("div");
  const raiz = anfitrion.attachShadow({ mode: "closed" });
  aplicarEstilos(raiz, ESTILOS_LASER);
  const efecto = document.createElement("div");
  efecto.style.setProperty("--paso", `${Math.max(0, msPorCaracter)}ms`);
  const zona = document.createElement("div");
  zona.className = "zona";
  const leido = document.createElement("div");
  leido.className = "leido";
  const haz = document.createElement("div");
  haz.className = "haz";
  haz.style.left = `${MARGEN_X}px`;
  zona.append(leido, haz);
  efecto.append(zona);
  raiz.append(efecto);
  document.documentElement.append(anfitrion);

  // Sigue al campo si la página se desplaza. Si la aplicación lo quita del DOM al leer (p. ej. al
  // añadir la línea), el efecto se queda en el último sitio donde estuvo.
  let activo = true;
  const seguir = () => {
    if (!activo) return;
    if (campo.isConnected) {
      const caja = campo.getBoundingClientRect();
      Object.assign(anfitrion.style, {
        left: `${caja.left - MARGEN_X}px`,
        top: `${caja.top - MARGEN_Y}px`,
        width: `${caja.width + MARGEN_X * 2}px`,
        height: `${caja.height + MARGEN_Y * 2}px`,
      });
    }
    requestAnimationFrame(seguir);
  };
  seguir();

  return {
    avanzar(fraccion: number) {
      // El haz recorre el campo, no el margen que lo rodea
      const posicion = `calc(${MARGEN_X}px + (100% - ${MARGEN_X * 2}px) * ${Math.min(1, Math.max(0, fraccion))})`;
      efecto.className = "avanzando";
      haz.style.left = posicion;
      leido.style.width = posicion;
    },
    terminar(ok: boolean) {
      efecto.className = ok ? "ok" : "error";
      setTimeout(() => {
        activo = false;
        anfitrion.remove();
      }, DURACION_FIN);
    },
  };
}
