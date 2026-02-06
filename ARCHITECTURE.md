# 🏗️ Tusa Gato's 24/7 - System Architecture

## Executive Summary

This document outlines the technical architecture for the Tusa Gato's 24/7 CRM and AI Receptionist system. The design prioritizes scalability, cost-efficiency, and integration with Google Cloud Platform while maintaining flexibility for future growth.

---

## 🎯 Architecture Principles

1. **Serverless-First** - Minimize operational overhead with managed services
2. **Event-Driven** - Async processing for lead handling and notifications
3. **API-First** - RESTful APIs for all integrations
4. **Multi-Tenant Ready** - Support future expansion to other markets
5. **Cost-Optimized** - Pay-per-use model, no idle resources

---

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Phone      │  │  Admin Web   │  │ Attorney     │  │  Call Center   │  │
│  │   (Voice)    │  │   Dashboard  │  │  Portal      │  │   Interface    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
└─────────┼─────────────────┼─────────────────┼──────────────────┼───────────┘
          │                 │                 │                  │
          │                 │                 │                  │
┌─────────┼─────────────────┼─────────────────┼──────────────────┼───────────┐
│         │    INTEGRATION & API LAYER (Google Cloud Run)        │           │
│         │                 │                 │                  │           │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼────────┐  │
│  │  RetellAI    │  │   REST API   │  │   WebSocket  │  │   Webhooks    │  │
│  │  Webhook     │  │   Gateway    │  │   (Real-time)│  │   Handler     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼──────────────────┼───────────┘
          │                 │                 │                  │
          │                 │                 │                  │
┌─────────┼─────────────────┼─────────────────┼──────────────────┼───────────┐
│         │         SERVICE LAYER (Cloud Run / Cloud Functions)              │
│         │                 │                 │                  │           │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼────────┐  │
│  │   Intake     │  │   Matching   │  │ Notification │  │   Analytics   │  │
│  │   Service    │  │   Engine     │  │   Service    │  │   Service     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                 │                  │          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼────────┐  │
│  │   Gemini AI  │  │   Lead Qual  │  │   Email/SMS  │  │   Reporting   │  │
│  │   (Optional) │  │   Scoring    │  │   Providers  │  │   Engine      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │                 │                 │                  │
          │                 │                 │                  │
┌─────────┼─────────────────┼─────────────────┼──────────────────┼───────────┐
│                         DATA LAYER (Google Cloud)                          │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    Cloud SQL (PostgreSQL)                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │   │
│  │  │    Leads     │  │  Attorneys   │  │   Case_Transfers         │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    Firestore (NoSQL)                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │   │
│  │  │  Call_Logs   │  │   Sessions   │  │   Real-time_Queue        │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    Cloud Storage                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │   │
│  │  │ Call_Recs    │  │  Documents   │  │   Exports                │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend
| Component | Technology | Justification |
|-----------|------------|---------------|
| Runtime | Python 3.11+ | Fast development, rich ecosystem |
| Framework | FastAPI | Async support, auto-docs, performance |
| ORM | SQLAlchemy 2.0 | Flexible, PostgreSQL optimized |
| Validation | Pydantic | Type safety, request/response models |

### Frontend (Admin Dashboard)
| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | Next.js 14 (App Router) | React-based, SEO-friendly |
| Styling | Tailwind CSS | Rapid UI development |
| UI Components | shadcn/ui | Modern, accessible components |
| State | React Query | Server state management |

### AI/ML
| Component | Technology | Justification |
|-----------|------------|---------------|
| AI Voice | RetellAI | Purpose-built for voice agents |
| NLP (Optional) | Google Gemini | Lead summarization, sentiment |
| Transcription | RetellAI (built-in) | Real-time, Spanish support |

### Infrastructure (Google Cloud)
| Component | Service | Purpose |
|-----------|---------|---------|
| Compute | Cloud Run | Serverless containers |
| Database | Cloud SQL (PostgreSQL) | Transactional data |
| Cache/Queue | Firestore + Pub/Sub | Real-time + async processing |
| Storage | Cloud Storage | Files, recordings |
| Secrets | Secret Manager | API keys, credentials |
| Monitoring | Cloud Monitoring + Logging | Observability |

