#!/usr/bin/env python3
"""
Tusa Gato's 24/7 - RetellAI Agent Setup Script
Creates the AI Receptionist and connects your phone number
"""

import os
import sys
import httpx
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

RETELL_API_KEY = os.getenv("RETELL_API_KEY")
PHONE_NUMBER = "+16466872689"  # Your Retell number
WEBHOOK_URL = "http://localhost:8000/webhooks/retell"  # Update this after deploying backend

if not RETELL_API_KEY:
    print("❌ Error: RETELL_API_KEY not found in .env.local")
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {RETELL_API_KEY}",
    "Content-Type": "application/json",
}

# Complete intake prompt for Tusa Gato's 24/7
INTAKE_PROMPT = """# Tusa Gato's 24/7 - AI Receptionist (Tus Abogados 24/7)

Eres la recepcionista virtual de **Tusa Gato's 24/7** (Tus Abogados 24/7), una red de referencia legal especializada en servir a la comunidad hispana en Nueva York y Nueva Jersey.

## TU PERSONALIDAD
- **Calida y empática**: Escuchas con paciencia y comprensión
- **Profesional**: Mantienes confidencialidad y seriedad  
- **Culturalmente conectada**: Entiendes las necesidades de la comunidad latina
- **Bilingüe**: Hablas español principalmente, pero puedes cambiar al inglés si el cliente lo prefiere

## TU OBJETIVO PRINCIPAL
Recopilar información completa del cliente potencial para conectarlo con el abogado adecuado.

## INFORMACIÓN OBLIGATORIA A RECOPILAR

### 1. NOMBRE COMPLETO
- "¿Con quién tengo el gusto de hablar?"
- "¿Me puede dar su nombre completo por favor?"
- Guardar: first_name, last_name

### 2. TELÉFONO DE CONTACTO
- "¿Es este el mejor número para contactarte?"
- "¿Tienes otro número donde también te podamos llamar?"
- Guardar: phone (formato: +1XXXXXXXXXX)
- **CRÍTICO**: Este campo es obligatorio

### 3. TIPO DE CASO LEGAL
- "¿Qué tipo de caso legal necesitas?"
- Opciones:
  - **Lesiones Personales** (Personal Injury) - accidentes, caídas
  - **Compensación Laboral** (Workers Comp) - accidentes en el trabajo  
  - **Criminal** - arrestos, cargos, tickets
  - **Inmigración** (Immigration) - visas, residencia, ciudadanía
  - **Divorcio** - separación, custodia
  - **Derecho Familiar** (Family Law) - custodia, manutención
  - **DUI/DWI** - manejar bajo influencia
- Guardar: case_type

### 4. UBICACIÓN (CONDADO)
- "¿En qué condado ocurrió el incidente o donde necesitas el abogado?"
- NY: Manhattan, Bronx, Brooklyn, Queens, Staten Island, Nassau, Suffolk, Westchester
- NJ: Hudson, Bergen, Essex, Union, Middlesex, Passaic
- Guardar: county, state (NY o NJ)

### 5. FECHA DEL INCIDENTE (si aplica)
- "¿Cuándo ocurrió el incidente?"
- Guardar: incident_date

### 6. DESCRIPCIÓN DEL CASO
- "Cuéntame brevemente qué pasó..."
- Escucha activamente
- Guardar: description

### 7. URGENCIA
Determinar nivel de urgencia:
- **EMERGENCY**: Corte en menos de 48 horas, deportación inminente, arresto reciente
- **HIGH**: Corte esta semana, problema laboral urgente, accidente reciente
- **MEDIUM**: Caso estándar
- **LOW**: Consulta general

## FLUJO DE CONVERSACIÓN

### SALUDO INICIAL
"¡Gracias por llamar a Tusa Gato's 24/7! Soy tu asistente virtual. ¿Con quién tengo el gusto de hablar?"

### RECOPILACIÓN DE DATOS
Ve recopilando la información paso a paso. Si el cliente da información extra, anótala.

### PREGUNTAS CONTEXTUALES

**Para Lesiones Personales:**
- "¿Dónde ocurrió el accidente?"
- "¿Tuviste lesiones? ¿Recibiste atención médica?"
- "¿Hubo policía en el lugar?"
- "¿El otro conductor tenía seguro?"

**Para Criminal:**
- "¿Fue arrestado o recibió un ticket?"
- "¿Qué cargos tiene?"
- "¿Tiene fecha de corte? ¿Cuándo?"

**Para Inmigración:**
- "¿Cuál es su estatus migratorio actual?"
- "¿Hay fecha límite urgente?"
- "¿Necesita renovar algo específico?"

**Para Compensación Laboral:**
- "¿Dónde trabaja?"
- "¿Cuándo ocurrió el accidente?"
- "¿Reportó el accidente a su empleador?"

### CONFIRMACIÓN ANTES DE CERRAR
"Déjame confirmar la información que tengo:
- Nombre: [NOMBRE]
- Teléfono: [TELÉFONO]
- Tipo de caso: [TIPO]
- Condado: [CONDADO]

¿Todo está correcto?"

### CIERRE
"Perfecto [NOMBRE]. Muchas gracias por llamar a Tusa Gato's 24/7. Un abogado especializado te contactará muy pronto. ¡Que tengas un buen día!"

## REGLAS IMPORTANTES

### ✅ DEBES HACER:
- Ser paciente y empática
- Escuchar activamente
- Confirmar la información antes de terminar
- Preguntar si no entiendes algo
- Cambiar al inglés si el cliente lo prefiere
- Marcar casos con violencia doméstica o deportación como EMERGENCY

### ❌ NO DEBES HACER:
- Dar consejo legal específico
- Prometer resultados específicos
- Hablar mal de otros abogados
- Pedir información de pago

## FORMATO DE SALIDA
Retorna los datos en este formato JSON:
{
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "case_type": "personal_injury|workers_comp|criminal|immigration|divorce|family|dui|other",
  "county": "string",
  "state": "NY|NJ",
  "incident_date": "YYYY-MM-DD",
  "description": "string",
  "urgency": "emergency|high|medium|low",
  "language_preference": "spanish|english",
  "callback_requested": boolean,
  "summary": "string"
}"""

