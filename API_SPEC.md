# 📡 Tusa Gato's 24/7 - API Specification

Complete API reference for the CRM system, including endpoints, request/response schemas, and authentication.

---

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.tusagatos247.com/v1` |
| Staging | `https://api-staging.tusagatos247.com/v1` |
| Local | `http://localhost:8000/v1` |

---

## Authentication

### JWT Token Authentication

All API requests require a Bearer token in the Authorization header.

```http
Authorization: Bearer <jwt_token>
```

### Webhook Authentication

Webhook endpoints use HMAC signature verification:

```http
X-Webhook-Signature: sha256=<hmac_signature>
X-Webhook-Source: retellai|twilio|stripe
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {
      "field": "phone",
      "value": "123"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

---

### 🔹 Intake Endpoints

#### POST `/intake/ai_lead`

Receive lead data from AI Receptionist (RetellAI webhook).

**Authentication:** Webhook signature (HMAC)

**Request Body:**
```json
{
  "call_id": "call_abc123",
  "agent_id": "agent_tusagatos_v1",
  "phone_number": "+12125551234",
  "direction": "inbound",
  "started_at": "2026-01-31T14:30:00Z",
  "ended_at": "2026-01-31T14:35:00Z",
  "duration_seconds": 300,
  "recording_url": "https:// recordings.retellai.com/call_abc123.mp3",
  "extracted_data": {
    "name": "Maria Gonzalez",
    "phone": "+12125551234",
    "case_type": "personal_injury",
    "county": "Queens",
    "state": "NY",
    "incident_date": "2026-01-15",
    "description": "Car accident on Main St, injured neck and back",
    "urgency": "high",
    "language_preference": "spanish",
    "callback_requested": false
  },
  "transcript": [
    {"role": "agent", "content": "Hola, gracias por llamar a Tusa Gato's 24/7..."},
    {"role": "user", "content": "Hola, tuve un accidente de carro..."}
  ],
  "disconnection_reason": "completed",
  "metadata": {
    "sentiment": 0.2,
    "confidence": 0.95
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "lead_id": "lead_123e4567-e89b-12d3-a456-426614174000",
    "status": "new",
    "qualification_score": 85,
    "matched_counties": ["Queens"],
    "matching_initiated": true,
    "estimated_match_time": "30 seconds"
  }
}
```

**Error Responses:**
- `422` - Invalid extracted data (missing required fields)
- `409` - Duplicate call_id (lead already exists)

---

#### POST `/intake/manual`

Manually create a lead (for call center agents).

**Authentication:** JWT (admin, agent)

**Request Body:**
```json
{
  "phone": "+12125551234",
  "first_name": "Maria",
  "last_name": "Gonzalez",
  "email": "maria@example.com",
  "case_type": "personal_injury",
  "county": "Queens",
  "state": "NY",
  "incident_date": "2026-01-15",
  "description": "Car accident on Main St",
  "urgency": "high",
  "language_pref": "spanish",
  "callback_requested": false,
  "source": "human_agent"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "lead_123e4567-e89b-12d3-a456-426614174000",
    "phone": "+12125551234",
    "status": "new",
    "created_at": "2026-01-31T14:35:00Z",
    "matching_initiated": true
  }
}
```

---

### 🔹 Leads Endpoints

#### GET `/leads`

List all leads with filtering and pagination.

**Authentication:** JWT (admin, agent, attorney - scope-based)

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `case_type` | string | Filter by case type |
| `county` | string | Filter by county |
| `state` | string | `NY` or `NJ` |
| `urgency` | string | `low`, `medium`, `high`, `emergency` |
| `source` | string | Filter by source |
| `date_from` | date | Start date (YYYY-MM-DD) |
| `date_to` | date | End date (YYYY-MM-DD) |
| `search` | string | Search phone, name, description |
| `assigned_to_me` | boolean | Attorney: only my leads |
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Items per page (default: 20, max: 100) |
| `sort` | string | Sort field (default: `created_at`) |
| `order` | string | `asc` or `desc` (default: `desc`) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "lead_123e4567-e89b-12d3-a456-426614174000",
      "phone": "+12125551234",
      "first_name": "Maria",
      "last_name": "Gonzalez",
      "case_type": "personal_injury",
      "case_subtype": "car_accident",
      "county": "Queens",
      "state": "NY",
      "urgency": "high",
      "status": "matched",
      "qualification_score": 85,
      "source": "ai_receptionist",
      "created_at": "2026-01-31T14:35:00Z",
      "assigned_attorney": {
        "id": "att_789",
        "firm_name": "Gonzalez Law Firm",
        "phone": "+12125555678"
      }
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

---

#### GET `/leads/:id`

Get detailed lead information.

**Authentication:** JWT (admin, agent, assigned attorney)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "lead_123e4567-e89b-12d3-a456-426614174000",
    "retell_call_id": "call_abc123",
    "phone": "+12125551234",
    "phone_alt": null,
    "first_name": "Maria",
    "last_name": "Gonzalez",
    "email": "maria@example.com",
    "case_type": "personal_injury",
    "case_subtype": "car_accident",
    "county": "Queens",
    "state": "NY",
    "incident_date": "2026-01-15",
    "incident_location": "Main St and 5th Ave",
    "description": "Car accident on Main St, injured neck and back",
    "urgency": "high",
    "language_pref": "spanish",
    "source": "ai_receptionist",
    "status": "matched",
    "qualification_score": 85,
    "qualification_notes": "Clear liability, documented injuries, insured driver",
    "ai_transcript": "Full conversation transcript...",
    "ai_summary": "Caller was in car accident 2 weeks ago...",
    "callback_requested": false,
    "callback_time": null,
    "converted_to_case": false,
    "created_at": "2026-01-31T14:35:00Z",
    "updated_at": "2026-01-31T14:36:00Z",
    "assigned_agent": {
      "id": "user_123",
      "name": "John Smith"
    },
    "transfers": [
      {
        "id": "trans_456",
        "attorney": {
          "id": "att_789",
          "firm_name": "Gonzalez Law Firm",
          "phone": "+12125555678",
          "email": "contact@gonzalezlaw.com"
        },
        "status": "pending",
        "sent_at": "2026-01-31T14:36:00Z",
        "expires_at": "2026-02-01T14:36:00Z"
      }
    ],
    "notes": [
      {
        "id": "note_123",
        "user": {"name": "John Smith"},
        "note_type": "general",
        "content": "Caller sounded genuine, clear case details",
        "created_at": "2026-01-31T14:40:00Z"
      }
    ],
    "call_log": {
      "id": "call_log_789",
      "duration_seconds": 300,
      "recording_url": "https://recordings.retellai.com/call_abc123.mp3",
      "sentiment_score": 0.2
    }
  }
}
```

