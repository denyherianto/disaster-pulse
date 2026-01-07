'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/components';
import { AlertCircle, ChevronRight, Users, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

type HeroIncident = {
    id: string;
    type: string;
    city: string;
    severity: string;
    status: string;
}

import { API_BASE_URL } from '@/lib/config';

// ...

import { useZone } from '@/components/providers/ZoneProvider';

// ...

export default function HeroStatus() {
    const { selectedZone } = useZone();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Fetch incidents
    const { data: incidents = [], isLoading } = useQuery({
        queryKey: ['hero-incident', selectedZone?.id],
        queryFn: async () => {
            if (selectedZone) {
                // Use new Nearby Endpoint
                const res = await fetch(`${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`);
                if (!res.ok) throw new Error("Failed to fetch nearby");
                return res.json() as Promise<HeroIncident[]>;
            } else {
                // Global fallback (viewport centered at 0,0 default or Jakarta)
                const res = await fetch(`${API_BASE_URL}/incidents/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180`);
                if (!res.ok) throw new Error("Failed to fetch hero");
                const all = await res.json() as HeroIncident[];
            // Sort by severity (high > medium > low)
                return all.filter(i => i.severity === 'high').concat(all.filter(i => i.severity !== 'high'));
            }
        },
        enabled: true 
    });

    const activeIncidents = incidents.slice(0, 5); // Limit to top 5
    const currentIncident = activeIncidents[currentIndex];
    const total = activeIncidents.length;

    // Reset index when zone changes
    // useEffect(() => setCurrentIndex(0), [selectedZone?.id]); 

    if (isLoading) return (
        <section className="px-6 pt-6 pb-2">
            <Card className="animate-pulse h-48 bg-slate-200 border-none"></Card>
        </section>
    );

    if (!currentIncident) return (
        <section className="px-6 pb-2">
             <Card className="bg-slate-50 border-dashed border-slate-300">
                <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                    <span className="font-medium">All systems normal</span>
                    <span className="text-xs">No active incidents detected.</span>
                </div>
             </Card>
        </section>
    );

    const handleVerify = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVerified(true);
        setTimeout(() => setIsVerified(false), 3000);
    };

    const nextIncident = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex < total - 1) setCurrentIndex(prev => prev + 1);
        else setCurrentIndex(0); // Loop
    };

    const prevIncident = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
        else setCurrentIndex(total - 1); // Loop
    };

    return (
        <section className="px-6 pb-2 relative">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                    <Users size={12} />
                    <span className="text-xs font-medium truncate max-w-[120px]">
                        {selectedZone ? selectedZone.label : 'Global Monitoring'}
                    </span>
                </div>

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
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="relative bg-white rounded-3xl p-6 shadow-sm border border-slate-200 overflow-hidden group z-10 transition-all duration-300 cursor-pointer"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600">
                                <AlertCircle size={14} />
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                                Advisory
                            </span>
                        </div>

                        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2 leading-tight capitalize animate-in fade-in slide-in-from-right-4 duration-300" key={currentIncident.id}>
                            {currentIncident.type.replace('_', ' ')} detected.
                        </h2>
                        <p className="text-slate-500 leading-relaxed text-base">
                            Reported near <span className="text-slate-900 font-medium">{currentIncident.city}</span>.
                        </p>

                        {/* Expandable Actions */}
                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] mt-0 opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600">
                                    <h4 className="font-semibold text-slate-900 mb-2">Recommended Actions</h4>
                                    <ul className="list-disc list-inside space-y-1 ml-1">
                                        <li>Stay indoors using safe room procedures.</li>
                                        <li>Monitor local radio for updates.</li>
                                        <li>Prepare emergency kit.</li>
                                    </ul>

                                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                                        <button
                                            onClick={handleVerify}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isVerified
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            {isVerified ? (
                                                <>
                                                    <CheckCircle2 size={12} />
                                                    Verified
                                                </>
                                            ) : (
                                                'Verify Incident'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Accordion Toggle */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-700">Offline Procedures</span>
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Downloaded</span>
                            </div>
                            {isExpanded ? <ChevronDown className="text-slate-400" size={18} /> : <ChevronRight className="text-slate-400" size={18} />}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
