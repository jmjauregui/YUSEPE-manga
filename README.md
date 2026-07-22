<p align="center">
  <img src="docs/imgs/UI%20creando%20una%20hoja%20del%20manga%20con%20vignetas.png" alt="YUSEPE manga editor" width="720" />
</p>

<h1 align="center">YUSEPE manga</h1>
<p align="center"><strong>Crea manga sin saber dibujar.</strong></p>

<p align="center">
  <a href="https://jmjauregui.github.io/YUSEPE-manga"><strong>🌐 Sitio web</strong></a> ·
  <a href="#-instalaci%C3%B3n"><strong>📦 Instalar</strong></a> ·
  <a href="#-caracter%C3%ADsticas"><strong>✨ Features</strong></a> ·
  <a href="#-formato-de-proyecto"><strong>📁 .ymanga</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/version-0.4-indigo" alt="Version" />
</p>

---

YUSEPE manga es una **aplicación de escritorio** que resuelve la maquetación, organización y gestión de proyectos de manga para personas con **capacidad creativa para contar historias pero sin formación en dibujo**.

> *"Mi idea era crear una plataforma que me permita diseñar mangas. Y lo logramos."*

---

## 🌐 Sitio web

La landing page completa está en:

### 👉 [jmjauregui.github.io/YUSEPE-manga](https://jmjauregui.github.io/YUSEPE-manga)

Con galería de capturas, features, stack tecnológico y guía de instalación.

---

## 📦 Instalación

```bash
# Requiere Node 20 (obligatorio)
nvm use 20

git clone https://github.com/jmjauregui/YUSEPE-manga.git
cd YUSEPE-manga

npm install
npm run dev        # desarrollo con HMR
npm run build      # producción
npm run typecheck  # verificación de tipos
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca electron-vite con HMR en el renderer |
| `npm run build` | Build de producción en `out/` |
| `npm run typecheck` | `tsc --noEmit` para verificar tipos |

---

## ✨ Características

### 🎯 Gestión de proyecto
- **Proyectos recientes** con detección de archivos eliminados
- **Asistente de creación**: nombre, presets reales (B5 Tankōbon, A5, A4, US Comic), márgenes
- **Guardado automático** (cada 600 ms). Nunca perdés trabajo.
- Formato `.ymanga` portable + carpeta `assets/`

### ▦ Viñetas poligonales
- Dibujo por **marquee** con vista previa punteada
- **División** en columnas/filas con gutter automático de 3 mm
- **Modo deformar**: 4 vértices libres con guardarraíl convexo
- **Recorte poligonal** del contenido (clip-path)
- **Fondo de trama**: screentone SVG con 12 tramas built-in de Illustrator

### 💬 Globos de diálogo
- **4 tipos SVG** (diálogo, pensamiento, grito, cartela)
- **Cola orientable** con asa arrastrable
- **9 fuentes** japonesas (Noto Sans JP, Rampart One, Yomogi…) cargadas de Google Fonts
- **Sombra configurable** con SVG drop-shadow
- **Marcos** para cartelas: sólido, redondeado, doble línea, sin marco

### ✨ Fondos con IA (Pollinations.ai)
- **27 estilos** en 5 categorías (artístico, color, ambiente, iluminación, detalle)
- **3 imágenes** por generación con seeds distintos
- **Biblioteca** persistente con búsqueda por prompt
- API key configurable vía `.env`

<p align="center">
  <img src="docs/imgs/UI%20creando%20una%20imagen%20con%20IA.png" alt="Generación de fondos con IA" width="600" />
</p>

### ✏️ Dibujo y screentones
- **Pluma**: 3 tintas × 3 grosores, trazos vectoriales en mm
- **Borrador**: elimina trazos y timbres
- **Timbres**: 8 patrones (puntos, líneas, cruzado, vertical, estrellas, ladrillos…) con slider 5–40 mm

### 💥 Onomatopeyas (SFX)
- 3 estilos (Impacto, Contorno, Pincel) · rotación ±15° · 3 colores · selector de fuente

### 👤 Constructor de personajes
- Cara paramétrica: 3 formas, 5 pieles, 6 cabellos, 7 colores, 3 ojos, 5 expresiones
- Guardado con nombre, copia independiente al colocar

### 📖 Constructor de historia
- Premisa, capítulos ordenables y escenas vinculadas a páginas
- Navegación fluida editor ↔ historia con autosave compartido

<p align="center">
  <img src="docs/imgs/UI%20creando%20historia%20del%20comic%20-%20manga.png" alt="Constructor de historia" width="600" />
</p>

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Desktop** | Electron 33 |
| **Build** | electron-vite 2 |
| **UI** | React 18 + TypeScript |
| **Estilos** | Tailwind CSS v4 (plugin `@tailwindcss/vite`) |
| **Iconos** | lucide-react (sin SVGs a mano) |
| **Protocolo** | `ymg://` (custom protocol, reemplaza `file://`) |
| **IA** | Pollinations.ai (servicio encapsulado `AIImageService`) |
| **Fuentes** | Google Fonts CDN (7 japonesas + sistema) |
| **Formato** | `.ymanga` (JSON, unidades en mm) |

---

## 📁 Formato de proyecto

```
MiProyecto/
├── project.ymanga     ← JSON con todo el proyecto
└── assets/
    ├── imagen.png       ← imágenes importadas
    └── tramas_vignetas/ ← SVGs de screentone
```

Todo en **milímetros** (página, márgenes, imágenes, viñetas, globos, fuentes). El editor convierte a px con `PX_PER_MM × zoom`.

```json
{
  "version": 1,
  "name": "Crónicas del barrio",
  "page": { "presetId": "b5", "width": 182, "height": 257,
    "margins": { "top": 20, "right": 15, "bottom": 20, "left": 15 } },
  "pages": [{
    "panels": [{
      "x": 15, "y": 20, "w": 152, "h": 100,
      "corners": [{ "x":0,"y":0 },{ "x":152,"y":0 },{ "x":152,"y":100 },{ "x":0,"y":100 }]
    }],
    "balloons": [{
      "kind": "speech", "text": "¡Llegamos!",
      "fontSize": 4.2, "tail": { "x": 32, "y": 68 }
    }]
  }],
  "story": { "premise": "", "chapters": [] },
  "characters": [],
  "library": [],
  "aiLibrary": []
}
```

---

## 🏗️ Estructura del código

```
src/
├── main/index.ts          Electron: ventana, IPC, archivos, ymg://
├── preload/index.ts       contextBridge → window.yusepe
├── shared/types.ts        Tipos (única fuente de verdad)
└── renderer/src/
    ├── App.tsx            Navegación
    ├── lib/               Constantes, hooks, prefabs, servicio IA
    ├── components/        PageCanvas, PanelItem, BalloonItem, SfxItem…
    └── screens/           Overview, CreateProject, Editor, StoryBuilder
```

---

## 🎨 Principios de diseño

- **Para no ilustradores** — nada de jerga, todo con defaults sensatos
- **Guardado automático** — nunca perdés trabajo
- **Estilo sobrio** — neutral grays + acento indigo
- **mm internos** — el usuario piensa en milímetros, igual que la impresión
- **IPC seguro** — el renderer nunca toca Node ni `file://`

---

## 🤖 Configurar IA

Creá un `.env` en la raíz:

```
APIKEY_pollinations = tu_api_key
```

El proceso main lo carga al arrancar. El servicio `AIImageService` lo inyecta en cada request a Pollinations.

---

<p align="center">
  <sub>Made with ☕ for storytellers who can't draw.</sub>
</p>
