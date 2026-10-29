// Ajustes del emulador, guardados en chrome.storage.local (solo afectan a este navegador).

export interface Ajustes {
  // Un código por línea
  codigos: string;
  // Campo donde se "lee". Vacío = el elemento con foco en la página.
  selector: string;
  sonido: boolean;
  // Haz rojo sobre el campo mientras se lee y destello verde/rojo al terminar
  efectoLaser: boolean;
  // Retardo aleatorio entre caracteres, en ms (una pistola real teclea en ~20-50 ms por carácter)
  retardoMin: number;
  retardoMax: number;
  // Pausa entre el pitido y el primer carácter, en ms
  pausaInicial: number;
  enviarEnter: boolean;
  // Mostrar el widget flotante en los sitios autorizados (el atajo de teclado funciona igualmente)
  mostrarWidget: boolean;
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  // El último no existe: sirve para probar el aviso de código no encontrado
  codigos: "9788411209625\n9788411209694\n9788411829120\n9780000000000",
  // Primer campo cuyo id empieza por "Isbn_"
  selector: "input[id^='Isbn_']",
  sonido: true,
  efectoLaser: true,
  retardoMin: 25,
  retardoMax: 50,
  pausaInicial: 250,
  enviarEnter: true,
  mostrarWidget: true,
};

export async function cargarAjustes(): Promise<Ajustes> {
  return (await chrome.storage.local.get(AJUSTES_POR_DEFECTO)) as Ajustes;
}

export async function guardarAjustes(cambios: Partial<Ajustes>): Promise<void> {
  await chrome.storage.local.set(cambios);
}

// Posición del código que leerá "Leer siguiente". Se guarda aparte de los ajustes porque la
// comparten los widgets de todas las pestañas.
export async function cargarIndice(): Promise<number> {
  const { indiceSiguiente } = await chrome.storage.local.get({ indiceSiguiente: 0 });
  return indiceSiguiente as number;
}

export async function guardarIndice(indice: number): Promise<void> {
  await chrome.storage.local.set({ indiceSiguiente: indice });
}

export const listaCodigos = (codigos: string): string[] =>
  codigos.split(/\r?\n/).map(c => c.trim()).filter(c => c.length > 0);