---

## 📡 API Gateway Design

### Base URL Structure
```
Production: https://api.tusagatos247.com/v1
Staging:    https://api-staging.tusagatos247.com/v1
```

### Endpoint Categories

```
/v1/intake          # Lead intake from AI/phone
/v1/leads           # Lead management
/v1/attorneys       # Attorney management
/v1/matching        # Lead-attorney matching
/v1/notifications   # Notification triggers
/v1/analytics       # Reports and metrics
/v1/admin           # Administrative operations
/v1/webhooks        # External service webhooks
```

---

## 🔗 RetellAI Integration Architecture

### Call Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Caller    │────▶│  RetellAI   │────▶│  Webhook    │────▶│   Intake    │
│   (Phone)   │◄────│  (Voice AI) │◄────│  Endpoint   │◄────│   Service   │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
                                                                   ▼
                                                          ┌─────────────────┐
                                                          │  Lead Created   │
                                                          │  Matching Eng.  │
                                                          │  Notification   │
                                                          └─────────────────┘
```

### RetellAI Configuration
```yaml
Agent Name: TusaGato-Intake-v1
Language: Spanish (es-US)
Voice: Custom (Dominican or Paisa accent)
Webhook URL: https://api.tusagatos247.com/v1/webhooks/retell

Functions:
  - create_lead: Collects caller info, creates CRM record
  - transfer_call: Escalates to human agent (optional)
  - schedule_callback: Books follow-up call

Required Information:
  - name: string (required)
  - phone: string (required, E.164 format)
  - case_type: enum (required)
  - county: string (required)
  - incident_date: date (optional)
  - description: string (optional)
  - urgency: enum (low|medium|high|emergency)
```

---

## 🔄 Event-Driven Workflow

### Lead Intake Event Flow
```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LEAD INTAKE FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

1. CALL_RECEIVED
   └─▶ RetellAI answers call, begins conversation
       └─▶ [Async] Log call_start to Firestore

2. INTAKE_COMPLETED
   └─▶ RetellAI POST /v1/webhooks/retell
       Payload: {call_data, extracted_fields, transcript}
       └─▶ [Sync] Return 200 OK to RetellAI
       └─▶ [Async] Pub/Sub: lead.received

3. LEAD_PROCESSING (Triggered by Pub/Sub)
   ├─▶ Validate lead data
   ├─▶ Enrich with metadata (timestamp, source)
   ├─▶ Calculate qualification_score
   ├─▶ Save to PostgreSQL (leads table)
   └─▶ Pub/Sub: lead.created

4. MATCHING_ENGINE (Triggered by Pub/Sub)
   ├─▶ Query attorneys by: case_type + county + availability
   ├─▶ Rank by: response_time, conversion_rate, capacity
   ├─▶ Select best_match
   ├─▶ Create case_transfer record
   └─▶ Pub/Sub: match.found

5. NOTIFICATION_DISPATCH (Triggered by Pub/Sub)
   ├─▶ Send SMS to attorney
   ├─▶ Send Email to attorney  
   ├─▶ Update lead status: NOTIFIED
   └─▶ Schedule follow-up reminder (24h)

6. ATTORNEY_RESPONSE (Webhook from attorney portal)
   ├─▶ accepted: Update status, notify admin
   ├─▶ declined: Re-run matching, notify admin
   └─▶ no_response: Escalate to admin
