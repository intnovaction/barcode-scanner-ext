// Mensajes entre el background y el widget de cada pestaña.

// Background / popup → widget
export type MensajeWidget =
  // Atajo de teclado: leer el siguiente código
  | { tipo: "leer-siguiente" }
  // Popup: elegir con el ratón el campo donde escribe la pistola
  | { tipo: "elegir-campo" }
  // Se han retirado permisos: el widget se quita si su sitio está entre ellos
  | { tipo: "permisos-retirados"; origenes: string[] };

// Widget → background (un content script no puede abrir la página de opciones ni leer los atajos)
export type MensajeFondo =
  | { tipo: "abrir-opciones" }
  // Responde con el atajo de "Leer siguiente" ("" si no hay)
  | { tipo: "pedir-atajo" };
