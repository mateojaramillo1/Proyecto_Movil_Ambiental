# Instrucciones para Iconos y Splash Screen

## 📱 Assets Requeridos

Para que la aplicación tenga iconos propios, necesitas crear las siguientes imágenes:

### 1. Icon (icon.png)
- **Tamaño**: 1024x1024 px
- **Formato**: PNG con fondo transparente o sólido
- **Ubicación**: `assets/icon.png`
- **Uso**: Icono principal de la app

### 2. Adaptive Icon (adaptive-icon.png)
- **Tamaño**: 1024x1024 px
- **Formato**: PNG
- **Ubicación**: `assets/adaptive-icon.png`
- **Uso**: Icono adaptativo para Android

### 3. Splash Screen (splash.png)
- **Tamaño**: 1242x2436 px (o superior)
- **Formato**: PNG
- **Ubicación**: `assets/splash.png`
- **Uso**: Pantalla de carga al iniciar la app

### 4. Favicon (favicon.png)
- **Tamaño**: 48x48 px
- **Formato**: PNG
- **Ubicación**: `assets/favicon.png`
- **Uso**: Para versión web

## 🎨 Recomendaciones de Diseño

### Para el Icono:
- Usar el color azul oscuro (#1A374D) como fondo
- Agregar un símbolo relacionado con medio ambiente (hoja, árbol, reciclar)
- Mantener el diseño simple y reconocible

### Para el Splash Screen:
- Fondo azul oscuro (#1A374D)
- Logo o nombre de la app en blanco en el centro
- Opcionalmente agregar "VINUS Transporte" al pie

## 🛠️ Herramientas para Crear Iconos

1. **Online (Gratis)**:
   - Canva: https://www.canva.com/
   - Figma: https://www.figma.com/
   - Icon generators: https://icon.kitchen/

2. **Software de Diseño**:
   - Adobe Illustrator
   - Photoshop
   - GIMP (gratis)

## ⚡ Generación Rápida

Si necesitas iconos temporales rápidamente:

1. Visita: https://icon.kitchen/
2. Sube tu logo o crea uno simple
3. Descarga el paquete completo
4. Reemplaza los archivos en la carpeta `assets/`

## 📝 Nota Importante

Por ahora, el proyecto usa iconos por defecto de Expo. La aplicación funcionará perfectamente sin iconos personalizados, pero se verá más profesional con iconos propios.

Una vez que tengas los archivos de imagen, simplemente colócalos en la carpeta `assets/` y vuelve a generar el APK.
