# Guia de Usuario - CURIEL

## Bienvenido a CURIEL

CURIEL es tu herramienta profesional para gestionar inspecciones tecnicas de edificaciones. Esta guia te ayudara a sacar el maximo provecho del sistema.

---

## 1. Primeros Pasos

### 1.1 Acceso al Sistema

**Frontend Web:**
1. Abre tu navegador y ve a la URL del sistema
2. Ingresa tu correo electronico y contrasena
3. Haz clic en "Iniciar Sesion"

**App Movil:**
1. Descarga la app desde Google Play Store o Apple App Store
2. Abre la app e ingresa tus credenciales
3. La app funcionara incluso sin conexion a internet

### 1.2 Tu Perfil

Una vez dentro, puedes:
- Ver tu informacion personal
- Cambiar tu contrasena
- Actualizar tu foto de perfil

---

## 2. Inspecciones

### 2.1 Ver Inspecciones

**Desde el Frontend:**
1. Haz clic en "Inspecciones" en el menu lateral
2. Usa los filtros para buscar por estado, inspector o fecha
3. Haz clic en una inspeccion para ver sus detalles

**Desde la App Movil:**
1. En la pantalla principal, veras la lista de tus inspecciones
2. Desliza hacia abajo para actualizar
3. Toca una inspeccion para ver sus detalles

### 2.2 Crear una Inspeccion

**Requisito:** Rol de Admin, Arquitecto o Supervisor

1. Haz clic en "Nueva Inspeccion"
2. Completa los datos requeridos:
   - **Nombre del Proyecto:** Ej: "Torre Residencial Solar"
   - **Cliente:** Selecciona el cliente
   - **Direccion:** Direccion del inmueble
   - **Fecha Programada:** Fecha de la visita
   - **Inspector:** Asigna un inspector
3. Haz clic en "Guardar"

### 2.3 Estados de una Inspeccion

| Estado | Descripcion |
|--------|-------------|
| Pendiente | Inspeccion creada, esperando programacion |
| En Proceso | Inspector esta trabajando en ella |
| Lista Revision | Inspeccion completada, esperando revision del supervisor |
| Finalizada | Inspeccion completada y aprobada |
| Cancelada | Inspeccion cancelada |
| Reprogramada | Inspeccion reprogramada para otra fecha |

---

## 3. Ejecucion de Inspeccion

### 3.1 Iniciar Ejecucion

1. Selecciona una inspeccion "Pendiente" o "En Proceso"
2. Haz clic en "Ejecutar Inspeccion"
3. El sistema creara las areas por defecto

### 3.2 Gestionar Areas

Cada inspeccion tiene areas como:
- Interior
- Exterior
- Area Comun
- Otros

**Para cada area puedes:**
1. **Agregar Observaciones:**
   - Titulo: Ej: "Humedad en techo"
   - Descripcion: Detalle del problema
   - Severidad: Leve, Media, Alta, Critica
   - Tipo: Humedad, Electrico, Sanitario, Acabados, etc.

2. **Tomar Fotos:**
   - Haz clic en "Tomar Foto" o "Elegir de Galeria"
   - La foto se comprime automaticamente a WebP
   - Asocia la foto a la observacion correspondiente

3. **Agregar Mediciones:**
   - Largo, Ancho, Area calculada
   - Altura del techo

### 3.3 Completar la Inspeccion

1. Revisa que todas las areas esten completas
2. Haz clic en "Finalizar Inspeccion"
3. El sistema generara el reporte PDF automaticamente

---

## 4. Fotos

### 4.1 Tomar una Foto

1. En la pantalla de ejecucion, selecciona un area
2. Haz clic en "Tomar Foto"
3. Usa la camara del dispositivo
4. La foto se comprime automaticamente (formato WebP)
5. Agrega una descripcion (opcional)
6. Haz clic en "Guardar Foto"

### 4.2 Elegir de Galeria

1. Haz clic en "Elegir de Galeria"
2. Selecciona una imagen existente
3. La imagen se comprimira automaticamente
4. Agrega una descripcion y guarda

### 4.3 Modo Offline

Si no tienes conexion a internet:
- Las fotos se guardan localmente
- Se sincronizaran automaticamente cuando vuelva la conexion
- Puedes ver el estado de sincronizacion en la lista

