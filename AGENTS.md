# AGENTS.md — YUSEPE manga

## Qué es

**YUSEPE manga** es una aplicación de escritorio (Electron) para **crear y gestionar proyectos de manga**. Su público objetivo son personas con capacidad creativa para contar historias pero **sin formación en dibujo**: la herramienta debe resolverles la maquetación, la organización y la gestión del proyecto con la menor fricción posible.

Principios de producto (tenerlos siempre presentes al tomar decisiones):

- **Soluciones reales para no ilustradores.** Nada de jerga profesional ni flujos de trabajo complejos.
- **Valores por defecto sensatos.** Presets de formato reales (B5 tankōbon, A5, A4, US Comic), márgenes preconfigurados, ajuste automático de imágenes a márgenes.
- **Guardado automático.** El usuario nunca debe preocuparse por perder trabajo.
- **Estilo sobrio.** Interfaz limpia en grises neutros con un único acento (indigo).

## Stack

- **Electron** (proceso main en `src/main/`, preload en `src/preload/`)
- **React 18 + TypeScript** en el renderer (`src/renderer/`)
- **electron-vite** como sistema de build (main + preload en CJS, renderer con HMR)
- **Tailwind CSS v4** (vía `@tailwindcss/vite`, sin archivo de config; se importa con `@import "tailwindcss"` en `index.css`)
- **lucide-react** para TODOS los iconos. No crear SVGs a mano.

## Comandos

> **IMPORTANTE:** antes de `npm install` o `npm run dev`, activar Node 20:
>
> ```bash
> nvm use 20
> ```

```bash
nvm use 20
npm install        # instalar dependencias
npm run dev        # desarrollo con HMR
npm run build      # build de producción (out/)
npm run typecheck  # verificación de tipos (tsc --noEmit)
```

No hay tests automatizados todavía; la verificación actual es `typecheck` + `build` + ejecutar `npm run dev`.

## Estructura del código

```
src/
├── main/index.ts        Proceso principal: ventana, IPC, archivos, protocolo ymg://
├── preload/index.ts     contextBridge: expone window.yusepe (API tipada)
├── shared/types.ts      Tipos compartidos main/preload/renderer (única fuente de verdad)
└── renderer/
    ├── index.html
    └── src/
        ├── App.tsx                  Navegación (overview/create/editor/story)
        ├── lib/
        │   ├── units.ts             Presets, PX_PER_MM, geometría, constantes
        │   ├── useDrag.ts           Hook de arrastre con puntero (listeners en window)
        │   └── prefabs.tsx          Arte SVG de escenarios prefabricados (registro PREFABS)
        ├── components/
        │   ├── Modal.tsx                Diálogo de confirmación genérico
        │   ├── PagesPanel.tsx           Sidebar de miniaturas (todas las capas)
        │   ├── PageCanvas.tsx           Lienzo: capas + herramientas + drop
        │   ├── PanelItem.tsx            Viñeta poligonal (clip, vértices, deformar)
        │   ├── PlacedImageItem.tsx      Elemento colocado (mover/redimensionar)
        │   ├── PlacedImageContent.tsx   Contenido: asset | prefab | personaje
        │   ├── BalloonItem.tsx          Globo de diálogo (formas SVG, cola, texto)
        │   ├── SfxItem.tsx              Onomatopeya (estilos, rotación, edición)
        │   ├── CharacterFace.tsx        Retrato paramétrico del personaje
        │   ├── CharacterBuilderModal.tsx Constructor de personajes
        │   ├── AIBackgroundModal.tsx    Generación de fondos con IA + biblioteca
        │   └── ToolStrip.tsx            Barra vertical de herramientas
        └── screens/
            ├── Overview.tsx         Proyectos recientes / estado vacío
            ├── CreateProject.tsx    Asistente de creación
            ├── Editor.tsx           Editor de páginas (orquesta todo)
            └── StoryBuilder.tsx     Constructor de historia (premisa/capítulos/escenas)
```

## Formato de proyecto en disco (.ymanga)

Un proyecto es una **carpeta** elegida por el usuario (obligatoria al crear el proyecto) con:

```
MiProyecto/
├── project.ymanga     # JSON con la definición completa del proyecto
└── assets/            # imágenes copiadas dentro del proyecto (nunca se referencian archivos externos)
```

El `.ymanga` enlaza los assets mediante **rutas relativas** que actúan como enlaces simbólicos internos. Ejemplo:

