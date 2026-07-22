# YUSEPE manga

**Herramienta de escritorio para crear y gestionar proyectos de manga sin necesidad de saber dibujar.**

YUSEPE manga es una aplicación Electron que resuelve la maquetación, organización y gestión de proyectos de manga para personas con capacidad creativa para contar historias pero sin formación en ilustración. Todo con valores por defecto sensatos, guardado automático y una interfaz sobria en grises neutros con acento índigo.

## Características

### Gestión de proyecto
- **Proyectos recientes** con detección de archivos eliminados del disco
- **Asistente de creación**: nombre, presets reales (B5 Tankōbon, A5, A4, US Comic), márgenes configurables, carpeta obligatoria
- **Guardado automático** continuo (nunca pierdes trabajo)
- Persistencia en `.ymanga` (JSON) + carpeta `assets/` con imágenes

### Editor de páginas
- **Páginas**: añadir, eliminar, reordenar; zoom y ajuste a ventana
- **Imágenes**: importar por diálogo o drag & drop, mover y redimensionar (proporción bloqueada), ajuste automático a márgenes o viñeta

### Viñetas (paneles)
- **Dibujo por marquee** con vista previa punteada
- **División** en columnas/filas con gutter automático de 3 mm
- **Recorte poligonal** del contenido (clip-path)
- **Modo deformar**: 4 vértices libres con guardarraíl convexo (sin aristas cruzadas)
- **Fondo de trama**: aplica cualquier SVG de `assets/tramas_vignetas/` como patrón de screentone repetitivo (12 tramas built-in de Adobe Illustrator)
- **Fondo con IA**: generación de imágenes mediante Pollinations.ai con selector de estilo, color, ambiente, iluminación y nivel de detalle

### Globos de diálogo
- **4 tipos SVG**: diálogo, pensamiento (borde punteado + burbujitas), grito (estrella de picos), cartela (narración)
- **Cola orientable** con asa circular arrastrable
- **Texto editable** con doble clic, tamaño ajustable (A−/A+)
- **Selector de fuente**: 9 tipografías (7 japonesas de Google Fonts: Noto Sans JP, Rampart One, Yomogi, Reggae One, Mochiy Pop One, Potta One, Yuji Mai + Manuscrita + Impacto)
- **Sombra configurable** con drop-shadow SVG
- **Marcos para cartelas**: sólido, redondeado, doble línea, sin marco

### Dibujo y entintado
- **Pluma a mano alzada**: 3 tintas × 3 grosores, trazos vectoriales en milímetros
- **Borrador**: elimina trazos y timbres al pasar
- **Timbres de trama** (screentone): 8 patrones (puntos, puntos densos, líneas diagonal, cruzado, vertical, horizontal, estrellas, ladrillos), tamaño continuo por slider 5–40 mm

### Onomatopeyas (SFX)
- **3 estilos**: Impacto (con skew), Contorno (trazo grueso invertido), Pincel (manuscrito)
- **Rotación ±15°**, 3 colores, edición con doble clic, selector de fuente

### Constructor de historia
- **Premisa** del proyecto
- **Capítulos** ordenables con título y resumen
- **Escenas** por capítulo vinculables a páginas del manga
- Navegación integrada editor ↔ historia con autosave compartido

### Constructor de personajes
- **Cara paramétrica**: 3 formas, 5 tonos de piel, 6 estilos de cabello, 7 colores, 3 tipos de ojos, 5 expresiones
- **Guardado con nombre**; colocación en viñetas con copia independiente de la configuración

### Constructor de escenarios
- **14 prefabs vectoriales** estilo line-art manga (árboles, pinos, arbustos, rocas, nubes, montañas, sol, edificios, torres, casas, escaleras, farolas, vallas)
- **Elementos personalizados** importables a la biblioteca

### Generación de fondos con IA
- **Integración con Pollinations.ai** mediante servicio encapsulado
- **27 estilos** en 5 categorías: artístico, color, ambiente, iluminación, detalle
- **3 imágenes por generación** con seeds independientes (Usar / Regenerar / Descargar)
- **Biblioteca de imágenes** persistente con búsqueda por prompt
- **API key** configurable vía `.env` (`APIKEY_pollinations`)

## Stack técnico

| Componente | Tecnología |
|---|---|
| Escritorio | Electron 33 |
| Build | electron-vite 2 |
| Frontend | React 18 + TypeScript |
| Estilos | Tailwind CSS v4 |
| Iconos | lucide-react |
| Protocolo de assets | `ymg://` (custom protocol) |
| Fuentes | Google Fonts CDN |
| IA | Pollinations.ai |

## Instalación

```bash
# Usar Node 20 (obligatorio)
nvm use 20

# Instalar dependencias
npm install

# Desarrollo con HMR
npm run dev

# Build de producción
npm run build

# Verificación de tipos
npm run typecheck
```

