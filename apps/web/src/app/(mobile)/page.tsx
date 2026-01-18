'use client';

import ZoneSelector from '@/components/dashboard/ZoneSelector';
import HeroStatus from '@/components/dashboard/HeroStatus';
import LiveMapSnippet from '@/components/dashboard/LiveMapSnippet';
import IncidentFeed from '@/components/feed/IncidentFeed';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LiveIntelligenceTicker from '@/components/dashboard/LiveIntelligenceTicker';
import { Home, Map as MapIcon, Bookmark, Bell, User, ArrowRight } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { useIncidentDataStream } from '@/hooks/useIncidentDataStream';

export default function DashboardPage() {
    useIncidentDataStream();

  return (
      <>
          {/* Scrollable Content Container - Header is now inside here */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-24">

              <DashboardHeader />

              <HeroStatus />

              <LiveIntelligenceTicker />

              <LiveMapSnippet />

              {/* <IncidentFeed /> */}
        </div>

          {/* Bottom Navigation - remains fixed relative to main container */}
          <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
              <BottomNav />
          </nav>
      </>
  );
}
