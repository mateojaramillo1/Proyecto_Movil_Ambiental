# 🚀 Guía Rápida - Windows

## Instalación Paso a Paso en Windows

### 1️⃣ Instalar Node.js

1. Descarga Node.js desde: https://nodejs.org/
2. Ejecuta el instalador descargado (.msi)
3. Sigue el asistente de instalación (acepta todas las opciones por defecto)
4. Reinicia la terminal/PowerShell

Para verificar la instalación, abre PowerShell y ejecuta:
```powershell
node --version
npm --version
```

### 2️⃣ Instalar Dependencias del Proyecto

1. Abre PowerShell
2. Navega a la carpeta del proyecto:
   ```powershell
   cd "C:\Users\teoja\OneDrive\Escritorio\Proyecto movil Ambiental"
   ```

3. Instala las dependencias:
   ```powershell
   npm install
   ```

4. Instala Expo CLI globalmente:
   ```powershell
   npm install -g expo-cli
   ```

5. Instala EAS CLI para generar APK:
   ```powershell
   npm install -g eas-cli
   ```

### 3️⃣ Probar la Aplicación

**Opción A: En tu celular con Expo Go (MÁS FÁCIL)**

1. Descarga "Expo Go" en tu celular desde Google Play Store

2. En PowerShell, ejecuta:
   ```powershell
   npm start
   ```

3. Se abrirá una página web con un código QR

4. Escanea el QR con la app Expo Go en tu celular

5. ¡La app se cargará automáticamente!

**Opción B: En emulador (requiere Android Studio)**

```powershell
npm run android
```

### 4️⃣ Generar el APK

Para crear el archivo .apk e instalarlo en cualquier celular:

1. Crea una cuenta en Expo (gratis):
   ```powershell
   eas login
   ```

2. Sigue las instrucciones para crear cuenta o iniciar sesión

3. Configura el proyecto:
   ```powershell
   eas build:configure
   ```

4. Genera el APK:
   ```powershell
   eas build -p android --profile preview
   ```

5. Espera 10-15 minutos (se construye en la nube)

6. Cuando termine, recibirás un link para descargar el APK

7. Descarga el APK a tu PC y transfiérelo a tu celular

8. En el celular, abre el archivo APK para instalarlo
   - Es posible que debas habilitar "Instalar apps de fuentes desconocidas"

### ⚠️ Problemas Comunes en Windows

**Error: "no se reconoce como un comando"**
- Cierra y abre nuevamente PowerShell
- Asegúrate de haber instalado Node.js correctamente

**Error: "execution policy"**
Para permitir scripts en PowerShell, ejecuta como Administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Error: "ENOENT" o "cannot find module"**
```powershell
rm -r node_modules
npm install
```

**El código QR no funciona**
- Asegúrate de que tu PC y celular estén en la misma red WiFi
- Prueba presionando "a" en la terminal para usar conexión LAN

### 📝 Comandos Útiles

Ver todas las opciones de Expo:
```powershell
npm start
```
Luego presiona:
- `a` - Abrir en Android
- `w` - Abrir en navegador web
- `r` - Recargar app
- `m` - Cambiar modo de desarrollo

Limpiar caché:
```powershell
npm start -- --clear
```

### 📱 Transferir APK al Celular

1. **Por cable USB**:
   - Conecta el celular a la PC
   - Copia el APK a la carpeta "Descargas" del celular
   - Abre el archivo en el celular

2. **Por correo/WhatsApp**:
   - Envíate el APK por correo o WhatsApp
   - Descárgalo en el celular
   - Abre el archivo descargado

3. **Por Google Drive**:
   - Sube el APK a Google Drive
   - Descárgalo desde el celular
   - Instálalo

### ✅ Verificación

Para verificar que todo está instalado correctamente:

```powershell
node --version        # Debe mostrar v16.x.x o superior
npm --version         # Debe mostrar 8.x.x o superior  
expo --version        # Debe mostrar ~50.x.x
eas-cli --version     # Debe mostrar una versión
```

### 🎯 Próximos Pasos

1. Personaliza los colores en los archivos de `screens/`
2. Agrega tus propios iconos en la carpeta `assets/`
3. Modifica los campos del formulario según necesites
4. Genera tu APK y prueba en tu celular

### 📞 Ayuda Adicional

Si tienes problemas:
1. Verifica que Node.js esté instalado correctamente
2. Asegúrate de estar en la carpeta correcta del proyecto
3. Revisa que tu firewall no bloquee Expo
4. Consulta la documentación oficial: https://docs.expo.dev/

---

**¡Listo! Ya tienes todo para desarrollar y generar tu app móvil. 🎉**