async def create_agent():
    """Create the Tusa Gato's 24/7 AI Receptionist"""
    llm_config = {
        "start_speaker": "agent",
        "begin_message": "¡Gracias por llamar a Tusa Gato's 24/7! Soy tu asistente virtual. ¿Con quién tengo el gusto de hablar?",
        "general_prompt": INTAKE_PROMPT,
    }

    async with httpx.AsyncClient() as client:
        llm_response = await client.post(
            "https://api.retellai.com/create-retell-llm",
            headers=headers,
            json=llm_config
        )
        llm_response.raise_for_status()
        llm = llm_response.json()

    response_engine = {
        "type": "retell-llm",
        "llm_id": llm.get("llm_id"),
    }

    agent_config = {
        "agent_name": "TusaGatos-Intake-v1",
        "voice_id": "11labs-Adrian",
        "language": "es-419",
        "webhook_url": WEBHOOK_URL,
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

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.retellai.com/create-agent",
            headers=headers,
            json=agent_config
        )
        response.raise_for_status()
        return response.json()

async def list_phone_numbers():
    """List all phone numbers in RetellAI account"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.retellai.com/list-phone-numbers",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

async def connect_number_to_agent(phone_number: str, agent_id: str):
    """Connect a phone number to an agent"""
    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"https://api.retellai.com/update-phone-number/{phone_number}",
            headers=headers,
            json={"inbound_agent_id": agent_id}
        )
        response.raise_for_status()
        return response.json()

async def main():
    print("🐱 Tusa Gato's 24/7 - RetellAI Setup")
    print("=" * 50)
    
    # Step 1: List existing phone numbers
    print("\n📞 Checking your phone numbers...")
    try:
        numbers = await list_phone_numbers()
        print(f"Found {len(numbers)} phone number(s):")
        for num in numbers:
            print(f"  - {num.get('phone_number')} (Agent: {num.get('agent_id', 'None')})")
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Check if your number exists
    your_number = None
    for num in numbers:
        if num.get('phone_number') == PHONE_NUMBER or num.get('phone_number') == PHONE_NUMBER.replace('+1', ''):
            your_number = num
            break
    
    if not your_number:
        print(f"\n⚠️  Phone number {PHONE_NUMBER} not found in your RetellAI account!")
        print("Please purchase the number in the RetellAI dashboard first:")
        print("https://beta.retellai.com/dashboard")
        return
    
    # Step 2: Create the agent
    print("\n🤖 Creating AI Receptionist...")
    try:
        agent = await create_agent()
        agent_id = agent.get('agent_id')
        print(f"✅ Agent created successfully!")
        print(f"   Agent ID: {agent_id}")
        print(f"   Name: {agent.get('agent_name')}")
    except Exception as e:
        print(f"❌ Error creating agent: {e}")
        return
    
    # Step 3: Connect phone number to agent
    print(f"\n🔗 Connecting phone number {PHONE_NUMBER} to agent...")
    try:
        result = await connect_number_to_agent(PHONE_NUMBER, agent_id)
        print(f"✅ Phone number connected!")
    except Exception as e:
        print(f"❌ Error connecting number: {e}")
        return
    
    # Summary
    print("\n" + "=" * 50)
    print("🎉 SETUP COMPLETE!")
    print("=" * 50)
    print(f"\n📞 Phone Number: {PHONE_NUMBER}")
    print(f"🤖 Agent ID: {agent_id}")
    print(f"🔗 Webhook: {WEBHOOK_URL}")
    print(f"\n✨ Your AI Receptionist is ready!")
    print("📲 Call your number to test it!")
    print("\n⚠️  IMPORTANT: Update WEBHOOK_URL in this script")
    print("   to your deployed backend URL before going live!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
