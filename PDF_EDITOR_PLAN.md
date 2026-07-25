# Supereditor de PDF Profesional - CURIEL

## Visión General

Sistema de edición de PDF WYSIWYG completo, tipo Adobe Acrobat, integrado al módulo de inspecciones. 100% client-side, responsive, con sistema de plantillas, versionado, y firmas digitales.

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Canvas Editor | Fabric.js 6 | Mejor para WYSIWYG con texto inline, serialización JSON, manipulación de imágenes |
| PDF Rendering | pdf.js (Mozilla) | Estándar de oro para renderizar PDFs en canvas |
| PDF Manipulation | pdf-lib + @pdf-lib/fontkit | Crear/modificar PDFs client-side, soporte UTF-8 español |
| State Management | Zustand + Immer | Consistente con frontend actual, historial de estados |
| Framework | React 19 + TypeScript | Consistente con frontend actual |
| Estilos | Tailwind CSS | Consistente con frontend actual |
| Drag & Drop | @dnd-kit | Reordenamiento de páginas y elementos |
| Firma Canvas | Signature_pad | Captura de firma con smooth rendering |
| Iconos | lucide-react | Iconos consistentes |

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPEREDITOR PDF (100% Client-Side)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   pdf.js    │  │   Fabric.js      │  │    pdf-lib       │  │
│  │  (Render)   │  │   (Canvas)       │  │   (Export)       │  │
│  └──────┬──────┘  └────────┬─────────┘  └────────┬─────────┘  │
│         │                  │                      │            │
│         ▼                  ▼                      ▼            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Zustand Store (Editor State)                │   │
│  │  • pages[]        • layers[]       • history[]           │   │
│  │  • selectedTool   • zoom          • templates[]          │   │
│  │  • annotations[]  • signatures[]  • autosave            │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                  │                      │            │
│         ▼                  ▼                      ▼            │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Backend    │  │   Cloudinary     │  │    IndexedDB     │  │
│  │  (API)      │  │   (Storage)      │  │   (Offline)      │  │
│  └─────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Funcionalidades

### 1. Toolbar Principal (Híbrida)

**Toolbar Fija (arriba):**
- Selector de herramienta (Seleccionar, Texto, Imagen, Forma, Anotación, Firma, Medir)
- Selector de color/fuente/tamaño (contextual)
- Botones: Undo, Redo, Guardar, Exportar PDF
- Zoom slider + porcentaje + ajustar a página
- Indicador de autoguardado

**Toolbar Contextual (al seleccionar elemento):**
- Posición X/Y, Rotación, Escala, Opacidad
- Capa (z-index)
- Acciones: Duplicar, Eliminar, Enviar al frente/atrás

### 2. Panel Izquierdo - Thumbnail de Páginas

- Thumbnails arrastrables para reordenar (@dnd-kit)
- Botón: Agregar página en blanco
- Botón: Agregar página desde plantilla
- Click derecho: Duplicar, Eliminar, Rotar, Exportar página individual
- Soporte touch para tablets

### 3. Panel Central - Canvas de Edición

**Capas por página:**
```
Capa 4: Overlay de interacción (selección, handles)
Capa 3: Anotaciones (flechas, rectángulos, círculos, texto libre)
Capa 2: Elementos editables (texto, imágenes, firmas)
Capa 1: Renderizado del PDF original (solo lectura)
```

**Zoom y Navegación:**
- Zoom continuo (10% - 500%) con Ctrl+Scroll
- Pan/Arrastrar con Space+Click o Middle Mouse
- Minimapa en esquina inferior derecha
- Ajustar a ancho, ajustar a página

### 4. Panel Derecho - Propiedades

- Propiedades del elemento seleccionado
- Panel de capas (lista, visibilidad, lock)
- Panel de búsqueda y reemplazo de texto
- Panel de métricas/mediciones

### 5. Herramientas de Edición

#### 5.1 Edición de Texto Inline
- Click para crear nuevo elemento de texto
- Doble click en texto existente para editar
- Fuentes: Inter, Roboto, Open Sans (embebidas)
- Propiedades: familia, tamaño, color, negrita, itálica, subrayado
- Alineación: izquierda, centro, derecha, justificado
- Interlineado, espaciado entre letras
- Soporte completo UTF-8 (á, é, í, ó, ú, ñ, ü, ¡, ¿)

#### 5.2 Manipulación de Imágenes
- Drag & drop para insertar
- Recorte libre y rectangular
- Rotación libre
- Filtros: brillo, contraste, saturación, escala de grises
- Ajuste de tamaño proporcional
- Bordes y sombras
- Formas de máscara (círculo, rectángulo, personalizada)

