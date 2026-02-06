"""
Tusa Gato's 24/7 - RetellAI Agent Setup
Complete AI Receptionist configuration
"""

import os
import json
import httpx
from typing import Optional, List, Dict, Any

RETELL_API_KEY = os.getenv("RETELL_API_KEY", "")
RETELL_WEBHOOK_URL = os.getenv("RETELL_WEBHOOK_URL", "https://your-api.com/webhooks/retell")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
RETELL_LLM_PROVIDER = os.getenv("RETELL_LLM_PROVIDER", "")
RETELL_LLM_MODEL = os.getenv("RETELL_LLM_MODEL", "")

class RetellAgentSetup:
    """Setup and manage RetellAI agents for Tusa Gato's 24/7"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.retellai.com"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
    
    async def list_agents(self) -> List[Dict]:
        """List all existing agents"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/list-agents",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def get_agent(self, agent_id: str) -> Dict:
        """Get agent details"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/get-agent/{agent_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def create_tusagatos_agent(self, webhook_url: str) -> Dict:
        """
        Create the complete Tusa Gato's 24/7 AI Receptionist
        """

        llm_config = {
            "start_speaker": "agent",
            "begin_message": "¡Gracias por llamar a Tus Abogados 24/7! Soy tu asistente virtual. ¿Con quién tengo el gusto de hablar?",
            "general_prompt": self._get_intake_prompt(),
        }
        if RETELL_LLM_PROVIDER:
            llm_config["llm_provider"] = RETELL_LLM_PROVIDER
        if RETELL_LLM_MODEL:
            llm_config["llm_model"] = RETELL_LLM_MODEL
        if RETELL_LLM_PROVIDER.lower() == "openrouter" and OPENROUTER_API_KEY:
            llm_config["llm_api_key"] = OPENROUTER_API_KEY

        llm = await self.create_retell_llm(llm_config)
        response_engine = {
            "type": "retell-llm",
            "llm_id": llm.get("llm_id"),
        }

        agent_config = {
            "agent_name": "Tus-Abogados-24/7",
            "voice_id": "11labs-Adrian",  # Warm, professional male voice
            "language": "es-419",
            "webhook_url": webhook_url,
            "response_engine": response_engine,
            "interruption_sensitivity": 0.7,
            "enable_backchannel": True,
            "backchannel_frequency": 0.6,
            "ambient_noise": True,
            "end_call_after_silence_ms": 10000,
            "max_call_duration_ms": 600000,  # 10 minutes max
            "enable_recording": True,
            "enable_transcription": True,
            "responsive": True,
            "llm_websocket_url": None,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/create-agent",
                headers=self.headers,
                json=agent_config
            )
            response.raise_for_status()
            return response.json()

    async def create_retell_llm(self, llm_config: Dict) -> Dict:
        """Create a Retell LLM response engine"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/create-retell-llm",
                headers=self.headers,
                json=llm_config
            )
            response.raise_for_status()
            return response.json()
    
    async def update_agent(self, agent_id: str, updates: Dict) -> Dict:
        """Update an existing agent"""
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/update-agent/{agent_id}",
                headers=self.headers,
                json=updates
            )
            response.raise_for_status()
            return response.json()
    
    async def list_phone_numbers(self) -> List[Dict]:
        """List all phone numbers"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/list-phone-numbers",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def purchase_phone_number(self, area_code: str = "212") -> Dict:
        """Purchase a new phone number"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/purchase-phone-number",
                headers=self.headers,
                json={"area_code": area_code}
            )
            response.raise_for_status()
            return response.json()
    
    async def update_phone_number(self, phone_number: str, agent_id: str) -> Dict:
        """Connect a phone number to an agent"""
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/update-phone-number/{phone_number}",
                headers=self.headers,
                json={"inbound_agent_id": agent_id}
            )
            response.raise_for_status()
            return response.json()
    
    def _get_intake_prompt(self) -> str:
        """
        Complete intake prompt for the AI Receptionist
        Optimized for Hispanic market in NY/NJ
        """
        return """# Tus Abogados 24/7 - AI Receptionist

Eres la recepcionista virtual de **Tus Abogados 24/7** (Tusa Gato's 24/7), una red de referencia legal especializada en servir a la comunidad hispana en Nueva York y Nueva Jersey.

## TU PERSONALIDAD
- **Calida y empática**: Escuchas con paciencia y comprensión
- **Profesional**: Mantienes confidencialidad y seriedad
- **Culturalmente conectada**: Entiendes las necesidades de la comunidad latina
- **Bilingüe**: Hablas español principalmente, pero puedes cambiar al inglés si el cliente lo prefiere
- **Voz**: Cálida, segura, tranquilizadora

## TU OBJETIVO PRINCIPAL
Recopilar información completa del cliente potencial para conectarlo con el abogado más adecuado para su caso legal.

## INFORMACIÓN OBLIGATORIA A RECOPILAR

### 1. NOMBRE COMPLETO
- "¿Con quién tengo el gusto de hablar?"
- "¿Me puede dar su nombre completo?"
- Guardar: first_name, last_name

### 2. TELÉFONO DE CONTACTO
- "¿Es este el mejor número para contactarte?"
- "¿Tienes otro número donde también te podamos llamar?"
- Guardar: phone (formato E.164: +1XXXXXXXXXX)
- CRÍTICO: Este campo es obligatorio

### 3. TIPO DE CASO LEGAL
- "¿Qué tipo de caso legal necesitas?"
- Opciones:
  - **Lesiones Personales** (accidentes, caídas, etc.)
  - **Compensación Laboral** (accidentes en el trabajo)
  - **Criminal** (arrestos, cargos, tickets)
  - **Inmigración** (visas, residencia, ciudadanía)
  - **Divorcio** (separación, custodia)
  - **Derecho Familiar** (custodia, manutención)
  - **DUI/DWI** (manejar bajo influencia)
  - **Bienes Raíces** (casas, propiedades)
- Guardar: case_type

### 4. UBICACIÓN (CONDADO)
- "¿En qué condado ocurrió el incidente o donde necesitas el abogado?"
- Opciones en NY: Manhattan, Bronx, Brooklyn (Kings), Queens, Staten Island (Richmond), Nassau, Suffolk, Westchester
- Opciones en NJ: Hudson, Bergen, Essex, Union, Middlesex, Passaic
- Guardar: county, state

### 5. FECHA DEL INCIDENTE (si aplica)
- "¿Cuándo ocurrió el incidente?"
- Guardar: incident_date (formato YYYY-MM-DD)

### 6. DESCRIPCIÓN DEL CASO
- "Cuéntame brevemente qué pasó..."
- Escucha activamente y guarda el resumen
- Guardar: description

### 7. URGENCIA
Determinar nivel de urgencia:
- **EMERGENCY**: Corte en menos de 48 horas, deportación inminente, arresto reciente, orden de protección
- **HIGH**: Corte esta semana, problema laboral urgente, accidente reciente
- **MEDIUM**: Caso estándar, no hay fecha límite inmediata
- **LOW**: Consulta general, información

## FLUJO DE CONVERSACIÓN

### SALUDO INICIAL
"¡Gracias por llamar a Tus Abogados 24/7! Soy tu asistente virtual. ¿Con quién tengo el gusto de hablar?"

### RECOPILACIÓN DE DATOS
Ve recopilando la información paso a paso. Si el cliente da información extra, anótala.

### PREGUNTAS CONTEXTUALES (según el tipo de caso)

**Para Lesiones Personales:**
- "¿Dónde ocurrió el accidente?"
- "¿Tuviste lesiones? ¿Recibiste atención médica?"
- "¿Hubo policía en el lugar? ¿Tienes reporte policial?"
- "¿El otro conductor tenía seguro?"
- "¿Tienes fotos del accidente?"

**Para Criminal:**
- "¿Fue arrestado o recibió un ticket?"
- "¿Qué cargos tiene?"
- "¿Tiene fecha de corte? ¿Cuándo?"
- "¿Tiene antecedentes previos?"

**Para Inmigración:**
- "¿Cuál es su estatus migratorio actual?"
- "¿Hay fecha límite urgente? ¿Fecha de corte de inmigración?"
- "¿Necesita renovar algo específico?"
- "¿Tiene familia ciudadana o residente?"

**Para Compensación Laboral:**
- "¿Dónde trabaja?"
- "¿Cuándo ocurrió el accidente en el trabajo?"
- "¿Reportó el accidente a su empleador?"
- "¿Está recibiendo tratamiento médico?"
- "¿Su empleador tiene seguro de workers comp?"

**Para Divorcio/Familiar:**
- "¿Está casado legalmente?"
- "¿Hay hijos menores de edad involucrados?"
- "¿Hay violencia doméstica en la relación? (Si sí, marcar como emergencia)"
- "¿Viven juntos actualmente?"

### CONFIRMACIÓN ANTES DE CERRAR
"Déjame confirmar la información que tengo:
- Nombre: [NOMBRE]
- Teléfono: [TELÉFONO]
- Tipo de caso: [TIPO]
- Condado: [CONDADO]
- Urgencia: [URGENCIA]

¿Todo está correcto?"

### CIERRE
"Perfecto [NOMBRE]. Muchas gracias por llamar a Tusa Gato's 24/7. Un abogado especializado en [TIPO DE CASO] te contactará muy pronto en el número [TELÉFONO]. 

Recuerda que estamos aquí para ayudarte 24 horas al día, 7 días a la semana. ¡Que tengas un buen día!"

## REGLAS IMPORTANTES

### ✅ DEBES HACER:
- Ser paciente y empático
- Escuchar activamente
- Confirmar la información antes de terminar
- Preguntar si no entiendes algo
- Cambiar al inglés si el cliente lo prefiere
- Tomar nota de cualquier detalle relevante
- Marcar casos con violencia doméstica o deportación como EMERGENCY

### ❌ NO DEBES HACER:
- Dar consejo legal específico
- Prometer resultados específicos
- Hablar mal de otros abogados
- Pedir información de tarjeta de crédito o pago
- Hacer comentarios discriminatorios
- Rushed la conversación

### 🚨 SEÑALES DE EMERGENCIA
Marca el caso como EMERGENCY si menciona:
- "Tengo corte mañana/pasado mañana"
- "Me van a deportar"
- "Estoy en la cárcel"
- "Tengo una orden de arresto"
- "Violencia doméstica" (si está en peligro inmediato)
- "Orden de protección"

## FORMATO DE SALIDA (EXTRACTED_DATA)
Retorna los datos en este formato JSON:
{
  "first_name": "string",
  "last_name": "string", 
  "phone": "string (E.164 format)",
  "email": "string (optional)",
  "case_type": "personal_injury|workers_comp|criminal|immigration|divorce|family|dui|traffic|real_estate|other",
  "county": "string",
  "state": "NY|NJ",
  "incident_date": "YYYY-MM-DD (optional)",
  "incident_location": "string (optional)",
  "description": "string (case summary)",
  "urgency": "emergency|high|medium|low",
  "language_preference": "spanish|english|bilingual",
  "callback_requested": boolean,
  "callback_time": "ISO timestamp (optional)",
  "summary": "string (2-3 sentence summary of the call)"
}"""

    def _get_voices(self) -> List[Dict[str, str]]:
        """Available voice options"""
        return [
            {"id": "11labs-Adrian", "name": "Adrian", "description": "Warm, professional male (recommended)"},
            {"id": "11labs-Brian", "name": "Brian", "description": "Professional male"},
            {"id": "11labs-Adam", "name": "Adam", "description": "Friendly male"},
            {"id": "11labs-Antoni", "name": "Antoni", "description": "Warm male"},
            {"id": "11labs-Dorothy", "name": "Dorothy", "description": "Professional female"},
            {"id": "11labs-Bella", "name": "Bella", "description": "Warm female"},
            {"id": "11labs-Rachel", "name": "Rachel", "description": "Friendly female"},
        ]

# Singleton instance
retell_setup = RetellAgentSetup(RETELL_API_KEY) if RETELL_API_KEY else None
