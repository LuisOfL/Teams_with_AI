#!/usr/bin/env python3
"""
=============================================================================
MICROSOFT TEAMS REPLICA - SERVIDOR BACKEND FASTAPI + MOTOR C++ NATIVO
=============================================================================
Arquitectura:
1. Frontend Teams (HTML5 / Vanilla JS / CSS3 Fluent Design).
2. Backend API en Python con FastAPI y Uvicorn.
3. Motor de Procesamiento y Red Neuronal compilado en C++ nativo (engine.dll).
   El puente entre Python y C++ se realiza mediante ctypes (sin librerías extras).
=============================================================================
"""

import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
import sys
import io
import json
import ctypes
import tempfile
import webbrowser
from typing import Optional
from PIL import Image, ImageDraw, ImageEnhance

from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Puerto y directorio base
PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DLL_PATH = os.path.join(BASE_DIR, "engine.dll")
CENTROIDS_PATH = os.path.join(BASE_DIR, "tekit-vision", "model", "centroids.bin")

# =============================================================================
# 1. CARGA DEL MOTOR COMPILADO EN C++ (engine.dll vía ctypes)
# =============================================================================
cpp_engine = None
whisper_pipeline = None

try:
    if os.path.exists(DLL_PATH):
        cpp_engine = ctypes.CDLL(DLL_PATH)
        
        # Configurar firmas de tipos de las funciones C++
        cpp_engine.get_engine_version.restype = ctypes.c_char_p

        cpp_engine.transcribe_wav_file.argtypes = [
            ctypes.c_char_p, # wav_path
            ctypes.c_char_p, # lang
            ctypes.c_char_p, # out_buffer
            ctypes.c_int     # max_buffer_len
        ]
        cpp_engine.transcribe_wav_file.restype = ctypes.c_int

        cpp_engine.transcribe_pcm.argtypes = [
            ctypes.POINTER(ctypes.c_float), # samples
            ctypes.c_int,                   # num_samples
            ctypes.c_int,                   # sample_rate
            ctypes.c_char_p,                # lang
            ctypes.c_char_p,                # out_buffer
            ctypes.c_int                    # max_buffer_len
        ]
        cpp_engine.transcribe_pcm.restype = ctypes.c_int

        # Configurar firmas del modelo de visión por computadora (tekit-vision)
        cpp_engine.init_vision_model.argtypes = [ctypes.c_char_p]
        cpp_engine.init_vision_model.restype = ctypes.c_int

        cpp_engine.reset_vision_session.restype = None

        cpp_engine.analyze_frame_rgba.argtypes = [
            ctypes.POINTER(ctypes.c_uint8),  # rgba_pixels
            ctypes.c_int,                    # width
            ctypes.c_int,                    # height
            ctypes.c_int,                    # use_guide
            ctypes.c_double,                 # elapsed_seconds
            ctypes.POINTER(ctypes.c_int),    # out_found
            ctypes.POINTER(ctypes.c_int),    # out_box_x
            ctypes.POINTER(ctypes.c_int),    # out_box_y
            ctypes.POINTER(ctypes.c_int),    # out_box_w
            ctypes.POINTER(ctypes.c_int),    # out_box_h
            ctypes.c_char_p,                 # out_expression
            ctypes.c_int,                    # max_exp_len
            ctypes.POINTER(ctypes.c_float)   # out_margin
        ]
        cpp_engine.analyze_frame_rgba.restype = ctypes.c_int

        cpp_engine.finish_vision_session.argtypes = [
            ctypes.c_double, # elapsed_seconds
            ctypes.c_char_p, # out_summary_json
            ctypes.c_int     # max_summary_len
        ]
        cpp_engine.finish_vision_session.restype = ctypes.c_int

        # Inicializar modelo de visión
        if os.path.exists(CENTROIDS_PATH):
            res_v = cpp_engine.init_vision_model(CENTROIDS_PATH.encode('utf-8'))
            print(f"  [VISIÓN C++]: Modelo centroids.bin cargado con éxito ({res_v == 1})")
        else:
            print(f"  [VISIÓN C++ AVISO]: No se encontró {CENTROIDS_PATH}")

        version_str = cpp_engine.get_engine_version().decode('utf-8')
        print("=" * 60)
        print(f"  [C++ ENGINE ACTIVO]: {version_str}")
        print("=" * 60)
    else:
        print(f"  [AVISO]: No se encontró {DLL_PATH}. Compila engine.cpp con MSVC.")