#### 5.3 Anotaciones
- Formas: Rectángulo, círculo, línea, flecha, polígono
- Texto libre: Sticky notes, comments
- Highlight: Resaltado de texto con transparencia
- Draw: Dibujo libre (pluma, marcador, resaltador)
- Medición: Herramienta de distancia sobre planos con escala configurable

#### 5.4 Firmas Digitales
- Canvas de firma: Dibujar con mouse/stylus
- Subir imagen: PNG/JPG con transparencia
- Campo de texto: Nombre del firmante
- Fecha automática: Timestamp del momento de firma
- Posicionamiento libre: Arrastrar y posicionar en cualquier punto
- Tamaño ajustable: Redimensionar manteniendo proporción
- Múltiples firmas: Inspector, cliente, supervisor

#### 5.5 Gestión de Páginas
- Reordenar por drag & drop
- Duplicar página
- Eliminar página
- Rotar página (90°, 180°, 270°)
- Insertar página en blanco
- Insertar página desde plantilla predefinida
- Importar página de otro PDF
- Exportar página individual como imagen

### 6. Sistema de Capas

- Cada tipo de elemento es una capa separada
- Visibilidad toggle por capa
- Lock por capa (no editable)
- Reordenar capas (z-index)
- Opacidad por capa
- Agrupar elementos en capas personalizadas

### 7. Undo/Redo Completo

- Historial ilimitado de estados
- Ctrl+Z / Ctrl+Y
- Snapshot-based con Immer

### 8. Búsqueda y Reemplazo

- Buscar texto en todas las páginas
- Resaltar resultados visualmente en el canvas
- Reemplazar individual o todos
- Búsqueda case-sensitive toggle
- Regex opcional

### 9. Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Guardar |
| `Ctrl+Shift+S` | Exportar PDF |
| `Ctrl+C` | Copiar elemento |
| `Ctrl+V` | Pegar elemento |
| `Ctrl+D` | Duplicar elemento |
| `Delete` | Eliminar elemento |
| `Ctrl+A` | Seleccionar todo |
| `Ctrl++` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Ajustar a página |
| `Space+Drag` | Pan/Arrastrar |
| `H` | Herramienta mano (pan) |
| `V` | Herramienta selección |
| `T` | Herramienta texto |
| `I` | Herramienta imagen |
| `R` | Herramienta rectángulo |
| `L` | Herramienta línea |
| `F` | Herramienta firma |
| `M` | Herramienta medición |

### 10. Sistema de Plantillas

