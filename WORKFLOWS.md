# ⚙️ Tusa Gato's 24/7 - Business Workflows

This document describes the core business processes, algorithms, and decision logic for the CRM system.

---

## 📋 Table of Contents

1. [Lead Intake Workflow](#1-lead-intake-workflow)
2. [Lead Qualification Algorithm](#2-lead-qualification-algorithm)
3. [Attorney Matching Engine](#3-attorney-matching-engine)
4. [Notification System](#4-notification-system)
5. [Lead Lifecycle States](#5-lead-lifecycle-states)
6. [Escalation Procedures](#6-escalation-procedures)

---

## 1. Lead Intake Workflow

### 1.1 AI Receptionist Flow (Primary)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INCOMING CALL (24/7)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RETELLAI ANSWERS CALL                                  │
│  • Spanish greeting: "Gracias por llamar a Tusa Gato's 24/7..."             │
│  • Voice: Dominican or Paisa accent (warm, trustworthy)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INTAKE CONVERSATION                                    │
│                                                                             │
│  STEP 1: IDENTIFICATION                                                     │
│  • "¿Con quién tengo el gusto de hablar?"                                   │
│  • Collect: First name, Last name                                           │
│                                                                             │
│  STEP 2: CONTACT CONFIRMATION                                               │
│  • "¿Es este el mejor número para contactarte?"                             │
│  • Confirm or collect alternative number                                    │
│                                                                             │
│  STEP 3: CASE TYPE IDENTIFICATION                                           │
│  • "¿Qué tipo de caso necesitas?"                                           │
│  • Options: Personal Injury, Criminal, Divorce, Immigration, etc.           │
│                                                                             │
│  STEP 4: LOCATION                                                           │
│  • "¿En qué condado ocurrió el incidente?"                                  │
│  • Map to: County + State (NY/NJ)                                           │
│                                                                             │
│  STEP 5: CASE DETAILS (Dynamic based on case type)                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ PERSONAL INJURY:                                                      │  │
│  │ • ¿Cuándo ocurrió el accidente? (incident_date)                       │  │
│  │ • ¿Dónde ocurrió? (incident_location)                                 │  │
│  │ • ¿Tuviste lesiones? (injuries)                                       │  │
│  │ • ¿Hubo policía? (police_report)                                      │  │
│  │ • ¿Tienes seguro? (insurance)                                         │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ CRIMINAL:                                                             │  │
│  │ • ¿Fue arrestado? (arrested)                                          │  │
│  │ • ¿Qué cargos? (charges)                                              │  │
│  │ • ¿Tiene fecha de corte? (court_date)                                 │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ IMMIGRATION:                                                          │  │
│  │ • ¿Cuál es tu estatus actual? (current_status)                        │  │
│  │ • ¿Hay fecha límite urgente? (deadline)                               │  │
│  │ • ¿Necesitas renovar algo? (renewal_type)                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  STEP 6: URGENCY ASSESSMENT                                                 │
│  • AI determines urgency based on:                                          │
│    - Keywords: "urgente", "emergencia", "carcel", "deportación"             │
│    - Case type + timing (criminal with court date < 48h = emergency)        │
│                                                                             │
│  STEP 7: SUMMARY & CLOSING                                                  │
│  • "Déjame confirmar la información..."                                     │
│  • Summarize collected data                                                 │
│  • "Un abogado te contactará pronto"                                        │
│  • Optional: Schedule callback time                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WEBHOOK TO CRM (/intake/ai_lead)                       │
│                                                                             │
│  {                                                                          │
│    "call_id": "call_abc123",                                                │
│    "extracted_data": {                                                      │
│      "first_name": "Maria",                                                 │
│      "last_name": "Gonzalez",                                               │
│      "phone": "+12125551234",                                               │
│      "case_type": "personal_injury",                                        │
│      "county": "Queens",                                                    │
│      "state": "NY",                                                         │
│      "urgency": "high"                                                      │
│    },                                                                       │
│    "transcript": [...]                                                      │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LEAD CREATED IN CRM                                    │
│  • Validate required fields                                                 │
│  • Check for duplicates (phone + case_type + 30 days)                       │
│  • Calculate qualification_score                                            │
│  • Generate AI summary from transcript                                      │
│  • Set status = "new"                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TRIGGER MATCHING ENGINE                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Human Agent Flow (Call Center Mode)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INCOMING CALL                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CALL CENTER AGENT ANSWERS                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CRM COACHING INTERFACE                                 │
│                                                                             │
│  Agent sees dynamic form that guides the conversation:                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  🎧 Live Call - Maria G.                                            │    │
│  │                                                                     │    │
│  │  📋 Next Questions to Ask:                                          │    │
│  │  ☐ 1. Full name                                                     │    │
│  │  ☐ 2. Phone number                                                  │    │
│  │  ☐ 3. Type of case                                                  │    │
│  │                                                                     │    │
│  │  💡 Suggested Follow-up:                                            │    │
│  │     "¿En qué condado ocurrió?"                                      │    │
│  │                                                                     │    │
│  │  [Previous Case Notes]  [Quick Responses]  [Transfer to Attorney]   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Features:                                                                  │
│  • Real-time form validation                                                │
│  • Conditional fields based on case type                                    │
│  • AI-suggested questions based on partial data                             │
│  • One-click transfer to attorney                                           │
│  • Quality score feedback                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Lead Qualification Algorithm

### 2.1 Scoring Criteria

Each lead receives a qualification score (0-100) based on:

```python
class LeadQualificationScorer:
    """
    Calculates lead quality score (0-100)
    Higher score = better qualified lead
    """
    
    def calculate_score(self, lead_data: dict) -> int:
        score = 0
        
        # === COMPLETENESS (max 30 points) ===
        required_fields = ['first_name', 'last_name', 'phone', 'case_type', 'county']
        optional_fields = ['incident_date', 'description', 'email']
        
        completeness = sum(1 for f in required_fields if lead_data.get(f)) / len(required_fields)
        score += int(completeness * 30)
        
        # === CASE TYPE VALUE (max 25 points) ===
        case_type_scores = {
            'personal_injury': 25,      # High value
            'workers_comp': 25,         # High value
            'construction_accident': 25,# High value
            'criminal': 20,             # Urgent/time-sensitive
            'immigration': 18,          # High volume, lower individual value
            'divorce': 15,              # Medium value
            'family': 12,               # Medium value
            'dui': 15,                  # Medium value
            'traffic': 8,               # Lower value
            'real_estate': 10,          # Lower value
            'other': 5
        }
        score += case_type_scores.get(lead_data.get('case_type'), 5)
        
        # === URGENCY (max 20 points) ===
        urgency_scores = {
            'emergency': 20,    # Criminal with court date < 48h, deportation proceedings
            'high': 15,         # Recent incident, active legal deadline
            'medium': 10,       # Standard case
            'low': 5            # Information gathering phase
        }
        score += urgency_scores.get(lead_data.get('urgency'), 5)
        
        # === CONTACT QUALITY (max 15 points) ===
        phone = lead_data.get('phone', '')
        if phone:
            # Valid US phone format
            if re.match(r'^\+1\d{10}$', phone):
                score += 10
            # Has alternative contact
            if lead_data.get('phone_alt') or lead_data.get('email'):
                score += 5
        
        # === DESCRIPTION QUALITY (max 10 points) ===
        description = lead_data.get('description', '')
        if description:
            word_count = len(description.split())
            if word_count >= 20:      # Detailed description
                score += 10
            elif word_count >= 10:    # Moderate description
                score += 7
            elif word_count >= 5:     # Brief description
                score += 4
            else:                     # Very brief
                score += 2
        
        return min(score, 100)
```

### 2.2 Qualification Tiers

| Score | Tier | Action |
|-------|------|--------|
| 85-100 | ⭐⭐⭐ Excellent | Immediate priority matching |
| 70-84 | ⭐⭐ Good | Standard priority matching |
| 50-69 | ⭐ Fair | Low priority, broader matching |
| 0-49 | ⚠️ Poor | Review by agent, may be spam |

---

## 3. Attorney Matching Engine

### 3.1 Matching Algorithm

```python
class AttorneyMatchingEngine:
    """
    Finds best attorney matches for a lead
    """
    
    def find_matches(self, lead: Lead, max_matches: int = 3) -> List[Match]:
        """
        Main matching algorithm
        """
        
        # Step 1: Hard filters (must match)
        candidates = (
            self.db.query(Attorney)
            .filter(Attorney.status == 'active')
            .filter(Attorney.specializations.any(case_type=lead.case_type))
            .filter(Attorney.counties.any(
                county=lead.county,
                state=lead.state
            ))
            .all()
        )
        
        # Step 2: Score each candidate
        scored_matches = []
        for attorney in candidates:
            score = self._calculate_match_score(lead, attorney)
            scored_matches.append(Match(attorney=attorney, score=score))
        
        # Step 3: Sort by score descending
        scored_matches.sort(key=lambda m: m.score, reverse=True)
        
        # Step 4: Return top N
        return scored_matches[:max_matches]
    
    def _calculate_match_score(self, lead: Lead, attorney: Attorney) -> int:
        """
        Calculate match score (0-100) for lead-attorney pairing
        """
        score = 0
        reasons = []
        
        # === PRIMARY SPECIALIZATION (30 points) ===
        for spec in attorney.specializations:
            if spec.case_type == lead.case_type:
                if spec.is_primary:
                    score += 30
                    reasons.append(f"Primary specialization: {lead.case_type}")
                else:
                    score += 20
                    reasons.append(f"Secondary specialization: {lead.case_type}")
                break
        
        # === GEOGRAPHIC MATCH (25 points) ===
        for county_pref in attorney.counties:
            if county_pref.county == lead.county and county_pref.state == lead.state:
                if county_pref.is_primary_office:
                    score += 25
                    reasons.append(f"Primary office in {lead.county}")
                else:
                    score += 20
                    reasons.append(f"Serves {lead.county}")
                
                # Bonus for priority preference
                if county_pref.priority == 1:
                    score += 5
                break
        
        # === ATTORNEY PERFORMANCE (25 points) ===
        if attorney.conversion_rate:
            # Scale conversion rate to 20 points
            score += int(attorney.conversion_rate * 20)
            reasons.append(f"{attorney.conversion_rate:.0%} conversion rate")
        else:
            # New attorney - give benefit of doubt
            score += 10
            reasons.append("New attorney")
        
        # Response time bonus (up to 5 points)
        if attorney.response_time_avg:
            if attorney.response_time_avg <= 15:
                score += 5
                reasons.append("Fast responder (< 15 min)")
            elif attorney.response_time_avg <= 30:
                score += 3
                reasons.append("Good response time (< 30 min)")
        
        # === SUBSCRIPTION TIER (10 points) ===
        tier_scores = {'premium': 10, 'standard': 7, 'basic': 5}
        score += tier_scores.get(attorney.subscription_tier, 5)
        reasons.append(f"{attorney.subscription_tier.title()} tier")
        
        # === AVAILABILITY (10 points) ===
        # Check daily lead count
        todays_leads = self._count_todays_leads(attorney)
        if todays_leads < attorney.max_leads_per_day * 0.5:
            score += 10
            reasons.append("High availability")
        elif todays_leads < attorney.max_leads_per_day * 0.8:
            score += 5
            reasons.append("Moderate availability")
        else:
            reasons.append("Near capacity")
        
        # === NEGATIVE FACTORS ===
        # Penalize if attorney recently declined similar lead
        recent_declines = self._count_recent_declines(attorney, days=7)
        if recent_declines >= 5:
            score -= 10
            reasons.append(f"Declined {recent_declines} leads recently")
        
        return min(max(score, 0), 100), reasons
```

### 3.2 Matching Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEW LEAD QUALIFIED (score >= 50)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FIND MATCHING ATTORNEYS                                  │
│                                                                             │
│  Filters:                                                                   │
│  ✓ Attorney.status = 'active'                                               │
│  ✓ Attorney.specializations contains lead.case_type                         │
│  ✓ Attorney.counties contains (lead.county, lead.state)                     │
│  ✓ Attorney.current_daily_leads < max_leads_per_day                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RANK BY MATCH SCORE                                      │
│                                                                             │
│  Example Results:                                                           │
│  ┌──────────┬────────────────────────┬───────┬─────────────────────────────┐│
│  │ Rank     │ Attorney               │ Score │ Key Match Factors           ││
│  ├──────────┼────────────────────────┼───────┼─────────────────────────────┤│
│  │ 1        │ Gonzalez Law Firm      │ 95    │ Primary PI specialty        ││
│  │          │                        │       │ Primary Queens office       ││
│  │          │                        │       │ 35% conversion rate         ││
│  ├──────────┼────────────────────────┼───────┼─────────────────────────────┤│
│  │ 2        │ Smith & Associates     │ 82    │ Handles PI cases            ││
│  │          │                        │       │ Serves Queens               ││
│  │          │                        │       │ Good response time          ││
│  ├──────────┼────────────────────────┼───────┼─────────────────────────────┤│
│  │ 3        │ Johnson Legal          │ 71    │ Secondary PI specialty      ││
│  │          │                        │       │ Office in Bronx (secondary) ││
│  └──────────┴────────────────────────┴───────┴─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SEND TO TOP MATCH (Rank #1)                              │
│                                                                             │
│  Create case_transfer record:                                               │
│  • status = 'pending'                                                       │
│  • expires_at = NOW() + 24 hours                                            │
│                                                                             │
│  Send notifications:                                                        │
│  • SMS: "Nuevo caso de [case_type] en [county]. Responda SÍ para aceptar..."│
│  • Email: Detailed lead summary with call-to-action                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WAIT FOR RESPONSE (24 hours)                             │
└─────────────────────────────────────────────────────────────────────────────┘
              │                           │                           │
              ▼                           ▼                           ▼
┌─────────────────┐             ┌─────────────────┐             ┌─────────────┐
│   ACCEPTED      │             │    DECLINED     │             │   EXPIRED   │
│                 │             │                 │             │             │
│ • Update lead   │             │ • Log decline   │             │ • Log as    │
│   status        │             │   reason        │             │   expired   │
│ • Notify admin  │             │ • Send to       │             │ • Send to   │
│ • Attorney      │             │   Match #2      │             │   Match #2  │
│   contacts      │             │   (retry)       │             │   (retry)   │
│   client        │             │                 │             │             │
└─────────────────┘             └─────────────────┘             └─────────────┘
```

### 3.3 Retry Logic

```python
class RetryManager:
    """
    Handles lead redistribution when attorneys decline or timeout
    """
    
    def handle_no_response(self, transfer: CaseTransfer):
        """
        Called when transfer expires without response
        """
        # Mark as expired
        transfer.status = 'expired'
        
        # Check retry count
        lead = transfer.lead
        previous_attempts = lead.transfers.count()
        
        if previous_attempts >= 3:
            # Max retries reached - escalate to admin
            self.escalate_to_admin(lead, reason="No attorney response after 3 attempts")
        else:
            # Find next best match, excluding previous attorneys
            excluded_ids = [t.attorney_id for t in lead.transfers]
            next_match = self.matching_engine.find_matches(
                lead, 
                max_matches=1,
                exclude_ids=excluded_ids
            )
            
            if next_match:
                self.create_transfer(lead, next_match[0].attorney)
            else:
                # No more matches available
                self.escalate_to_admin(lead, reason="No available attorneys")
    
    def handle_decline(self, transfer: CaseTransfer, reason: str):
        """
        Called when attorney explicitly declines
        """
        transfer.status = 'declined'
        
        # Log decline reason for analytics
        self.log_decline_reason(transfer.attorney, reason)
        
        # Immediately find next match
        self.handle_no_response(transfer)
```

---

## 4. Notification System

### 4.1 Notification Types

| Type | Trigger | Channels | Priority |
|------|---------|----------|----------|
| `lead_alert` | New lead matched | SMS + Email | HIGH |
| `reminder` | No response after 2h, 12h, 22h | SMS | MEDIUM |
| `expiry_warning` | 1 hour before expiry | SMS | HIGH |
| `escalation` | Max retries reached | Email (admin) | HIGH |
| `daily_digest` | Daily summary | Email | LOW |
| `weekly_report` | Weekly stats | Email | LOW |

### 4.2 Notification Templates

#### SMS - Lead Alert (Spanish)
```
🏛️ Tusa Gato's 24/7

Nuevo caso: [CASE_TYPE]
Condado: [COUNTY]
Urgencia: [URGENCY]

Responda:
SI - Aceptar caso
NO - Rechazar
INFO - Más detalles

Expira: [EXPIRY_TIME]
```

#### Email - Lead Alert
```
Subject: 🏛️ Nuevo Caso de [CASE_TYPE] - [COUNTY], [STATE]

Estimado/a [ATTORNEY_NAME],

Ha recibido un nuevo caso potencial:

═══════════════════════════════════════════
📋 DETALLES DEL CASO
═══════════════════════════════════════════

Tipo: [CASE_TYPE]
Ubicación: [COUNTY], [STATE]
Urgencia: [URGENCY]
Calificación: [SCORE]/100

Contacto:
Nombre: [LEAD_NAME]
Teléfono: [LEAD_PHONE]

Descripción:
[LEAD_DESCRIPTION]

═══════════════════════════════════════════

🔊 ESCUCHAR LLAMADA: [RECORDING_URL]
✅ ACEPTAR CASO: [ACCEPT_LINK]
❌ RECHAZAR: [DECLINE_LINK]

Este enlace expira en 24 horas.

---
Tusa Gato's 24/7 - Tus Abogados 24/7
```

---

## 5. Lead Lifecycle States

### 5.1 State Machine

```
                              ┌─────────────────┐
                              │                 │
                    ┌────────►│   new           │◄────────┐
                    │         │                 │         │
                    │         └────────┬────────┘         │
                    │                  │                  │
                    │                  ▼                  │
                    │         ┌─────────────────┐         │
                    │         │                 │         │
                    │         │  qualified      │─────────┤
                    │         │                 │  (DQ)
                    │         └────────┬────────┘
                    │                  │
                    │                  ▼
                    │         ┌─────────────────┐
                    │         │                 │
                    │         │  pending_match  │
                    │         │                 │
                    │         └────────┬────────┘
                    │                  │
         ┌──────────┴──────────────────┼──────────────────┐
         │                             │                  │
         ▼                             ▼                  ▼
┌─────────────────┐          ┌─────────────────┐  ┌─────────────────┐
│                 │          │                 │  │                 │
│   matched       │          │   spam          │  │   closed        │
│                 │          │                 │  │                 │
└────────┬────────┘          └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│                 │
│   accepted  ◄───┼──┐
│                 │  │ (decline)
└────────┬────────┘  │
         │           │
         ▼           │
┌─────────────────┐  │
│                 │  │
│   contacted     │  │
│                 │  │
└────────┬────────┘  │
         │           │
         ▼           │
┌─────────────────┐  │
│                 │  │
│   converted     │  │
│                 │──┘
└─────────────────┘
```

### 5.2 State Definitions

| State | Description | Entry Action | Exit Action |
|-------|-------------|--------------|-------------|
| `new` | Just created from intake | Create lead record | Validate data |
| `qualified` | Passed validation | Calculate score | Trigger matching |
| `pending_match` | Searching for attorney | Start matching engine | - |
| `matched` | Attorney notified | Create transfer, send alert | - |
| `accepted` | Attorney accepted | Update lead, notify admin | - |
| `declined` | Attorney declined | Log reason, retry | Trigger retry |
| `contacted` | Attorney contacted client | - | - |
| `converted` | Became paying case | Update stats, notify | - |
| `closed` | No conversion | Archive | - |
| `spam` | Invalid/incomplete | Log, no further action | - |

---

## 6. Escalation Procedures

### 6.1 Escalation Triggers

| Scenario | Action | Notify |
|----------|--------|--------|
| 3+ attorney attempts, no acceptance | Manual assignment | Admin + Kevin |
| Emergency case, no match within 30min | Priority override | Admin + Kevin + Porf |
| Attorney accepts but doesn't contact within 24h | Follow-up required | Admin |
| Lead quality score < 50 | Review queue | Agent supervisor |
| Technical error in matching | Manual intervention | Admin + Tech |

### 6.2 Emergency Case Handling

```python
class EmergencyEscalation:
    """
    Special handling for emergency-level cases
    """
    
    def handle_emergency(self, lead: Lead):
        """
        Emergency cases include:
        - Criminal with court date < 48 hours
        - Active deportation proceedings
        - Domestic violence with immediate danger
        - Child custody emergency
        """
        
        # 1. Override normal matching - include ALL qualified attorneys
        attorneys = (
            self.db.query(Attorney)
            .filter(Attorney.status == 'active')
            .filter(Attorney.specializations.any(case_type=lead.case_type))
            .all()  # Don't filter by county for emergencies
        )
        
        # 2. Notify multiple attorneys simultaneously
        for attorney in attorneys[:5]:  # Top 5
            self.create_transfer(
                lead=lead,
                attorney=attorney,
                expires_at=datetime.now() + timedelta(hours=2),  # 2 hour expiry
                priority=1
            )
        
        # 3. Immediate admin notification
        self.notify_admins(
            subject=f"🚨 EMERGENCY CASE: {lead.case_type} - {lead.county}",
            message=f"Emergency lead requires immediate attention",
            channels=['sms', 'email', 'slack']
        )
        
        # 4. Auto-callback scheduling
        self.schedule_callback(lead, within_minutes=15)
```

---

## Related Documentation
- `AGENTS.md` - Business context
- `ARCHITECTURE.md` - System architecture
- `DATA_MODEL.md` - Database schema
- `API_SPEC.md` - API specifications

---

*Last Updated: January 31, 2026*
*Version: 1.0*
