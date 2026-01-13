# Disaster Pulse

**Disaster Pulse** is a real-time disaster monitoring and intelligence platform for Indonesia. It aggregates data from multiple sources (BMKG, TikTok, News RSS, User Reports) to provide verified, actionable insights.

![Disaster Pulse Splash](/apps/web/public/splash_screen.png)

## System Architecture

The project is a monorepo managed with **Turborepo** and **npm**, consisting of:

- **Web (`apps/web`)**: Next.js 16+ PWA application.
- **API (`apps/api`)**: NestJS backend with event-driven architecture.
- **Shared (`packages/shared`)**: Shared types and utilities.

## Key Features

### Frontend (Web)
- **Real-time Map**: Leaflet-based map with custom clustering and live incident tracking.
- **PWA Support**: Fully offline-capable, installable on mobile devices.
- **Hero Animation**: Interactive dashboard with directional slide animations.
- **Responsive Design**: Mobile-first UI optimized for touch interfaces.

### Backend (API)
- **Multi-Source Ingestion**:
  - **BMKG**: Earthquake and Tsunami data.
  - **RSS Feeds**: News aggregation and analysis.
  - **TikTok**: Social media signal detection.
  - **User Reports**: Crowd-sourced ground truth.
- **AI Analysis**: LLM-based verification and clustering of signals.
- **Event-Driven**: Automated incident lifecycle management.

## Getting Started

### Prerequisites
- Node.js 20+
- npm
- PostgreSQL with PostGIS

### Usage

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm dev
   ```

3. **Build for Production**
   ```bash
   npm build
   ```

## License

MIT