**Backend (nuevo modelo Prisma):**
```prisma
model PdfTemplate {
  id            String   @id @default(uuid())
  name          String
  description   String?
  category      String   // "inspeccion", "reporte", "custom"
  layoutJson    Json     // Definición del layout
  thumbnailUrl  String?
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Funcionalidades:**
- Admins/arquitectos crean plantillas con layout predefinido
- Plantillas incluyen: encabezado, logos, secciones, tablas, campos editables
- Inspectores seleccionan plantilla al iniciar inspección
- Plantillas son editables visualmente en el mismo editor
- Importar/exportar plantillas como JSON

### 11. Guardado y Versionado

**Autoguardado:**
- Cada 30 segundos automáticamente
- Al cambiar de pestaña/navegación
- Al cerrar el editor
- Indicador visual de "Guardando..." / "Guardado"

**Borradores:**
- Se guardan en Cloudinary como JSON
- Incluyen: estado completo del canvas + datos de inspección
- Permiten continuar edición desde cualquier dispositivo

**Versionado:**
- Cada guardado crea una versión
- Historial de versiones con timestamp y usuario
- Posibilidad de restaurar versión anterior

**Exportación:**
- PDF final se genera con pdf-lib al momento de exportar
- Separación: datos en DB + PDF exportado
- Opción de "Publicar" (genera PDF final y lo sube a Cloudinary)

### 12. Responsive Design

**Desktop (>1024px):**
- Layout de 3 paneles: thumbnails | canvas | propiedades
- Toolbar completa

**Tablet (768px - 1024px):**
- Panel de thumbnails colapsable
- Panel de propiedades como drawer/modal
- Toolbar simplificada con overflow menu
- Touch gestures: pinch-to-zoom, two-finger pan

**Móvil (<768px):**
- Solo canvas visible
- Toolbar inferior tipo apps móviles
- Thumbnails en bottom sheet
- Propiedades en modal full-screen
- Touch-first interactions

### 13. Historial de Cambios (Audit Trail)

**Backend (nuevo modelo Prisma):**
```prisma
model PdfEditHistory {
  id            String   @id @default(uuid())
  inspectionId  String
  userId        String
  action        String   // "text_edit", "image_add", "signature", "page_reorder", etc.
  details       Json     // Datos específicos del cambio
  timestamp     DateTime @default(now())
}
```

---

## Estructura de Archivos (Nuevos)

```
frontend/src/
├── features/
│   └── pdf-editor/
│       ├── index.ts                    # Public exports
│       ├── types/
│       │   ├── editor.ts              # Tipos del editor
│       │   ├── canvas.ts              # Tipos de canvas/Fabric.js
│       │   ├── tools.ts               # Tipos de herramientas
│       │   └── templates.ts           # Tipos de plantillas
│       ├── store/
│       │   ├── editorStore.ts         # Store principal del editor
│       │   ├── historyStore.ts        # Undo/redo store
│       │   └── templateStore.ts       # Store de plantillas
│       ├── components/
│       │   ├── EditorShell.tsx        # Layout principal del editor
│       │   ├── Canvas/
│       │   │   ├── EditorCanvas.tsx   # Canvas principal con Fabric.js
│       │   │   ├── CanvasToolbar.tsx  # Toolbar contextual
│       │   │   └── Minimap.tsx        # Minimapa de navegación
│       │   ├── Toolbar/
│       │   │   ├── MainToolbar.tsx    # Toolbar fija principal
│       │   │   ├── ToolSelector.tsx   # Selector de herramientas
│       │   │   └── PropertyPanel.tsx  # Panel de propiedades
│       │   ├── Panels/
│       │   │   ├── PageThumbnails.tsx # Panel de thumbnails
│       │   │   ├── LayerPanel.tsx     # Panel de capas
│       │   │   ├── SearchPanel.tsx    # Buscar/reemplazar
│       │   │   └── HistoryPanel.tsx   # Historial de cambios
│       │   ├── Tools/
│       │   │   ├── TextTool.tsx       # Herramienta de texto
│       │   │   ├── ImageTool.tsx      # Herramienta de imagen
│       │   │   ├── ShapeTool.tsx      # Herramienta de formas
│       │   │   ├── AnnotationTool.tsx # Herramienta de anotaciones
│       │   │   ├── MeasureTool.tsx    # Herramienta de medición
│       │   │   └── DrawTool.tsx       # Herramienta de dibujo libre
│       │   ├── Signature/
│       │   │   ├── SignaturePad.tsx   # Canvas de firma
│       │   │   ├── SignatureUpload.tsx# Subir imagen de firma
│       │   │   └── SignatureManager.tsx# Gestor de firmas
│       │   ├── Export/
│       │   │   ├── ExportDialog.tsx   # Diálogo de exportación
│       │   │   └── PdfExporter.tsx    # Lógica de exportación
│       │   └── Templates/
│       │       ├── TemplateSelector.tsx# Selector de plantillas
│       │       ├── TemplateEditor.tsx  # Editor de plantillas
│       │       └── TemplateManager.tsx # Gestor de plantillas
│       ├── hooks/
│       │   ├── useEditorCanvas.ts     # Hook principal del canvas
│       │   ├── useFabricObjects.ts    # Manejo de objetos Fabric.js
│       │   ├── useKeyboardShortcuts.ts# Atajos de teclado
│       │   ├── useAutosave.ts         # Autoguardado
│       │   ├── usePdfImport.ts        # Importar PDF
│       │   └── usePdfExport.ts        # Exportar PDF
│       ├── utils/
│       │   ├── fabricHelpers.ts       # Utilidades de Fabric.js
│       │   ├── pdfHelpers.ts          # Utilidades de pdf-lib
│       │   ├── fontLoader.ts          # Carga de fuentes personalizadas
│       │   ├── imageFilters.ts        # Filtros de imagen
│       │   └── coordinateUtils.ts     # Utilidades de coordenadas
│       ├── constants/
│       │   ├── editorConstants.ts     # Constantes del editor
│       │   ├── defaultFonts.ts        # Fuentes predefinidas
│       │   └── keyboardShortcuts.ts   # Definición de atajos
│       └── styles/
│           └── editor.css             # Estilos del editor
├── pages/
│   └── PdfEditorPage.tsx             # Página principal del editor
└── services/
    └── pdfTemplate.service.ts        # API de plantillas
