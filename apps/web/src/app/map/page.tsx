'use client';

import dynamic from 'next/dynamic';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import BottomNav from '@/components/navigation/BottomNav';

const IncidentMap = dynamic(() => import('@/components/map/IncidentMap'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">Loading Map...</div>
});

export default function MapPage() {
    return (
        <>
            <div className="shrink-0 bg-white z-20 relative">
                <DashboardHeader />
            </div>

            <div className="flex-1 relative bg-slate-100 overflow-hidden">
                <IncidentMap />
            </div>

            <BottomNav />
        </>
    );
}