except Exception as e:
    print(f"  [ERROR al cargar engine.dll]: {e}")
    cpp_engine = None

# =============================================================================
# CARGA ASÍNCRONA DE MODELO WHISPER LOCAL (PyTorch + CUDA)
# =============================================================================
def load_whisper_ai():
    global whisper_pipeline
    try:
        os.environ["HF_HUB_OFFLINE"] = "1"
        import torch
        if not hasattr(torch, 'accelerator'):
            class _Acc:
                @staticmethod
                def current_accelerator():
                    return torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            torch.accelerator = _Acc()
        from transformers import pipeline

        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        print(f"  [AUDIO LOCAL]: Inicializando Whisper con aceleración en {device}...")
        whisper_pipeline = pipeline(
            "automatic-speech-recognition",
            model="openai/whisper-tiny",
            device=device
        )
        print("  [AUDIO LOCAL]: Whisper listo. Transcripción de oraciones completas activa.")
    except Exception as err:
        print(f"  [AUDIO LOCAL AVISO]: Operando en modo C++ puro ({err})")

import threading

# =============================================================================
# 2. APLICACIÓN FASTAPI
# =============================================================================
app = FastAPI(
    title="Teams Collaboration Service",
    description="Servicio de conferencias y transcripción de voz",
    version="2.0.0"
)

@app.on_event("startup")
async def on_startup_event():
    threading.Thread(target=load_whisper_ai, daemon=True).start()
    flag_file = os.path.join(tempfile.gettempdir(), "teams_browser_opened_v41.flag")
    if not os.path.exists(flag_file):
        try:
            with open(flag_file, "w") as f:
                f.write("1")
            webbrowser.open(f"http://127.0.0.1:{PORT}")
        except Exception:
            pass

# Permitir CORS para localhost, redes locales y file:// (origen null)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def disable_cache_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/api/health")
def get_health():
    return {
        "status": "online",
        "engine": "cpp",
        "vision_ready": cpp_engine is not None and os.path.exists(CENTROIDS_PATH)
    }

# Estado del sistema
@app.get("/api/status")
def get_system_status():
    version_info = "No disponible"
    if cpp_engine:
        try:
            version_info = cpp_engine.get_engine_version().decode('utf-8')
        except Exception:
            version_info = "Activo"
    return {
        "status": "online",
        "backend": "FastAPI + Uvicorn",
        "cpp_engine_loaded": cpp_engine is not None,
        "cpp_engine_version": version_info,
        "supported_languages": ["en-US", "es-ES", "en-GB", "es-MX", "fr-FR", "pt-BR"]
    }

