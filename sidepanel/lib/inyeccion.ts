// Lectura de un código en la pestaña activa vía chrome.scripting.executeScript.

export interface ResultadoLectura {
  ok: boolean;
  mensaje: string;
}

// Se ejecuta DENTRO de la página: executeScript serializa la función, así que no puede usar nada
// de fuera de su cuerpo (ni imports, ni helpers del módulo). Reproduce lo que hace una pistola
// real (que se comporta como un teclado): teclea el código carácter a carácter y termina con Enter.
async function teclearEnPagina(
  codigo: string,
  selector: string,
  retardoMin: number,
  retardoMax: number,
  pausaInicial: number,
  enviarEnter: boolean,
): Promise<ResultadoLectura> {
  const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

  const elemento = selector
    ? document.querySelector(selector)
    : document.activeElement;
  if (!(elemento instanceof HTMLInputElement) && !(elemento instanceof HTMLTextAreaElement)) {
    return {
      ok: false,
      mensaje: selector
        ? `No hay ningún campo que cumpla "${selector}"`
        : "No hay ningún campo de texto con foco en la página",
    };
  }
  const campo = elemento;
  if (campo.disabled || campo.readOnly) {
    return { ok: false, mensaje: "El campo destino está deshabilitado o es de solo lectura" };
  }

  campo.focus();
  await esperar(pausaInicial);

  // Se usa el setter nativo para que el framework (React/Preact) vea el cambio igual que con el teclado
  const prototipo = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setterValor = Object.getOwnPropertyDescriptor(prototipo, "value")!.set!;
  for (const caracter of codigo) {
    const tecla = { key: caracter, bubbles: true, cancelable: true };
    campo.dispatchEvent(new KeyboardEvent("keydown", tecla));
    setterValor.call(campo, campo.value + caracter);
    campo.dispatchEvent(new InputEvent("input", { data: caracter, inputType: "insertText", bubbles: true }));
    campo.dispatchEvent(new KeyboardEvent("keyup", tecla));
    await esperar(retardoMin + Math.random() * Math.max(0, retardoMax - retardoMin));
  }

  if (enviarEnter) {
    // keyCode/which los siguen mirando algunos manejadores antiguos (jQuery, Select2...)
    const enter = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    campo.dispatchEvent(new KeyboardEvent("keydown", enter));
    campo.dispatchEvent(new KeyboardEvent("keypress", enter));
    campo.dispatchEvent(new KeyboardEvent("keyup", enter));
  }

  return { ok: true, mensaje: `Leído ${codigo}` };
}

export async function leerEnPestana(
  tabId: number,
  codigo: string,
  opciones: { selector: string; retardoMin: number; retardoMax: number; pausaInicial: number; enviarEnter: boolean },
): Promise<ResultadoLectura> {
  const [resultado] = await chrome.scripting.executeScript({
    target: { tabId },
    func: teclearEnPagina,
    args: [codigo, opciones.selector, opciones.retardoMin, opciones.retardoMax, opciones.pausaInicial, opciones.enviarEnter],
  });
  return (resultado?.result as ResultadoLectura | undefined) ?? { ok: false, mensaje: "La página no devolvió resultado" };
}
