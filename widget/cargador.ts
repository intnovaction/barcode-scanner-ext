// Content script registrado en los sitios autorizados. Los content scripts no pueden ser módulos
// ES, así que este carga el widget (que sí lo es) con import() dinámico. Por eso widget/ y comun/
// están en web_accessible_resources. Sin imports ni exports: tsc lo compila como script clásico.

import(chrome.runtime.getURL("widget/widget.js"))
  .then(modulo => modulo.montar())
  .catch(e => console.error("[Emulador de pistola] No se pudo cargar el widget", e));
