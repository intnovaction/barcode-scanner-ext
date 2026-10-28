// Sonidos de la pistola. Se reproducen en el panel lateral (página de la extensión) y no en la
// página destino: allí el clic no es un gesto del usuario y el AudioContext arrancaría suspendido.

let contextoAudio: AudioContext | null = null;
const obtenerAudio = (): AudioContext => {
  if (!contextoAudio) contextoAudio = new AudioContext();
  if (contextoAudio.state === "suspended") contextoAudio.resume();
  return contextoAudio;
};

// Pitido de lectura correcta, como el de un lector de verdad
export function pitar(): void {
  const ctx = obtenerAudio();
  const osc = ctx.createOscillator();
  const ganancia = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 2400;
  // se programa un poco en el futuro: el AudioContext recién creado tarda en arrancar y se
  // comería el principio del pitido
  const inicio = ctx.currentTime + 0.03;
  ganancia.gain.setValueAtTime(0.15, inicio);
  ganancia.gain.setValueAtTime(0.15, inicio + 0.12);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.18);
  osc.connect(ganancia).connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + 0.18);
}

// Doble pitido grave para los errores (no hay campo destino, página sin permiso...)
export function pitarError(): void {
  const ctx = obtenerAudio();
  [0, 0.16].forEach(desfase => {
    const osc = ctx.createOscillator();
    const ganancia = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 600;
    const inicio = ctx.currentTime + 0.03 + desfase;
    ganancia.gain.setValueAtTime(0.12, inicio);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.12);
    osc.connect(ganancia).connect(ctx.destination);
    osc.start(inicio);
    osc.stop(inicio + 0.12);
  });
}

// Chasquido corto de ruido filtrado, como una tecla
export function teclear(): void {
  const ctx = obtenerAudio();
  const duracion = 0.018;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duracion), ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) {
    datos[i] = (Math.random() * 2 - 1) * (1 - i / datos.length);
  }
  const fuente = ctx.createBufferSource();
  fuente.buffer = buffer;
  const filtro = ctx.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.frequency.value = 2500 + Math.random() * 1500;
  const ganancia = ctx.createGain();
  ganancia.gain.value = 0.25;
  fuente.connect(filtro).connect(ganancia).connect(ctx.destination);
  fuente.start();
}
