import { ResultadoLectura } from "./inyeccion.js";

// Mensajes del background (atajo de teclado) al panel lateral, para que este pite, suene el tecleo y
// pinte el resultado igual que si la lectura se hubiera lanzado desde el propio panel.
export type MensajeLectura =
  | { tipo: "lectura-inicio"; indice: number; codigo: string }
  | { tipo: "lectura-fin"; indice: number; siguiente: number; resultado: ResultadoLectura };

export function avisarPanel(mensaje: MensajeLectura): void {
  // Si el panel está cerrado no hay receptor y sendMessage rechaza: no es un error
  chrome.runtime.sendMessage(mensaje).catch(() => { });
}