```json
{
  "version": 1,
  "name": "Crónicas del barrio",
  "createdAt": "2026-07-18T10:00:00.000Z",
  "page": {
    "presetId": "b5",
    "width": 182,
    "height": 257,
    "margins": { "top": 20, "right": 15, "bottom": 20, "left": 15 }
  },
  "pages": [
    {
      "id": "uuid",
      "images": [
        { "id": "uuid", "src": "assets/fondo.png", "x": 0, "y": 0, "w": 182, "h": 257 }
      ],
      "panels": [
        {
          "id": "uuid",
          "x": 15, "y": 20, "w": 74.5, "h": 100,
          "corners": [
            { "x": 0, "y": 8 }, { "x": 74.5, "y": 0 },
            { "x": 74.5, "y": 100 }, { "x": 0, "y": 100 }
          ],
          "images": [
            { "id": "uuid", "src": "assets/viñeta-1.png", "x": 0, "y": 0, "w": 74.5, "h": 60 }
          ]
        }
      ],
      "balloons": [
        {
          "id": "uuid",
          "kind": "speech",
          "x": 20, "y": 25, "w": 46, "h": 30,
          "text": "¡Llegamos!",
          "fontSize": 4.2,
          "tail": { "x": 32, "y": 68 }
        }
      ],
      "strokes": [
        { "id": "uuid", "points": [20, 30, 21.5, 31, 23, 32], "color": "#141414", "width": 0.8 }
      ],
      "stamps": [
        { "id": "uuid", "pattern": "dots", "x": 60, "y": 90, "size": 14 }
      ],
      "sfx": [
        { "id": "uuid", "text": "¡BOOM!", "x": 90, "y": 60, "fontSize": 12, "rotation": -8, "style": "impact", "color": "#141414" }
      ]
    }
  ],
  "story": {
    "premise": "Un repartidor descubre que su barrio es un punto ciego del tiempo.",
    "chapters": [
      {
        "id": "uuid",
        "title": "Capítulo 1",
        "summary": "Presentación del barrio y del protagonista.",
        "scenes": [
          { "id": "uuid", "text": "Akira llega al barrio en bicicleta.", "pageId": "uuid-de-pagina" }
        ]
      }
    ]
  },
  "characters": [
    {
      "id": "uuid",
      "name": "Akira",
      "config": {
        "faceShape": "round", "skin": "#f7cda3", "hairStyle": "spiky",
        "hairColor": "#2b2622", "eyeStyle": "normal", "expression": "happy"
      }
    }
  ],
  "library": [
    { "id": "uuid", "name": "mi textura", "src": "assets/textura.png" }
  ]
}
```

Convenciones del formato:

- **Unidades: milímetros** en todo el documento (página, márgenes, posición/tamaño de imágenes, viñetas, globos y fuentes). El renderer convierte a píxeles con `PX_PER_MM * zoom`.
- `src` siempre es relativo a la raíz del proyecto (`assets/...`).
- **`images` (página)** son imágenes libres (fondos, a sangre); se renderizan debajo de las viñetas.
- **`panels`**: viñetas con borde (0.55 mm) que **recortan** sus imágenes. `x/y/w/h` es el *bounding box*; **`corners`** son los 4 vértices del cuadrilátero en orden [sup-izq, sup-der, inf-der, inf-izq], **relativos al bounding box** — una viñeta rectangular tiene las esquinas del bbox. Deformar un vértice recalcula el bbox y compensa las imágenes para que no salten. Guardarraíl: solo se permiten cuadriláteros **convexos** (`isConvexQuad`). `toneSrc` opcional: ruta a un SVG en `assets/tramas_vignetas/` que se usa como patrón de fondo repetitivo (trama de screentone). Las tramas built-in se copian automáticamente desde `assets/tramas_vignetas/` de la app al crear o abrir un proyecto. Las coordenadas `x/y` de las imágenes internas son **relativas al bounding box**. Al dividir una viñeta (vertical/horizontal) las mitades nacen rectangulares, las imágenes se quedan en la primera mitad y el gutter es de 3 mm. Los proyectos antiguos sin `corners` se normalizan al abrir.
- **`balloons`**: `kind` ∈ `speech | thought | shout | caption`. `tail` es la punta de la cola en coordenadas de página (`null` en cartelas). `fontSize` en mm.
- **`strokes`**: trazos a mano alzada; `points` aplanados `[x1,y1,x2,y2,...]` en coords de página. **`stamps`**: timbres de trama (8 patrones: `dots | dotsDense | dashes | crosshatch | linesV | linesH | stars | bricks`, `x/y` centro, `size` diámetro, tamaño continuo por slider 5–40 mm). **`sfx`**: onomatopeyas (`x/y` centro, `fontSize` mm, `rotation` grados, `style` ∈ `impact | outline | brush`).
- **`images[].src`** puede ser: ruta de asset (`assets/...`), prefab de escenario (`prefab:<id>` del registro en `lib/prefabs.tsx`), o `"character"` (el campo `character` lleva una **copia** de la `CharacterConfig`: editar el personaje guardado no altera las copias ya colocadas).
- **`story`**: premisa + capítulos + escenas; `scene.pageId` vincula escena ↔ página (o `null`).
- **`characters`**: personajes guardados (nombre + config paramétrica del `CharacterFace`). **`library`**: elementos propios importados (nombre + ruta de asset).
- Los proyectos antiguos sin estos campos se normalizan al abrir (`normalizeProject` en main).
- Los proyectos recientes se guardan en `userData/recent-projects.json` (máx. 12), con detección de proyectos eliminados del disco.

