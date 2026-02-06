# 🗄️ Tusa Gato's 24/7 - Data Model

This document defines the complete database schema for the CRM system, including tables, fields, relationships, and constraints.

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  users          │       │  attorneys      │       │  attorney_      │
│  ─────────────  │       │  ─────────────  │       │  specializations│
│  id (PK)        │       │  id (PK)        │       │  ─────────────  │
│  email          │       │  user_id (FK)   │◄──────┤  id (PK)        │
│  role           │       │  bar_number     │       │  attorney_id(FK)│
│  first_name     │       │  firm_name      │       │  case_type      │
│  last_name      │       │  phone          │       │  is_primary     │
│  phone          │       │  email          │       └─────────────────┘
│  is_active      │       │  status         │
│  created_at     │       │  subscription_tier
└─────────────────┘       │  county_prefs   │       ┌─────────────────┐
         │                │  created_at     │       │  attorney_      │
         │                └────────┬────────┘       │  counties       │
         │                         │                │  ─────────────  │
         │                         │                │  id (PK)        │
         │                         │                │  attorney_id(FK)│
         │                         ▼                │  county         │
         │                ┌─────────────────┐       │  state          │
         │                │  subscriptions  │       │  priority       │
         │                │  ─────────────  │       └─────────────────┘
         │                │  id (PK)        │
         └───────────────►│  attorney_id(FK)│
                          │  status         │
                          │  amount         │
                          │  billing_cycle  │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  leads          │◄──────┤  case_transfers │──────►│  attorney_      │
│  ─────────────  │       │  ─────────────  │       │  responses      │
│  id (PK)        │       │  id (PK)        │       │  ─────────────  │
│  retell_call_id │       │  lead_id (FK)   │       │  id (PK)        │
│  phone          │       │  attorney_id(FK)│       │  transfer_id(FK)│
│  first_name     │       │  status         │       │  response_type  │
│  last_name      │       │  sent_at        │       │  responded_at   │
│  case_type      │       │  expires_at     │       │  notes          │
│  county         │       │  created_at     │       │  estimated_value│
│  state          │       └─────────────────┘       └─────────────────┘
│  incident_date  │
│  description    │       ┌─────────────────┐
│  urgency        │       │  call_logs      │
│  language_pref  │       │  ─────────────  │
│  source         │       │  id (PK)        │
│  status         │       │  lead_id (FK)   │
│  qualification  │       │  retell_call_id │
│  ai_transcript  │       │  recording_url  │
│  ai_summary     │       │  duration_secs  │
│  created_at     │       │  raw_transcript │
│  updated_at     │       │  metadata       │
└─────────────────┘       │  created_at     │
         │                └─────────────────┘
         │
         │                ┌─────────────────┐
         └───────────────►│  lead_notes     │
                          │  ─────────────  │
                          │  id (PK)        │
                          │  lead_id (FK)   │
                          │  user_id (FK)   │
                          │  note_type      │
                          │  content        │
                          │  created_at     │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  activities     │       │  notifications  │
│  ─────────────  │       │  ─────────────  │
│  id (PK)        │       │  id (PK)        │
│  entity_type    │       │  user_id (FK)   │
│  entity_id      │       │  type           │
│  action         │       │  channel        │
│  user_id (FK)   │       │  status         │
│  old_values     │       │  content        │
│  new_values     │       │  sent_at        │
│  created_at     │       │  delivered_at   │
└─────────────────┘       │  error_message  │
                          └─────────────────┘
```

---

## Core Tables

### 1. users

System users (admins, agents, attorneys)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| role | ENUM | NOT NULL | `super_admin`, `admin`, `agent`, `attorney` |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| phone | VARCHAR(20) | NULL | Contact phone |
| is_active | BOOLEAN | DEFAULT true | Account status |
| email_verified | BOOLEAN | DEFAULT false | Email verification status |
| last_login_at | TIMESTAMP | NULL | Last login timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last update time |

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'agent', 'attorney')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
```

---

### 2. attorneys