```

---

## Endpoints Nuevos (Backend)

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/v1/pdf-templates` | Listar plantillas |
| `POST` | `/api/v1/pdf-templates` | Crear plantilla |
| `PUT` | `/api/v1/pdf-templates/:id` | Actualizar plantilla |
| `DELETE` | `/api/v1/pdf-templates/:id` | Eliminar plantilla |
| `POST` | `/api/v1/inspections/:id/pdf-draft` | Guardar borrador |
| `GET` | `/api/v1/inspections/:id/pdf-draft` | Cargar borrador |
| `GET` | `/api/v1/inspections/:id/pdf-versions` | Listar versiones |
| `POST` | `/api/v1/inspections/:id/pdf-versions/:v/restore` | Restaurar versión |
| `GET` | `/api/v1/inspections/:id/pdf-history` | Historial de cambios |

---

## Dependencias NPM

```json
{
  "dependencies": {
    "fabric": "^6.0.0",
    "pdfjs-dist": "^4.0.0",
    "pdf-lib": "^1.17.0",
    "@pdf-lib/fontkit": "^1.1.0",
    "zustand": "^5.0.0",
    "immer": "^10.0.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^8.0.0",
    "signature_pad": "^5.0.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@types/fabric": "^5.0.0"
  }
}
```

---

# FASES DE IMPLEMENTACIÓN

---

## FASE 1: Core del Editor (Semanas 1-3)

### Objetivo
Setup inicial del editor con canvas funcional, renderizado de PDF, y herramientas básicas de navegación.

### Tareas

#### Semana 1: Setup y Fundamentos

**1.1 Instalar dependencias**
```bash
npm --prefix frontend install fabric pdfjs-dist pdf-lib @pdf-lib/fontkit zustand immer lucide-react
npm --prefix frontend install -D @types/fabric
```

**1.2 Configurar pdf.js worker**
- Crear `frontend/src/features/pdf-editor/utils/pdfSetup.ts`
- Configurar worker de pdf.js con CDN o archivo local
- Crear wrapper `renderPageToCanvas(pdfDoc, pageNumber, canvas, scale)`

**1.3 Crear tipos base**
- `frontend/src/features/pdf-editor/types/editor.ts`: `EditorState`, `Page`, `EditorTool`
- `frontend/src/features/pdf-editor/types/canvas.ts`: `FabricObject`, `CanvasOptions`
- `frontend/src/features/pdf-editor/constants/editorConstants.ts`: `DEFAULT_ZOOM`, `PAGE_SIZES`, `TOOLS`

**1.4 Crear store principal del editor**
- `frontend/src/features/pdf-editor/store/editorStore.ts`
- Estado: `pages[]`, `currentPageIndex`, `selectedTool`, `zoom`, `selectedObjectId`
- Acciones: `setTool`, `setZoom`, `setPage`, `selectObject`

**1.5 Crear EditorShell (layout principal)**
- `frontend/src/features/pdf-editor/components/EditorShell.tsx`
- Layout de 3 paneles: thumbnails | canvas | propiedades
- Responsivo: paneles colapsables en tablet

#### Semana 2: Canvas y Renderizado

**2.1 Crear EditorCanvas**
- `frontend/src/features/pdf-editor/components/Canvas/EditorCanvas.tsx`
- Inicializar Fabric.js canvas overlay sobre canvas de pdf.js
- Implementar zoom con Ctrl+Scroll
- Implementar pan con Space+Click
- Renderizar página actual del PDF como fondo

**2.2 Crear hook useEditorCanvas**
- `frontend/src/features/pdf-editor/hooks/useEditorCanvas.ts`
- Inicializar canvas de Fabric.js
- Manejar resize con ResizeObserver
- Cleanup al desmontar
- Coordenadas: screen space ↔ canvas space

**2.3 Crear PageThumbnails**
- `frontend/src/features/pdf-editor/components/Panels/PageThumbnails.tsx`
- Renderizar thumbnails de todas las páginas
- Click para cambiar de página
- Página activa resaltada
- Scroll vertical con snap

**2.4 Crear MainToolbar (versión básica)**
- `frontend/src/features/pdf-editor/components/Toolbar/MainToolbar.tsx`
- Selector de herramienta (Seleccionar, Mano)
- Controles de zoom (slider, botones +/-, ajustar)
- Botones Undo/Redo (habilitados/deshabilitados)

#### Semana 3: Herramientas Básicas