---

#### PATCH `/leads/:id`

Update lead information.

**Authentication:** JWT (admin, agent)

**Request Body:**
```json
{
  "first_name": "Maria Elena",
  "status": "qualified",
  "qualification_score": 90,
  "qualification_notes": "Updated after follow-up call"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "lead_123e4567-e89b-12d3-a456-426614174000",
    "updated_fields": ["first_name", "status", "qualification_score", "qualification_notes"],
    "updated_at": "2026-01-31T15:00:00Z"
  }
}
```

---

#### POST `/leads/:id/notes`

Add a note to a lead.

**Authentication:** JWT (admin, agent, attorney)

**Request Body:**
```json
{
  "note_type": "follow_up",
  "content": "Spoke with client, they're ready to proceed",
  "is_private": false
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "note_456",
    "lead_id": "lead_123e4567-e89b-12d3-a456-426614174000",
    "note_type": "follow_up",
    "content": "Spoke with client, they're ready to proceed",
    "created_at": "2026-01-31T15:00:00Z"
  }
}
```

---

#### POST `/leads/:id/convert`

Mark lead as converted to a case.

**Authentication:** JWT (admin, attorney)

**Request Body:**
```json
{
  "attorney_id": "att_789",
  "estimated_value": 50000.00,
  "notes": "Signed retainer agreement"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "lead_id": "lead_123e4567-e89b-12d3-a456-426614174000",
    "status": "converted",
    "converted_at": "2026-01-31T15:00:00Z",
    "attorney_id": "att_789"
  }
}
```

---

### 🔹 Attorney Endpoints

#### GET `/attorneys`

List all attorneys.

