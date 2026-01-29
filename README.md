# Disaster Pulse

**Disaster Pulse** is a real-time disaster monitoring and intelligence platform for Indonesia. It aggregates data from multiple sources (BMKG, TikTok, News RSS, User Reports) to provide verified, actionable insights.

![Disaster Pulse](/media/disaster-pulse-home.jpg)

## System Architecture

The project is a monorepo managed with **Turborepo** and **npm**, consisting of:

| Package | Description | Tech Stack |
|---------|-------------|------------|
| `apps/web` | Next.js 16 PWA frontend | Next.js, Tailwind CSS 4, Leaflet, TanStack Query |
| `apps/api` | NestJS backend service | NestJS, PostgreSQL + PostGIS, BullMQ, Gemini AI |
| `packages/shared` | Shared types and utilities | TypeScript |

---

## Key Features

### Frontend (Web)

- **Real-time Map**: Leaflet-based map with custom clustering and live incident tracking
- **PWA Support**: Fully offline-capable, installable on mobile devices
- **Live Updates**: Real-time signals from backend via SSE
- **Responsive Design**: Mobile-first UI optimized for touch interfaces

### Backend (API)

- **Multi-Source Ingestion**:
  - **BMKG**: Earthquake and Tsunami official data
  - **RSS Feeds**: News aggregation and analysis
  - **TikTok**: Social media signal detection via Apify
  - **User Reports**: Crowd-sourced ground truth with media upload
- **AI Analysis**: Multi-agent LLM-based verification and clustering
- **Event-Driven**: Automated incident lifecycle management

---

## AI Agents Architecture

### Overview

```mermaid
flowchart TB
    subgraph Sources["Data Sources"]
        TikTok[("TikTok")]
        RSS[("RSS News")]
        UserReport[("User Reports")]
        BMKG[("BMKG API")]
    end

    subgraph Ingestion["Signal Ingestion Agents"]
        VA["VideoAnalysisAgent<br/>(gemini-2.5-flash)"]
        NA["NewsAnalysisAgent<br/>(gemini-2.5-flash)"]
        URA["UserReportAnalysisAgent<br/>(gemini-3-pro)"]
    end

    subgraph Processing["Signal Processing"]
        SQ[("Signal Queue")]
        SE["SignalEnrichmentAgent<br/>(gemini-2.5-flash)"]
        LM["LocationMatcherAgent<br/>(gemini-2.5-flash)"]
    end

    subgraph Reasoning["Multi-Agent Reasoning Chain"]
        OBS["ObserverAgent<br/>(gemini-2.5-flash)"]
        CLS["ClassifierAgent<br/>(gemini-3-pro)"]
        SKP["SkepticAgent<br/>(gemini-3-pro)"]
        SYN["SynthesizerAgent<br/>(gemini-3-pro)"]
        ACT["ActionAgent<br/>(gemini-3-pro)"]
    end

    subgraph Lifecycle["Incident Lifecycle"]
        IR["IncidentResolutionAgent<br/>(gemini-2.5-flash)"]
        INC[("Incidents DB")]
    end

    subgraph UserFacing["User-Facing"]
        GA["GuideAssistantAgent<br/>(gemini-3-pro)"]
    end

    TikTok --> VA
    RSS --> NA
    UserReport --> URA
    BMKG --> SQ

    VA --> SQ
    NA --> SQ
    URA --> SQ

    SQ --> SE
    SE --> LM
    LM --> OBS
    OBS --> CLS
    CLS --> SKP
    SKP --> SYN
    SYN --> ACT
    ACT --> INC

    INC --> IR
    IR --> INC

    GA -.-> INC
```

### Signal Ingestion Flow

```mermaid
flowchart LR
    subgraph TikTok["TikTok Source"]
        T1["Fetch Videos<br/>(Apify)"] --> T2["VideoAnalysisAgent"]
        T2 --> T3{"is_real_event?<br/>confidence > 0.6?"}
        T3 -->|Yes| T4["Create Signal"]
        T3 -->|No| T5["Discard"]
    end

    subgraph RSS["RSS News Source"]
        R1["Fetch Articles"] --> R2["NewsAnalysisAgent"]
        R2 --> R3{"is_disaster?<br/>confidence > 0.5?"}
        R3 -->|Yes| R4["Create Signal"]
        R3 -->|No| R5["Discard"]
    end

    subgraph UserReports["User Reports"]
        U1["Upload Media"] --> U2["Extract EXIF/Metadata"]
        U2 --> U3["UserReportAnalysisAgent"]
        U3 --> U4{"recommended_action?"}
        U4 -->|accept| U5["Create Signal"]
        U4 -->|reject| U6["Return Error"]
    end
```