Attorney profile information (extends users)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| user_id | UUID | FK → users.id, UNIQUE | Link to user account |
| bar_number | VARCHAR(50) | NOT NULL | State bar license number |
| firm_name | VARCHAR(255) | NOT NULL | Law firm name |
| phone | VARCHAR(20) | NOT NULL | Direct phone for leads |
| email | VARCHAR(255) | NOT NULL | Direct email for leads |
| website | VARCHAR(255) | NULL | Firm website |
| address | TEXT | NULL | Office address |
| status | ENUM | DEFAULT 'pending' | `pending`, `active`, `suspended`, `cancelled` |
| subscription_tier | ENUM | DEFAULT 'standard' | `basic`, `standard`, `premium` |
| max_leads_per_day | INTEGER | DEFAULT 10 | Daily lead limit |
| response_time_avg | INTEGER | NULL | Average response time (minutes) |
| conversion_rate | DECIMAL(5,4) | NULL | Lead-to-case conversion rate |
| rating | DECIMAL(2,1) | NULL | Internal rating (1-5) |
| notes | TEXT | NULL | Admin notes |
| onboarding_completed | BOOLEAN | DEFAULT false | Onboarding status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last update time |

```sql
CREATE TABLE attorneys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bar_number VARCHAR(50) NOT NULL,
    firm_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    address TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'cancelled')),
    subscription_tier VARCHAR(20) DEFAULT 'standard' CHECK (subscription_tier IN ('basic', 'standard', 'premium')),
    max_leads_per_day INTEGER DEFAULT 10,
    response_time_avg INTEGER,
    conversion_rate DECIMAL(5,4),
    rating DECIMAL(2,1) CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attorneys_status ON attorneys(status);
CREATE INDEX idx_attorneys_tier ON attorneys(subscription_tier);
```

---

### 3. attorney_specializations

Case types each attorney handles (many-to-many)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| attorney_id | UUID | FK → attorneys.id, NOT NULL | Attorney reference |
| case_type | ENUM | NOT NULL | Type of case |
| is_primary | BOOLEAN | DEFAULT false | Primary specialty |
| years_experience | INTEGER | NULL | Years in this practice area |
| notes | TEXT | NULL | Additional details |

**Case Type Values:**
- `personal_injury` - Personal Injury
- `workers_comp` - Workers' Compensation
- `construction_accident` - Construction Accidents
- `criminal` - Criminal Law
- `family` - Family Law
- `divorce` - Divorce
- `immigration` - Immigration
- `real_estate` - Real Estate
- `dui` - DUI/DWI
- `traffic` - Traffic Violations

```sql
CREATE TABLE attorney_specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attorney_id UUID NOT NULL REFERENCES attorneys(id) ON DELETE CASCADE,
    case_type VARCHAR(50) NOT NULL CHECK (case_type IN (
        'personal_injury', 'workers_comp', 'construction_accident',
        'criminal', 'family', 'divorce', 'immigration',
        'real_estate', 'dui', 'traffic'
    )),
    is_primary BOOLEAN DEFAULT false,
    years_experience INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(attorney_id, case_type)
);

CREATE INDEX idx_specs_attorney ON attorney_specializations(attorney_id);
CREATE INDEX idx_specs_type ON attorney_specializations(case_type);
```

---

### 4. attorney_counties

Geographic areas each attorney serves

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| attorney_id | UUID | FK → attorneys.id, NOT NULL | Attorney reference |
| county | VARCHAR(100) | NOT NULL | County name |
| state | ENUM | NOT NULL | `NY` or `NJ` |
| priority | INTEGER | DEFAULT 1 | Serving priority (1 = highest) |
| is_primary_office | BOOLEAN | DEFAULT false | Primary office location |

```sql
CREATE TABLE attorney_counties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attorney_id UUID NOT NULL REFERENCES attorneys(id) ON DELETE CASCADE,
    county VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL CHECK (state IN ('NY', 'NJ')),
    priority INTEGER DEFAULT 1,
    is_primary_office BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(attorney_id, county, state)
);

CREATE INDEX idx_counties_attorney ON attorney_counties(attorney_id);
CREATE INDEX idx_counties_location ON attorney_counties(county, state);
```