**3.1 Implementar herramienta Selección**
- Click para seleccionar objeto
- Drag para mover objeto
- Handles de resize/rotación con Fabric.js Transformer
- Click en vacío para deseleccionar

**3.2 Implementar herramienta Mano (Pan)**
- Arrastrar para mover canvas
- Cambiar cursor a "grab" / "grabbing"

**3.3 Implementar Undo/Redo básico**
- `frontend/src/features/pdf-editor/store/historyStore.ts`
- Snapshot completo del estado del canvas
- Push state antes de cada modificación
- Undo/Redo con Ctrl+Z / Ctrl+Y

**3.4 Crear página de integración**
- `frontend/src/pages/PdfEditorPage.tsx`
- Ruta `/inspections/:id/editor`
- Cargar PDF de inspección existente
- Conectar store con datos reales

### Entregable Fase 1
- Editor con canvas funcional que renderiza PDFs
- Zoom y pan funcionales
- Selección y movimiento de objetos
- Thumbnails de páginas
- Undo/Redo básico
- Navegación entre páginas

---

## FASE 2: Herramientas de Edición (Semanas 4-6)

### Objetivo
Implementar todas las herramientas de creación y edición de contenido.

### Tareas

#### Semana 4: Texto e Imágenes

**4.1 Herramienta de Texto**
- Click en canvas para crear texto
- Doble click para editar texto existente
- Inline editing con Fabric.js `i-text`
- Panel de propiedades: familia, tamaño, color, estilo
- Soporte UTF-8 (pañís, acentos, etc.)

**4.2 Loader de fuentes**
- `frontend/src/features/pdf-editor/utils/fontLoader.ts`
- Cargar Open Sans, Inter, Roboto via Google Fonts
- Embedding de fuentes para exportación con fontkit

**4.3 Herramienta de Imagen**
- Click para abrir file picker
- Drag & drop sobre canvas
- Inserir imagen en canvas con Fabric.js `Image`
- Redimensionar proporcionalmente
- Recorte básico (rectangular)

**4.4 Filtros de imagen**
- `frontend/src/features/pdf-editor/utils/imageFilters.ts`
- Brillo, contraste, saturación, escala de grises
- Aplicar filtros de Fabric.js

#### Semana 5: Formas y Anotaciones

**5.1 Herramienta de Rectángulo**
- Click + drag para crear rectángulo
- Color de borde y relleno
- Grosor de borde
- Opacidad

**5.2 Herramienta de Círculo**
- Click + drag para crear elipse
- Mismas propiedades que rectángulo

**5.3 Herramienta de Línea**
- Click + drag para crear línea
- Color y grosor
- Flecha opcional en cada extremo

**5.4 Herramienta de Dibujo Libre**
- Dibujar con mouse/stylus
- Selector de color y grosor
- Modos: pluma, marcador, resaltador
- Suavizado de trazos

**5.5 Herramienta de Highlight**
- Seleccionar texto del PDF subyacente
- Aplicar marca amarilla semitransparente
- Guardar posición relativa al PDF

#### Semana 6: Panel de Propiedades y Capas

**6.1 PropertyPanel completo**
- `frontend/src/features/pdf-editor/components/Toolbar/PropertyPanel.tsx`
- Mostrar propiedades del objeto seleccionado
- Inputs para: posición X/Y, rotación, escala, opacidad
- Color picker para borde y relleno
- Selector de familia de fuente
- Tamaño de fuente

**6.2 LayerPanel básico**
- `frontend/src/features/pdf-editor/components/Panels/LayerPanel.tsx`
- Lista de objetos en la página actual
- Icono de visibilidad (ojo)
- Icono de lock (candado)
- Click para seleccionar objeto
- Reordenar con drag & drop

**6.3 Toolbar contextual**
- `frontend/src/features/pdf-editor/components/Canvas/CanvasToolbar.tsx`
- Aparece al seleccionar un objeto
- Posición flotante cerca del objeto
- Acciones rápidas: duplicar, eliminar, enviar al frente/atrás

### Entregable Fase 2
- Edición de texto inline completa
- Inserción y manipulación de imágenes
- Todas las formas básicas
- Dibujo libre
- Panel de propiedades funcional
- Panel de capas básico
- Toolbar contextual

---

## FASE 3: Funcionalidades Avanzadas (Semanas 7-9)

### Objetivo
Funcionalidades que diferencian al editor de soluciones básicas.

### Tareas

#### Semana 7: Búsqueda y Medición