**Authentication:** JWT (admin)

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `pending`, `active`, `suspended`, `cancelled` |
| `tier` | string | `basic`, `standard`, `premium` |
| `case_type` | string | Filter by specialization |
| `county` | string | Filter by served county |
| `search` | string | Search firm name, email |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "att_789",
      "user_id": "user_456",
      "bar_number": "NY123456",
      "firm_name": "Gonzalez Law Firm",
      "phone": "+12125555678",
      "email": "contact@gonzalezlaw.com",
      "website": "https://gonzalezlaw.com",
      "status": "active",
      "subscription_tier": "standard",
      "specializations": ["personal_injury", "workers_comp"],
      "counties": ["Queens", "Bronx"],
      "conversion_rate": 0.35,
      "rating": 4.5,
      "created_at": "2025-01-15T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 45
  }
}
```

---

#### GET `/attorneys/:id`

Get detailed attorney information.

**Authentication:** JWT (admin, self)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "att_789",
    "user": {
      "id": "user_456",
      "email": "attorney@gonzalezlaw.com",
      "first_name": "Carlos",
      "last_name": "Gonzalez"
    },
    "bar_number": "NY123456",
    "firm_name": "Gonzalez Law Firm",
    "phone": "+12125555678",
    "email": "contact@gonzalezlaw.com",
    "website": "https://gonzalezlaw.com",
    "address": "123 Main St, Queens, NY 11101",
    "status": "active",
    "subscription_tier": "standard",
    "max_leads_per_day": 10,
    "response_time_avg": 15,
    "conversion_rate": 0.35,
    "rating": 4.5,
    "onboarding_completed": true,
    "specializations": [
      {
        "case_type": "personal_injury",
        "is_primary": true,
        "years_experience": 15
      },
      {
        "case_type": "workers_comp",
        "is_primary": false,
        "years_experience": 10
      }
    ],
    "counties": [
      {
        "county": "Queens",
        "state": "NY",
        "priority": 1,
        "is_primary_office": true
      },
      {
        "county": "Bronx",
        "state": "NY",
        "priority": 2,
        "is_primary_office": false
      }
    ],
    "subscription": {
      "tier": "standard",
      "amount": 999.00,
      "billing_cycle": "monthly",
      "status": "active"
    },
    "stats": {
      "total_leads_received": 156,
      "leads_accepted": 54,
      "leads_declined": 45,
      "acceptance_rate": 34.6,
      "avg_response_time": "15 minutes"
    },
    "created_at": "2025-01-15T00:00:00Z"
  }
}
```

---

#### POST `/attorneys`

Create a new attorney.

**Authentication:** JWT (admin)

**Request Body:**
```json
{
  "email": "newattorney@example.com",
  "password": "securepassword123",
  "first_name": "Carlos",
  "last_name": "Gonzalez",
  "phone": "+12125555678",
  "bar_number": "NY123456",
  "firm_name": "Gonzalez Law Firm",
  "specializations": [
    {"case_type": "personal_injury", "is_primary": true, "years_experience": 15}
  ],
  "counties": [
    {"county": "Queens", "state": "NY", "priority": 1, "is_primary_office": true}
  ],
  "subscription_tier": "standard"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "att_789",
    "user_id": "user_456",
    "status": "pending",
    "message": "Attorney created. Welcome email sent.",
    "onboarding_url": "https://app.tusagatos247.com/onboarding/att_789"
  }
}
```

---

#### PATCH `/attorneys/:id`

Update attorney information.

**Authentication:** JWT (admin, self)

**Request Body:**
```json
{
  "phone": "+12125559999",
  "max_leads_per_day": 15,
  "specializations": [
    {"case_type": "personal_injury", "is_primary": true},
    {"case_type": "immigration", "is_primary": false}
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "att_789",
    "updated_fields": ["phone", "max_leads_per_day", "specializations"],
    "updated_at": "2026-01-31T15:00:00Z"
  }
}
```

---

#### POST `/attorneys/:id/pause`

Pause attorney's lead flow (vacation, etc.).

**Authentication:** JWT (admin, self)

**Request Body:**
```json
{
  "reason": "Vacation",
  "resume_at": "2026-02-15T00:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "att_789",
    "status": "paused",
    "paused_at": "2026-01-31T15:00:00Z",
    "resume_at": "2026-02-15T00:00:00Z"
  }
}
```

---

### 🔹 Matching Endpoints

#### POST `/matching/find`

Find matching attorneys for a lead (manual trigger).

**Authentication:** JWT (admin, agent)

**Request Body:**
```json
{
  "lead_id": "lead_123e4567-e89b-12d3-a456-426614174000",
  "exclude_attorney_ids": ["att_111"]  // Optional: exclude specific attorneys
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "lead_id": "lead_123e4567-e89b-12d3-a456-426614174000",
    "matches_found": 3,
    "matches": [
      {
        "attorney_id": "att_789",
        "firm_name": "Gonzalez Law Firm",
        "rank": 1,
        "score": 95,
        "reasons": [
          "Primary specialization: personal_injury",
          "Primary office in Queens",
          "High conversion rate (35%)"
        ]
      },
      {
        "attorney_id": "att_790",
        "firm_name": "Smith & Associates",
        "rank": 2,
        "score": 82,
        "reasons": [
          "Handles personal_injury",
          "Serves Queens",
          "Good response time"
        ]
      }
    ],
    "notification_sent": true
  }
}
```

---

#### POST `/matching/transfer/:transfer_id/accept`

Attorney accepts a lead.

**Authentication:** JWT (attorney)

**Request Body:**
```json
{
  "estimated_value": 50000.00,
  "notes": "Will contact client within 1 hour"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transfer_id": "trans_456",
    "status": "accepted",
    "lead": {
      "id": "lead_123e4567-e89b-12d3-a456-426614174000",
      "phone": "+12125551234",
      "first_name": "Maria",
      "last_name": "Gonzalez"
    },
    "next_steps": [
      "Contact client within 24 hours",
      "Update case status in CRM"
    ]
  }
}
```