---

### 5. leads

Core lead/potential client information

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| retell_call_id | VARCHAR(100) | UNIQUE, NULL | RetellAI call ID |
| phone | VARCHAR(20) | NOT NULL | Primary phone number |
| phone_alt | VARCHAR(20) | NULL | Alternative phone |
| first_name | VARCHAR(100) | NULL | First name |
| last_name | VARCHAR(100) | NULL | Last name |
| email | VARCHAR(255) | NULL | Email address |
| case_type | ENUM | NOT NULL | Type of legal case |
| case_subtype | VARCHAR(50) | NULL | Sub-type (e.g., "car_accident") |
| county | VARCHAR(100) | NOT NULL | County of incident |
| state | ENUM | NOT NULL | `NY` or `NJ` |
| incident_date | DATE | NULL | When incident occurred |
| incident_location | TEXT | NULL | Specific location details |
| description | TEXT | NULL | Case description |
| urgency | ENUM | DEFAULT 'medium' | `low`, `medium`, `high`, `emergency` |
| language_pref | ENUM | DEFAULT 'spanish' | `spanish`, `english`, `bilingual` |
| source | ENUM | DEFAULT 'ai_receptionist' | Source of lead |
| status | ENUM | DEFAULT 'new' | Lead status |
| qualification_score | INTEGER | NULL | AI/human qualification (1-100) |
| qualification_notes | TEXT | NULL | Why this score |
| ai_transcript | TEXT | NULL | Full AI conversation transcript |
| ai_summary | TEXT | NULL | AI-generated summary |
| callback_requested | BOOLEAN | DEFAULT false | Caller wants callback |
| callback_time | TIMESTAMP | NULL | Preferred callback time |
| assigned_agent_id | UUID | FK → users.id, NULL | Call center agent |
| converted_to_case | BOOLEAN | DEFAULT false | Became paying case |
| converted_at | TIMESTAMP | NULL | Conversion timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last update time |

**Status Values:**
- `new` - Just created, not processed
- `qualified` - Information complete, ready for matching
- `pending_match` - Matching in progress
- `matched` - Attorney assigned, awaiting response
- `accepted` - Attorney accepted lead
- `declined` - Attorney declined, re-matching
- `contacted` - Client contacted by attorney
- `converted` - Became a paying case
- `closed` - No conversion, archived
- `spam` - Marked as invalid/spam

**Source Values:**
- `ai_receptionist` - AI phone intake
- `human_agent` - Call center agent
- `website` - Web form submission
- `referral` - Referral from attorney
- `manual` - Manually entered

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retell_call_id VARCHAR(100) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    phone_alt VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    case_type VARCHAR(50) NOT NULL CHECK (case_type IN (
        'personal_injury', 'workers_comp', 'construction_accident',
        'criminal', 'family', 'divorce', 'immigration',
        'real_estate', 'dui', 'traffic', 'other'
    )),
    case_subtype VARCHAR(50),
    county VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL CHECK (state IN ('NY', 'NJ')),
    incident_date DATE,
    incident_location TEXT,
    description TEXT,
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
    language_pref VARCHAR(20) DEFAULT 'spanish' CHECK (language_pref IN ('spanish', 'english', 'bilingual')),
    source VARCHAR(30) DEFAULT 'ai_receptionist' CHECK (source IN ('ai_receptionist', 'human_agent', 'website', 'referral', 'manual')),
    status VARCHAR(30) DEFAULT 'new' CHECK (status IN (
        'new', 'qualified', 'pending_match', 'matched', 'accepted',
        'declined', 'contacted', 'converted', 'closed', 'spam'
    )),
    qualification_score INTEGER CHECK (qualification_score >= 1 AND qualification_score <= 100),
    qualification_notes TEXT,
    ai_transcript TEXT,
    ai_summary TEXT,
    callback_requested BOOLEAN DEFAULT false,
    callback_time TIMESTAMP,
    assigned_agent_id UUID REFERENCES users(id),
    converted_to_case BOOLEAN DEFAULT false,
    converted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_case_type ON leads(case_type);
