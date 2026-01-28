# Disaster Pulse - API Service

The backend service for Disaster Pulse, built with **NestJS**. This service handles data ingestion, AI analysis, clustering, and serves the REST API.

## Features

- **Event-Driven Architecture**: Uses `event-emitter` to decouple ingestion, analysis, and notification.
- **Multiple Data Sources**:
  - **BMKG**: Polling service for Earthquake/Tsunami.
  - **TikTok**: Scraper agent to find disaster-related content.
  - **RSS**: News aggregation from reputable sources.
  - **User Reports**: API for crowd-sourced entries with media upload.
- **Intelligent Reasoning**: Multi-agent LLM-based verification and analysis.
- **Clustering**: Spatiotemporal grouping of signals into incidents.

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL + PostGIS (via Supabase)
- **AI**: Gemini 2.5 Flash & Gemini 3 Pro Preview (via MAIA Router)
- **Queues**: BullMQ
- **Storage**: Cloudflare R2

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

---

### 1. Signal Ingestion Flow

Each data source has a specialized agent for initial analysis:

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

#### VideoAnalysisAgent
- **Model**: `gemini-2.5-flash`
- **Input**: Video URL, caption, author, likes, timestamp
- **Output**: event_type, summary, location_inference, confidence_score, severity, is_real_event
- **Multimodal**: Analyzes video frames + text

#### NewsAnalysisAgent
- **Model**: `gemini-2.5-flash`
- **Input**: Article title, content, source, published date
- **Output**: event_type, summary, location, confidence_score, severity

#### UserReportAnalysisAgent
- **Model**: `gemini-3-pro-preview`
- **Input**: Description, event_type, media URL, user location, EXIF data
- **Output**: verified_event_type, authenticity assessment, recommended_action (accept/reject)
- **Features**: EXIF validation, location consistency check, multimodal analysis

---

### 2. Multi-Agent Reasoning Chain

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

#### Agent Roles

| Agent | Model | Role |
|-------|-------|------|
| **ObserverAgent** | gemini-2.5-flash | Extract objective facts from raw signals |
| **ClassifierAgent** | gemini-3-pro | Generate multiple hypotheses with likelihood scores |
| **SkepticAgent** | gemini-3-pro | Challenge hypotheses, identify inconsistencies |
| **SynthesizerAgent** | gemini-3-pro | Produce final judgment from debate |
| **ActionAgent** | gemini-3-pro | Decide system action (alert/monitor/dismiss) |

---

### 3. Utility Agents

```mermaid
flowchart LR
    subgraph LocationMatcher["Location Matching"]
        LM_IN["Location 1: 'Jl. Sudirman, Jakarta Pusat'<br/>Location 2: 'Jakarta'"]
        LM["LocationMatcherAgent"]
        LM_OUT["same_location: true<br/>reason: 'Same city'"]
        LM_IN --> LM --> LM_OUT
    end

    subgraph Resolution["Incident Resolution"]
        IR_IN["Incident with no new signals<br/>for 6+ hours"]
        IR["IncidentResolutionAgent"]
        IR_OUT["should_resolve: true<br/>reason: 'No activity'"]
        IR_IN --> IR --> IR_OUT
    end

    subgraph Guide["Safety Guide Assistant"]
        GA_IN["User Query: 'What to do during earthquake?'"]
        GA["GuideAssistantAgent"]
        GA_OUT["answer: 'Drop, Cover, Hold On...'<br/>sources[]<br/>confidence"]
        GA_IN --> GA --> GA_OUT
    end
```

#### LocationMatcherAgent
- **Purpose**: Compare two location strings to determine if they refer to the same area
- **Use Case**: Prevent merging signals from different cities into one incident
- **Example**: "Jakarta Selatan" ≈ "South Jakarta" → `same_location: true`

#### IncidentResolutionAgent
- **Purpose**: Automatically resolve stale incidents
- **Trigger**: Cron job checks incidents with no new signals for 6+ hours
- **Output**: `should_resolve`, `resolution_reason`, `final_summary`

#### GuideAssistantAgent
- **Purpose**: Answer disaster safety questions
- **Input**: User query + incident context
- **Output**: Safety advice with sources and confidence

---

### 4. Signal Enrichment (Batch)

```mermaid
flowchart LR
    subgraph Batch["Batch Processing (every 60s or 10 signals)"]
        B1["Pending Signals"]
        SE["SignalEnrichmentAgent"]
        B2["Enriched Signals"]
    end

    B1 -->|"Batch of N signals"| SE
    SE -->|"severity, location, event_type"| B2

    subgraph Tools["Available Tools"]
        GEO["geocode_location()<br/>Google Maps API"]
    end

    SE -.->|"Tool Call"| GEO
```

---

## Environment Variables

```env
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI (MAIA Router)
MAIA_API_KEY=xxx

# Google Maps (for geocoding)
GOOGLE_MAPS_API_KEY=xxx

# Cloudflare R2 (media storage)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=disaster-media
R2_PUBLIC_URL=https://media.yourdomain.com

# Firebase (notifications)
FIREBASE_SERVICE_ACCOUNT_BASE64=xxx
FIREBASE_PROJECT_ID=xxx

# Redis (queues)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Key Modules

| Module | Description |
|--------|-------------|
| `SignalsModule` | Ingestion and raw data storage |
| `IncidentsModule` | Incident lifecycle management |
| `ReasoningModule` | AI Agent orchestration |
| `SourcesModule` | External data fetchers (TikTok, RSS, BMKG, Reports) |
| `UploadModule` | Cloudflare R2 file uploads |
| `NotificationsModule` | Firebase push notifications |
| `QueueModule` | BullMQ job processing |

---

## Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

---

## API Endpoints

### Reports
- `POST /reports` - Submit user report (multipart/form-data with media)
- `GET /reports/user/:userId` - Get user's reports

### Incidents
- `GET /incidents` - List all incidents
- `GET /incidents/:id` - Get incident details
- `GET /incidents/sse` - Server-Sent Events for real-time updates

### Guides
- `POST /guides/ask` - Ask safety question to GuideAssistantAgent

---

## License

MIT
