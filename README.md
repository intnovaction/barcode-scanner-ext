# Emulador de pistola de códigos de barras

Extensión de navegador (Chrome / Edge, Manifest V3) que **simula una pistola lectora de códigos de barras** (ISBN / EAN) con un widget flotante sobre la página web. Sirve para probar y enseñar cómo se comporta una aplicación con una pistola real, sin tener el lector físico.

Al vivir fuera de la aplicación, no hay que tocar ni desplegar código de la aplicación para usarla y vale en cualquier entorno (local, preproducción, producción).

## Cómo funciona una pistola real (y qué se emula)

Una pistola USB/Bluetooth en modo *HID* se presenta al sistema como **un teclado**: al leer un código pita, teclea los dígitos muy deprisa (~20-50 ms por carácter) y termina con **Enter**. La aplicación no sabe que hay una pistola; solo ve pulsaciones de teclado en el campo con foco.

La extensión reproduce exactamente eso en la pestaña activa:

1. Pitido de lectura.
2. Foco en el campo destino (el que indique el selector o el que ya tenga el foco).
3. Por cada carácter: `keydown` → valor actualizado con el *setter* nativo de `value` → `input` → `keyup`, con un retardo aleatorio entre caracteres.
4. `keydown` / `keypress` / `keyup` de **Enter** (con `keyCode`/`which` = 13 para los manejadores antiguos tipo jQuery / Select2).

Se usa el *setter* nativo de `HTMLInputElement.prototype.value` (y no `campo.value = ...`) para que React / Preact detecten el cambio igual que con el teclado.

> Los eventos generados son sintéticos (`isTrusted: false`). La mayoría de aplicaciones no lo comprueban, pero una que filtrase por `isTrusted` no reaccionaría. Para eventos "de verdad" habría que usar `chrome.debugger` (`Input.dispatchKeyEvent`), que muestra una barra de depuración en la pestaña — ver Roadmap.

## Funcionalidades

