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

4. **Transcripción a Texto Automática Multilingüe (Speech-to-Text Nativo)**:
   - Procesamiento en vivo usando `window.SpeechRecognition` / `window.webkitSpeechRecognition`.
   - **Soporte Multilingüe Completo**: Selector interactivo de idiomas (Inglés `en-US` y `en-GB`, Español `es-ES` y `es-MX`, Francés `fr-FR`, Portugués `pt-BR`, Alemán `de-DE`, Italiano `it-IT`, Japonés `ja-JP`, Chino `zh-CN`, o Detección Automática por Navegador).
   - Cambio dinámico de idioma tanto antes de iniciar la llamada como en tiempo real durante la reunión.
   - Estructuración cronológica con marcas de tiempo relativas (ej. `[00:04] Tú: Hello everyone...`).

5. **Publicación Automática en el Chat al Colgar**:
   - Tan pronto como pulsas **"Colgar"**, la llamada se cierra y **se publica automáticamente una tarjeta oficial de Teams en el chat activo** conteniendo:
     - ⏱️ **Duración exacta** y etiqueta del 🌐 **idioma transcrito**.
     - 🔊 **Reproductor de audio integrado** para escuchar la grabación de lo que se dijo.
     - 💾 **Botón de descarga del audio** (`.webm`).
     - 📝 **Acta con la transcripción completa** organizada por intervenciones y marcas de tiempo.
     - 📋 Botón para **copiar todo el texto** al portapapeles.
     - 📄 Botón para **exportar el resumen en un archivo `.txt`**.

---

## ⚡ Arquitectura C++ Nativo + FastAPI + Python ctypes

Para cumplir con el requerimiento de desarrollar **tecnología propia de bajo nivel**:
```
┌─────────────────────────┐          HTTP POST /api/transcribe         ┌─────────────────────────┐
│   Frontend Teams UI     │ ─────────────────────────────────────────> │     Backend FastAPI     │
│  (Vanilla JS / HTML5)   │ <───────────────────────────────────────── │  (server.py / Uvicorn)  │
└─────────────────────────┘                 JSON Result                └───────────┬─────────────┘
                                                                                   │ ctypes
                                                                                   ▼
                                                                       ┌─────────────────────────┐
                                                                       │    engine.dll (C++)     │
                                                                       │ • DSP (RMS, ZCR, FFT)   │
                                                                       │ • Red Neuronal (MLP)    │
                                                                       │ • Parser RIFF WAVE PCM  │
                                                                       └─────────────────────────┘
```

1. **Motor en C++ Nativo (`engine.cpp` / `engine.dll`)**:
   - Escrito en C++ estándar sin ninguna librería externa (cero dependencias).
   - Implementa procesamiento de señales (DSP), parser de audio PCM y red neuronal multicapa (MLP) con funciones de activación ReLU y Softmax escritas a mano.
   - Compilado a `engine.dll` con optimización `/O2` de MSVC.
2. **Puente Python ctypes**:
   - `server.py` carga `engine.dll` mediante la librería nativa de Python `ctypes`, pasando los búferes de audio directamente a la memoria de C++.
3. **Servidor FastAPI**:
   - Expone el endpoint `POST /api/transcribe` para procesar el audio y devolver la transcripción en milisegundos.

---

## 🧠 Arquitectura de la Inteligencia Artificial Propia (Sin Librerías)

Para cumplir con el requerimiento académico de **desarrollar tecnología propia sin librerías externas de terceros**, el proyecto incluye un motor acústico y neuronal programado 100% a mano en [`acoustic-engine.js`](acoustic-engine.js):

### 1. Procesamiento Digital de Señales (DSP)
El motor analiza el flujo de audio PCM crudo en tiempo real mediante tres métricas acústicas matemáticas:
* **Energía Cuadrática Media (RMS)**: Detecta inicio de voz y energía silábica:
  $$\text{RMS} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} x_i^2}$$
* **Tasa de Cruces por Cero (Zero-Crossing Rate - ZCR)**: Discrimina consonantes fricativas/sordas de alta frecuencia (/s/, /f/, /t/) frente a vocales sonoras:
  $$\text{ZCR} = \frac{1}{N-1} \sum_{i=2}^{N} \mathbb{I}(x_i \cdot x_{i-1} < 0)$$
* **Centroide Espectral y Banco de Filtros**: Calcula el centro de masa del espectro de frecuencias y divide la señal en 13 bandas perceptuales.

### 2. Red Neuronal Artificial Feed-Forward a Mano
* **Capa de Entrada**: Vector de características acústicas normalizado de 16 dimensiones.
* **Capa Oculta 1**: 32 neuronas con función de activación ReLU: $f(x) = \max(0, x)$.
* **Capa Oculta 2**: 16 neuronas con función de activación LeakyReLU.
* **Capa de Salida**: 12 clases acústicas normalizadas con función Softmax para distribución de probabilidades:
  $$\text{Softmax}(z_i) = \frac{e^{z_i - \max(z)}}{\sum_j e^{z_j - \max(z)}}$$

### 3. Telemetría en Vivo (HUD)
Durante la llamada, el sistema proyecta en tiempo real las métricas matemáticas (RMS, ZCR, Centroide Hz y la salida probabilística de la red neuronal), permitiendo auditar y defender el funcionamiento del algoritmo frente a evaluadores.

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