CREATE INDEX idx_leads_location ON leads(county, state);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_created ON leads(created_at);
CREATE INDEX idx_leads_urgency ON leads(urgency) WHERE urgency IN ('high', 'emergency');
```

---

### 6. case_transfers

Lead distribution records to attorneys

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| lead_id | UUID | FK → leads.id, NOT NULL | Lead reference |
| attorney_id | UUID | FK → attorneys.id, NOT NULL | Attorney reference |
| status | ENUM | DEFAULT 'pending' | Transfer status |
| priority | INTEGER | DEFAULT 1 | Match priority ranking |
| matching_reason | TEXT | NULL | Why this match was made |
| sent_at | TIMESTAMP | NULL | When notification sent |
| expires_at | TIMESTAMP | NOT NULL | Response deadline |
| responded_at | TIMESTAMP | NULL | When attorney responded |
| notes | TEXT | NULL | Internal notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Status Values:**
- `pending` - Notification sent, awaiting response
- `accepted` - Attorney accepted the lead
- `declined` - Attorney declined the lead
- `expired` - No response within deadline
- `cancelled` - Admin cancelled transfer

```sql
CREATE TABLE case_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    attorney_id UUID NOT NULL REFERENCES attorneys(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    priority INTEGER DEFAULT 1,
    matching_reason TEXT,
    sent_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    responded_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lead_id, attorney_id)
);

CREATE INDEX idx_transfers_status ON case_transfers(status);
CREATE INDEX idx_transfers_lead ON case_transfers(lead_id);
CREATE INDEX idx_transfers_attorney ON case_transfers(attorney_id);
CREATE INDEX idx_transfers_expires ON case_transfers(expires_at) WHERE status = 'pending';
```

---

### 7. attorney_responses

Detailed responses from attorneys about leads

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| transfer_id | UUID | FK → case_transfers.id, NOT NULL | Transfer reference |
| response_type | ENUM | NOT NULL | Type of response |
| response_channel | ENUM | NOT NULL | How they responded |
| responded_at | TIMESTAMP | NOT NULL | Response timestamp |
| notes | TEXT | NULL | Attorney's notes |
| estimated_case_value | DECIMAL(12,2) | NULL | Attorney's value estimate |
| rejection_reason | ENUM | NULL | Why declined |
| follow_up_needed | BOOLEAN | DEFAULT false | Needs admin follow-up |

**Response Type Values:**
- `accepted` - Will take the case
- `declined` - Cannot take the case
- `counter_offer` - Wants to negotiate
- `needs_info` - Needs more information

**Rejection Reason Values:**
- `conflict` - Conflict of interest
- `capacity` - At capacity
- `not_in_area` - Outside practice area
- `not_qualified` - Lead not qualified
- `fee_too_low` - Case value too low
- `other` - Other reason

```sql
CREATE TABLE attorney_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES case_transfers(id) ON DELETE CASCADE,
    response_type VARCHAR(20) NOT NULL CHECK (response_type IN ('accepted', 'declined', 'counter_offer', 'needs_info')),
    response_channel VARCHAR(20) NOT NULL CHECK (response_channel IN ('sms', 'email', 'phone', 'portal')),
    responded_at TIMESTAMP NOT NULL,
    notes TEXT,
    estimated_case_value DECIMAL(12,2),
    rejection_reason VARCHAR(30) CHECK (rejection_reason IN ('conflict', 'capacity', 'not_in_area', 'not_qualified', 'fee_too_low', 'other')),
    follow_up_needed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responses_transfer ON attorney_responses(transfer_id);
