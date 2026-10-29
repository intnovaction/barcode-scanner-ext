# Emulador de pistola de códigos de barras

Extensión para Chrome y Edge que **hace de pistola lectora de códigos de barras** (ISBN, EAN...) sin tener la pistola. Sirve para probar y enseñar cómo funciona una aplicación web cuando se leen códigos con una pistola.

No hace falta cambiar nada en la aplicación: la extensión funciona sobre cualquier página web que le indiques.

## Qué hace

Una pistola de verdad, para el ordenador, es como un teclado: cuando lee un código, **escribe los números muy deprisa en el campo donde esté el cursor y pulsa Enter**. La aplicación no sabe que es una pistola; solo ve que alguien ha escrito.

La extensión hace lo mismo: pones en la página una pequeña "pistola" flotante y, cada vez que pulsas **Disparar**, escribe el siguiente código de tu lista en el campo que hayas elegido y pulsa Enter. Además:

- **Pita** como una pistola real y suena el tecleo.
- Un **rayo rojo** pasa por el campo mientras se escribe el código y, al terminar, el campo **se ilumina en verde**.
- **No te mueve el cursor**: si la aplicación, después de leer, salta a otro campo (por ejemplo, a la cantidad), puedes seguir escribiendo ahí directamente, como con una pistola real.

## Instalación

Funciona en Chrome o Edge, versión 102 o posterior. Mientras no esté publicada en la tienda de Chrome, se instala a mano:

1. Descarga o clona esta carpeta y, dentro de ella, ejecuta `npm install` y `npm run build` (hace falta tener [Node.js](https://nodejs.org)).
2. En Chrome, abre `chrome://extensions` (en Edge, `edge://extensions`).
3. Activa el **Modo desarrollador** (arriba a la derecha).
4. Pulsa **Cargar descomprimida** y elige la carpeta `barcode-scanner-ext`.
5. Fija el icono de la extensión en la barra del navegador para tenerlo a mano.

## Cómo se usa

1. Abre la página de tu aplicación donde se leen los códigos.
2. Pulsa el icono de la extensión y luego **Autorizar este sitio**. La extensión solo funciona en las páginas que autorices. Aparece la pistola en una esquina de la página.
3. Pulsa **◎ Campo** en la pistola y haz clic en el campo donde se escriben los códigos. Al pasar el ratón, los campos se marcan en azul con su nombre. Pulsa `Esc` si te arrepientes.
4. Pulsa **Disparar**. Se escribe el código en ese campo y se pulsa Enter.
5. Si después hay que escribir algo a mano (por ejemplo, la cantidad), escríbelo sin hacer clic: el cursor sigue donde lo dejó la aplicación. Vuelve a pulsar **Disparar** para el siguiente código.

Más cosas que puedes hacer:

- **Disparar con el teclado**: `Alt+Shift+L` lee el siguiente código sin tocar el ratón.
- **Leer un código concreto**: haz clic en él en la lista de la pistola.
- **Moverla**: arrástrala por la barra de arriba. Se queda donde la dejes en todas las páginas; para devolverla abajo a la derecha, pulsa **↘** en esa barra o haz doble clic en ella.
- **Hacerla pequeña**: pulsa la flecha de arriba a la derecha para dejar solo el botón Disparar y el atajo de teclado.

### La pistola

- **Disparar**: lee el siguiente código. Debajo se ve cuál toca, por dónde vas (`2 de 4`) y el atajo para disparar sin ratón (`Sin ratón: Alt+Shift+L`). Cuando llega al último, vuelve a empezar.
- **◎ Campo**: el campo donde escribe. Púlsalo para elegir otro.
- **Lista de códigos**: ✓ si se escribió bien y ✗ si no se pudo escribir.
- **Mensaje**: qué ha pasado en la última lectura.
- **Más opciones**: abre la página de opciones.

La extensión solo sabe si ha podido escribir el código. Si el código existe o no en tu aplicación, lo dice tu aplicación, igual que con una pistola de verdad.

### El botón de la extensión

Al pulsar el icono de la extensión en la barra del navegador puedes:

- **Autorizar** o **quitar** la página en la que estás.
- **Elegir el campo** de esa página.
- **Mostrar u ocultar** la pistola en las páginas.
- Ver el atajo de teclado y abrir las **Opciones**.

### Opciones

- **Códigos a leer**: la lista de códigos, uno por línea. Trae tres ISBN de ejemplo y uno que no existe (`9780000000000`) para ver cómo avisa tu aplicación. **Volver al primero** empieza la lista de nuevo y **Poner códigos de ejemplo** vuelve a poner los de ejemplo (si tenías otros, pide confirmación antes de sustituirlos).
- **Páginas donde funciona**: puedes añadir una escribiendo su dirección (por ejemplo `localhost:5002` o `https://mi-app.ejemplo.com`) o quitarla. Al autorizar una dirección vale para todas sus páginas. Aquí también se puede ocultar la pistola (**Mostrar la pistola en estas páginas**).
- **Dónde se escribe el código**: elige entre **Un campo concreto** (el elegido con **◎ Campo** en la pistola) o **Donde esté el cursor** (el campo en el que hayas hecho clic antes de disparar). Si pasas a "donde esté el cursor", se recuerda el campo para poder volver a él con un clic. Quien sepa CSS puede escribirlo a mano en *Avanzado*.
- **Velocidad y efectos**:
  - **Velocidad**: la pausa entre número y número (cada vez una al azar entre la mínima y la máxima) y la espera antes de empezar, en milisegundos. Una pistola real tarda unos 20-50 ms por número.
  - **Pulsar Enter al terminar**, **Sonido** y **Rayo láser**: se activan o desactivan.
  - **Volver a los valores de fábrica**: solo afecta a esta sección.
- **Disparar con el teclado**: el atajo que tienes asignado. Se cambia en `chrome://extensions/shortcuts`.

### Normas que se imitan

La extensión imita el funcionamiento habitual de las pistolas lectoras de códigos de barras en modo teclado:

- Se comportan como un teclado USB, según la especificación de dispositivos de interfaz humana (USB HID) del USB Implementers Forum: escriben el código y terminan con Enter.
- Los ISBN siguen la norma **ISO 2108** y en el libro se imprimen como código de barras **EAN-13** (**ISO/IEC 15420**).

Es una herramienta de pruebas: no lee códigos de barras reales, no comprueba que los códigos sean válidos (ni el dígito de control) y no está certificada conforme a ninguna de estas normas.

## Problemas frecuentes

- **No aparece la pistola en la página**:
  - Comprueba con el icono de la extensión que la página está autorizada y que *Mostrar la pistola en estas páginas* está marcado (en el icono o en Opciones).
  - Recarga la página.
  - No funciona en páginas internas del navegador (`chrome://...`), en la tienda de Chrome, en PDFs ni dentro de marcos (*iframes*).
- **Autoricé la página pero no aparece**: mira si la dirección empieza por `http://` o `https://`. Son direcciones distintas; autoriza la que uses.
- **"No encuentro el campo… en esta página"**: el campo elegido no está en esta página o todavía no ha cargado. Elige otra vez el campo con **◎ Campo**.
- **"El cursor no está en ningún campo"**: no hay campo elegido y el cursor no está en ningún campo. Haz clic en el campo antes de disparar o elige uno con **◎ Campo**.
- **"En ese campo no se puede escribir"**: el campo está bloqueado por la aplicación.
- **Al elegir campo, el que quiero no se marca en azul**: solo se pueden elegir campos donde se escribe texto (no desplegables ni casillas). Algunos campos de componentes especiales tampoco se pueden elegir; en ese caso elige **Donde esté el cursor** en Opciones y haz clic en el campo antes de disparar.
- **La aplicación no hace nada al pulsar Enter**: algunas aplicaciones distinguen si una tecla la pulsa una persona o un programa, y entonces no reaccionan a la extensión.
- **No suena**: mira que *Sonido* esté marcado en Opciones. El navegador no deja sonar una página hasta que has hecho clic o escrito algo en ella.
- **El atajo de teclado no hace nada**:
  - Si en el icono de la extensión sale un `!` rojo, la página no está autorizada.
  - Si no sale nada, asigna el atajo en `chrome://extensions/shortcuts`: Chrome no lo pone si otra extensión ya lo usa.
- **La pistola tapa algo**: arrástrala a otro sitio o hazla pequeña.

---

## Para desarrolladores

### Estructura

```
barcode-scanner-ext/
├── manifest.json           ← configuración de la extensión (Manifest V3)
├── background.ts           ← proceso de fondo: pone la pistola en los sitios autorizados y atiende el atajo
├── comun/                  ← código que usan todas las partes
│   ├── ajustes.ts          ← ajustes por defecto y guardado
│   ├── mensajes.ts         ← mensajes entre el proceso de fondo, el popup y la pistola
│   └── sitios.ts           ← sitios autorizados y carga de la pistola en ellos
├── widget/                 ← la pistola, que se ejecuta dentro de la página
│   ├── cargador.ts         ← punto de entrada en la página: carga widget.js
│   ├── widget.ts           ← la pistola: botones, lista, lecturas, elegir campo, moverla y plegarla
│   ├── teclado.ts          ← busca el campo y escribe el código tecla a tecla
│   ├── elegir.ts           ← modo "elegir campo": marca los campos y recoge el clic
│   ├── selector.ts         ← convierte el campo elegido en un selector CSS y le pone nombre
│   ├── laser.ts            ← rayo rojo y destello verde
│   ├── estilos.ts          ← estilos de la pistola
│   └── sonido.ts           ← pitidos y tecleo
├── popup/                  ← ventana del icono de la extensión (html, css, ts)
├── opciones/               ← página de opciones (html, css, ts)
├── icons/                  ← iconos de 16, 48 y 128 px
├── tsconfig.json
├── package.json / package-lock.json
├── pack.ps1                ← genera el ZIP para publicar
├── .gitignore
└── README.md
```

El código es TypeScript sin frameworks ni empaquetador: `tsc` genera cada `.js` junto a su `.ts`. Los `.js` no se suben al repositorio.

```powershell
npm install       # una sola vez
npm run build     # compila
npm run watch     # recompila al guardar
```

Tras cambiar código, compila y pulsa **Recargar** en la tarjeta de la extensión en `chrome://extensions`. La pistola se vuelve a cargar sola en las pestañas abiertas.

### Decisiones de diseño

Cosas que parecen raras en el código pero están hechas a propósito:

- **La pistola va dentro de la página, no en un panel lateral ni en un popup.** Cualquier clic fuera de la página le quita el cursor al campo de la aplicación.
- **Los botones de la pistola cancelan el `mousedown`.** Así el clic funciona sin que el navegador mueva el cursor al botón.
- **`cargador.js` carga `widget.js` con `import()`.** Los scripts que una extensión mete en una página no pueden usar `import`. Por eso `widget/`, `comun/` e `icons/` están en `web_accessible_resources`.
- **El valor se cambia con el *setter* nativo de `value`**, y Enter lleva `keyCode` 13. Lo primero es para que React y Preact vean el cambio; lo segundo, para las librerías antiguas como jQuery.
- **Cada parte visible va en su propio *shadow root* cerrado**, sin `innerHTML`. Así la página y la pistola no se cambian los estilos entre sí, y funciona en páginas que prohíben `innerHTML`.
- **Al elegir un campo cuyo `id` acaba en número, se guarda el comienzo del `id`** (`Isbn_3` → `input[id^="Isbn_"]`). En listas con una fila por línea el número cambia. Si eso no identifica el campo, se prueba con `#id`, `name`, `aria-label`, `placeholder` y, por último, con la ruta (`selector.ts`).

### Permisos

| Permiso | Para qué |
|---|---|
| `storage` | Guardar códigos, ajustes, por dónde va la lista y dónde está la pistola. |
| `scripting` | Cargar la pistola en las páginas autorizadas. |
| `activeTab` | Saber en qué página estás al abrir el icono de la extensión. |
| `optional_host_permissions` (`http://*/*`, `https://*/*`) | Al instalarla no tiene acceso a ninguna web. Se pide sitio a sitio al autorizarlo y se retira con **Quitar**. |

Los ficheros declarados en `web_accessible_resources` los puede pedir cualquier web, así que una página podría saber que la extensión está instalada. Para una herramienta de pruebas no es un problema.

### Publicar

1. Sube el número de `version` en `manifest.json`.
2. Ejecuta `.\pack.ps1`: compila y genera `barcode-scanner-ext-<version>.zip` solo con lo necesario (sin los `.ts`).
3. Sube el ZIP:
   - **Chrome Web Store**: [Developer Dashboard](https://chrome.google.com/webstore/devconsole) (alta de desarrollador: pago único de 5 USD).
   - **Edge Add-ons**: [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge) (gratis).
4. En la revisión, explica para qué se usa cada permiso (tabla de arriba).
5. Para uso interno, publícala como **No listada** (solo con enlace) o distribúyela con Google Workspace / directivas de grupo.

### Problemas al desarrollar

- **Un cambio no se ve**: falta compilar o pulsar **Recargar** en `chrome://extensions`.
- **El atajo no se asigna**: Chrome solo pone el atajo sugerido al **instalar** la extensión, no al recargarla.
- **El proceso de fondo no arranca tras añadir un `import`**: las rutas de los `import` tienen que acabar en `.js`.

### Pendiente

- [ ] Opción de teclas "de verdad" con `chrome.debugger`, para aplicaciones que distinguen si teclea una persona.
- [ ] Elegir qué tecla se pulsa al final (Tab en vez de Enter) o añadir texto antes o después, como en las pistolas reales.
- [ ] Importar códigos desde un CSV o Excel.
- [ ] Leer códigos reales con la cámara.
- [ ] Pistola dentro de *iframes*.
- [ ] Textos en inglés.