---

#### POST `/matching/transfer/:transfer_id/decline`

Attorney declines a lead.

**Authentication:** JWT (attorney)

**Request Body:**
```json
{
  "reason": "conflict",
  "notes": "Conflict with existing client"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transfer_id": "trans_456",
    "status": "declined",
    "message": "Lead declined. Searching for alternative attorney...",
    "alternative_match_initiated": true
  }
}
```

---

### 🔹 Webhook Endpoints

#### POST `/webhooks/retell`

RetellAI event webhook.

**Authentication:** HMAC signature verification

**Events:**
- `call.started` - Call initiated
- `call.completed` - Call finished
- `call.transcript` - Transcript available

**Request Body (call.completed):**
```json
{
  "event": "call.completed",
  "timestamp": "2026-01-31T14:35:00Z",
  "data": {
    "call_id": "call_abc123",
    "extracted_data": { ... },
    "transcript": [ ... ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "received": true
}
```

---

### 🔹 Analytics Endpoints

#### GET `/analytics/dashboard`

Get dashboard summary statistics.

**Authentication:** JWT (admin)

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `date_from` | date | Start date |
| `date_to` | date | End date |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2026-01-01",
      "to": "2026-01-31"
    },
    "calls": {
      "total": 1450,
      "answered_by_ai": 1380,
      "transferred_to_human": 70,
      "avg_duration_seconds": 285
    },
    "leads": {
      "total": 1200,
      "qualified": 1080,
      "matched": 950,
      "accepted": 380,
      "converted": 165,
      "conversion_rate": 13.8
    },
    "case_types": {
      "personal_injury": 480,
      "workers_comp": 240,
      "immigration": 320,
      "criminal": 160
    },
    "geography": {
      "Queens": 360,
      "Bronx": 280,
      "Brooklyn": 340,
      "Manhattan": 120,
      "New_Jersey": 100
    },
    "attorney_performance": {
      "total_attorneys": 45,
      "active_attorneys": 38,
      "avg_acceptance_rate": 42.5,
      "avg_response_time_minutes": 22
    }
  }
}
```

---

#### GET `/analytics/attorneys/:id`

Get individual attorney analytics.

**Authentication:** JWT (admin, self)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "attorney_id": "att_789",
    "period": {
      "from": "2026-01-01",
      "to": "2026-01-31"
    },
    "summary": {
      "leads_received": 45,
      "leads_accepted": 18,
      "leads_declined": 12,
      "leads_expired": 15,
      "acceptance_rate": 40.0,
      "avg_response_minutes": 18
    },
    "by_case_type": {
      "personal_injury": {
        "received": 30,
        "accepted": 15,
        "conversion_rate": 50.0
      }
    },
    "by_county": {
      "Queens": {
        "received": 25,
        "accepted": 12
      }
    },
    "trend": [
      {"date": "2026-01-01", "received": 2, "accepted": 1},
      {"date": "2026-01-02", "received": 3, "accepted": 1}
    ]
  }
}
```

---

### 🔹 Admin Endpoints

#### GET `/admin/users`

List all system users.

**Authentication:** JWT (super_admin, admin)

**Response (200 OK):** Same format as `/attorneys`

---

#### POST `/admin/users`

Create new user.

**Authentication:** JWT (super_admin, admin)

---

#### GET `/admin/settings`

Get system settings.

**Authentication:** JWT (admin)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "matching": {
      "default_expiry_hours": 24,
      "max_matches_per_lead": 3,
      "retry_interval_hours": 4
    },
    "notifications": {
      "sms_enabled": true,
      "email_enabled": true,
      "reminder_hours": [2, 12, 22]
    },
    "ai_receptionist": {
      "agent_id": "agent_tusagatos_v1",
      "retell_api_key": "***",
      "phone_number": "+1-888-TUSA-GATO"
    }
  }
}
```

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 requests/minute per user |
| Webhooks | 1000 requests/minute |
| Analytics | 30 requests/minute |

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706720400
```

---

## Pagination

All list endpoints support cursor-based or offset pagination.

**Offset Pagination (default):**
```
GET /leads?page=2&per_page=50
```

**Cursor Pagination (for large datasets):**
```
GET /leads?cursor=eyJpZCI6IjEyMyJ9&per_page=50
```

---

## Related Documentation
- `AGENTS.md` - Business context
- `ARCHITECTURE.md` - System architecture
- `DATA_MODEL.md` - Database schema
- `WORKFLOWS.md` - Business logic flows

---

*Last Updated: January 31, 2026*
*Version: 1.0*
