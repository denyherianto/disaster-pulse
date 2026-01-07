'use client';

import { useQuery } from '@tanstack/react-query';
import { CloudRain, Zap, MapPin, SlidersHorizontal, Info, Database } from 'lucide-react';

type FeedIncident = {
    id: string;
    type: string;
    city: string;
    severity: string;
    confidence: number;
    lat: number;
    lng: number;
    status: string;
}

import { API_BASE_URL } from '@/lib/config';

// ...

import { useZone } from '@/components/providers/ZoneProvider';

// ...

export default function IncidentFeed() {
    const { selectedZone } = useZone();

    const { data: incidents, isLoading } = useQuery({
        queryKey: ['feed-incidents', selectedZone?.id],
        queryFn: async () => {
            if (selectedZone) {
                const res = await fetch(`${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`);
                if (!res.ok) throw new Error("Failed to fetch feed");
                return res.json() as Promise<FeedIncident[]>;
            } else {
                 const res = await fetch(`${API_BASE_URL}/incidents/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180`);
                 if (!res.ok) throw new Error("Failed to fetch feed");
                 return res.json() as Promise<FeedIncident[]>;
             }
        }
    });

    if (isLoading) return <div className="p-6 text-center text-slate-400 text-sm">Loading feed...</div>;
    if (!incidents || incidents.length === 0) return (
         <div className="space-y-4 px-6 pb-24">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">Recent Alerts</h3>
                <Database className="text-slate-400" size={18} />
            </div>
            <div className="p-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">No cached alerts.</div>
         </div>
    );

    return (
        <section className="mt-6 px-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">Nearby Incidents</h3>
                <SlidersHorizontal className="text-slate-400" size={18} />
            </div>

            <div className="space-y-4">
                {incidents?.map((inc, i) => (
                    <div key={inc.id} className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-transform duration-100 group ${i > 0 ? 'opacity-80' : ''}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className={`mt-1 w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${inc.type === 'flood' ? 'bg-blue-50 border-blue-100 text-blue-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                    {inc.type === 'flood' ? <CloudRain size={20}/> : <Zap size={20}/>}
                                </div>
                                <div>
                                    <h4 className="text-base font-semibold text-slate-900 capitalize">{inc.type.replace('_', ' ')}</h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <MapPin size={12} />
                                            {inc.city || '3.2 mi'}
                                        </span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span>24m ago</span>
                                    </div>
                                </div>
                            </div>
                            {/* Verified Badge for specific items (mock logic for demo) */}
                            {i === 0 && (
                                <div className="flex flex-col items-end gap-1">
                                    <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">Verified</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Trust/Confidence Indicator */}
                        {i === 0 ? (
                            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>
                                        <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white"></div>
                                    </div>
                                    <span className="text-xs text-slate-400">Confirmed by 5 locals</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-blue-600 font-medium cursor-pointer">
                                    Explain
                                    <Info size={12} />
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 flex items-center gap-2">
                                <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-300 w-[40%] rounded-full"></div>
                                </div>
                                <span className="text-xs text-slate-400 font-medium">Low Confidence</span>
                            </div>
                        )}
                    </div>
                ))}

                {/* All Clear Break */}
                <div className="py-4 flex items-center gap-4">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Everything else looks good</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                </div>
            </div>
        </section>
    );
}
