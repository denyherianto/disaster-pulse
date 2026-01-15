'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CloudRain, Zap, Flame, Mountain, MapPin, ChevronRight, Filter, ChevronLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import { API_BASE_URL } from '@/lib/config';
import { useZone } from '@/components/providers/ZoneProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';

type AlertIncident = {
    id: string;
    type: string;
    city: string;
    severity: string;
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

const DISASTER_TYPES = ['all', 'flood', 'earthquake', 'fire', 'landslide', 'power_outage'];

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

export default function AlertsPage() {
    const { t } = useLanguage();
    const { zones, selectedZone, setSelectedZoneId } = useZone();
    const [typeFilter, setTypeFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const observerRef = useRef<HTMLDivElement>(null);

    // ... (useInfiniteQuery logic remains same)

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        // ... same config
        queryKey: ['alerts', selectedZone?.id, typeFilter],
        queryFn: async ({ pageParam = 0 }) => {
            let url = `${API_BASE_URL}/incidents/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180`;
            
            if (selectedZone) {
                url = `${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch alerts');
            const allData: AlertIncident[] = await res.json();

            // Filter by status and type
            let filtered = allData.filter(inc => ['monitor', 'alert', 'resolved'].includes(inc.status));
            if (typeFilter !== 'all') {
                filtered = filtered.filter(inc => inc.type === typeFilter);
            }

            // Sort by updated_at (Recent Activity)
            filtered.sort((a, b) => {
                const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
                const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
                return timeB - timeA;
            });

            // Paginate
            const PAGE_SIZE = 10;
            const start = pageParam * PAGE_SIZE;
            const paginated = filtered.slice(start, start + PAGE_SIZE);

            return {
                items: paginated,
                nextCursor: start + PAGE_SIZE < filtered.length ? pageParam + 1 : undefined,
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
    });
    
    // ... (observer logic remains same)
    
     // Infinite scroll observer
    const lastItemRef = useCallback((node: HTMLDivElement | null) => {
        if (isFetchingNextPage) return;
        if (observerRef.current) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage) {
                fetchNextPage();
            }
        });

        if (node) observer.observe(node);
    }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

    const allIncidents = data?.pages.flatMap(page => page.items) || [];

    const getDisasterLabel = (type: string) => {
         // @ts-ignore
         return t(`common.disasterTypes.${type}`) || type.replace('_', ' ');
    };

    return (
        <>
            {/* Header */}
            <div className="shrink-0 bg-white z-20 relative border-b border-slate-100">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-lg font-semibold text-slate-900">{t('alerts.title')}</h1>
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 -mr-2 transition-colors ${showFilters ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Filter size={20} />
                        </button>
                    </div>

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="mt-4 space-y-4 pb-2">
                            {/* Place Filter */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">{t('alerts.filter.location')}</label>
                                <select 
                                    value={selectedZone?.id || 'all'}
                                    onChange={(e) => {
                                        setSelectedZoneId(e.target.value);
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">{t('alerts.filter.allLocations')}</option>
                                    {zones.map(zone => (
                                        <option key={zone.id} value={zone.id}>{zone.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Type Filter */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">{t('alerts.filter.type')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {DISASTER_TYPES.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setTypeFilter(type)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                                                typeFilter === type 
                                                    ? 'bg-slate-900 text-white' 
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {getDisasterLabel(type)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                <div className="px-6 py-4 space-y-3">
                    {isLoading ? (
                        <div className="text-center text-slate-400 text-sm py-12">{t('alerts.loading')}</div>
                    ) : allIncidents.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-12 border border-dashed border-slate-200 rounded-2xl">
                            {t('alerts.empty')}
                        </div>
                    ) : (
                        <>
                            {allIncidents.map((inc, index) => {
                                const IconComponent = getIncidentIcon(inc.type);
                                const colorClasses = getIncidentColor(inc.type);
                                const isLast = index === allIncidents.length - 1;

                                return (
                                    <Link key={inc.id} href={`/incidents/${inc.id}`}>
                                        <div 
                                            ref={isLast ? lastItemRef : null}
                                            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm active:scale-[0.99] transition-transform cursor-pointer hover:border-slate-300 hover:shadow-md mb-3"
                                        >
                                            {/* Top Section: Icon, Content, Confidence */}
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClasses.replace('rounded-full', '')}`}>
                                                    <IconComponent size={24} strokeWidth={1.5} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <h4 className="text-lg font-bold text-slate-900 capitalize leading-tight mb-1 truncate pr-2">
                                                            {getDisasterLabel(inc.type)}
                                                        </h4>
                                                        <SignalBars confidence={inc.confidence} />
                                                    </div>

                                                    <div className="text-slate-400 text-sm">
                                                        {timeAgo(inc.updated_at || inc.created_at)} • {inc.city || 'Unknown Location'}
                                                    </div>
                                                </div>
                                            </div>

                                            {(inc.incident_feedback?.filter(f => f.type === 'confirm').length || 0) > 0 && (
                                                <>
                                                    <div className="mt-6"></div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex -space-x-1.5">
                                                            {[...Array(Math.min(3, inc.incident_feedback?.filter(f => f.type === 'confirm').length || 0))].map((_, i) => (
                                                                <div key={i} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold
                                                                    ${['bg-indigo-100 text-indigo-600', 'bg-emerald-100 text-emerald-600', 'bg-slate-100 text-slate-600'][i % 3]}
                                                                `}>
                                                                    {['JD', 'AS', '+'][i % 3]}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <span className="text-slate-400 text-xs">
                                                            Verified by {inc.incident_feedback?.filter(f => f.type === 'confirm').length} people
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        
                            {isFetchingNextPage && (
                                <div className="text-center text-slate-400 text-sm py-4">{t('common.loading')}</div>
                            )}

                            {!hasNextPage && allIncidents.length > 0 && (
                                <div className="py-4 flex items-center gap-4">
                                    <div className="h-px bg-slate-200 flex-1" />
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{t('alerts.endOfList')}</span>
                                    <div className="h-px bg-slate-200 flex-1" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>
        </>
    );
}
