// Tecleo del código en la página, como lo haría una pistola real (que se comporta como un teclado):
// carácter a carácter y terminando con Enter.

export interface ResultadoLectura {
  ok: boolean;
  mensaje: string;
}

export interface OpcionesTecleo {
  selector: string;
  retardoMin: number;
  retardoMax: number;
  pausaInicial: number;
  enviarEnter: boolean;
}

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

// Elemento con foco, entrando en los shadow roots de los componentes de la página
function elementoConFoco(): Element | null {
  let elemento = document.activeElement;
  while (elemento?.shadowRoot?.activeElement) elemento = elemento.shadowRoot.activeElement;
  return elemento;
}

// alTeclear se llama en cada carácter (para el sonido del tecleo)
export async function escribirCodigo(
  codigo: string,
  opciones: OpcionesTecleo,
  alTeclear: () => void,
): Promise<ResultadoLectura> {
  const elemento = opciones.selector ? document.querySelector(opciones.selector) : elementoConFoco();
  if (!(elemento instanceof HTMLInputElement) && !(elemento instanceof HTMLTextAreaElement)) {
    return {
      ok: false,
      mensaje: opciones.selector
        ? `No hay ningún campo que cumpla "${opciones.selector}"`
        : "No hay ningún campo de texto con foco en la página",
    };
  }
  const campo = elemento;
  if (campo.disabled || campo.readOnly) {
    return { ok: false, mensaje: "El campo destino está deshabilitado o es de solo lectura" };
  }

  campo.focus();
  await esperar(opciones.pausaInicial);

  // Se usa el setter nativo para que el framework (React/Preact) vea el cambio igual que con el teclado
  const prototipo = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setterValor = Object.getOwnPropertyDescriptor(prototipo, "value")!.set!;
  for (const caracter of codigo) {
    const tecla = { key: caracter, bubbles: true, cancelable: true };
    alTeclear();
    campo.dispatchEvent(new KeyboardEvent("keydown", tecla));
    setterValor.call(campo, campo.value + caracter);
    campo.dispatchEvent(new InputEvent("input", { data: caracter, inputType: "insertText", bubbles: true }));
    campo.dispatchEvent(new KeyboardEvent("keyup", tecla));
    await esperar(opciones.retardoMin + Math.random() * Math.max(0, opciones.retardoMax - opciones.retardoMin));
  }

  if (opciones.enviarEnter) {
    // keyCode/which los siguen mirando algunos manejadores antiguos (jQuery, Select2...)
    const enter = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    campo.dispatchEvent(new KeyboardEvent("keydown", enter));
    campo.dispatchEvent(new KeyboardEvent("keypress", enter));
    campo.dispatchEvent(new KeyboardEvent("keyup", enter));
  }

  return { ok: true, mensaje: `Leído ${codigo}` };
}
