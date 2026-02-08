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
import { usePushNotifications } from '@/hooks/usePushNotifications';
import Link from 'next/link';

export default function DashboardPage() {
    useIncidentDataStream();
    const { isSubscribed, isSupported, permission } = usePushNotifications();

    const showNotificationNotice = isSupported && !isSubscribed;

  return (
      <>
          {/* Scrollable Content Container - Header is now inside here */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-24">

              <DashboardHeader />

              {showNotificationNotice && (
                  <div className="px-4 pt-4">
                      <Link href="/profile/notifications">
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm active:scale-95 transition-transform">
                              <div className="flex items-center gap-3">
                                  <div className="bg-amber-100 p-2 rounded-full">
                                      <Bell className="w-5 h-5 text-amber-600" />
                                  </div>
                                  <div>
                                      <h3 className="font-semibold text-amber-900 text-sm">Enable Notifications</h3>
                                      <p className="text-amber-700 text-xs mt-0.5">Get real-time disaster alerts</p>
                                  </div>
                              </div>
                              <ArrowRight className="w-5 h-5 text-amber-400" />
                          </div>
                      </Link>
                  </div>
              )}

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