# Endpoint principal de transcripción de audio mediante C++
@app.post("/api/transcribe")
async def transcribe_audio_endpoint(
    audio: UploadFile = File(...),
    lang: str = Form("es-ES")
):
    """
    Recibe el archivo de audio grabado por Teams, invoca el motor C++ nativo
    a través de ctypes y devuelve la transcripción procesada con la red neuronal C++.
    """
    if not cpp_engine:
        raise HTTPException(status_code=500, detail="Motor C++ (engine.dll) no cargado.")

    temp_wav_path = None
    try:
        # Guardar archivo recibido temporalmente
        suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            contents = await audio.read()
            temp_file.write(contents)
            temp_wav_path = temp_file.name

        transcription_text = ""
        engine_name = ""

        # 1. Prioridad: Si Whisper AI con PyTorch está listo, transcribir con máxima precisión
        if whisper_pipeline is not None:
            try:
                whisper_lang = "english" if "en" in lang.lower() else "spanish"
                result = whisper_pipeline(
                    temp_wav_path,
                    generate_kwargs={"language": whisper_lang, "task": "transcribe"}
                )
                transcription_text = result.get("text", "").strip()
                if transcription_text:
                    engine_name = "OpenAI Whisper AI (PyTorch GPU)"
            except Exception as w_err:
                print(f"  [AVISO Whisper]: {w_err}, pasando al motor C++...")

        # 2. Respaldo: Si Whisper no está listo o falló, usar el motor C++ nativo
        if not transcription_text and cpp_engine:
            out_buffer = ctypes.create_string_buffer(4096)
            lang_bytes = lang.encode("utf-8")
            path_bytes = temp_wav_path.encode("utf-8")

            res_code = cpp_engine.transcribe_wav_file(
                path_bytes,
                lang_bytes,
                out_buffer,
                4096
            )

            transcription_text = out_buffer.value.decode("utf-8", errors="replace")
            engine_name = "C++ Native Neural Audio Engine (MSVC x64)"

        if not transcription_text:
            transcription_text = "(No speech detected)" if "en" in lang.lower() else "(No se detectó voz grabada)"

        # Generar formato cronológico de Teams
        is_en = "en" in lang.lower()
        speaker_name = "Tú" if not is_en else "You"

        return {
            "status": "success",
            "engine": "Teams Audio Service",
            "language": lang,
            "text": transcription_text,
            "transcription": [
                {
                    "time": "00:02",
                    "speaker": speaker_name,
                    "text": transcription_text
                }
            ]
        }

    except Exception as err:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(err)}
        )
    finally:
        if temp_wav_path and os.path.exists(temp_wav_path):
            try:
                os.remove(temp_wav_path)
            except Exception:
                pass

# =============================================================================
# ENDPOINTS DE VISIÓN POR COMPUTADORA (TEKIT-VISION)
# =============================================================================
@app.post("/api/vision/reset_session")
async def vision_reset_session():
    if cpp_engine:
        cpp_engine.reset_vision_session()
    return {"status": "success", "message": "Sesión de visión reiniciada"}

@app.post("/api/vision/analyze_frame")
async def vision_analyze_frame(
    frame: UploadFile = File(...),
    elapsed: float = Form(0.0),
    use_guide: int = Form(0)
):
    """
    Analiza un cuadro de video en vivo de la cámara usando el modelo C++ (tekit-vision):
    Detección por color de piel, LBP U2 y clasificación con distancia chi² sobre centroides.
    """
    if not cpp_engine:
        raise HTTPException(status_code=500, detail="Motor C++ no cargado")

    try:
        content = await frame.read()
        rgb_img = Image.open(io.BytesIO(content)).convert("RGB")
        w, h = rgb_img.size

        # Compensar iluminación tenue de webcam y enmascarar bordes laterales del fondo (puertas/muebles de madera)
        rgb_img = ImageEnhance.Brightness(rgb_img).enhance(1.22)
        rgb_img = ImageEnhance.Contrast(rgb_img).enhance(1.10)
        pil_img = rgb_img.convert("RGBA")

        draw = ImageDraw.Draw(pil_img)
        draw.rectangle([0, 0, int(w * 0.22), h], fill=(20, 20, 20, 255))
        draw.rectangle([int(w * 0.78), 0, w, h], fill=(20, 20, 20, 255))
        draw.rectangle([0, 0, w, int(h * 0.12)], fill=(20, 20, 20, 255))

        raw_bytes = pil_img.tobytes()

        pixels_arr = (ctypes.c_uint8 * len(raw_bytes)).from_buffer_copy(raw_bytes)

        out_found = ctypes.c_int(0)
        out_bx = ctypes.c_int(0)
        out_by = ctypes.c_int(0)
        out_bw = ctypes.c_int(0)
        out_bh = ctypes.c_int(0)
        out_exp = ctypes.create_string_buffer(64)
        out_margin = ctypes.c_float(0.0)

        cpp_engine.analyze_frame_rgba(
            pixels_arr,
            w, h,
            use_guide,
            ctypes.c_double(elapsed),
            ctypes.byref(out_found),
            ctypes.byref(out_bx),
            ctypes.byref(out_by),
            ctypes.byref(out_bw),
            ctypes.byref(out_bh),
            out_exp, 64,
            ctypes.byref(out_margin)
        )

        exp_name = out_exp.value.decode("utf-8", errors="replace")
        
        display_map = {
            "enojo": "Concentrado / Tensión",
            "asco": "Disgusto / Desacuerdo",
            "miedo": "Alerta",
            "feliz": "Positiva / Agradable",
            "triste": "Serio",
            "sorpresa": "Atenta / Sorpresa",
            "neutral": "Neutral / Enfocado",
            "sin datos": "Buscando rostro"
        }
        display_name = display_map.get(exp_name, exp_name.capitalize())

        return {
            "status": "success",
            "found": bool(out_found.value),
            "box": {
                "x": out_bx.value,
                "y": out_by.value,
                "w": out_bw.value,
                "h": out_bh.value
            },
            "expression": exp_name,
            "expression_display": display_name,
            "margin": float(out_margin.value),
            "elapsed": elapsed
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.post("/api/vision/finish_session")
async def vision_finish_session(
    elapsed: float = Form(0.0)
):
    """
    Cierra la sesión de análisis de video y calcula las métricas de cobertura,
    expresión dominante, balance de atención y distribución de tiempo por emoción.
    """
    if not cpp_engine:
        raise HTTPException(status_code=500, detail="Motor C++ no cargado")

    out_summary = ctypes.create_string_buffer(8192)
    res_len = cpp_engine.finish_vision_session(
        ctypes.c_double(elapsed),
        out_summary,
        8192
    )

    if res_len <= 0:
        return {"status": "empty", "summary": None}

    try:
        summary_data = json.loads(out_summary.value.decode("utf-8", errors="replace"))
        return {
            "status": "success",
            "summary": summary_data
        }
    except Exception as err:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(err)})

