'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/components';
import { AlertCircle, ChevronRight, ChevronDown, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

type HeroIncident = {
    id: string;
    type: string;
    city: string;
    severity: 'low' | 'medium' | 'high';
    status: string;
    confidence: number;
    signal_count?: number;
    summary?: string;
}

import { API_BASE_URL } from '@/lib/config';
import { useZone } from '@/components/providers/ZoneProvider';
import ZoneSelector from '@/components/dashboard/ZoneSelector';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function HeroStatus() {
    const { selectedZone } = useZone();
    const { t } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [animPhase, setAnimPhase] = useState<'idle' | 'out' | 'snap'>('idle');
    const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
    const router = useRouter();

    const triggerSlide = (direction: 'next' | 'prev', total: number) => {
        if (animPhase !== 'idle') return;

        const dir = direction === 'next' ? 'left' : 'right';
        setSlideDir(dir);
        setAnimPhase('out');

        setTimeout(() => {
            if (direction === 'next') {
                setCurrentIndex(prev => (prev < total - 1 ? prev + 1 : 0));
            } else {
                setCurrentIndex(prev => (prev > 0 ? prev - 1 : total - 1));
            }

            setAnimPhase('snap');

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setAnimPhase('idle');
                });
            });
        }, 500);
    };

    // Fetch incidents
    const { data: incidents = [], isLoading } = useQuery({
        queryKey: ['hero-incident', selectedZone?.id, 'v2'],
        queryFn: async () => {
            if (selectedZone) {
                // Use new Nearby Endpoint
                const res = await fetch(`${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`);
                if (!res.ok) throw new Error("Failed to fetch nearby");
                const data = await res.json() as HeroIncident[];
                return data.filter(i => ['monitor', 'alert'].includes(i.status.toLowerCase())); 
            } else {
                // Global fallback (viewport centered at 0,0 default or Jakarta)
                const res = await fetch(`${API_BASE_URL}/incidents/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180`);
                if (!res.ok) throw new Error("Failed to fetch hero");
                const all = await res.json() as HeroIncident[];
                // Filter: Only active (monitor/alert)
                const active = all.filter(i => ['monitor', 'alert'].includes(i.status.toLowerCase()));

                // Sort by severity (high > medium > low)
                return active.filter(i => i.severity === 'high').concat(active.filter(i => i.severity !== 'high'));
            }
        },
        enabled: true 
    });

    const activeIncidents = incidents.slice(0, 5); // Limit to top 5
    const currentIncident = activeIncidents[currentIndex];
    const total = activeIncidents.length;

    // Reset index when zone changes
    useEffect(() => setCurrentIndex(0), [selectedZone?.id]); 

    if (isLoading) return (
        <section className="px-6 pt-6 pb-2">
            <Card className="animate-pulse h-48 bg-slate-200 border-none"></Card>
        </section>
    );

    if (!currentIncident) return (
        <section className="px-6 pb-2">
             <Card className="bg-slate-50 border-dashed border-slate-300">
                <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                    <span className="font-medium">{t('dashboard.status.uptodate')}</span>
                    <span className="text-xs">{t('incidentFeed.empty')}</span>
                </div>
             </Card>
        </section>
    );

    const nextIncident = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerSlide('next', total);
    };

    const prevIncident = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerSlide('prev', total);
    };

    // Get translated event type
    const getEventTypeName = (type: string) => {
        const typeKey = type.toLowerCase().replace(' ', '_') as keyof typeof t;
        return t(`common.disasterTypes.${type}` as any) || type.replace('_', ' ');
    };

    return (
        <section className="px-6 py-4 relative">
            <div className="flex items-center justify-between mb-3 px-1 min-h-[28px]">
                <ZoneSelector />

                {total > 1 && (
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-sm z-20">
                        <button
                            onClick={prevIncident}
                            className="p-1 text-slate-400 hover:text-slate-600 active:scale-95 transition-transform"
                        >
                            <ChevronDown className="rotate-90" size={14} />
                        </button>
                        <span className="text-[10px] font-mono text-slate-600 font-medium w-8 text-center select-none">
                            {currentIndex + 1}/{total}
                        </span>
                        <button
                            onClick={nextIncident}
                            className="p-1 text-slate-400 hover:text-slate-600 active:scale-95 transition-transform"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Card Stack Wrapper */}
            <div className="relative">
                {/* Cascading Cards Effect */}
                {total > 1 && (
                    <>
                        <div className="absolute top-2 left-4 right-4 h-full bg-slate-100 rounded-3xl border border-slate-200 shadow-sm transform scale-x-95 -translate-y-1 z-0 opacity-80"></div>
                        <div className="absolute top-3 left-8 right-8 h-full bg-slate-50 rounded-3xl border border-slate-200 shadow-sm transform scale-x-90 -translate-y-2 -z-10 opacity-60"></div>
                    </>
                )}

                <div
                    onClick={() => router.push(`/incidents/${currentIncident.id}`)}
                    className={`relative bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group z-10 
                        cursor-pointer active:scale-[0.99]
                        ${animPhase === 'snap' ? 'transition-none opacity-0' : 'transition-all duration-500 ease-in-out opacity-100'}
                        ${animPhase === 'snap'
                            ? (slideDir === 'left' ? '-translate-x-12 opacity-0' : 'translate-x-12 opacity-0')
                            : ''
                        }
                        ${animPhase === 'out'
                            ? (slideDir === 'left' ? 'translate-x-12' : '-translate-x-12')
                            : ''
                        }
                        ${animPhase === 'idle' ? 'translate-x-0' : ''}
                    `}
                >
                    <div className="relative z-10 p-6 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600">
                                <AlertCircle size={14} />
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                                {t('incidentFeed.alert')}
                            </span>
                        </div>

                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-1 leading-tight capitalize">
                            {getEventTypeName(currentIncident.type)}
                        </h2>
                        <p className="text-slate-500 text-sm mb-2">
                            {currentIncident.city}
                        </p>

                        {/* AI Summary */}
                        {currentIncident.summary && (
                            <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                                {currentIncident.summary}
                            </p>
                        )}
                    </div>

                    {/* Metrics Bar */}
                    <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex gap-4 text-xs text-slate-500">
                            <div title="Confidence Score" className="flex items-center gap-1">
                                <Activity size={12} className={currentIncident.confidence > 0.7 ? 'text-green-500' : 'text-slate-400'} />
                                <span className="font-medium">{Math.round(currentIncident.confidence * 100)}%</span>
                            </div>
                            <div title="Severity" className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${currentIncident.severity === 'high' ? 'bg-red-500' : currentIncident.severity === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />
                                <span className="capitalize">{currentIncident.severity}</span>
                            </div>
                            <div title="User Reports" className="flex items-center gap-1">
                                <span className="font-semibold text-slate-900">{currentIncident.signal_count}</span>
                                <span>{t('incidentDetail.reports')}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] font-medium text-blue-600 uppercase tracking-widest">
                            Details <ChevronRight size={12} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

