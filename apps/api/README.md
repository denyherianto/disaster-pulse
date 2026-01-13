# Disaster Pulse - API Service

The backend service for Disaster Pulse, built with **NestJS**. This service handles data ingestion, AI analysis, clustering, and serves the REST API.

## Features

- **Event-Driven Architecture**: Uses `event-emitter` to decouple ingestion, analysis, and notification.
- **Multiple Data Sources**:
  - **BMKG**: Polling service for Earthquake/Tsunami.
  - **TikTok**: Scraper agent to find disaster-related content.
  - **RSS**: News aggregation from reputable sources.
  - **User Reports**: API for crowd-sourced entries.
- **Intelligent Reasoning**: LLM-based verification and entity extraction.
- **Clustering**: Spatiotemporal grouping of signals into incidents.

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL + PostGIS (via Drizzle ORM/Supabase)
- **AI**: Gemini 2.5 Flash & Gemini 3 Pro Preview (via Google AI SDK)
- **Queues**: BullMQ

## Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm start:dev
   ```

## Key Modules

- **`SignalsModule`**: Ingestion and raw data storage.
- **`ClusterModule`**: Grouping logic (DBSCAN-like approach).
- **`IncidentsModule`**: Incident lifecycle management (Draft -> Alert -> Archived).
- **`SourcesModule`**: External data fetchers (TikTok, RSS, BMKG).
- **`ReasoningModule`**: AI Agent logic.