- **Widget flotante en la página** (en los sitios autorizados): un botón **Disparar** con el código que toca, la lista de códigos (clic en uno = una lectura), la posición (`2 de 4`), una marca ✓/✗ con el resultado de cada lectura y el mensaje de la última. Se puede **arrastrar** por la cabecera y **plegar** para dejar solo el botón Disparar; la posición y el plegado se recuerdan.
- **Efecto láser**: al disparar, un haz rojo apunta al campo destino y lo cruza de izquierda a derecha al ritmo del tecleo, dejando iluminada la parte leída: llega al final con el último carácter, justo antes del Enter. Al terminar, el campo destella en verde (leído) o en rojo (error). El destello sigue al campo aunque la aplicación lo mueva al añadir la línea. Se puede desactivar en Opciones.
- **No quita el foco**: ningún clic en el widget se lleva el foco de la página (ver [El foco](#el-foco)).
- **Atajo de teclado `Alt+Shift+L`**: dispara sin tocar el ratón, aunque el widget esté oculto. Se puede cambiar en `chrome://extensions/shortcuts`. Si la pestaña no tiene widget (sitio sin autorizar), el icono muestra un `!` rojo unos segundos.
- **Leer en orden**: Disparar recorre la lista y vuelve al principio al final. La posición se comparte entre pestañas; si una lectura falla, no avanza.
- **Campo destino configurable** con un selector CSS. Por defecto `input[id^='Isbn_']` (el primer campo cuyo `id` empieza por `Isbn_`). Fijar el campo es útil cuando la aplicación mueve el foco tras cada lectura (p. ej. a una cantidad): así el siguiente código no acaba en el campo equivocado. Si se deja vacío, se escribe en el campo que tenga el foco en la página.
- **Ritmo configurable**: retardo mínimo/máximo entre caracteres, pausa entre el pitido y el primer carácter, y si se termina o no con Enter.
- **Sonido** opcional: pitido de lectura, tecleo y doble pitido grave en los errores. Suena en la propia página, así que sigue su política de reproducción automática: basta con que se haya hecho clic o tecleado algo en ella.
- **Códigos y ajustes persistentes** en `chrome.storage.local`, editables en la página de **Opciones**. Por defecto trae varios ISBN de ejemplo y uno que no existe (`9780000000000`) para probar el aviso de código no encontrado.
- **Sitios configurables**: la extensión solo aparece y teclea en los sitios que autorices, ya sea `localhost` u otro host (preproducción, producción...). Se autorizan desde el popup del icono (**Autorizar este sitio**) o en la sección **Sitios** de Opciones, escribiendo la URL (`localhost:5002`, `https://mi-app.ejemplo.com`...). El permiso se concede por host: vale para cualquier puerto y ruta de ese host, con el protocolo indicado (`http` o `https`; si no se indica, `https`).

## Uso

1. Abre la página de la aplicación donde se leen los códigos.
2. Pulsa el icono de la extensión y, la primera vez, **Autorizar este sitio**. Aparece el widget en la página.
3. Ajusta el **campo destino** en Opciones (o déjalo vacío y pon el foco en el campo).
4. Pulsa **Disparar** en el widget (o un código de la lista), o **`Alt+Shift+L`**: se teclea el código en el campo destino y se envía Enter.
5. Si después de leer hay que teclear algo (p. ej. una cantidad), teclea directamente: el foco sigue donde lo dejó la aplicación.

El popup del icono también permite quitar el sitio, ocultar el widget y abrir las **Opciones** (códigos, sitios y ajustes).

### El foco

Muchas aplicaciones mueven el foco tras la lectura (p. ej. a la cantidad del producto recién añadido) para seguir con el teclado. Con una pistola real el foco nunca sale de la aplicación, y el widget se comporta igual: cancela el `mousedown` de sus botones, que es lo que haría que el navegador moviese el foco al botón. El clic sigue funcionando, pero el foco se queda en el campo que eligió la aplicación.

Por eso es un widget dentro de la página y no un panel lateral o un popup: esos son otra parte de la ventana, y cualquier clic en ellos le quita el foco a la página.

## Estructura

```
barcode-scanner-ext/
├── manifest.json           ← Manifest V3 (popup, opciones, background, permisos, iconos)
├── background.ts           ← registra el widget en los sitios autorizados y atiende el atajo de teclado
├── comun/
│   ├── ajustes.ts          ← ajustes por defecto y persistencia en chrome.storage.local
│   ├── mensajes.ts         ← mensajes entre el background y el widget
│   └── sitios.ts           ← patrones de permiso, registro e inyección del widget
├── widget/                 ← lo que se ejecuta en la página
│   ├── cargador.ts         ← content script: carga widget.js con import() dinámico
│   ├── widget.ts           ← widget flotante (shadow DOM), lectura y posición
│   ├── estilos.ts          ← CSS del widget
│   ├── teclado.ts          ← teclea el código en el campo destino y envía Enter
│   ├── laser.ts            ← haz rojo que cruza el campo al ritmo del tecleo y destello al terminar
│   └── sonido.ts           ← pitido, pitido de error y tecleo (Web Audio)
├── popup/                  ← popup del icono: autorizar / quitar el sitio, mostrar el widget
├── opciones/               ← página de opciones: códigos, sitios y ajustes
├── icons/                  ← icon16/48/128.png
├── tsconfig.json
├── package.json
├── pack.ps1
└── README.md
```

El widget se registra como *content script* con `chrome.scripting.registerContentScripts` en los sitios autorizados, y se vuelve a registrar cada vez que se añade o se quita un sitio. En las pestañas que ya estaban abiertas se inyecta a mano. Los *content scripts* no pueden ser módulos ES, así que `widget/cargador.js` es un script clásico que carga `widget/widget.js` con `import()`. Por eso `widget/`, `comun/` e `icons/` están en `web_accessible_resources`.

El widget se pinta dentro de un *shadow root* cerrado, con los estilos como hoja construida (`adoptedStyleSheets`): ni la página le pisa los estilos ni él los de la página, y no depende del CSP de la página. Los elementos se crean con `createElement` (sin `innerHTML`) por las páginas que imponen Trusted Types.

Los `.js` se generan con `tsc` junto a su `.ts` (sin bundler, `"module": "ES2020"`) y no se versionan (ver `.gitignore`). La UI es DOM plano, sin framework.

## Permisos

| Permiso | Uso |
|---|---|
| `storage` | Guardar códigos, ajustes y la posición del widget (`local`). |
| `scripting` | Registrar el widget como *content script* en los sitios autorizados e inyectarlo en las pestañas ya abiertas. |
| `activeTab` | Conocer la URL de la pestaña activa al abrir el popup, para saber qué sitio autorizar. |
| `optional_host_permissions: http://*/*`, `https://*/*` | No se concede ningún host al instalar. Se conceden host a host cuando el usuario autoriza un sitio (popup u Opciones) y se retiran con **Quitar** o desde `chrome://extensions` → Detalles → Acceso al sitio. |

`web_accessible_resources` expone `widget/`, `comun/` e `icons/` a las páginas http(s): lo necesita el `import()` del cargador. Una página podría detectar que la extensión está instalada pidiendo esos ficheros; para una herramienta de pruebas no es un problema.

## Desarrollo / carga local

```powershell
npm install       # una sola vez (instala typescript y @types/chrome)
npm run build     # compila todos los .ts
npm run watch     # recompila en cada guardado
```

1. Compila (`npm run build` o deja `npm run watch` corriendo).
2. Abre `chrome://extensions` (o `edge://extensions`).
3. Activa el **Modo desarrollador**.
4. **Cargar descomprimida** → selecciona la carpeta `barcode-scanner-ext`.
5. Abre la aplicación, haz clic en el icono de la extensión y autoriza el sitio.
6. Tras editar un `.ts`, recompila y pulsa **Recargar** en la tarjeta de la extensión. Al recargarla se vuelve a montar el widget en las pestañas abiertas de los sitios autorizados.

## Empaquetado

```powershell
.\pack.ps1
```

Recompila los `.ts` (instalando dependencias si falta `node_modules`) y genera `barcode-scanner-ext-<version>.zip` con `manifest.json` en la raíz (requisito de la Store), incluyendo `background.js`, `comun/`, `widget/`, `popup/`, `opciones/` e `icons/` y excluyendo el tooling (`*.ts`). La versión se lee de `manifest.json`.

## Publicación

1. Incrementa `version` en `manifest.json`.
2. Ejecuta `pack.ps1`.
3. Sube el ZIP:
   - **Chrome Web Store** → [Developer Dashboard](https://chrome.google.com/webstore/devconsole) (alta de desarrollador: pago único de 5 USD).
   - **Edge Add-ons** → [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge) (sin coste).
4. Justifica en la revisión los permisos `scripting`, `activeTab`, `storage`, los `optional_host_permissions` y los `web_accessible_resources`.
5. Elige visibilidad: para uso interno, **No listada** (por enlace) o distribución forzada vía Google Workspace / GPO.

## Solución de problemas

- **No aparece el widget**: el sitio no está autorizado (el popup lo indica), está desactivado *Mostrar el widget* o la pestaña no es `http(s)` (p. ej. `chrome://`, la Web Store o un PDF), donde Chrome no deja inyectar scripts. Tras autorizar un sitio el widget aparece en sus pestañas abiertas; si no, recarga la página.
- **"No hay ningún campo que cumpla `input[id^='Isbn_']`"**: la página no tiene ese campo (o todavía no se ha pintado). Ajusta el selector o déjalo vacío para usar el campo con foco.
- **He añadido el sitio pero no aparece**: revisa el protocolo; `http://localhost` y `https://localhost` son permisos distintos.
- **La aplicación no reacciona al Enter**: algún manejador filtra por `isTrusted` o escucha otro evento; revisa en DevTools qué escucha el campo (pestaña *Event Listeners*).
- **No suena nada**: comprueba la casilla *Sonido* en Opciones. Si la lectura es por atajo nada más cargar la página, el navegador no deja sonar hasta que haya un clic o una tecla en ella.
- **Cambios en un `.ts` no se reflejan**: falta recompilar y pulsar **Recargar** en `chrome://extensions`.
- **El atajo no hace nada / sale un `!` en el icono**: la pestaña no tiene widget (sitio sin autorizar). Si no pasa nada, Chrome no ha asignado el atajo: solo aplica el sugerido al **instalar** la extensión (no al recargarla) y no lo asigna si ya lo usa otra extensión. Asígnalo en `chrome://extensions/shortcuts`; el popup muestra el atajo asignado.
- **El widget tapa algo de la página**: arrástralo por la cabecera o plégalo.
- **El service worker no arranca tras añadir un import**: `background.ts` es un módulo (`"type": "module"` en el manifest); las rutas de los imports deben acabar en `.js`.

## Roadmap

- [ ] **Eventos de confianza** (`isTrusted: true`) con `chrome.debugger` / `Input.dispatchKeyEvent`, como opción.
- [ ] **Sufijos configurables**: Tab en vez de Enter, prefijo/sufijo, como permiten configurar las pistolas reales.
- [ ] **Importar códigos** desde un CSV/Excel.
- [ ] **Lectura por cámara** (`BarcodeDetector`) para leer códigos reales con la webcam.
- [ ] **i18n**: soporte de `_locales` (es / en).