## Arquitectura de comunicación (IPC)

El renderer **no tiene acceso a Node**. Todo pasa por `window.yusepe` (definido en `src/preload/index.ts`):

| Método | Canal IPC | Descripción |
|---|---|---|
| `selectFolder()` | `dialog:selectFolder` | Diálogo para elegir/crear carpeta |
| `createProject(payload)` | `project:create` | Crea carpeta + `assets/` + `project.ymanga`. Error `PROJECT_EXISTS` si ya hay proyecto |
| `openProjectDialog()` | `project:openDialog` | Abrir un `.ymanga` mediante diálogo |
| `openProjectPath(path)` | `project:openPath` | Abrir desde recientes |
| `saveProject(path, project)` | `project:save` | Escritura del `.ymanga` (autosave cada 600 ms tras cambios) |
| `listRecents()` / `removeRecent(path)` | `recents:list` / `recents:remove` | Lista de recientes |
| `importImages()` | `images:import` | Diálogo de imágenes → las copia a `assets/` (nombres únicos) |
| `importImagePaths(paths)` | `images:importPaths` | Igual pero desde drag & drop |
| `openProjectFolder()` | `folder:open` | Revela la carpeta en el Finder/Explorer |
| `getPathForFile(file)` | — (webUtils) | File de drag & drop → ruta absoluta |

**Protocolo `ymg://`:** las imágenes del proyecto se sirven al renderer vía `ymg://project/<ruta-relativa>` (registrado en `src/main/index.ts`, con protección contra path traversal). Nunca usar `file://` en el renderer ni desactivar `webSecurity`. Helper: `assetUrl()` en `lib/units.ts`.

## Convenciones de código

- **UI en español** (textos, mensajes, diálogos). Código e identificadores en inglés.
- Estilos solo con **Tailwind**; paleta: `neutral-*` + acento `indigo-600`. Esquinas redondeadas (`rounded-lg/xl`), sombras sutiles. Excepción: la fuente de los globos usa la clase `.balloon-font` (stack manuscrito: Chalkboard SE / Segoe Print / Comic Sans MS).
- Iconos exclusivamente de **lucide-react**.
- Estado del renderer: React state plano; las mutaciones del proyecto se hacen con `structuredClone` + helper `mutate()` en `Editor.tsx`.
- Selección del editor: tipo `Selection` en `shared/types.ts` (`image` | `panel` | `balloon`). Las acciones contextuales del header dependen de ella.
- Arrastres (mover/redimensionar/colas/marquee): hook `useWindowDrag` (`src/renderer/src/lib/useDrag.ts`). NUNCA listeners de pointer en el propio elemento: siempre en `window` durante el gesto.
- Tipos estrictos compartidos: cualquier cambio al formato `.ymanga` empieza en `src/shared/types.ts`.

## Interacciones del editor (cómo debe comportarse)