**7.1 Herramienta de Medición**
- `frontend/src/features/pdf-editor/components/Tools/MeasureTool.tsx`
- Click en dos puntos para medir distancia
- Mostrar distancia con unidades configurables (m, cm, ft)
- Escala configurable (px por metro)
- Línea con etiqueta de distancia
- Múltiples mediciones en la página

**7.2 Búsqueda y Reemplazo**
- `frontend/src/features/pdf-editor/components/Panels/SearchPanel.tsx`
- Input de búsqueda
- Resultados: lista con página y contexto
- Click en resultado → navegar a página y resaltar
- Reemplazar individual / reemplazar todos
- Toggle case-sensitive

**7.3 Extracción de texto del PDF**
- Usar pdf.js `getTextContent()` para extraer texto
- Indexar texto por página para búsqueda
- Mapear posiciones de texto para highlight

#### Semana 8: Gestión Avanzada de Páginas

**8.1 Reordenamiento de páginas**
- Integrar @dnd-kit con PageThumbnails
- Drag para reordenar páginas
- Actualizar array de páginas en store

**8.2 Acciones de página**
- Duplicar página (clonar todos los objetos)
- Eliminar página (con confirmación)
- Rotar página (90°, 180°, 270°)
- Insertar página en blanco
- Insertar página desde plantilla

**8.3 Importar página de otro PDF**
- Seleccionar archivo PDF
- Elegir página a importar
- Renderizar y agregar al canvas

**8.4 Exportar página como imagen**
- Renderizar página actual a canvas
- Exportar como PNG/JPG
- Descargar automáticamente

#### Semana 9: Minimapa y Atajos

**9.1 Minimapa**
- `frontend/src/features/pdf-editor/components/Canvas/Minimap.tsx`
- Representación miniatura de la página completa
- Rectángulo que muestra viewport actual
- Click en minimapa para navegar
- Actualización en tiempo real

**9.2 Atajos de teclado**
- `frontend/src/features/pdf-editor/hooks/useKeyboardShortcuts.ts`
- `frontend/src/features/pdf-editor/constants/keyboardShortcuts.ts`
- Registrar atajos globales
- Mostrar atajos en tooltips
- Help modal con lista de atajos (Shift+?)

**9.3 Touch gestures para tablet**
- Pinch-to-zoom
- Two-finger pan
- Long press para contexto
- Touch-friendly hit targets

### Entregable Fase 3
- Herramienta de medición sobre planos
- Búsqueda y reemplazo de texto completo
- Gestión avanzada de páginas
- Minimapa de navegación
- Atajos de teclado documentados
- Touch gestures para tablet

---

## FASE 4: Firmas y Exportación (Semanas 10-11)

### Objetivo
Sistema completo de firmas y exportación a PDF con soporte UTF-8.

### Tareas

#### Semana 10: Firmas Digitales

**10.1 SignaturePad**
- `frontend/src/features/pdf-editor/components/Signature/SignaturePad.tsx`
- Canvas con signature_pad library
- Dibujar con mouse o stylus
- Botones: Limpiar, Aplicar
- Color y grosor configurables

**10.2 SignatureUpload**
- `frontend/src/features/pdf-editor/components/Signature/SignatureUpload.tsx`
- File picker para PNG/JPG
- Preview antes de insertar
- Eliminar fondo blanco automáticamente (opcional)

**10.3 SignatureManager**
- `frontend/src/features/pdf-editor/components/Signature/SignatureManager.tsx`
- Lista de firmas guardadas
- Crear nueva firma (canvas o upload)
- Seleccionar firma para insertar
- Eliminar firmas

**10.4 Posicionamiento de firmas**
- Insertar firma como objeto Fabric.js
- Arrastrar para posicionar
- Redimensionar con handles
- Rotar si es necesario
- Metadata: nombre del firmante, fecha automática

#### Semana 11: Exportación a PDF

**11.1 PdfExporter**
- `frontend/src/features/pdf-editor/utils/pdfHelpers.ts`
- Crear PDF con pdf-lib
- Embedder fuentes personalizadas (Open Sans, Inter, Roboto)
- Soporte UTF-8 para español

**11.2 Renderizado de objetos a PDF**
- Texto → `page.drawText()` con fuente embebida
- Imágenes → `page.drawImage()` con imagen embebida
- Formas → `page.drawRectangle()`, `page.drawEllipse()`, `page.drawLine()`
- Anotaciones → Convertir a elementos PDF nativos

**11.3 ExportDialog**
- `frontend/src/features/pdf-editor/components/Export/ExportDialog.tsx`
- Opciones de exportación:
  - Páginas a exportar (todas, rango, actual)
  - Calidad (baja, media, alta)
  - Incluir/Ocultar capas específicas
