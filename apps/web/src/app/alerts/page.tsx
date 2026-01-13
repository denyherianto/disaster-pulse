'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CloudRain, Zap, Flame, Mountain, MapPin, ChevronRight, Filter, ChevronLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import { API_BASE_URL } from '@/lib/config';
import { useZone } from '@/components/providers/ZoneProvider';

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

export default function AlertsPage() {
    const { zones, selectedZone, setSelectedZoneId } = useZone();
    const [typeFilter, setTypeFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const observerRef = useRef<HTMLDivElement>(null);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
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
            let filtered = allData.filter(inc => inc.status === 'monitor' || inc.status === 'alert');
            if (typeFilter !== 'all') {
                filtered = filtered.filter(inc => inc.type === typeFilter);
            }

            // Sort by status (alert first) then severity
            const severityWeight: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 };
            filtered.sort((a, b) => {
                if (a.status === 'alert' && b.status !== 'alert') return -1;
                if (b.status === 'alert' && a.status !== 'alert') return 1;
                return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
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

    return (
        <>
            {/* Header */}
            <div className="shrink-0 bg-white z-20 relative border-b border-slate-100">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-lg font-semibold text-slate-900">All Alerts</h1>
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
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Location</label>
                                <select 
                                    value={selectedZone?.id || 'all'}
                                    onChange={(e) => {
                                        setSelectedZoneId(e.target.value);
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Locations</option>
                                    {zones.map(zone => (
                                        <option key={zone.id} value={zone.id}>{zone.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Type Filter */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Disaster Type</label>
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
                                            {type === 'all' ? 'All Types' : type.replace('_', ' ')}
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
                        <div className="text-center text-slate-400 text-sm py-12">Loading alerts...</div>
                    ) : allIncidents.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-12 border border-dashed border-slate-200 rounded-2xl">
                            No alerts found with current filters.
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
                                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.99] transition-transform cursor-pointer hover:border-slate-300"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-3 items-center">
                                                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${colorClasses}`}>
                                                        <IconComponent size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-semibold text-slate-900 capitalize">{inc.type.replace('_', ' ')}</h4>
                                                            {inc.status === 'alert' && (
                                                                <span className="bg-red-100 text-red-600 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">Alert</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500">
                                                            <MapPin size={12} />
                                                            <span>{inc.city || 'Unknown location'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300" size={20} />
                                            </div>

                                            <div className="mt-3 flex items-center gap-2">
                                                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${inc.confidence >= 0.7 ? 'bg-green-400' : inc.confidence >= 0.4 ? 'bg-amber-400' : 'bg-slate-300'}`}
                                                        style={{ width: `${(inc.confidence || 0.3) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-400 font-medium w-16 text-right">
                                                    {inc.confidence >= 0.7 ? 'High' : inc.confidence >= 0.4 ? 'Medium' : 'Low'}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}

                            {isFetchingNextPage && (
                                <div className="text-center text-slate-400 text-sm py-4">Loading more...</div>
                            )}

                            {!hasNextPage && allIncidents.length > 0 && (
                                <div className="py-4 flex items-center gap-4">
                                    <div className="h-px bg-slate-200 flex-1" />
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">End of list</span>
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
