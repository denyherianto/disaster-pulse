'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CloudRain, Zap, Flame, Mountain, MapPin, Database, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type FeedIncident = {
    id: string;
    type: string;
    city: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    lat: number;
    lng: number;
    status: string;
    created_at?: string;
    updated_at?: string;
}

import { API_BASE_URL } from '@/lib/config';
import { useZone } from '@/components/providers/ZoneProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';

// ... (helper functions getIncidentIcon, getIncidentColor unchanged)

const getIncidentIcon = (type: string) => {
    switch (type) {
        case 'flood': return CloudRain;
        case 'earthquake': return Zap;
        case 'fire': return Flame;
        case 'landslide': return Mountain;
        default: return Zap;
    }
};

const getIncidentColor = (type: string) => {
    switch (type) {
        case 'flood': return 'bg-blue-50 border-blue-100 text-blue-500';
        case 'earthquake': return 'bg-amber-50 border-amber-100 text-amber-500';
        case 'fire': return 'bg-red-50 border-red-100 text-red-500';
        case 'landslide': return 'bg-orange-50 border-orange-100 text-orange-500';
        default: return 'bg-slate-50 border-slate-100 text-slate-400';
    }
};

export default function IncidentFeed() {
    const { selectedZone } = useZone();
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    const { data: incidents, isLoading } = useQuery({
        queryKey: ['feed-incidents', selectedZone?.id],
        queryFn: async () => {
            let data: FeedIncident[] = [];
            if (selectedZone) {
                const res = await fetch(`${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`);
                if (!res.ok) throw new Error("Failed to fetch feed");
                data = await res.json();
            } else {
                 const res = await fetch(`${API_BASE_URL}/incidents/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180`);
                 if (!res.ok) throw new Error("Failed to fetch feed");
                data = await res.json();
             }

            // Filter to only show monitor, alert, and resolved status
            const filteredData = data.filter(inc => ['monitor', 'alert', 'resolved'].includes(inc.status));

            // Sort by updated_at/created_at (most recent activity first)
            // This ensures recently resolved incidents show up
            return filteredData
                .sort((a, b) => {
                    const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
                    const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
                    return timeB - timeA;
                })
                .slice(0, 5); // Limit to 5 most recent
        }
    });

    if (isLoading) return <div className="p-6 text-center text-slate-400 text-sm">{t('common.loading')}</div>;
    if (!incidents || incidents.length === 0) return (
         <div className="space-y-4 px-6 pb-24">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">{t('dashboard.recentAlerts')}</h3>
                <Database className="text-slate-400" size={18} />
            </div>
            <div className="p-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">{t('incidentFeed.empty')}</div>
         </div>
    );

    return (
        <section className="mt-6 px-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">{t('dashboard.recentAlerts')}</h3>
                <Link href="/alerts" className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline">
                    {t('incidentFeed.viewAll')}
                    <ChevronRight size={14} />
                </Link>
            </div>

            <div className="space-y-3">
                {incidents?.map((inc) => {
                    const IconComponent = getIncidentIcon(inc.type);
                    const colorClasses = getIncidentColor(inc.type);

                    return (
                        <Link key={inc.id} href={`/incidents/${inc.id}`}>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.99] transition-transform cursor-pointer hover:border-slate-300 mb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-3 items-center">
                                        <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${colorClasses}`}>
                                            <IconComponent size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-base font-semibold text-slate-900 capitalize">{inc.type.replace('_', ' ')}</h4>
                                                {inc.status === 'alert' && (
                                                    <span className="bg-red-100 text-red-600 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">{t('incidentFeed.alert')}</span>
                                                )}
                                                {inc.status === 'resolved' && (
                                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">Resolved</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500">
                                                <MapPin size={12} />
                                                <span>{inc.city || t('incidentFeed.unknownLocation')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-300" size={20} />
                                </div>

                                {/* Confidence indicator */}
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${inc.confidence >= 0.7 ? 'bg-green-400' : inc.confidence >= 0.4 ? 'bg-amber-400' : 'bg-slate-300'}`}
                                            style={{ width: `${(inc.confidence || 0.3) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium w-16 text-right">
                                        {inc.confidence >= 0.7 ? t('incidentFeed.confidence.high') : inc.confidence >= 0.4 ? t('incidentFeed.confidence.medium') : t('incidentFeed.confidence.low')}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