- Preview del PDF resultante
- Botón de exportar/descargar

**11.4 Integración con datos de inspección**
- Mantener separación: datos editados → DB, PDF exportado → archivo
- Al exportar, sincronizar datos editados con InspectionSummary
- Generar PDF final con todos los cambios

### Entregable Fase 4
- Canvas de firma funcional
- Upload de imagen de firma
- Múltiples firmas posicionables
- Exportación a PDF completa
- Soporte UTF-8 para español
- Integración con datos de inspección

---

## FASE 5: Persistencia y Plantillas (Semanas 12-13)

### Objetivo
Guardado automático, borradores, versionado, y sistema de plantillas.

### Tareas

#### Semana 12: Guardado y Versionado

**12.1 Autosave**
- `frontend/src/features/pdf-editor/hooks/useAutosave.ts`
- Timer cada 30 segundos
- Detectar cambios (dirty state)
- Guardar al cambiar de pestaña
- Guardar al cerrar editor
- Indicador visual de estado

**12.2 Borradores**
- Serializar estado completo del editor a JSON
- Subir a Cloudinary como archivo JSON
- Cargar borrador al abrir editor
- Manejo de errores de red

**12.3 Versionado**
- Cada guardado crea una versión
- Almacenar: timestamp, userId, snapshot JSON
- Lista de versiones en panel lateral
- Restaurar versión anterior (con confirmación)

**12.4 Backend: Endpoint de borradores**
- `POST /api/v1/inspections/:id/pdf-draft`
- `GET /api/v1/inspections/:id/pdf-draft`
- Validar permisos del usuario
- Almacenar en Cloudinary

**12.5 Backend: Endpoint de versiones**
- `GET /api/v1/inspections/:id/pdf-versions`
- `POST /api/v1/inspections/:id/pdf-versions/:v/restore`
- Modelo Prisma: `PdfVersion`

#### Semana 13: Plantillas

