# Emulador de pistola de códigos de barras

Extensión de navegador (Chrome / Edge, Manifest V3) que **simula una pistola lectora de códigos de barras** (ISBN / EAN) sobre cualquier página web. Sirve para probar y enseñar cómo se comporta una aplicación con una pistola real, sin tener el lector físico.

Al vivir fuera de la aplicación, no hay que tocar ni desplegar código de la aplicación para usarla y vale en cualquier entorno (local, preproducción, producción).

## Cómo funciona una pistola real (y qué se emula)

Una pistola USB/Bluetooth en modo *HID* se presenta al sistema como **un teclado**: al leer un código pita, teclea los dígitos muy deprisa (~20-50 ms por carácter) y termina con **Enter**. La aplicación no sabe que hay una pistola; solo ve pulsaciones de teclado en el campo con foco.

La extensión reproduce exactamente eso en la pestaña activa:

1. Pitido de lectura.
2. Foco en el campo destino.
3. Por cada carácter: `keydown` → valor actualizado con el *setter* nativo de `value` → `input` → `keyup`, con un retardo aleatorio entre caracteres.
4. `keydown` / `keypress` / `keyup` de **Enter** (con `keyCode`/`which` = 13 para los manejadores antiguos tipo jQuery / Select2).

Se usa el *setter* nativo de `HTMLInputElement.prototype.value` (y no `campo.value = ...`) para que React / Preact detecten el cambio igual que con el teclado.

> Los eventos generados son sintéticos (`isTrusted: false`). La mayoría de aplicaciones no lo comprueban, pero una que filtrase por `isTrusted` no reaccionaría. Para eventos "de verdad" habría que usar `chrome.debugger` (`Input.dispatchKeyEvent`), que muestra una barra de depuración en la pestaña — ver Roadmap.

## Funcionalidades