- **Herramientas (ToolStrip)**: selección, viñeta, pluma, borrador y timbre son modos (Esc vuelve a selección); imagen, globo, SFX y biblioteca son acciones. Al activar cualquier herramienta de dibujo los elementos interactivos se vuelven transparentes al puntero (se puede dibujar/timbrar/borrar sobre viñetas sin que capturen el clic). Solo la herramienta de selección reactiva mover/redimensionar/editar. Los ajustes de pluma (tinta/grosor) y timbre (patrón) aparecen en el header cuando la herramienta está activa.
- **Viñetas**: herramienta viñeta activa el modo dibujo (marquee arrastrando). Con una viñeta seleccionada: dividir en columnas/filas (gutter 3 mm, mínimo 15 mm por mitad), ajustar a márgenes, **fondo de trama** (selecciona un SVG de `assets/tramas_vignetas/` como patrón repetitivo, se siembran automáticamente desde la app), eliminar (con confirmación si tiene contenido). **Modo deformar**: botón «Spline» de la barra contextual o doble clic en la viñeta — las esquinas se convierten en asas circulares que estiran cada vértice libremente (solo convexo; Esc o deseleccionar sale del modo). En modo normal las esquinas redimensionan el bounding box escalando los vértices proporcionalmente.
- **Elementos** (imágenes, prefabs, personajes): al colocar van a la viñeta seleccionada si la hay (si no, a la página libre). Al soltar archivos sobre el lienzo, van a la viñeta bajo el punto de drop si existe. Los de viñeta se recortan a sus bordes; «Ajustar» los encaja a su contenedor (viñeta o márgenes).
- **Globos**: menú del ToolStrip con 4 tipos; se crean centrados y entran en edición directa. Doble clic para editar texto, asa circular para orientar la cola, A−/A+ para el tamaño de letra. Selector de **tipo de letra** (9 fuentes: Noto Sans JP, Rampart One, Yomogi, Reggae One, Mochiy Pop One, Potta One, Yuji Mai, Manuscrita, Impacto) cargadas desde Google Fonts via CDN.
- **Onomatopeyas**: se crean centradas en edición directa; doble clic edita; barra contextual con A−/A+, rotación ±15°, ciclo de estilo, ciclo de color, y selector de **tipo de letra** (mismas 9 fuentes que los globos).
- **Supr/Retroceso** elimina la selección (elemento, globo, SFX o viñeta). **Esc** cierra menús, sale de modos o deselecciona.

## Estado actual y roadmap

Implementado:

- v0.1: Overview con recientes y estado vacío; creación de proyecto (nombre, preset, márgenes, carpeta obligatoria); editor de páginas (añadir/eliminar/reordenar), imágenes con mover/redimensionar, ajuste a márgenes, zoom y autosave.
- v0.2: **Viñetas** (dibujo con marquee, división en columnas/filas con gutter, clip de imágenes, ajuste a márgenes) y **globos de diálogo** (diálogo, pensamiento, grito, cartela; cola orientable; texto editable; tamaño de letra ajustable).
- v0.3: **Viñetas poligonales** — modo deformar con arrastre libre de los 4 vértices (guardarraíl convexo), recorte poligonal del contenido, vértices escalados al redimensionar, miniaturas poligonales.
- v0.4: **Fábrica de manga** —
  - *Constructor de escenarios*: biblioteca con prefabs vectoriales (árboles, edificios, escaleras, rocas, nubes…) colocables como elementos + sección «Míos» para importar elementos propios reutilizables.
  - *Constructor de historia* (`StoryBuilder`): premisa, capítulos (ordenables) y escenas vinculables a páginas; botón «Historia» en el editor; autosave compartido; el editor se remonta con datos frescos al volver (nonce en App).
  - *Constructor de personajes*: cara/ojos/expresión/cabello/piel paramétricos (`CharacterFace`), guardado con nombre en el proyecto, colocación en viñetas como elementos (copia de config).
  - *Dibujo a mano alzada*: pluma (3 tintas × 3 grosores, trazos vectoriales en mm) y borrador (elimina trazos y timbres al pasar).
  - *Onomatopeyas*: texto SFX con 3 estilos (Impacto/Contorno/Pincel), rotación ±15°, tamaño A−/A+, 3 colores, edición con doble clic.
  - *Timbres de trama*: 4 patrones (puntos, puntos densos, líneas, cruzado) estampables con clic o arrastre.
  - *ToolStrip*: barra vertical de herramientas (selección, viñeta, pluma, borrador, timbre + acciones de imagen/globo/SFX/biblioteca).

Próximas iteraciones (no implementar sin que se pida):

- Plantillas de página predefinidas (layouts de viñetas listos para usar).
- Guías de snap (bordes de viñetas, márgenes, centro de página).
- Undo/redo, duplicar página/viñeta/globo.
- Exportación a PDF/imágenes.
- Líneas de acción/velocidad y más variedad de prefabs/personajes (cuerpos, poses).
