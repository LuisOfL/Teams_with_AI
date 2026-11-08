#!/usr/bin/env python3
"""
Servidor HTTP local nativo para Microsoft Teams Replica.
Utiliza únicamente la librería estándar de Python (sin pip ni paquetes externos).
Permite ejecutar en localhost para habilitar los permisos de micrófono y Web Speech API.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class TeamsHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Cabeceras para evitar caché en desarrollo y permitir audio y micrófono seguro
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), TeamsHTTPRequestHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print("  MICROSOFT TEAMS REPLICA - SERVIDOR NATIVO")
        print("=" * 60)
        print(f"  Servidor iniciado en: {url}")
        print("  Abriendo navegador...")
        print("  Presiona Ctrl+C para detener el servidor.")
        print("=" * 60)
        
        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
            sys.exit(0)

if __name__ == "__main__":
    main()