- **Panel lateral** persistente (se abre al hacer clic en el icono de la extensión) con la lista de códigos: clic en uno = una lectura.
- **Leer siguiente**: recorre la lista en orden (vuelve al principio al final); el código siguiente queda resaltado y cada código muestra ✓/✗ según su última lectura.
- **Atajo de teclado `Alt+Shift+L`**: lee el siguiente código **desde la propia página**, sin pasar por el panel, así que el foco del teclado no sale de la página (ver [El foco](#el-foco)). Se puede cambiar en `chrome://extensions/shortcuts`; el panel muestra el atajo asignado. Si el panel está abierto, pita y pinta el resultado igual que con un clic.
- **Campo destino configurable** con un selector CSS. Por defecto `input[id^='Isbn_']` (el primer campo cuyo `id` empieza por `Isbn_`). Fijar el campo es útil cuando la aplicación mueve el foco tras cada lectura (p. ej. a una cantidad): así el siguiente código no acaba en el campo equivocado. Si se deja vacío, se escribe en el campo que tenga el foco en la página.
- **Ritmo configurable**: retardo mínimo/máximo entre caracteres, pausa entre el pitido y el primer carácter, y si se termina o no con Enter.
- **Sonido** opcional: pitido de lectura, tecleo y doble pitido grave en los errores (sin campo destino, sitio sin autorizar...). Se reproduce en el panel, no en la página: allí no hay gesto del usuario y el `AudioContext` arrancaría suspendido.
- **Códigos y ajustes persistentes** en `chrome.storage.local`. Por defecto trae varios ISBN de ejemplo y uno que no existe (`9780000000000`) para probar el aviso de código no encontrado.
- **Sitios configurables**: la extensión solo teclea en los sitios que autorices, ya sea `localhost` u otro host (preproducción, producción...). Se gestionan en la sección **Sitios** del panel: escribes la URL (`localhost:5002`, `https://mi-app.ejemplo.com`...) y pulsas **Añadir**, o **Quitar** para retirarlo. Si la pestaña activa no está autorizada, el panel muestra además un atajo **Autorizar este sitio**. El permiso se concede por host: vale para cualquier puerto y ruta de ese host, con el protocolo indicado (`http` o `https`; si no se indica, `https`).

## Uso

1. Abre la página de la aplicación donde se leen los códigos.
2. Abre el panel de la extensión (icono de la barra) y, la primera vez, pulsa **Autorizar este sitio** (o añade el sitio en la sección **Sitios**).
3. Ajusta el **campo destino** en Ajustes (o déjalo vacío y pon el foco en el campo).
4. Pulsa un código (o **Leer siguiente**) en el panel, o pulsa **`Alt+Shift+L`** con el foco en la página: se teclea el código en el campo destino y se envía Enter.
5. Si después de leer hay que teclear algo a mano (p. ej. una cantidad), usa el atajo de teclado en vez del panel.

### El foco

Muchas aplicaciones mueven el foco tras la lectura (p. ej. a la cantidad del producto recién añadido) para seguir con el teclado. Si la lectura se lanza **desde el panel**, el foco del teclado se queda en el panel: la aplicación mueve su foco interno, pero para teclear hay que hacer clic en la página, y ese clic mueve el foco a donde se pincha, no al campo que eligió la aplicación. Chrome no ofrece ninguna API para devolver el foco del teclado del panel a la página.

Con el **atajo de teclado** el foco nunca sale de la página: es como una pistola real, se lee, se teclea la cantidad y Enter, y se vuelve a leer.

## Estructura

```
barcode-scanner-ext/
├── manifest.json           ← Manifest V3 (side_panel, background, permisos, iconos)
├── background.ts           ← abre el panel lateral al hacer clic en el icono y atiende el atajo de teclado
├── sidepanel/
│   ├── sidepanel.html
│   ├── sidepanel.css
│   ├── sidepanel.ts        ← entrada: pestaña activa, permisos, lista de códigos y ajustes
│   └── lib/
│       ├── ajustes.ts      ← ajustes por defecto y persistencia en chrome.storage.local
│       ├── inyeccion.ts    ← función que se inyecta en la página y teclea el código
│       ├── mensajes.ts     ← avisos del background al panel (inicio / fin de una lectura por atajo)
│       └── sonido.ts       ← pitido, pitido de error y tecleo (Web Audio)
├── icons/                  ← icon16/48/128.png
├── tsconfig.json
├── package.json
├── pack.ps1
└── README.md
```

No hay *content script* fijo: cada lectura inyecta `teclearEnPagina` con `chrome.scripting.executeScript` en la pestaña activa y recoge su resultado (`{ ok, mensaje }`). Por eso esa función **no puede usar nada de fuera de su cuerpo** (ni imports ni helpers del módulo): Chrome la serializa y la ejecuta en la página.

`sidepanel/**/*.js` y `background.js` se generan con `tsc` junto a su `.ts` (sin bundler, `"module": "ES2020"`) y no se versionan (ver `.gitignore`). La UI es DOM plano, sin framework; si crece, se puede pasar a Preact + `htm` copiados en una carpeta `vendor/` (MV3 no permite cargar scripts desde CDN y sin bundler no se resuelven imports por nombre de paquete).

## Permisos

| Permiso | Uso |
|---|---|
| `sidePanel` | Mostrar el panel lateral. |
| `storage` | Guardar códigos y ajustes (`local`). |
| `scripting` | Inyectar en la pestaña activa la función que teclea el código. |
| `tabs` | Conocer la URL de la pestaña activa para mostrar el host y saber qué permiso pedir (sin él, Chrome oculta la URL de los sitios no autorizados). |
| `optional_host_permissions: http://*/*`, `https://*/*` | No se concede ningún host al instalar. Se conceden host a host cuando el usuario añade un sitio (sección **Sitios** o **Autorizar este sitio**) y se retiran con **Quitar** o desde `chrome://extensions` → Detalles → Acceso al sitio. |

## Desarrollo / carga local

```powershell
npm install       # una sola vez (instala typescript y @types/chrome)
npm run build     # compila sidepanel/**/*.ts y background.ts
npm run watch     # recompila en cada guardado
```

1. Compila (`npm run build` o deja `npm run watch` corriendo).
2. Abre `chrome://extensions` (o `edge://extensions`).
3. Activa el **Modo desarrollador**.
4. **Cargar descomprimida** → selecciona la carpeta `barcode-scanner-ext`.
5. Haz clic en el icono de la extensión: se abre el panel lateral.
6. Tras editar un `.ts`, recompila y pulsa **Recargar** en la tarjeta de la extensión (y vuelve a abrir el panel si estaba abierto).

## Empaquetado

```powershell
.\pack.ps1
```

Recompila los `.ts` (instalando dependencias si falta `node_modules`) y genera `barcode-scanner-ext-<version>.zip` con `manifest.json` en la raíz (requisito de la Store), incluyendo `sidepanel/`, `icons/` y `background.js` y excluyendo el tooling (`*.ts`). La versión se lee de `manifest.json`.

## Publicación

1. Incrementa `version` en `manifest.json`.
2. Ejecuta `pack.ps1`.
3. Sube el ZIP:
   - **Chrome Web Store** → [Developer Dashboard](https://chrome.google.com/webstore/devconsole) (alta de desarrollador: pago único de 5 USD).
   - **Edge Add-ons** → [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge) (sin coste).
4. Justifica en la revisión los permisos `scripting`, `tabs`, `storage`, `sidePanel` y los `optional_host_permissions`.
5. Elige visibilidad: para uso interno, **No listada** (por enlace) o distribución forzada vía Google Workspace / GPO.

## Solución de problemas

- **"No hay ningún campo que cumpla `input[id^='Isbn_']`"**: la página no tiene ese campo (o todavía no se ha pintado). Ajusta el selector o déjalo vacío para usar el campo con foco.
- **"Autoriza primero este sitio"** / no aparece el botón de autorizar: la pestaña activa no es `http(s)` (p. ej. `chrome://`, la Web Store o un PDF), donde Chrome no deja inyectar scripts.
- **"Cannot access contents of the page"**: se retiró el permiso del sitio desde `chrome://extensions`; vuelve a pulsar **Autorizar este sitio**.
- **He añadido el sitio pero sigue pidiendo autorización**: revisa el protocolo; `http://localhost` y `https://localhost` son permisos distintos.
- **La aplicación no reacciona al Enter**: algún manejador filtra por `isTrusted` o escucha otro evento; revisa en DevTools qué escucha el campo (pestaña *Event Listeners*).
- **No suena nada**: comprueba la casilla *Sonido* en Ajustes y que el panel no esté silenciado en el mezclador del sistema.
- **Cambios en un `.ts` no se reflejan**: falta recompilar y pulsar **Recargar** en `chrome://extensions`.
- **El atajo no hace nada / el panel dice "Sin atajo de teclado"**: Chrome solo aplica el atajo sugerido al **instalar** la extensión (no al recargarla) y no lo asigna si ya lo usa otra extensión. Asígnalo en `chrome://extensions/shortcuts`.
- **El atajo no pita**: el sonido lo pone el panel; con el panel cerrado la lectura se hace igual, pero en silencio.
- **El service worker no arranca tras añadir un import**: `background.ts` es un módulo (`"type": "module"` en el manifest) e importa de `sidepanel/lib/`; las rutas deben acabar en `.js`.

## Roadmap

- [ ] **Sonido con el panel cerrado** (documento `offscreen` con `AUDIO_PLAYBACK`).
- [ ] **Eventos de confianza** (`isTrusted: true`) con `chrome.debugger` / `Input.dispatchKeyEvent`, como opción.
- [ ] **Sufijos configurables**: Tab en vez de Enter, prefijo/sufijo, como permiten configurar las pistolas reales.
- [ ] **Importar códigos** desde un CSV/Excel.
- [ ] **Lectura por cámara** (`BarcodeDetector`) para leer códigos reales con la webcam.
- [ ] **i18n**: soporte de `_locales` (es / en).
