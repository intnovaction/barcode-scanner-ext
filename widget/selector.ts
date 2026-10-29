// Del campo que el usuario elige con el ratón a un selector CSS que lo vuelva a encontrar, y a un
// nombre legible para mostrarlo ("ISBN" en vez de "input[id^='Isbn_']").

export type CampoTexto = HTMLInputElement | HTMLTextAreaElement;

const TIPOS_TEXTO = new Set(["", "text", "search", "number", "tel", "email", "url"]);

// Campos en los que puede escribir la pistola
export function esCampoTexto(elemento: unknown): elemento is CampoTexto {
  if (elemento instanceof HTMLTextAreaElement) return !elemento.disabled && !elemento.readOnly;
  return elemento instanceof HTMLInputElement
    && TIPOS_TEXTO.has(elemento.getAttribute("type")?.toLowerCase() ?? "")
    && !elemento.disabled && !elemento.readOnly;
}

// Ids que genera el framework y cambian en cada carga (":r1:", GUIDs, números largos): no sirven
const pareceGenerado = (id: string) => /^:|[0-9a-f]{8}-[0-9a-f]{4}|\d{6,}/i.test(id);

const comillas = (valor: string) => `"${valor.replace(/["\\]/g, "\\$&")}"`;

// Prueba selectores de más a menos legibles y se queda con el primero que encuentra ese mismo campo
// (la pistola escribe en el primero que cumpla el selector). "" si no hay forma de apuntarle (p. ej.
// está dentro del shadow DOM de un componente).
export function generarSelector(campo: CampoTexto): string {
  if (campo.getRootNode() !== document) return "";
  const etiqueta = campo.localName;
  const candidatos: string[] = [];

  const id = campo.id;
  if (id && !pareceGenerado(id)) {
    // "Isbn_3" → todos los que empiezan por "Isbn_": en listas con una fila por línea el número
    // cambia, pero el campo vacío para la siguiente lectura suele ser el primero
    const prefijo = id.match(/^(.*\D)\d+$/)?.[1];
    if (prefijo) candidatos.push(`${etiqueta}[id^=${comillas(prefijo)}]`);
    candidatos.push(`#${CSS.escape(id)}`);
  }
  for (const atributo of ["name", "data-testid", "aria-label", "placeholder"]) {
    const valor = campo.getAttribute(atributo);
    if (valor) candidatos.push(`${etiqueta}[${atributo}=${comillas(valor)}]`);
  }
  candidatos.push(ruta(campo));

  return candidatos.find(selector => {
    try {
      return document.querySelector(selector) === campo;
    } catch {
      return false;
    }
  }) ?? "";
}

// Ruta desde el antepasado más cercano con id (o desde <html>): "#pedido > div:nth-of-type(2) > input"
function ruta(campo: Element): string {
  const partes: string[] = [];
  let actual: Element | null = campo;
  while (actual && actual !== document.documentElement) {
    if (actual !== campo && actual.id && !pareceGenerado(actual.id)) {
      partes.unshift(`#${CSS.escape(actual.id)}`);
      break;
    }
    const padre: Element | null = actual.parentElement;
    const nombre = actual.localName;
    const iguales = padre ? [...padre.children].filter(hijo => hijo.localName === nombre) : [];
    partes.unshift(iguales.length > 1 ? `${nombre}:nth-of-type(${iguales.indexOf(actual) + 1})` : nombre);
    actual = padre;
  }
  return partes.join(" > ");
}

// Nombre para mostrar: su <label>, aria-label, placeholder, name o id
export function describirCampo(campo: CampoTexto): string {
  const textos = [
    campo.labels?.[0]?.textContent,
    campo.getAttribute("aria-label"),
    campo.placeholder,
    campo.name,
    campo.id,
  ];
  const texto = textos.map(t => t?.replace(/\s+/g, " ").trim()).find(t => t) ?? "Campo sin nombre";
  return texto.length > 40 ? texto.slice(0, 39) + "…" : texto;
}