## Formato de proyecto (`.ymanga`)

Cada proyecto es una carpeta con:

```
MiProyecto/
├── project.ymanga     # JSON con la definición completa
└── assets/            # imágenes, tramas y recursos
    └── tramas_vignetas/  # tramas de screentone SVG
```

Todas las unidades están en **milímetros** (página, márgenes, posición de imágenes, viñetas, globos y fuentes). El editor convierte a píxeles con `PX_PER_MM × zoom` (PX_PER_MM = 3).

Ejemplo mínimo de `project.ymanga`:

```json
{
  "version": 1,
  "name": "Crónicas del barrio",
  "page": { "presetId": "b5", "width": 182, "height": 257,
    "margins": { "top": 20, "right": 15, "bottom": 20, "left": 15 } },
  "pages": [{
    "id": "uuid",
    "images": [],
    "panels": [
      { "id": "uuid", "x": 15, "y": 20, "w": 152, "h": 100,
        "corners": [{ "x": 0, "y": 0 }, { "x": 152, "y": 0 },
                    { "x": 152, "y": 100 }, { "x": 0, "y": 100 }],
        "images": [] }
    ],
    "balloons": [
      { "id": "uuid", "kind": "speech", "x": 20, "y": 25, "w": 46, "h": 30,
        "text": "¡Llegamos!", "fontSize": 4.2, "tail": { "x": 32, "y": 68 } }
    ],
    "strokes": [],
    "stamps": [],
    "sfx": []
  }],
  "story": { "premise": "", "chapters": [] },
  "characters": [],
  "library": [],
  "aiLibrary": []
}
```

Los proyectos antiguos se normalizan automáticamente al abrir (campos faltantes reciben valores por defecto).

## Estructura del código

```
src/
├── main/index.ts          Proceso principal: ventana, IPC, archivos, ymg://
├── preload/index.ts       contextBridge: expone window.yusepe
├── shared/types.ts        Tipos compartidos (única fuente de verdad)
└── renderer/src/
    ├── App.tsx            Navegación (overview / create / editor / story)
    ├── lib/
    │   ├── units.ts       Constantes, geometría, presets, fuentes
    │   ├── useDrag.ts     Hook de arrastre con listeners en window
    │   ├── prefabs.tsx    Arte SVG de escenarios prefabricados
    │   └── aiImageService.ts  Servicio encapsulado de Pollinations.ai
    ├── components/
    │   ├── PageCanvas.tsx        Lienzo: capas + herramientas + drop
    │   ├── PagesPanel.tsx        Miniaturas de páginas
    │   ├── PanelItem.tsx         Viñeta poligonal (clip, deformar)
    │   ├── BalloonItem.tsx       Globo (SVG, cola, sombra, texto)
    │   ├── SfxItem.tsx           Onomatopeya (estilos, rotación)
    │   ├── PlacedImageItem.tsx   Elemento colocado (mover/redimensionar)
    │   ├── CharacterFace.tsx     Retrato paramétrico SVG
    │   ├── AIBackgroundModal.tsx Fondos IA + biblioteca
    │   ├── ToolStrip.tsx         Barra vertical de herramientas
    │   └── Modal.tsx             Diálogo de confirmación
    └── screens/
        ├── Overview.tsx       Proyectos recientes
        ├── CreateProject.tsx  Asistente de creación
        ├── Editor.tsx         Editor principal (orquesta todo)
        └── StoryBuilder.tsx   Constructor de historia
```

## Principios de diseño

- **Soluciones reales para no ilustradores**: nada de jerga profesional ni flujos complejos. Presets de formato reales, márgenes preconfigurados, ajuste automático de imágenes.
- **Guardado automático**: el usuario nunca debe preocuparse por perder trabajo.
- **Estilo sobrio**: interfaz limpia en grises neutros con un único acento índigo.
- **Unidades en milímetros**: todo el documento usa mm; la conversión a píxeles es interna.
- **Sin acceso a Node en el renderer**: toda comunicación con el sistema de archivos pasa por IPC (`window.yusepe`) y el protocolo `ymg://`.

## Desarrollo

```bash
nvm use 20          # obligatorio antes de cualquier comando
npm install
npm run dev         # HMR en renderer, auto-reload en main
npm run typecheck   # tsc --noEmit
npm run build       # producción en out/
```

No hay tests automatizados todavía. La verificación actual es `typecheck` + `build`.

## API Key de IA

Para usar la generación de fondos con IA, crea un archivo `.env` en la raíz del proyecto:

```
APIKEY_pollinations = tu_api_key
```

El proceso main la carga automáticamente al arrancar y el servicio de IA la inyecta en cada petición a Pollinations.