### Multi-Agent Reasoning Chain

When an incident needs full evaluation, signals go through a debate-style reasoning chain:

```mermaid
flowchart TB
    subgraph Input
        S1["Signal 1"]
        S2["Signal 2"]
        S3["Signal N"]
    end

    subgraph Observer["Step 1: Observer"]
        OBS["ObserverAgent"]
        OBS_OUT["observation_summary<br/>key_facts[]<br/>timeline[]"]
    end

    subgraph Classifier["Step 2: Classifier"]
        CLS["ClassifierAgent"]
        CLS_OUT["hypotheses[]<br/>- event_type<br/>- likelihood<br/>- reasoning"]
    end

    subgraph Skeptic["Step 3: Skeptic"]
        SKP["SkepticAgent"]
        SKP_OUT["source_breakdown<br/>inconsistencies[]<br/>confidence_adjustment<br/>risk_of_false_positive"]
    end

    subgraph Synthesizer["Step 4: Synthesizer"]
        SYN["SynthesizerAgent"]
        SYN_OUT["final_classification<br/>severity<br/>confidence_score<br/>summary"]
    end

    subgraph Action["Step 5: Action"]
        ACT["ActionAgent"]
        ACT_OUT["action: alert|monitor|dismiss<br/>reasoning"]
    end

    S1 & S2 & S3 --> OBS
    OBS --> OBS_OUT --> CLS
    CLS --> CLS_OUT --> SKP
    SKP --> SKP_OUT --> SYN
    SYN --> SYN_OUT --> ACT
    ACT --> ACT_OUT

    ACT_OUT -->|alert| CREATE["Create/Update Incident"]
    ACT_OUT -->|monitor| WATCH["Add to Watch List"]
    ACT_OUT -->|dismiss| IGNORE["Mark as Noise"]
```

### Agent Reference

| Agent | Model | Type | Role & Logic |
|-------|-------|------|--------------|
| **SignalEnrichmentAgent** | `gemini-2.5-flash` | Ingestion | **Triage & Geocoding**. Process raw signals in batches. <br>• Infers `{City}, {Province}` from unstructured text.<br>• Rejects signals outside Indonesia.<br>• Assigns initial severity score. |
| **VideoAnalysisAgent** | `gemini-2.5-flash` | Ingestion | **TikTok Analyst**. Analyzes video content + captions.<br>• Multimodal check: Does visual match text?<br>• Freshness check: Is this old footage being reposted?<br>• Location check: Must be in Indonesia. |
| **NewsAnalysisAgent** | `gemini-2.5-flash` | Ingestion | **News Analyst**. Filters RSS feeds.<br>• Distinguishes active disasters from prevention articles/history.<br>• Extracts specific location and time.<br>• Rejects international news. |
| **UserReportAnalysisAgent** | `gemini-3-pro` | Ingestion | **Forensic Analyst**. Validates user submissions.<br>• Checks EXIF metadata consistency (GPS/Time).<br>• Detects "fake" or "spam" reports.<br>• Multimodal analysis of user upload media. |
| **ObserverAgent** | `gemini-2.5-flash` | Reasoning | **The Eye**. Step 1 of Reasoning Chain.<br>• Reads raw signals (text/images).<br>• Extracts objective facts only (timeline, casualty counts).<br>• No speculation allowed. |
| **ClassifierAgent** | `gemini-3-pro` | Reasoning | **The Theorist**. Step 2 of Reasoning Chain.<br>• Proposes multiple hypotheses based on facts (e.g., "Flood" vs "Puddle").<br>• Assigns likelihood scores.<br>• Restricted to Indonesian event types. |
| **SkepticAgent** | `gemini-3-pro` | Reasoning | **The Critic**. Step 3 of Reasoning Chain.<br>• Challenges hypotheses.<br>• Checks source diversity (Bio-verification).<br>• Penalizes single-source or viral-only reports.<br>• Explicitly demotes out-of-region events. |
| **SynthesizerAgent** | `gemini-3-pro` | Reasoning | **The Judge**. Step 4 of Reasoning Chain.<br>• Weighs hypotheses vs critiques.<br>• Produces final classification and confidence score.<br>• Generates user-facing summaries. |
| **ActionAgent** | `gemini-3-pro` | Reasoning | **The Strategist**. Step 5 of Reasoning Chain.<br>• Decides system action based on confidence threshold (0.6).<br>• `CREATE_INCIDENT`: High confidence, new event.<br>• `MERGE_INCIDENT`: Matches existing active incident.<br>• `WAIT`: Insufficient data.<br>• `DISMISS`: Benign/Noise. |
| **LocationMatcherAgent** | `gemini-2.5-flash` | Utility | **Fuzzy Geospatial Matcher**.<br>• Compares two location strings (e.g. "Jaksel" vs "Jakarta Selatan").<br>• Determines if they refer to the same incident cluster. |
| **IncidentResolutionAgent** | `gemini-2.5-flash` | Utility | **Cleanup Crew**.<br>• Analyzes stale incidents (no updates > 6h).<br>• Determines if safe to resolve/close. |
| **GuideAssistantAgent** | `gemini-3-pro` | Utility | **Safety Guide**.<br>• RAG-based safety advice.<br>• Context-aware answers based on active incident. |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL with PostGIS (via Supabase)
- Redis (for BullMQ queues)

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/your-org/disaster-pulse.git
   cd disaster-pulse
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy example files
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local

   # Edit with your credentials
   ```

3. **Start Development Servers**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

---

## Environment Variables

### API (`apps/api/.env`)

```env
# Server
PORT=3001

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI / LLM (Gemini)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_BASE_URL=https://api.maiarouter.ai/v1
GEMINI_FLASH_MODEL=maia/gemini-2.5-flash
GEMINI_PRO_MODEL=maia/gemini-3-pro-preview