```

---

### 8. call_logs

Detailed call session information from RetellAI

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| lead_id | UUID | FK → leads.id, NULL | Linked lead (if converted) |
| retell_call_id | VARCHAR(100) | UNIQUE, NOT NULL | RetellAI call ID |
| retell_agent_id | VARCHAR(100) | NOT NULL | RetellAI agent used |
| phone_number | VARCHAR(20) | NOT NULL | Caller phone number |
| direction | ENUM | NOT NULL | `inbound` or `outbound` |
| status | ENUM | NOT NULL | Call result |
| started_at | TIMESTAMP | NOT NULL | Call start time |
| ended_at | TIMESTAMP | NULL | Call end time |
| duration_seconds | INTEGER | NULL | Call duration |
| recording_url | VARCHAR(500) | NULL | S3/Storage URL |
| raw_transcript | JSONB | NULL | Full transcript data |
| extracted_data | JSONB | NULL | Data extracted by AI |
| sentiment_score | DECIMAL(3,2) | NULL | Call sentiment (-1 to 1) |
| metadata | JSONB | NULL | Additional RetellAI metadata |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

```sql
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id),
    retell_call_id VARCHAR(100) UNIQUE NOT NULL,
    retell_agent_id VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'failed', 'no_answer', 'voicemail', 'transferred')),
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    recording_url VARCHAR(500),
    raw_transcript JSONB,
    extracted_data JSONB,
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calls_lead ON call_logs(lead_id);
CREATE INDEX idx_calls_retell ON call_logs(retell_call_id);
CREATE INDEX idx_calls_date ON call_logs(started_at);
```

---

### 9. lead_notes

Manual notes added to leads by agents/admins

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| lead_id | UUID | FK → leads.id, NOT NULL | Lead reference |
| user_id | UUID | FK → users.id, NOT NULL | Who wrote the note |
| note_type | ENUM | DEFAULT 'general' | Type of note |
| content | TEXT | NOT NULL | Note content |
| is_private | BOOLEAN | DEFAULT false | Internal-only note |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

```sql
CREATE TABLE lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    note_type VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('general', 'follow_up', 'quality', 'conversion', 'complaint')),
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_lead ON lead_notes(lead_id);
CREATE INDEX idx_notes_user ON lead_notes(user_id);
```

---

### 10. activities (Audit Log)

Complete audit trail of all system changes

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| entity_type | VARCHAR(50) | NOT NULL | Table/entity name |
| entity_id | UUID | NOT NULL | Entity UUID |
| action | VARCHAR(50) | NOT NULL | What happened |
| user_id | UUID | FK → users.id, NULL | Who made the change |
| old_values | JSONB | NULL | Previous state |
| new_values | JSONB | NULL | New state |
| ip_address | VARCHAR(45) | NULL | User's IP |
| user_agent | TEXT | NULL | User's browser |
| created_at | TIMESTAMP | DEFAULT NOW() | When it happened |

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_date ON activities(created_at);
```

---

### 11. notifications

Notification delivery tracking

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| user_id | UUID | FK → users.id, NOT NULL | Recipient |
| type | VARCHAR(50) | NOT NULL | Notification type |
| channel | ENUM | NOT NULL | `sms`, `email`, `push` |
| status | ENUM | DEFAULT 'pending' | Delivery status |
| content | TEXT | NOT NULL | Message content |
| subject | VARCHAR(255) | NULL | Email subject |
| metadata | JSONB | NULL | Additional data |
| scheduled_at | TIMESTAMP | NULL | When to send |
| sent_at | TIMESTAMP | NULL | When sent |
| delivered_at | TIMESTAMP | NULL | When delivered |
| opened_at | TIMESTAMP | NULL | When opened |
| error_message | TEXT | NULL | If failed |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(10) NOT NULL CHECK (channel IN ('sms', 'email', 'push')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'delivered', 'opened', 'failed', 'bounced')),
    content TEXT NOT NULL,
    subject VARCHAR(255),
    metadata JSONB,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at) WHERE status = 'scheduled';
