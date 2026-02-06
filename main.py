"""
Tusa Gato's 24/7 - Backend API
FastAPI backend for CRM with RetellAI integration
"""

import os
import json
import hmac
import hashlib
import time
from uuid import uuid4
from datetime import datetime
from typing import Optional, List, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
from convex import ConvexClient

# Import Retell setup
from retell_setup import retell_setup, RetellAgentSetup

# =============================================================================
# CONFIGURATION
# =============================================================================

RETELL_API_KEY = os.getenv("RETELL_API_KEY", "")
RETELL_WEBHOOK_SECRET = os.getenv("RETELL_WEBHOOK_SECRET", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
RETELL_LLM_PROVIDER = os.getenv("RETELL_LLM_PROVIDER", "")
RETELL_LLM_MODEL = os.getenv("RETELL_LLM_MODEL", "")
CONVEX_URL = os.getenv("CONVEX_URL", "")
DEMO_MODE = os.getenv("DEMO_MODE", "").lower() in ("1", "true", "yes")

# Get webhook URL (for production, use deployed URL)
WEBHOOK_BASE_URL = os.getenv("WEBHOOK_BASE_URL", "https://your-api.com")
if os.getenv("ENVIRONMENT") == "development":
    WEBHOOK_BASE_URL = "https://tusa.ngrok.io"  # Use ngrok for local dev

if not RETELL_API_KEY:
    print("⚠️  Warning: RETELL_API_KEY not set")
if not CONVEX_URL:
    print("⚠️  Warning: CONVEX_URL not set")

DEMO_LEADS: List[dict] = []

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class RetellExtractedData(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    case_type: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = "NY"
    incident_date: Optional[str] = None
    incident_location: Optional[str] = None
    description: Optional[str] = None
    urgency: Optional[str] = "medium"
    language_preference: Optional[str] = "spanish"
    callback_requested: Optional[bool] = False
    summary: Optional[str] = None

class RetellWebhookPayload(BaseModel):
    event: str
    call_id: str
    agent_id: str
    phone_number: str
    direction: str = "inbound"
    started_at: int
    ended_at: Optional[int] = None
    duration_seconds: Optional[int] = None
    recording_url: Optional[str] = None
    extracted_data: Optional[RetellExtractedData] = None
    transcript: Optional[List[dict]] = None
    call_analysis: Optional[dict] = None
    status: str
    metadata: Optional[dict] = None

class LeadCreate(BaseModel):
    phone: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    case_type: str
    county: str
    state: str = "NY"
    incident_date: Optional[str] = None
    description: Optional[str] = None
    urgency: str = "medium"
    language_pref: str = "spanish"
    source: str = "manual"

class AttorneyCreate(BaseModel):
    email: str
    first_name: str
    last_name: str
    phone: str
    bar_number: str
    firm_name: str
    website: Optional[str] = None
    address: Optional[str] = None
    subscription_tier: str = "standard"
    max_leads_per_day: int = 10
    specializations: List[dict]
    counties: List[dict]

class TransferResponse(BaseModel):
    response_type: str  # accepted or declined
    notes: Optional[str] = None
    estimated_value: Optional[float] = None
    rejection_reason: Optional[str] = None

class SetupAgentRequest(BaseModel):
    webhook_url: Optional[str] = None
    voice_id: Optional[str] = "11labs-Adrian"

class ConnectNumberRequest(BaseModel):
    phone_number: str
    agent_id: str

# =============================================================================
# FASTAPI APP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    global convex
    print("🚀 Starting Tusa Gato's 24/7 Backend")
    print(f"📞 RetellAI API Key: {'✅ Configured' if RETELL_API_KEY else '❌ Missing'}")
    print(f"🗄️  Convex URL: {'✅ Configured' if CONVEX_URL else '❌ Missing'}")
    if CONVEX_URL:
        try:
            convex = ConvexClient(CONVEX_URL)
            print(f"✅ Connected to Convex: {CONVEX_URL}")
        except Exception as e:
            print(f"❌ Failed to connect to Convex: {e}")
    yield
    print("👋 Shutting down")

app = FastAPI(
    title="Tusa Gato's 24/7 API",
    description="CRM and AI Receptionist API for Legal Referral Network",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Convex client
convex: Optional[ConvexClient] = None

# =============================================================================
# RETELLAI CLIENT
# =============================================================================

class RetellClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.retellai.com"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
    
    async def list_agents(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/list-agents",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def get_agent(self, agent_id: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/get-agent/{agent_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def create_agent(self, agent_config: dict):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/create-agent",
                headers=self.headers,
                json=agent_config
            )
            response.raise_for_status()
            return response.json()

    async def create_retell_llm(self, llm_config: dict):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/create-retell-llm",
                headers=self.headers,
                json=llm_config
            )
            response.raise_for_status()
            return response.json()
    
    async def update_agent(self, agent_id: str, updates: dict):
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/update-agent/{agent_id}",
                headers=self.headers,
                json=updates
            )
            response.raise_for_status()
            return response.json()
    
    async def get_call(self, call_id: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/get-call/{call_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def list_phone_numbers(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/list-phone-numbers",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def update_phone_number(self, phone_number: str, agent_id: str):
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/update-phone-number/{phone_number}",
                headers=self.headers,
                json={"inbound_agent_id": agent_id}
            )
            response.raise_for_status()
            return response.json()

retell = RetellClient(RETELL_API_KEY) if RETELL_API_KEY else None

# =============================================================================
# DEMO MODE HELPERS
# =============================================================================

def demo_enabled() -> bool:
    return DEMO_MODE or convex is None

def _build_demo_lead(
    first_name: str,
    last_name: str,
    phone: str,
    case_type: str,
    county: str,
    state: str,
    urgency: str,
    description: str,
    source: str,
    retell_call_id: Optional[str] = None,
    retell_agent_id: Optional[str] = None,
) -> dict:
    now_ms = int(time.time() * 1000)
    score = 90 if urgency in ("emergency", "high") else 75 if urgency == "medium" else 60
    return {
        "_id": uuid4().hex,
        "firstName": first_name,
        "lastName": last_name,
        "phone": phone,
        "caseType": case_type,
        "county": county,
        "state": state,
        "urgency": urgency,
        "description": description,
        "status": "new",
        "qualificationScore": score,
        "createdAt": now_ms,
        "updatedAt": now_ms,
        "source": source,
        "retellCallId": retell_call_id,
        "retellAgentId": retell_agent_id,
    }

def add_demo_lead_from_retell(payload: RetellWebhookPayload) -> dict:
    extracted = payload.extracted_data or RetellExtractedData()
    first_name = extracted.first_name or ""
    last_name = extracted.last_name or ""

    if not first_name and extracted.name:
        parts = extracted.name.split()
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    phone = extracted.phone or payload.phone_number or "+1"
    case_type = extracted.case_type or "personal_injury"
    county = extracted.county or "Queens"
    state = extracted.state or "NY"
    urgency = extracted.urgency or "medium"
    description = extracted.description or "AI intake completed."

    lead = _build_demo_lead(
        first_name or "Unknown",
        last_name or "Client",
        phone,
        case_type,
        county,
        state,
        urgency,
        description,
        "retell",
        payload.call_id,
        payload.agent_id,
    )
    if payload.recording_url:
        lead["recordingUrl"] = payload.recording_url
    if payload.extracted_data and payload.extracted_data.summary:
        lead["aiSummary"] = payload.extracted_data.summary
    if payload.transcript:
        lead["aiTranscript"] = json.dumps(payload.transcript)
    DEMO_LEADS.insert(0, lead)
    return lead

def add_demo_lead_manual(lead: LeadCreate) -> dict:
    demo_lead = _build_demo_lead(
        lead.first_name or "Unknown",
        lead.last_name or "Client",
        lead.phone,
        lead.case_type,
        lead.county,
        lead.state,
        lead.urgency,
        lead.description or "Manual intake.",
        lead.source,
    )
    DEMO_LEADS.insert(0, demo_lead)
    return demo_lead

def get_demo_stats() -> dict:
    total = len(DEMO_LEADS)
    qualified = sum(1 for lead in DEMO_LEADS if lead.get("status") in ("qualified", "matched", "accepted", "converted"))
    converted = sum(1 for lead in DEMO_LEADS if lead.get("status") == "converted")
    return {
        "total": total,
        "qualified": qualified,
        "converted": converted,
    }

# =============================================================================
# WEBHOOK ENDPOINTS
# =============================================================================

def verify_retell_webhook(payload: bytes, signature: str) -> bool:
    """Verify RetellAI webhook signature"""
    if not RETELL_WEBHOOK_SECRET:
        return True  # Skip verification in dev
    
    expected = hmac.new(
        RETELL_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)

def _first_value(sources: List[dict], keys: List[str]) -> Optional[Any]:
    for source in sources:
        if not isinstance(source, dict):
            continue
        for key in keys:
            if key in source and source[key] is not None:
                return source[key]
    return None

def _normalize_status(event: str, status: Optional[str]) -> str:
    allowed = {"completed", "failed", "no_answer", "voicemail", "transferred"}
    normalized = (status or "").lower()
    if normalized in allowed:
        return normalized
    event_normalized = (event or "").lower()
    if "failed" in event_normalized:
        return "failed"
    if "no_answer" in event_normalized:
        return "no_answer"
    if "voicemail" in event_normalized:
        return "voicemail"
    if "transfer" in event_normalized:
        return "transferred"
    return "completed"

def normalize_retell_payload(raw: dict) -> RetellWebhookPayload:
    event = raw.get("event") or raw.get("type") or raw.get("event_type") or "call.unknown"
    data = raw.get("data") if isinstance(raw.get("data"), dict) else {}
    call = raw.get("call") if isinstance(raw.get("call"), dict) else {}
    call_data = data.get("call") if isinstance(data.get("call"), dict) else {}

    sources = [raw, data, call, call_data]

    call_id = _first_value(sources, ["call_id", "callId", "id"])
    agent_id = _first_value(sources, ["agent_id", "agentId", "agent"])
    phone_number = _first_value(sources, ["phone_number", "phoneNumber", "from_number", "from", "caller_number"])
    started_at = _first_value(sources, ["started_at", "startedAt", "start_timestamp", "start_time", "startTime"])
    ended_at = _first_value(sources, ["ended_at", "endedAt", "end_timestamp", "end_time", "endTime"])
    duration_seconds = _first_value(sources, ["duration_seconds", "durationSeconds", "duration"])
    transcript = _first_value(sources, ["transcript", "transcripts"])
    extracted_data = _first_value(sources, ["extracted_data", "extractedData"])
    call_analysis = _first_value(sources, ["call_analysis", "callAnalysis", "analysis"])
    recording_url = _first_value(
        sources + [raw.get("media", {})],
        [
            "recording_url",
            "recordingUrl",
            "recording_uri",
            "recording",
            "recording_multi_channel_url",
            "recording_multi_channel_uri",
            "public_log_url",
        ],
    )

    metadata = raw.get("metadata") if isinstance(raw.get("metadata"), dict) else {}
    if isinstance(data.get("metadata"), dict):
        metadata = {**metadata, **data.get("metadata")}

    if not extracted_data and isinstance(call_analysis, dict):
        summary = call_analysis.get("summary") or call_analysis.get("call_summary")
        if summary:
            extracted_data = {"summary": summary}

    if not call_id:
        raise ValueError("Missing call_id in Retell webhook payload")

    if not started_at:
        started_at = int(time.time())

    normalized_status = _normalize_status(event, _first_value(sources, ["status", "call_status", "callStatus"]))

    payload = {
        "event": event,
        "call_id": call_id,
        "agent_id": agent_id or "unknown_agent",
        "phone_number": phone_number or "unknown",
        "direction": _first_value(sources, ["direction"]) or "inbound",
        "started_at": int(started_at),
        "ended_at": int(ended_at) if ended_at else None,
        "duration_seconds": int(duration_seconds) if duration_seconds else None,
        "recording_url": recording_url,
        "extracted_data": extracted_data,
        "transcript": transcript,
        "call_analysis": call_analysis if isinstance(call_analysis, dict) else None,
        "status": normalized_status,
        "metadata": metadata or None,
    }
    return RetellWebhookPayload(**payload)

@app.post("/webhooks/retell")
async def retell_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_retell_signature: Optional[str] = Header(None),
):
    """
    Handle webhooks from RetellAI
    Events: call.completed, call.started, etc.
    """
    body = await request.body()
    
    # Verify signature
    if x_retell_signature and not verify_retell_webhook(body, x_retell_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        data = json.loads(body)
        payload = normalize_retell_payload(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {str(e)}")
    
    print(f"📞 Retell Webhook: {payload.event} - Call {payload.call_id}")
    
    # Process in background
    background_tasks.add_task(process_retell_webhook, payload)
    
    return {"success": True, "received": True}

async def process_retell_webhook(payload: RetellWebhookPayload):
    """Process RetellAI webhook asynchronously"""
    if demo_enabled():
        demo_lead = add_demo_lead_from_retell(payload)
        print(f"✅ Demo lead created {demo_lead['_id']}")
        return

    if not convex:
        print("❌ Convex not configured")
        return
    
    try:
        # Call Convex mutation to handle the webhook
        result = convex.mutation("leads:handleRetellWebhook", {
            "event": payload.event,
            "callId": payload.call_id,
            "agentId": payload.agent_id,
            "phoneNumber": payload.phone_number,
            "startedAt": payload.started_at,
            "endedAt": payload.ended_at,
            "durationSeconds": payload.duration_seconds,
            "recordingUrl": payload.recording_url,
            "extractedData": payload.extracted_data.dict() if payload.extracted_data else None,
            "transcript": payload.transcript,
            "callAnalysis": payload.call_analysis,
            "metadata": payload.metadata,
            "status": payload.status,
        })
        
        print(f"✅ Processed call {payload.call_id}: Lead created" if result.get("leadId") else f"✅ Processed call {payload.call_id}")
        
    except Exception as e:
        print(f"❌ Error processing webhook: {e}")

# =============================================================================
# API ENDPOINTS - SETUP & HEALTH
# =============================================================================

@app.get("/")
async def root():
    return {
        "message": "Tusa Gato's 24/7 API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    # Check RetellAI
    retell_status = False
    if retell:
        try:
            agents = await retell.list_agents()
            retell_status = True
        except:
            pass
    
    return {
        "status": "healthy",
        "convex_connected": convex is not None,
        "retell_connected": retell_status,
        "timestamp": datetime.now().isoformat(),
    }

# =============================================================================
# API ENDPOINTS - RETELLAI SETUP
# =============================================================================

@app.get("/retell/agents")
async def list_retell_agents():
    """List all RetellAI agents"""
    if not retell:
        raise HTTPException(status_code=503, detail="RetellAI not configured")
    
    try:
        agents = await retell.list_agents()
        return {"success": True, "data": agents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retell/phone-numbers")
async def list_phone_numbers():
    """List all phone numbers in RetellAI"""
    if not retell:
        raise HTTPException(status_code=503, detail="RetellAI not configured")
    
    try:
        numbers = await retell.list_phone_numbers()
        return {"success": True, "data": numbers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retell/setup-complete")
async def setup_complete_agent(request: SetupAgentRequest):
    """
    Complete setup of Tusa Gato's 24/7 AI Receptionist
    - Creates agent with proper prompt
    - Returns agent details
    """
    if not retell:
        raise HTTPException(status_code=503, detail="RetellAI not configured")
    
    webhook_url = request.webhook_url or f"{WEBHOOK_BASE_URL}/webhooks/retell"
    
    try:
        llm_config = {
            "start_speaker": "agent",
            "begin_message": "¡Gracias por llamar a Tus Abogados 24/7! Soy tu asistente virtual. ¿Con quién tengo el gusto de hablar?",
            "general_prompt": get_intake_prompt(),
        }
        if RETELL_LLM_PROVIDER:
            llm_config["llm_provider"] = RETELL_LLM_PROVIDER
        if RETELL_LLM_MODEL:
            llm_config["llm_model"] = RETELL_LLM_MODEL
        if RETELL_LLM_PROVIDER.lower() == "openrouter" and OPENROUTER_API_KEY:
            llm_config["llm_api_key"] = OPENROUTER_API_KEY

        llm = await retell.create_retell_llm(llm_config)
        response_engine = {
            "type": "retell-llm",
            "llm_id": llm.get("llm_id"),
        }

        # Create the agent directly using retell client
        agent_config = {
            "agent_name": "Tus-Abogados-24/7",
            "voice_id": "11labs-Adrian",
            "language": "es-419",
            "webhook_url": webhook_url,
            "response_engine": response_engine,
            "interruption_sensitivity": 0.7,
            "enable_backchannel": True,
            "backchannel_frequency": 0.6,
            "ambient_noise": True,
            "end_call_after_silence_ms": 10000,
            "max_call_duration_ms": 600000,
            "enable_recording": True,
            "enable_transcription": True,
            "responsive": True,
        }
        
        agent = await retell.create_agent(agent_config)
        
        return {
            "success": True,
            "message": "Tusa Gato's 24/7 AI Receptionist created successfully!",
            "agent_id": agent.get("agent_id"),
            "llm_id": llm.get("llm_id"),
            "agent": agent,
            "next_steps": [
                "Connect a phone number to this agent",
                f"Use agent_id: {agent.get('agent_id')} to connect your number",
                "Test by calling the number"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")

def get_intake_prompt() -> str:
    """Get the complete intake prompt for Tusa Gato's 24/7"""
    return """# Tus Abogados 24/7 - AI Receptionist

Eres la recepcionista virtual de **Tus Abogados 24/7** (Tusa Gato's 24/7), una red de referencia legal para la comunidad hispana en NY/NJ.

## INFORMACIÓN OBLIGATORIA:
1. Nombre completo (first_name, last_name)
2. Teléfono (phone en formato +1XXXXXXXXXX)
3. Tipo de caso (case_type: personal_injury, workers_comp, criminal, immigration, divorce, family, dui)
4. Condado (county)
5. Estado (state: NY o NJ)
6. Descripción del caso
7. Nivel de urgencia (urgency: emergency, high, medium, low)

## FLUJO:
1. Saluda: "¡Gracias por llamar a Tus Abogados 24/7! ¿Con quién tengo el gusto de hablar?"
2. Recopila información paso a paso
3. Haz preguntas contextuales según el tipo de caso
4. Confirma la información antes de terminar
5. Cierra: "Un abogado te contactará pronto. Gracias por llamar a Tus Abogados 24/7."

## REGLAS:
- NO des consejo legal
- Sé empática y profesional
- Habla español principalmente
- Marca EMERGENCY si hay corte <48h o deportación inminente

## OUTPUT FORMAT:
Retorna JSON con: first_name, last_name, phone, case_type, county, state, description, urgency, language_preference, summary"""

@app.post("/retell/connect-number")
async def connect_phone_number(request: ConnectNumberRequest):
    """
    Connect a phone number to the AI agent
    """
    if not retell:
        raise HTTPException(status_code=503, detail="RetellAI not configured")
    
    try:
        result = await retell.update_phone_number(
            request.phone_number, 
            request.agent_id
        )
        return {
            "success": True,
            "message": f"Phone number {request.phone_number} connected to agent {request.agent_id}",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retell/test-webhook")
async def test_webhook():
    """
    Send a test webhook to simulate a call
    """
    if demo_enabled():
        payload = RetellWebhookPayload(
            event="call.completed",
            call_id=f"test_call_{datetime.now().timestamp()}",
            agent_id="agent_demo",
            phone_number="+12125551234",
            started_at=int(datetime.now().timestamp()) - 300,
            ended_at=int(datetime.now().timestamp()),
            duration_seconds=300,
            recording_url="https://example.com/recording.mp3",
            extracted_data=RetellExtractedData(
                first_name="Maria",
                last_name="Gonzalez",
                phone="+12125551234",
                case_type="personal_injury",
                county="Queens",
                state="NY",
                urgency="high",
                description="Car accident on Main Street, injured neck and back",
                language_preference="spanish",
                callback_requested=False,
                summary="Client was in a car accident and needs a personal injury lawyer in Queens",
            ),
            transcript=[
                {"role": "agent", "content": "Gracias por llamar a Tusa Gato's 24/7"},
                {"role": "user", "content": "Hola, tuve un accidente de carro"},
            ],
            status="completed",
        )
        demo_lead = add_demo_lead_from_retell(payload)
        return {
            "success": True,
            "message": "Test webhook processed in demo mode!",
            "result": {"leadId": demo_lead.get("_id")},
        }

    if not convex:
        raise HTTPException(status_code=503, detail="Convex not configured")
    
    try:
        # Simulate a test call
        result = convex.mutation("leads:handleRetellWebhook", {
            "event": "call.completed",
            "callId": f"test_call_{datetime.now().timestamp()}",
            "agentId": "agent_test",
            "phoneNumber": "+12125551234",
            "startedAt": int(datetime.now().timestamp()) - 300,
            "endedAt": int(datetime.now().timestamp()),
            "durationSeconds": 300,
            "recordingUrl": "https://example.com/recording.mp3",
            "extractedData": {
                "first_name": "Maria",
                "last_name": "Gonzalez",
                "phone": "+12125551234",
                "case_type": "personal_injury",
                "county": "Queens",
                "state": "NY",
                "urgency": "high",
                "description": "Car accident on Main Street, injured neck and back",
                "language_preference": "spanish",
                "callback_requested": False,
                "summary": "Client was in a car accident and needs a personal injury lawyer in Queens"
            },
            "transcript": [
                {"role": "agent", "content": "Gracias por llamar a Tusa Gato's 24/7"},
                {"role": "user", "content": "Hola, tuve un accidente de carro"}
            ],
            "status": "completed",
        })
        
        return {
            "success": True,
            "message": "Test webhook sent successfully!",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# API ENDPOINTS - LEADS
# =============================================================================

@app.get("/leads")
async def list_leads(
    status: Optional[str] = None,
    case_type: Optional[str] = None,
    county: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 50,
):
    """List leads with optional filtering"""
    if demo_enabled():
        leads = DEMO_LEADS
        if status:
            leads = [lead for lead in leads if lead.get("status") == status]
        if case_type:
            leads = [lead for lead in leads if lead.get("caseType") == case_type]
        if county:
            leads = [lead for lead in leads if lead.get("county") == county]
        if state:
            leads = [lead for lead in leads if lead.get("state") == state]
        return {"success": True, "data": leads[:limit]}

    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        leads = convex.query("leads:getAll", {
            "status": status,
            "caseType": case_type,
            "county": county,
            "state": state,
            "limit": limit,
        })
        return {"success": True, "data": leads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    """Get detailed lead information"""
    if demo_enabled():
        lead = next((item for item in DEMO_LEADS if item.get("_id") == lead_id), None)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {"success": True, "data": lead}

    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        lead = convex.query("leads:getById", {"id": lead_id})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {"success": True, "data": lead}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/leads")
async def create_lead(lead: LeadCreate):
    """Manually create a lead"""
    if demo_enabled():
        demo_lead = add_demo_lead_manual(lead)
        return {"success": True, "data": demo_lead}

    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        result = convex.mutation("leads:create", {
            "phone": lead.phone,
            "firstName": lead.first_name,
            "lastName": lead.last_name,
            "email": lead.email,
            "caseType": lead.case_type,
            "county": lead.county,
            "state": lead.state,
            "incidentDate": lead.incident_date,
            "description": lead.description,
            "urgency": lead.urgency,
            "languagePref": lead.language_pref,
            "source": lead.source,
            "callbackRequested": False,
        })
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/leads/{lead_id}/notes")
async def add_lead_note(lead_id: str, content: str, user_id: str, note_type: str = "general"):
    """Add a note to a lead"""
    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        result = convex.mutation("leads:addNote", {
            "leadId": lead_id,
            "userId": user_id,
            "noteType": note_type,
            "content": content,
            "isPrivate": False,
        })
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/leads/{lead_id}/convert")
async def convert_lead(lead_id: str, attorney_id: str, estimated_value: Optional[float] = None):
    """Mark lead as converted"""
    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        result = convex.mutation("leads:convert", {
            "leadId": lead_id,
            "attorneyId": attorney_id,
            "estimatedValue": estimated_value,
        })
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# API ENDPOINTS - ATTORNEYS
# =============================================================================

@app.get("/attorneys")
async def list_attorneys(
    status: Optional[str] = None,
    tier: Optional[str] = None,
    limit: int = 100,
):
    """List attorneys"""
    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        attorneys = convex.query("attorneys:getAll", {
            "status": status,
            "tier": tier,
            "limit": limit,
        })
        return {"success": True, "data": attorneys}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attorneys/{attorney_id}")
async def get_attorney(attorney_id: str):
    """Get detailed attorney information"""
    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        attorney = convex.query("attorneys:getById", {"id": attorney_id})
        if not attorney:
            raise HTTPException(status_code=404, detail="Attorney not found")
        return {"success": True, "data": attorney}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/attorneys")
async def create_attorney(attorney: AttorneyCreate):
    """Create a new attorney"""
    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        result = convex.mutation("attorneys:create", {
            "email": attorney.email,
            "firstName": attorney.first_name,
            "lastName": attorney.last_name,
            "phone": attorney.phone,
            "barNumber": attorney.bar_number,
            "firmName": attorney.firm_name,
            "website": attorney.website,
            "address": attorney.address,
            "subscriptionTier": attorney.subscription_tier,
            "maxLeadsPerDay": attorney.max_leads_per_day,
            "specializations": attorney.specializations,
            "counties": attorney.counties,
        })
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/attorneys/{attorney_id}")
async def update_attorney(attorney_id: str, updates: dict):
    """Update attorney information"""
    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        result = convex.mutation("attorneys:update", {
            "id": attorney_id,
            "updates": updates,
        })
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# API ENDPOINTS - TRANSFERS
# =============================================================================

@app.post("/transfers/{transfer_id}/respond")
async def respond_to_transfer(transfer_id: str, response: TransferResponse):
    """Attorney responds to a lead transfer"""
    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        result = convex.mutation("leads:respondToTransfer", {
            "transferId": transfer_id,
            "responseType": response.response_type,
            "notes": response.notes,
            "estimatedValue": response.estimated_value,
            "rejectionReason": response.rejection_reason,
        })
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# API ENDPOINTS - ANALYTICS
# =============================================================================

@app.get("/analytics/dashboard")
async def dashboard_stats():
    """Get dashboard statistics"""
    if demo_enabled():
        return {
            "success": True,
            "data": {
                "leads": get_demo_stats(),
                "attorneys": {"total": 0},
            }
        }

    if not convex:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        # Get lead stats
        lead_stats = convex.query("leads:getStats", {})
        
        # Get attorney stats
        attorney_stats = convex.query("attorneys:getStats", {})
        
        return {
            "success": True,
            "data": {
                "leads": lead_stats,
                "attorneys": attorney_stats,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
