#!/usr/bin/env python3
"""
Simple HTTP server to serve the existing frontend on port 8080
"""

import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = "/Users/johngonzalez/tusagatos-crm/frontend-existing"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 Serving frontend at http://localhost:{PORT}")
        print(f"📁 Directory: {DIRECTORY}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")
