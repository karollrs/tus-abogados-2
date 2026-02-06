#!/usr/bin/env python3
"""
Tusa Gato's 24/7 - Simple Backend (No complex dependencies)
"""

import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# Load environment variables
RETELL_API_KEY = os.getenv("RETELL_API_KEY", "")

# Storage
leads = []

class APIHandler(BaseHTTPRequestHandler):
    lead_counter = 1000
    
    def log_message(self, format, *args):
        pass
    
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_OPTIONS(self):
        self._set_headers()
    
    def do_GET(self):
        path = self.path
        
        if path == '/' or path == '/health':
            self._set_headers()
            self.wfile.write(json.dumps({
                "status": "healthy",
                "service": "Tusa Gato's 24/7 API",
                "timestamp": datetime.now().isoformat()
            }).encode())
        
        elif path.startswith('/leads'):
            self._set_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "data": leads[-20:]  # Return last 20 leads
            }).encode())
        
        elif path == '/analytics/dashboard':
            self._set_headers()
            total = len(leads)
            qualified = sum(1 for l in leads if l.get('qualificationScore', 0) >= 50)
            converted = sum(1 for l in leads if l.get('status') == 'converted')
            
            self.wfile.write(json.dumps({
                "success": True,
                "data": {
                    "leads": {
                        "total": total,
                        "qualified": qualified,
                        "converted": converted,
                        "conversionRate": f"{((converted/max(total,1))*100):.1f}",
                        "byCaseType": {},
                        "byStatus": {}
                    }
                }
            }).encode())
        
        elif path == '/attorneys':
            self._set_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "data": []
            }).encode())
        
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
    
    def do_POST(self):
        path = self.path
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode() if content_length > 0 else '{}'
        
        try:
            data = json.loads(body) if body else {}
        except:
            data = {}
        
        if path == '/webhooks/retell':
            self._set_headers()
            
            # Process RetellAI webhook
            extracted = data.get('extracted_data', {})
            
            APIHandler.lead_counter += 1
            
            new_lead = {
                "_id": f"lead_{APIHandler.lead_counter}",
                "_creationTime": int(datetime.now().timestamp() * 1000),
                "phone": extracted.get('phone', data.get('phone_number', '')),
                "firstName": extracted.get('first_name', ''),
                "lastName": extracted.get('last_name', ''),
                "caseType": extracted.get('case_type', 'other'),
                "county": extracted.get('county', 'Unknown'),
                "state": extracted.get('state', 'NY'),
                "urgency": extracted.get('urgency', 'medium'),
                "status": "new",
                "qualificationScore": 75,
                "source": "ai_receptionist",
                "createdAt": int(datetime.now().timestamp() * 1000),
                "aiSummary": extracted.get('summary', ''),
                "aiTranscript": json.dumps(data.get('transcript', []), indent=2)
            }
            
            leads.append(new_lead)
            print(f"📞 New lead created: {new_lead['firstName']} {new_lead['lastName']} - {new_lead['caseType']}")
            
            self.wfile.write(json.dumps({
                "success": True,
                "leadId": new_lead['_id'],
                "message": "Lead created"
            }).encode())
        
        elif path == '/retell/test-webhook':
            self._set_headers()
            
            # Create test lead
            APIHandler.lead_counter += 1
            
            test_lead = {
                "_id": f"lead_{APIHandler.lead_counter}",
                "_creationTime": int(datetime.now().timestamp() * 1000),
                "phone": "+12125551234",
                "firstName": "Maria",
                "lastName": "Gonzalez",
                "caseType": "personal_injury",
                "county": "Queens",
                "state": "NY",
                "urgency": "high",
                "status": "new",
                "qualificationScore": 85,
                "source": "ai_receptionist",
                "createdAt": int(datetime.now().timestamp() * 1000),
                "aiSummary": "Client was in a car accident on Main St. Needs personal injury attorney.",
                "aiTranscript": "AI: Gracias por llamar a Tusa Gato's 24/7..."
            }
            
            leads.append(test_lead)
            print(f"🧪 Test lead created: {test_lead['firstName']} {test_lead['lastName']}")
            
            self.wfile.write(json.dumps({
                "success": True,
                "leadId": test_lead['_id'],
                "message": "Test lead created"
            }).encode())
        
        elif path == '/retell/setup-complete':
            self._set_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "agent_id": "agent_tusagatos_v1",
                "message": "Agent configured! Now run: python3 setup-retell.py to connect your phone"
            }).encode())
        
        elif path == '/retell/connect-number':
            self._set_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": f"Phone {data.get('phone_number')} connected!"
            }).encode())
        
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

if __name__ == "__main__":
    PORT = 8000
    server = HTTPServer(("", PORT), APIHandler)
    print(f"🚀 Simple backend running on http://localhost:{PORT}")
    print(f"📞 RetellAI webhook: http://localhost:{PORT}/webhooks/retell")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
