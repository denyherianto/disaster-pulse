'use client';

import { ArrowRight, Wind, Check } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the map to avoid SSR issues
const IncidentMap = dynamic(() => import('@/components/map/IncidentMap'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-100 animate-pulse" />
});

import Link from 'next/link';

// ...

export default function LiveMapSnippet() {
    return (
        <section className="mt-8 px-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">Live Radius</h3>
          <Link href="/map" className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
                    Expand Map <ArrowRight size={14} />
          </Link>
            </div>

            <div className="w-full h-48 rounded-2xl border border-slate-200 relative overflow-hidden mask-bottom bg-slate-50">
                {/* Map Component */}
                <div className="absolute inset-0 opacity-100">
                    <IncidentMap
                        showFilter={false}
                        interactive={false}
                        defaultShowMyPlaces={true}
                        zoomLevel={10}
                    />
                </div>

                {/* Decorative Overlay Markers (Visual only, assuming Map has real markers too) */}
                {/* Real map markers are handled by IncidentMap, these are just for the "visual style" if needed, 
                    but since we have a real map, we might rely on that. 
                    However, to match the "UI Reference" exactly, the user might want these specific static-looking indicators
                    layered on top if the map is just a background. 
                    For now, I'll let the React-Leaflet map do the work, effectively replacing the static markers 
                    with real ones. */}
            </div>
        </section>
    );
}
