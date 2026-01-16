'use client'

import { useState, useEffect } from 'react';
import { Activity, Radio, Video, Globe, Twitter, AlertTriangle, CheckCircle2, Rss } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

// Fallback mock data if API is empty or fails
const MOCK_LOGS = [
    { text: "Analyzing public social signals...", type: 'scan', source: 'twitter' },
    { text: "Monitoring verified news sources...", type: 'scan', source: 'rss' },
    { text: "Processing sensor data streams...", type: 'info', source: 'api' },
];

export default function LiveIntelligenceTicker() {
    const [logs, setLogs] = useState<any[]>(MOCK_LOGS);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    // Fetch real signals from API
    useEffect(() => {
        const fetchSignals = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/signals/recent`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        const formattedLogs = data.map((signal: any) => ({
                            text: getLogText(signal),
                            type: getLogType(signal),
                            source: getSourceType(signal.source),
                            confidence: signal.raw_payload?.ai_analysis?.urgency_score || null,
                            timestamp: signal.created_at
                        }));
                        
                        // Mix real data with some "scanning" noise for the hackathon feel
                        const mixedLogs = interleaveLogs(formattedLogs, MOCK_LOGS);
                        setLogs(mixedLogs);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch ticker signals", err);
            }
        };

        fetchSignals();
        const poller = setInterval(fetchSignals, 30000); // Poll every 30s
        return () => clearInterval(poller);
    }, []);

    // Rotating logic removed for marquee
    
    // Safety check just in case logs are empty to prevent marquee crash
    if (!logs || logs.length === 0) return null;

    const getIcon = (source: string) => {
        switch (source) {
            case 'twitter': return <Twitter size={12} />;
            case 'video': return <Video size={12} />;
            case 'geo': return <Globe size={12} />;
            case 'rss': return <Rss size={12} />;
            default: return <Activity size={12} />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'alert': return 'text-red-600 font-bold';
            case 'success': return 'text-emerald-600 font-medium';
            case 'error': return 'text-slate-400 line-through';
            case 'ignored': return 'text-slate-400 italic';
            case 'info': return 'text-blue-600';
            default: return 'text-slate-500';
        }
    };

    if (!isVisible) return null;

    return (
        <section className="px-6 my-2"> 
            {/* Ticker Container - Card Style */}
            <div className="w-full bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden h-9 flex items-center relative group">
                
                {/* Left: Indicator (Fixed) */}
                <div className="absolute left-0 z-20 h-full flex items-center px-3 bg-gradient-to-r from-white via-white to-transparent pr-6">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600"></span>
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">
                            LIVE
                        </span>
                    </div>
                </div>

                {/* Center: Marquee Content */}
                <div className="flex-1 overflow-hidden mask-fade-sides">
                    <div className="animate-marquee flex gap-8 pl-[80px]"> {/* Adjusted offset */}
                        {[...logs, ...logs].map((log, i) => (
                            <div key={`log-${i}`} className="flex items-center gap-2 text-xs whitespace-nowrap">
                                <span className="text-slate-400 font-mono text-[10px] tracking-tight">
                                    {new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' })}
                                </span>
                                <span className="text-slate-400">{getIcon(log.source)}</span>
                                {log.confidence ? (
                                    <span className={`${getColor(log.type)} flex items-center gap-1`}>
                                        <span className="font-bold">Gemini:</span>
                                        {log.text}
                                    </span>
                                ) : (
                                        <span className={`${getColor(log.type)} font-medium`}>
                                            {log.text}
                                        </span>
                                )}
                                {log.confidence && (
                                    <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 rounded border border-slate-200">
                                        {Math.round(log.confidence * 100)}%
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Controls (Fixed) */}
                <div className="absolute right-0 z-20 h-full flex items-center px-1.5 bg-gradient-to-l from-white via-white to-transparent pl-6">
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        title="Hide Feed"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

            </div>
        </section>
    );
}

// Helpers
function getLogText(signal: any) {
    const loc = signal.city_hint ? ` in ${signal.city_hint}` : '';
    const aiReason = signal.raw_payload?.ai_analysis?.reason;

    // Handle Rejected/Noise specifically
    if (signal.event_type === 'noise') {
        return `IGNORED: "${aiReason || signal.text}"`;
    }

    const type = (signal.event_type || 'Potential').replace('_', ' ').toUpperCase();
    const prefix = `${type}${loc}`;

    if (aiReason) return `${prefix}: "${aiReason}"`;

    if (signal.event_type && signal.event_type !== 'other') {
        return prefix;
    }
    return `Scanning: ${signal.text?.substring(0, 50)}...`;
}

function getLogType(signal: any) {
    if (signal.event_type === 'noise') return 'ignored';
    if (signal.status === 'processed') return 'success';
    if (signal.status === 'failed') return 'error';
    if (signal.status === 'pending') return 'scan';
    return 'info';
}

function getSourceType(source: string) {
    if (source === 'social_media') return 'twitter';
    if (source === 'news') return 'rss';
    return 'api';
}

function interleaveLogs(real: any[], mock: any[]) {
    const result = [];
    let r = 0, m = 0;
    while (r < real.length || m < mock.length) {
        if (r < real.length) result.push(real[r++]);
        if (m < mock.length) result.push(mock[m++]);
    }
    return result;
}