# Servir página principal
@app.get("/", response_class=HTMLResponse)
async def read_index():
    index_path = os.path.join(BASE_DIR, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        return f.read()

# Servir archivos estáticos del frontend (app.js, styles.css, etc.)
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")

# =============================================================================
# 3. LIBERACIÓN DE PUERTO Y LANZAMIENTO DEL SERVIDOR
# =============================================================================
def release_port_if_busy(port: int):
    """
    Si una instancia previa de Python o Node quedó reteniendo el puerto,
    la libera para evitar el error OSError [WinError 10048].
    """
    if sys.platform == "win32":
        try:
            import subprocess, time
            cmd = f'netstat -ano | findstr :{port}'
            output = subprocess.check_output(cmd, shell=True).decode()
            current_pid = os.getpid()
            killed = False
            for line in output.strip().split('\n'):
                parts = line.strip().split()
                if len(parts) >= 5 and "LISTENING" in parts:
                    pid = int(parts[-1])
                    if pid != current_pid and pid > 0:
                        print(f"  [AVISO]: Liberando puerto {port} ocupado por proceso PID {pid}...")
                        subprocess.call(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        killed = True
            if killed:
                time.sleep(1.2)  # Pausa breve para que el kernel de Windows libere el socket TCP
        except Exception:
            pass

def main():
    target_port = PORT
    release_port_if_busy(target_port)
    url = f"http://127.0.0.1:{target_port}"
    print("=" * 60)
    print("  MICROSOFT TEAMS REPLICA - FASTAPI + MOTOR C++ NATIVO")
    print("=" * 60)
    print(f"  Servidor iniciado en: {url} (o http://localhost:{target_port})")
    print(f"  Motor de IA: C++ compilado en engine.dll (ctypes)")
    print("  Abriendo navegador...")
    print("=" * 60)
    
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        uvicorn.run(app, host="0.0.0.0", port=target_port, log_level="info")
    except OSError as e:
        alt_port = 8080 if target_port == 8000 else 8000
        print(f"  [AVISO]: Error en puerto {target_port} ({e}), intentando en puerto alternativo {alt_port}...")
        release_port_if_busy(alt_port)
        webbrowser.open(f"http://127.0.0.1:{alt_port}")
        uvicorn.run(app, host="0.0.0.0", port=alt_port, log_level="info")

if __name__ == "__main__":
    main()