# Google Maps (Geocoding)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Cloudflare R2 (Media Storage)
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=disaster-media
R2_PUBLIC_URL=https://media.yourdomain.com

# Firebase (Notifications & Remote Config)
FIREBASE_SERVICE_ACCOUNT_BASE64=base64-encoded-service-account-json
FIREBASE_PROJECT_ID=your-firebase-project-id

# Redis (BullMQ Queues)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Web (`apps/web/.env.local`)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Supabase (Client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Firebase (Client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# Feature Flags
NEXT_PUBLIC_FEATURE_USER_REPORTS=true

# Admin Access
ADMIN_EMAIL_WHITELIST=admin@example.com
```

---

## API Endpoints

### Core Resources
- **Incidents**
  - `GET /incidents/map` - Viewport clustering (bbox)
  - `GET /incidents/nearby` - Geospatial radius search
  - `GET /incidents/:id` - Full incident details
  - `GET /incidents/:id/signals` - Raw signals clustering to incident
  - `GET /incidents/:id/lifecycle` - Incident status history
- **Reports**
  - `POST /reports` - Submit user report (multipart w/ images/video)
  - `GET /reports/user/:userId` - History of user submissions
- **Guides**
  - `GET /guides` - Disaster safety guides (filterable)
  - `POST /guides/ask` - AI Safety Assistant (RAG-based Q&A)
- **Users**
  - `POST /users/sync` - Sync Supabase Auth profile
  - `POST /user/places` - Create monitored location
  - `PATCH /user/places/:id/notifications` - Toggle alerts for location

### Admin & Internal
- **Dashboard**
  - `GET /admin/stats` - System-wide metrics
  - `GET /admin/incidents` - Incident management table
  - `GET /admin/signals` - Raw signal inspector
  - `GET /admin/evaluations` - AI reasoning logs
- **Demo Tools**
  - `POST /admin/demo/seed` - Inject fake disaster scenarios
  - `POST /admin/demo/reset` - Wipes database

### System
- **Notifications**
  - `POST /notifications/subscribe` - Register FCM token
- **Emergency Contacts**
  - `GET /emergency-contacts` - Localized emergency numbers

---

## Key Modules

### Application Modules
| Module | Description |
|--------|-------------|
| `IncidentsModule` | Core logic for clustering and lifecycle management |
| `SignalsModule` | Raw data ingestion and normalization |
| `ReasoningModule` | Helper module for AI Agent orchestration |
| `ReportsModule` | User report handling and verification |
| `GuidesModule` | RAG-based safety guide system |
| `UsersModule` | User profile and preferences management |
| `UserPlacesModule` | Saved locations and geofencing logic |

### Infrastructure Modules
| Module | Description |
|--------|-------------|
| `DatabaseModule` | Supabase / PostgreSQL connection |
| `QueueModule` | BullMQ job processing configuration |
| `UploadModule` | Cloudflare R2 media storage |
| `NotificationsModule` | Firebase Cloud Messaging wrapper |
| `SseModule` | Server-Sent Events for real-time updates |

### Ingestion Source Modules
| Module | Description |
|--------|-------------|
| `BmkgModule` | Earthquake/Tsunami API poller |
| `TiktokModule` | Social media video scraper |
| `RssModule` | News feed aggregator |

---

## License

MIT
