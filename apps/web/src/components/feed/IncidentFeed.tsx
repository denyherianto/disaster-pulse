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
    incident_feedback?: {
        id: string;
        incident_id: string;
        user_id: string;
        type: 'confirm' | 'reject';
        created_at: string;
    }[];
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

// Helper function for timeAgo - added to ensure syntactical correctness
const timeAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

const SignalBars = ({ confidence }: { confidence: number }) => {
    const percentage = Math.round(confidence * 100);
    const level = confidence > 0.7 ? 3 : confidence > 0.4 ? 2 : 1;

    // Dynamic color based on confidence level
    const getColor = (barIndex: number) => {
        if (barIndex > level) return 'bg-slate-200';
        if (level === 3) return 'bg-emerald-500'; // High - Green
        if (level === 2) return 'bg-amber-500';   // Med - Yellow/Amber
        return 'bg-red-500';                      // Low - Red
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-4">
                {[1, 2, 3].map((bar) => (
                    <div
                        key={bar}
                        className={`w-1 rounded-sm ${getColor(bar)}`}
                        style={{ height: `${bar * 33}%` }}
                    />
                ))}
            </div>
            <span className={`text-xs font-bold ${level === 3 ? 'text-emerald-600' : level === 2 ? 'text-amber-600' : 'text-red-600'}`}>
                {percentage}%
            </span>
        </div>
    );
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
                    // Use a more subtle background for the icon container to match the clean look
                    const colorClasses = getIncidentColor(inc.type).replace('rounded-full', '');
                    const feedbackCount = inc.incident_feedback?.filter(f => f.type === 'confirm').length || 0;
                    const isVerified = inc.confidence > 0.8 || inc.status === 'alert' || feedbackCount >= 2;

                    return (
                        <Link key={inc.id} href={`/incidents/${inc.id}`}>
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm active:scale-[0.99] transition-transform cursor-pointer hover:border-slate-300 hover:shadow-md mb-3">
                                {/* Top Section: Icon, Content, Confidence */}
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClasses}`}>
                                        <IconComponent size={24} strokeWidth={1.5} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <h4 className="text-lg font-bold text-slate-900 capitalize leading-tight mb-1 truncate pr-2">
                                                {inc.type.replace('_', ' ')}
                                            </h4>
                                            <SignalBars confidence={inc.confidence} />
                                        </div>

                                        <div className="text-slate-400 text-sm">
                                            {timeAgo(inc.updated_at || inc.created_at)} • {inc.city || 'Unknown Location'}
                                        </div>
                                    </div>
                                </div>

                                {feedbackCount > 0 && (
                                    <>
                                        <div className="mt-6"></div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-1.5">
                                                {[...Array(Math.min(3, feedbackCount))].map((_, i) => (
                                                    <div key={i} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold
                                                        ${['bg-indigo-100 text-indigo-600', 'bg-emerald-100 text-emerald-600', 'bg-slate-100 text-slate-600'][i % 3]}
                                                    `}>
                                                        {['JD', 'AS', '+'][i % 3]}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-slate-400 text-xs">
                                                Verified by {feedbackCount} people
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
