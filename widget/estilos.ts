// Estilos del widget. Van dentro de su shadow root, así que ni la página los pisa ni ellos pisan
// la página. Se cargan como hoja construida (adoptedStyleSheets), que no depende del CSP de la página.

export const ESTILOS = `
:host {
  all: initial;
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
}

.widget {
  width: 230px;
  font: 12px/1.4 -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  color: #1f2937;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
  overflow: hidden;
  user-select: none;
}

button {
  font: inherit;
  color: inherit;
  cursor: pointer;
  border: 0;
  background: none;
  padding: 0;
}
button:disabled { cursor: default; opacity: .5; }

.cabecera {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 10px;
  background: linear-gradient(135deg, #374151, #1f2937);
  color: #fff;
  cursor: move;
}
.cabecera img { width: 18px; height: 18px; }
.titulo { flex: 1; font-weight: 600; }
.cabecera button {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 22px;
}
.cabecera button:hover { background: rgba(255, 255, 255, .15); }

.cuerpo { padding: 10px; }

.disparar {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  background: #1f2937;
  color: #fff;
}
.disparar:hover:not(:disabled) { background: #111827; }
.disparar .etiqueta { font-weight: 600; }
.disparar .codigo { font-family: Consolas, "Courier New", monospace; font-size: 11px; opacity: .8; }
.disparar.leyendo { background: #dc2626; opacity: 1; }

.info {
  display: flex;
  justify-content: space-between;
  margin: 6px 2px 0;
  color: #6b7280;
  font-size: 11px;
}

.codigos {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}
.codigos li + li { border-top: 1px solid #e5e7eb; }
.codigos button {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 4px 8px;
  text-align: left;
  font-family: Consolas, "Courier New", monospace;
}
.codigos button:hover:not(:disabled) { background: #f3f4f6; }
.codigos .actual button { background: #eff6ff; }
.codigos .vacio { padding: 6px 8px; color: #6b7280; }
.ok { color: #059669; }
.error { color: #dc2626; }

.estado {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 6px;
}
.estado.ok { background: #ecfdf5; color: #065f46; }
.estado.error { background: #fef2f2; color: #991b1b; }

.pie { margin-top: 8px; text-align: right; }
.enlace { color: #2563eb; }
.enlace:hover { text-decoration: underline; }

.plegado .cuerpo > :not(.disparar) { display: none; }
[hidden] { display: none !important; }
`;

// Aplica una hoja de estilos a un shadow root. Si el navegador no admite hojas construidas, se
// recurre a un <style> (que sí depende del CSP de la página).
export function aplicarEstilos(destino: ShadowRoot, css: string): void {
  try {
    const hoja = new CSSStyleSheet();
    hoja.replaceSync(css);
    destino.adoptedStyleSheets = [hoja];
  } catch {
    const estilo = document.createElement("style");
    estilo.textContent = css;
    destino.append(estilo);
  }
}