```

---

## 🗄️ Database Strategy

### PostgreSQL (Cloud SQL) - Primary Database

**Purpose**: Structured, relational data with ACID guarantees

**Tables**:
- `leads` - Core lead information
- `attorneys` - Attorney profiles and preferences
- `case_transfers` - Lead-attorney match records
- `users` - Admin and agent accounts
- `subscriptions` - Attorney billing/subscriptions
- `activities` - Audit trail

### Firestore - Real-time & Session Data

**Purpose**: High-velocity writes, real-time sync

**Collections**:
- `call_sessions` - Active call state
- `lead_queue` - Real-time lead status
- `notifications` - Pending notifications
- `analytics_events` - Time-series events

### Cloud Storage

**Buckets**:
- `call-recordings` - MP3/WAV of calls
- `documents` - Uploaded case files
- `exports` - CSV/Excel reports

---

## 🔐 Security Architecture

### Authentication & Authorization
```
┌─────────────────────────────────────────────────────────┐
│                    AUTH FLOW                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │  Client  │───▶│  Firebase│───▶│  ID Token (JWT)  │  │
│  │          │◄───│  Auth    │◄───│                  │  │
│  └──────────┘    └──────────┘    └────────┬─────────┘  │
│                                           │            │
│                                           ▼            │
│                              ┌─────────────────────┐   │
│                              │  API Gateway        │   │
│                              │  - Verify JWT       │   │
│                              │  - Extract claims   │   │
│                              │  - Route request    │   │
│                              └──────────┬──────────┘   │
│                                         │              │
│                                         ▼              │
│                              ┌─────────────────────┐   │
│                              │  Service Layer      │   │
│                              │  - Check RBAC       │   │
│                              │  - Process request  │   │
│                              └─────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| `super_admin` | Full system access |
| `admin` | Manage attorneys, view all leads, reports |
| `agent` | View assigned leads, update status |
| `attorney` | View own leads, accept/decline, profile |
| `webhook` | System-to-system only |

---

## 📊 Scaling Considerations

### Current Projections
- **Initial Load**: 50-100 calls/day
- **Target Load**: 500-1000 calls/day
- **Peak Load**: 100+ concurrent calls

### Auto-Scaling Strategy

**Cloud Run**:
- Min instances: 1 (keep warm)
- Max instances: 100
- Concurrency: 80 requests per instance
- CPU: 1 vCPU, 512MB RAM per instance

**Cloud SQL**:
- Start: db-f1-micro (development)
- Production: db-g1-small → db-n1-standard-2
- Read replicas for analytics queries

**Pub/Sub**:
- Default throughput: 10MB/s per topic
- Can scale to GB/s automatically

---

## 💰 Cost Estimates (Monthly)

### Development Phase
| Service | Estimated Cost |
|---------|---------------|
| Cloud Run | $10-20 |
| Cloud SQL (micro) | $7 |
| Firestore | $5-10 |
| Cloud Storage | $5 |
| RetellAI (100 calls) | $50-100 |
| **Total** | **~$80-150/mo** |

### Production Phase (500 calls/day)
| Service | Estimated Cost |
|---------|---------------|
| Cloud Run | $100-200 |
| Cloud SQL (standard) | $50-100 |
| Firestore | $50-100 |
| Cloud Storage | $50-100 |
| RetellAI (15K calls) | $2,000-3,000 |
| **Total** | **~$2,500-3,500/mo** |

---

## 🚀 Deployment Strategy

### Environments
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Local     │────▶│  Staging    │────▶│ Production  │
│  (Docker)   │     │  (staging)  │     │  (tusagatos)│
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                   │
      ▼                    ▼                   ▼
  Dev testing         QA/UAT testing      Live traffic
  Hot reload          Auto-deploy main    Manual promote
```

### CI/CD Pipeline
1. **Build**: Docker image build
2. **Test**: Unit tests, integration tests
3. **Deploy Staging**: Auto-deploy on PR merge
4. **Smoke Tests**: Health checks
5. **Deploy Production**: Manual approval → deploy

---

## 📚 Related Documentation
- `DATA_MODEL.md` - Detailed database schema
- `API_SPEC.md` - API endpoint specifications
- `WORKFLOWS.md` - Business process flows
- `AGENTS.md` - Business context and requirements

---

*Last Updated: January 31, 2026*
*Version: 1.0*