**13.1 Modelo Prisma**
```prisma
model PdfTemplate {
  id            String   @id @default(uuid())
  name          String
  description   String?
  category      String   @default("inspeccion")
  layoutJson    Json
  thumbnailUrl  String?
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**13.2 Backend: CRUD de plantillas**
- `GET /api/v1/pdf-templates`
- `POST /api/v1/pdf-templates`
- `PUT /api/v1/pdf-templates/:id`
- `DELETE /api/v1/pdf-templates/:id`
- Solo admin/arquitecto pueden crear/editar

**13.3 Frontend: TemplateService**
- `frontend/src/services/pdfTemplate.service.ts`
- Funciones: getAll, create, update, delete

**13.4 TemplateSelector**
- `frontend/src/features/pdf-editor/components/Templates/TemplateSelector.tsx`
- Grid de plantillas disponibles
- Preview de cada plantilla
- Seleccionar para usar

**13.5 TemplateEditor**
- `frontend/src/features/pdf-editor/components/Templates/TemplateEditor.tsx`
- Crear/editar plantillas visualmente
- Definir: encabezados, logos, secciones, campos
- Guardar como JSON

**13.6 TemplateManager**
- `frontend/src/features/pdf-editor/components/Templates/TemplateManager.tsx`
- Lista de plantillas del usuario
- CRUD completo
- Importar/exportar plantillas

### Entregable Fase 5
- Autoguardado cada 30 segundos
- Borradores guardados en servidor
- Sistema de versionado funcional
- CRUD de plantillas completo
- Selector de plantillas al crear inspección

---

## FASE 6: Responsive y Polish (Semanas 14-15)

### Objetivo
Optimizar para todos los dispositivos, pulir UX, y asegurar rendimiento.

### Tareas

#### Semana 14: Responsive Design

**14.1 Layout Desktop (>1024px)**
- 3 paneles fijos: thumbnails (200px) | canvas (flex) | propiedades (280px)
- Toolbar completa en parte superior
- Todos los atajos de teclado activos

**14.2 Layout Tablet (768px - 1024px)**
- Thumbnails colapsable (toggle button)
- Propiedades como drawer (slide-in desde derecha)
- Toolbar con overflow menu
- Touch gestures activos

**14.3 Layout Móvil (<768px)**
- Canvas full-screen
- Toolbar inferior estilo app (4-5 iconos principales)
- Thumbnails en bottom sheet (swipe up)
- Propiedades en modal full-screen
- Long press para context menu

**14.4 Touch Gestures**
- Pinch-to-zoom (scale factor)
- Two-finger pan
- Tap para seleccionar
- Double tap para editar texto
- Long press para contexto

#### Semana 15: Performance y Polish

**15.1 Optimización de rendimiento**
- Lazy loading de páginas (solo renderizar visibles + buffer)
- Virtual scrolling en thumbnails si hay muchas páginas
- Debounce en autoguardado
- RequestAnimationFrame para renderizado
- Dispose de objetos Fabric.js no visibles

**15.2 UX Polish**
- Transiciones suaves entre páginas
- Loading states para operaciones pesadas
- Toast notifications para acciones (guardado, error, etc.)
- Confirmación antes de acciones destructivas
- Empty states informativos

**15.3 Testing**
- Unit tests para utils y hooks
- Integration tests para componentes principales
- E2E test para flujo completo (abrir → editar → exportar)
- Test en diferentes viewports

**15.4 Documentación**
- README del módulo pdf-editor
- Documentación de atajos de teclado
- Guía de uso para inspectores
- Guía de creación de plantillas para admins

### Entregable Fase 6
- Layout responsive para desktop, tablet, móvil
- Touch gestures funcionales
- Optimización de rendimiento
- Testing completo
- Documentación

---

## Checklist de Aceptación

### Funcionalidad Core
- [ ] El editor carga un PDF existente y lo renderiza correctamente
- [ ] Zoom funciona (Ctrl+Scroll, botones, preset)
- [ ] Pan funciona (Space+Click, two-finger)
- [ ] Navegación entre páginas funciona
- [ ] Thumbnails muestran todas las páginas

### Herramientas
- [ ] Texto: crear, editar inline, cambiar propiedades
- [ ] Imagen: insertar, redimensionar, recortar, filtros
- [ ] Formas: rectángulo, círculo, línea, flecha
- [ ] Dibujo libre: pluma, marcador, resaltador
- [ ] Medición: distancia entre dos puntos con unidades
- [ ] Highlight: marcar texto del PDF

### Firmas
- [ ] Canvas de firma funciona
- [ ] Upload de imagen funciona
- [ ] Posicionamiento libre funciona
- [ ] Múltiples firmas soportadas

### Gestión de Páginas
- [ ] Reordenar páginas con drag & drop
- [ ] Duplicar página
- [ ] Eliminar página
- [ ] Rotar página
- [ ] Insertar página en blanco
- [ ] Insertar página desde plantilla

### Exportación
- [ ] Exportar a PDF descarga archivo
- [ ] Texto español (ñ, acentos) se muestra correctamente
- [ ] Imágenes se incluyen en el PDF
- [ ] Firmas se incluyen en el PDF

### Persistencia
- [ ] Autoguardado funciona cada 30 segundos
- [ ] Borrador se carga al reabrir editor
- [ ] Versionado crea historial
- [ ] Restaurar versión funciona

### Plantillas
- [ ] CRUD de plantillas funciona
- [ ] Selector de plantillas muestra opciones
- [ ] Crear desde plantilla genera layout base

### Responsive
- [ ] Desktop: layout de 3 paneles
- [ ] Tablet: paneles colapsables, touch gestures
- [ ] Móvil: canvas full-screen, toolbar inferior

### Performance
- [ ] PDF de 50 páginas carga en <3 segundos
- [ ] Zoom no tiene lag perceptible
- [ ] Autoguardado no bloquea UI
- [ ] Memory leak no detectado tras 30 min de uso

---

## Notas Técnicas

### Fuentes Españolas
Todas las fuentes embebidas (Open Sans, Inter, Roboto) soportan caracteres españoles completos: á, é, í, ó, ú, ñ, ü, ¡, ¿. pdf-lib con fontkit maneja UTF-8 correctamente.

### Coordenadas
El editor usa un sistema de coordenadas normalizado donde:
- Origen (0,0) es la esquina inferior izquierda del PDF
- Unidades en puntos PDF (1 punto = 1/72 pulgada)
- Conversión automática entre screen space y canvas space

### Memoria
- Fabric.js objects se disponen al cambiar de página
- Solo 2-3 páginas en memoria (actual + buffer)
- Imágenes se cachéan por URL
- Estado del editor se serializa a JSON compacto

### Seguridad
- Todo procesamiento en el navegador (client-side)
- Archivos no salen del navegador hasta exportar
- Borradores se guardan con autenticación JWT
- Permisos de edición verificados en backend

---

*Última actualización: 2026-07-24*
