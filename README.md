# 🎯 Microsoft Teams Replica con Extracción de Audio y Transcripción Automática

Una réplica fiel y moderna de **Microsoft Teams** construida **completamente desde cero, sin librerías ni dependencias externas** (Vanilla JavaScript ES6+, HTML5 semántico y CSS3 Fluent Design).

---

## 🚀 Características Principales

1. **Interfaz Réplica de Microsoft Teams**:
   - Barra superior con búsqueda global, selector de tema (Modo Oscuro / Modo Claro) y perfil de usuario.
   - Barra lateral izquierda de aplicaciones (*Actividad, Chat, Equipos, Calendario, Llamadas*).
   - Lista de canales y chats recientes con filtrado en tiempo real.
   - Área de mensajes con avatares, timestamps, burbujas estilo Teams y barra de escritura.

2. **Módulo de Llamada / Reunión Integrada**:
   - Botón morado **"Reunirse"** en la cabecera del canal.
   - Pantalla completa de reunión con vista de tu cámara en vivo y el asistente transcriptor.
   - Ecualizador de ondas de audio en tiempo real dibujado en `<canvas>` nativo con **Web Audio API**.
   - Subtítulos en directo (*Live Captions*) flotantes que muestran lo que vas hablando.
   - Barra flotante de controles: activar/desactivar cámara, mutear micrófono, compartir pantalla, enviar reacciones y botón rojo de **"Colgar"**.

3. **Extracción y Grabación de Audio desde Cero**:
   - Acceso al micrófono mediante `navigator.mediaDevices.getUserMedia({ audio: true })`.
   - Grabación continua en memoria mediante la API estándar `MediaRecorder` sin paquetes externos.
   - Generación de archivo de audio local (`Blob` en formato WebM/WAV) listo para reproducirse y descargarse.

4. **Transcripción a Texto Automática (Speech-to-Text Nativo)**:
   - Procesamiento en vivo usando `window.SpeechRecognition` / `window.webkitSpeechRecognition`.
   - Detección continua en idioma español (`es-ES` / nativo).
   - Estructuración cronológica con marcas de tiempo relativas (ej. `[00:04] Tú: Hola a todos...`).

5. **Publicación Automática en el Chat al Colgar**:
   - Tan pronto como pulsas **"Colgar"**, la llamada se cierra y **se publica automáticamente una tarjeta oficial de Teams en el chat activo** conteniendo:
     - ⏱️ **Duración exacta** de la llamada.
     - 🔊 **Reproductor de audio integrado** para escuchar la grabación de lo que se dijo.
     - 💾 **Botón de descarga del audio** (`.webm`).
     - 📝 **Acta con la transcripción completa** organizada por intervenciones y marcas de tiempo.
     - 📋 Botón para **copiar todo el texto** al portapapeles.
     - 📄 Botón para **exportar el resumen en un archivo `.txt`**.

---

## 🛠️ Cero Librerías Externas

El proyecto cumple estrictamente con el principio de **no usar librerías externas**:
- ❌ **Sin React / Vue / Angular** (JavaScript puro y optimizado).
- ❌ **Sin Bootstrap / Tailwind** (CSS nativo con variables CSS y diseño Fluent).
- ❌ **Sin npm packages ni módulos externos**.
- ❌ **Sin APIs externas de pago** (usa las APIs nativas del navegador).

---

## ⚡ Cómo Ejecutar la Aplicación

Debido a que los navegadores modernos exigen un contexto seguro (`http://localhost` o `https://`) para conceder permisos de micrófono y activar la Web Speech API, dispones de dos opciones ultraligeras (ambas usando solo herramientas estándar de tu sistema):

### Opción A: Con Python (Recomendado)
```bash
python server.py
```
*Se abrirá automáticamente tu navegador en `http://localhost:8080`.*

### Opción B: Con Node.js
```bash
node server.js
```
*Se abrirá automáticamente tu navegador en `http://localhost:8080`.*

---

## 💡 Instrucciones de Uso

1. Inicia el servidor con `python server.py` o `node server.js`.
2. En la interfaz de Teams, presiona el botón morado **"Reunirse"** (en la esquina superior derecha del chat).
3. Concede los permisos de micrófono y cámara que te solicite el navegador.
4. Habla por el micrófono; verás cómo el ecualizador reacciona a tu voz y los subtítulos en directo muestran lo que dices.
5. Cuando termines, pulsa el botón rojo **"Colgar"**.
6. Observa cómo automáticamente aparece en el chat la tarjeta de la reunión con el reproductor del audio que acabas de grabar y la transcripción completa a texto.