---

## 5. Firmas Digitales

### 5.1 Firmar como Inspector

1. Al finalizar la inspeccion, se te pedira tu firma
2. Dibuja tu firma en la pantalla
3. Confirma la firma

### 5.2 Firmar como Cliente

1. El cliente recibe un enlace por email
2. Abre el enlace en su navegador
3. Dibuja su firma
4. La firma queda registrada en el reporte

---

## 6. Reportes

### 6.1 Generar Reporte

El reporte se genera automaticamente al finalizar la inspeccion. Incluye:
- Datos del proyecto y cliente
- Informacion del inspector
- Resumen de hallazgos
- Fotos con descripcion
- Firmas digitales
- Recomendaciones

### 6.2 Descargar Reporte

1. Ve a la inspeccion finalizada
2. Haz clic en "Descargar Reporte"
3. El PDF se descargara a tu dispositivo

### 6.3 Compartir Reporte

El reporte se envia automaticamente por email al cliente cuando:
- La inspeccion se marca como "Finalizada"
- El supervisor aprueba el reporte

---

## 7. Notificaciones

### 7.1 Notificaciones en la App

Recibiras notificaciones cuando:
- Se te asigne una nueva inspeccion
- Una inspeccion este vencida
- Se apruebe o rechace tu reporte
- Haya actualizaciones importantes

### 7.2 Notificaciones por Email

Recibiras emails cuando:
- Se cree tu cuenta
- Se te asigne una inspeccion
- Se complete una inspeccion
- Se genere un reporte

---

## 8. Modo Offline (App Movil)

### 8.1 Cuando usar el modo offline

- En areas sin cobertura de internet
- En interiores con mal senal
- Para ahorrar datos moviles

### 8.2 Como funciona

1. **Guardado Local:** Todo se guarda en la base de datos local
2. **Sincronizacion Automatica:** Cuando vuelva la conexion, los datos se suben
3. **Resolucion de Conflictos:** Si hay cambios en el servidor, el sistema te preguntara cual conservar

### 8.3 Ver estado de sincronizacion

1. Ve a "Estado Offline" desde el menu
2. Veras:
   - Numero de items pendientes
   - Estado de cada operacion
   - Boton para sincronizar manualmente

---

## 9. Dashboard

### 9.1 Vista General

El dashboard muestra:
- **Total de Inspecciones:** Numero total en el sistema
- **Inspecciones Pendientes:** Esperando ejecucion
- **Inspecciones Completadas:** Finalizadas exitosamente
- **Tasa de Completado:** Porcentaje de exito

### 9.2 Graficos

- Grafico de barras: Inspecciones por estado
- Grafico circular: Distribucion por tipo
- Timeline: Actividad reciente

---

## 10. Consejos y Trucos

### 10.1 Atajos de Teclado (Frontend)

| Atajo | Accion |
|-------|--------|
| Ctrl + N | Nueva inspeccion |
| Ctrl + F | Buscar |
| Esc | Cerrar modal |
| Tab | Siguiente campo |

### 10.2 Optimizar el Uso

1. **Usa filtros:** Para encontrar inspecciones rapidamente
2. **Toma fotos claras:** Buena iluminacion y enfoque
3. **Sincroniza regularmente:** Evita acumular datos offline
4. **Revisa antes de finalizar:** Asegurate de que todo este completo

### 10.1 Soporte

Si tienes problemas:
1. Revisa tu conexion a internet
2. Cierra y vuelve a abrir la app
3. Contacta al administrador del sistema
4. Envia un email a soporte@curiel.com

---

## Glosario

| Termino | Definicion |
|---------|------------|
| Inspeccion | Visita tecnica para evaluar un inmueble |
| Area | Seccion del inmueble (interior, exterior, etc.) |
| Observacion | Hallazgo o problema encontrado |
| Severidad | Nivel de criticidad (leve, media, alta, critica) |
| Inspector | Profissional que realiza la inspeccion |
| Supervisor | Profissional que revisa y aprueba inspecciones |
| Checklist | Lista de verificacion |
| PDF | Documento portatil (Portable Document Format) |

---

**Ultima actualizacion:** 2026
