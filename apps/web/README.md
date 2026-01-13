# Disaster Pulse - Web Client

The frontend application for Disaster Pulse, built with **Next.js 14+ (App Router)** and **Tailwind CSS**.

## Features

- **PWA Ready**: Works offline with background sync and aggressive caching strategies. installable on mobile.
- **Interactive Maps**: Real-time incident tracking using Leaflet and `react-leaflet-cluster`.
- **Live Updates**: real-time signals from backend (TikTok, News, User Reports).
- **Responsive UI**: Optimized for mobile and desktop viewports.

## Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State/Data**: TanStack Query (React Query) + Persistence
- **Map Integration**: Leaflet, React Leaflet
- **PWA**: `@ducanh2912/next-pwa`

## Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   # NOTE: PWA features are disabled in development
   npm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

3. **Build & Test PWA**
   ```bash
   npm build
   npm start
   ```

## Key Components

- **`IncidentMap`**: Core visualization component. Handles clustering and custom markers.
- **`HeroStatus`**: animated incident highlight card with directional transitions.
- **`DashboardHeader`**: Main navigation and status indicator.