```

---

### 12. subscriptions

Attorney subscription billing records

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Unique identifier |
| attorney_id | UUID | FK → attorneys.id, NOT NULL | Attorney reference |
| status | ENUM | DEFAULT 'active' | Subscription status |
| tier | ENUM | NOT NULL | Subscription level |
| amount | DECIMAL(10,2) | NOT NULL | Monthly amount |
| billing_cycle | ENUM | DEFAULT 'monthly' | Billing frequency |
| started_at | TIMESTAMP | NOT NULL | Subscription start |
| ends_at | TIMESTAMP | NULL | Subscription end |
| payment_method | VARCHAR(50) | NULL | Payment type |
| stripe_customer_id | VARCHAR(100) | NULL | Stripe customer |
| stripe_subscription_id | VARCHAR(100) | NULL | Stripe subscription |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last update |

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attorney_id UUID NOT NULL REFERENCES attorneys(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('basic', 'standard', 'premium')),
    amount DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
    started_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    payment_method VARCHAR(50),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_attorney ON subscriptions(attorney_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

---

## Views

### 1. lead_summary
Consolidated lead view for dashboards

```sql
CREATE VIEW lead_summary AS
SELECT 
    l.id,
    l.phone,
    l.first_name,
    l.last_name,
    l.case_type,
    l.county,
    l.state,
    l.urgency,
    l.status,
    l.qualification_score,
    l.created_at,
    CASE 
        WHEN l.status IN ('accepted', 'converted') THEN 'converted'
        WHEN l.status IN ('declined', 'closed', 'spam') THEN 'lost'
        ELSE 'active'
    END as pipeline_status,
    ct.id as transfer_id,
    ct.attorney_id,
    a.firm_name as attorney_firm,
    CASE 
        WHEN ct.status = 'accepted' THEN true
        ELSE false
    END as is_converted
FROM leads l
LEFT JOIN case_transfers ct ON l.id = ct.lead_id AND ct.status = 'accepted'
LEFT JOIN attorneys a ON ct.attorney_id = a.id;
```

### 2. attorney_performance
Attorney metrics for reporting

```sql
CREATE VIEW attorney_performance AS
SELECT 
    a.id as attorney_id,
    a.firm_name,
    a.status,
    COUNT(DISTINCT ct.id) as total_leads_received,
    COUNT(DISTINCT CASE WHEN ct.status = 'accepted' THEN ct.id END) as leads_accepted,
    COUNT(DISTINCT CASE WHEN ct.status = 'declined' THEN ct.id END) as leads_declined,
    COUNT(DISTINCT CASE WHEN ct.status = 'expired' THEN ct.id END) as leads_expired,
    ROUND(
        COUNT(DISTINCT CASE WHEN ct.status = 'accepted' THEN ct.id END)::decimal / 
        NULLIF(COUNT(DISTINCT ct.id), 0) * 100, 
        2
    ) as acceptance_rate,
    AVG(EXTRACT(EPOCH FROM (ct.responded_at - ct.sent_at))/60) as avg_response_minutes
FROM attorneys a
LEFT JOIN case_transfers ct ON a.id = ct.attorney_id
WHERE a.status = 'active'
GROUP BY a.id, a.firm_name, a.status;
```

---

## Firestore Collections (NoSQL)

### 1. call_sessions
Real-time active call state

```javascript
{
  callId: string,           // RetellAI call ID
  leadId: string,           // Associated lead (if known)
  status: string,           // 'connected', 'intaking', 'completed'
  currentStep: string,      // Current intake step
  collectedData: {          // Data collected so far
    name?: string,
    phone?: string,
    caseType?: string,
    county?: string
  },
  startedAt: timestamp,
  lastActivityAt: timestamp
}
```

### 2. lead_queue
Real-time lead status for dashboards

```javascript
{
  leadId: string,
  status: string,
  priority: number,
  caseType: string,
  county: string,
  urgency: string,
  matchedAttorneys: string[],  // IDs of notified attorneys
  createdAt: timestamp,
  expiresAt: timestamp
}
```

### 3. notification_queue
Pending notification jobs

```javascript
{
  notificationId: string,
  type: string,             // 'lead_alert', 'reminder', etc.
  userId: string,
  channel: string,          // 'sms', 'email'
  content: string,
  scheduledAt: timestamp,
  retryCount: number,
  status: string            // 'pending', 'processing', 'sent', 'failed'
}
```

---

## Related Documentation
- `AGENTS.md` - Business context
- `ARCHITECTURE.md` - System architecture
- `API_SPEC.md` - API specifications
- `WORKFLOWS.md` - Business logic flows

---

*Last Updated: January 31, 2026*
*Version: 1.0*
