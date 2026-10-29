// Tecleo del código en la página, como lo haría una pistola real (que se comporta como un teclado):
// carácter a carácter y terminando con Enter.

export interface ResultadoLectura {
  ok: boolean;
  mensaje: string;
}

export interface OpcionesTecleo {
  selector: string;
  // Nombre legible del campo, para los mensajes
  descripcionCampo?: string;
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

export interface AvisosTecleo {
  // Campo destino localizado, justo antes de la pausa inicial (para el efecto láser)
  alApuntar(campo: HTMLElement): void;
  // Cada carácter, justo antes de teclearlo (para el sonido y el avance del láser)
  alTeclear(tecleados: number, total: number): void;
}

export async function escribirCodigo(
  codigo: string,
  opciones: OpcionesTecleo,
  avisos: AvisosTecleo,
): Promise<ResultadoLectura> {
  const elemento = opciones.selector ? document.querySelector(opciones.selector) : elementoConFoco();
  if (!(elemento instanceof HTMLInputElement) && !(elemento instanceof HTMLTextAreaElement)) {
    return {
      ok: false,
      mensaje: opciones.selector
        ? `No encuentro el campo «${opciones.descripcionCampo || opciones.selector}» en esta página. Elige otro con ◎ Campo.`
        : "El cursor no está en ningún campo. Haz clic en uno o elige uno con ◎ Campo.",
    };
  }
  const campo = elemento;
  if (campo.disabled || campo.readOnly) {
    return { ok: false, mensaje: "En ese campo no se puede escribir (está bloqueado)." };
  }

  campo.focus();
  avisos.alApuntar(campo);
  await esperar(opciones.pausaInicial);

  // Se usa el setter nativo para que el framework (React/Preact) vea el cambio igual que con el teclado
  const prototipo = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setterValor = Object.getOwnPropertyDescriptor(prototipo, "value")!.set!;
  const caracteres = [...codigo];
  for (const [i, caracter] of caracteres.entries()) {
    const tecla = { key: caracter, bubbles: true, cancelable: true };
    avisos.alTeclear(i + 1, caracteres.length);
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
