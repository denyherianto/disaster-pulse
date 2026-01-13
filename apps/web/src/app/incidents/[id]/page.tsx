'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CloudRain, Zap, Flame, Mountain, MapPin, ChevronLeft, ThumbsUp, ThumbsDown, Clock, Phone, FileDown, ExternalLink, AlertTriangle, CheckCircle, Eye, Newspaper, Video, AlarmCheck } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import { API_BASE_URL } from '@/lib/config';

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
        case 'flood': return 'bg-blue-500';
        case 'earthquake': return 'bg-amber-500';
        case 'fire': return 'bg-red-500';
        case 'landslide': return 'bg-orange-500';
        default: return 'bg-slate-500';
    }
};

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'high': return 'bg-red-100 text-red-700';
        case 'medium': return 'bg-amber-100 text-amber-700';
        default: return 'bg-green-100 text-green-700';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'alert': return AlertTriangle;
        case 'resolved': return CheckCircle;
        default: return Eye;
    }
};

export default function IncidentDetailPage() {
    const params = useParams();
    const incidentId = params.id as string;
    const queryClient = useQueryClient();

    // Fetch incident details
    const { data: incident, isLoading } = useQuery({
        queryKey: ['incident', incidentId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}`);
            if (!res.ok) throw new Error('Failed to fetch incident');
            return res.json();
        },
    });

    // Fetch guides for this disaster type
    const { data: guides = [] } = useQuery({
        queryKey: ['guides', incident?.event_type],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/guides?type=${incident?.event_type}`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!incident?.event_type,
    });

    // Fetch emergency contacts
    const { data: contacts = [] } = useQuery({
        queryKey: ['emergency-contacts'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/emergency-contacts`);
            if (!res.ok) return [];
            return res.json();
        },
    });

    // Feedback mutation
    const feedbackMutation = useMutation({
        mutationFn: async (type: 'confirm' | 'reject') => {
            const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: '00000000-0000-0000-0000-000000000000', type }),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
        },
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    if (!incident) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-slate-400 mb-4">Incident not found</div>
                    <Link href="/" className="text-blue-600 font-medium">Go back</Link>
                </div>
            </div>
        );
    }

    const IconComponent = getIncidentIcon(incident.event_type);

    // Use real lifecycle data from API
    // If empty (legacy incidents), fallback to created_at
    const lifecycle = incident.lifecycle?.length > 0 ? incident.lifecycle.map((l: any) => ({
        status: l.to_status,
        time: l.created_at,
        label: l.reason || `Status changed to ${l.to_status}`
    })) : [
        { status: 'detected', time: incident.created_at, label: 'First Detected' },
        { status: incident.status, time: incident.updated_at, label: `Current Status: ${incident.status}` }
    ];

    // Mock signals data (would come from API)  
    const signals = incident.signals || [];

    return (
        <>
            {/* Header */}
            <div className={`shrink-0 ${getIncidentColor(incident.event_type)} text-white`}>
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/" className="p-2 -ml-2 text-white/80 hover:text-white">
                            <ChevronLeft size={20} />
                        </Link>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                            incident.status === 'alert' ? 'bg-white/20' : 'bg-white/10'
                        }`}>
                            {incident.status}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                            <IconComponent size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold capitalize">{incident.event_type?.replace('_', ' ')}</h1>
                            <div className="flex items-center gap-2 text-white/80 mt-1">
                                <MapPin size={14} />
                                <span className="text-sm">{incident.city || 'Unknown location'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold">{Math.round((incident.confidence_score || 0.5) * 100)}%</div>
                            <div className="text-xs text-white/70">Confidence</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <div className={`text-sm font-semibold px-2 py-1 rounded-full inline-block ${getSeverityColor(incident.severity)}`}>
                                {(incident?.severity || 'Medium').toUpperCase()}
                            </div>
                            <div className="text-xs text-white/70 mt-1">Severity</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold">{signals.length}</div>
                            <div className="text-xs text-white/70">Reports</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 pb-24">
                {/* Lifecycle Timeline */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Incident Timeline</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="relative">
                            {lifecycle.map((event, i) => {
                                const StatusIcon = getStatusIcon(event.status);
                                return (
                                    <div key={i} className="flex gap-3 mb-4 last:mb-0">
                                        <div className="relative">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                i === lifecycle.length - 1 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                <StatusIcon size={14} />
                                            </div>
                                            {i < lifecycle.length - 1 && (
                                                <div className="absolute top-8 left-1/2 w-0.5 h-6 bg-slate-200 -translate-x-1/2" />
                                            )}
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <div className="text-sm font-medium text-slate-900">{event.label}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Clock size={10} />
                                                {new Date(event.time).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Feedback Section */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Is this real?</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <p className="text-sm text-slate-600 mb-4">Help us verify this incident by sharing your knowledge</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => feedbackMutation.mutate('confirm')}
                                disabled={feedbackMutation.isPending}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm ${
                                    incident.incident_feedback?.some((f: any) => f.user_id === '00000000-0000-0000-0000-000000000000' && f.type === 'confirm')
                                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                                }`}
                            >
                                <ThumbsUp size={18} />
                                {incident.incident_feedback?.some((f: any) => f.user_id === '00000000-0000-0000-0000-000000000000' && f.type === 'confirm') ? 'Confirmed' : 'Confirm'}
                            </button>
                            <button 
                                onClick={() => feedbackMutation.mutate('reject')}
                                disabled={feedbackMutation.isPending}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm ${
                                    incident.incident_feedback?.some((f: any) => f.user_id === '00000000-0000-0000-0000-000000000000' && f.type === 'reject')
                                    ? 'bg-red-100 text-red-700 border-2 border-red-500'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                                }`}
                            >
                                <ThumbsDown size={18} />
                                {incident.incident_feedback?.some((f: any) => f.user_id === '00000000-0000-0000-0000-000000000000' && f.type === 'reject') ? 'Reported as False' : 'False Alarm'}
                            </button>
                        </div>

                        {/* Feedback Statistics - Only visible after voting */}
                        {incident.incident_feedback?.some((f: any) => f.user_id === '00000000-0000-0000-0000-000000000000') && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                                    <span>Community Verification</span>
                                    <span>{incident.incident_feedback.length} reports</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div 
                                        className="h-full bg-green-500"
                                        style={{ width: `${(incident.incident_feedback.filter((f: any) => f.type === 'confirm').length / incident.incident_feedback.length) * 100}%` }}
                                    />
                                    <div 
                                        className="h-full bg-red-500"
                                        style={{ width: `${(incident.incident_feedback.filter((f: any) => f.type === 'reject').length / incident.incident_feedback.length) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-medium uppercase">
                                    <span className="text-green-600">{incident.incident_feedback.filter((f: any) => f.type === 'confirm').length} Confirmed</span>
                                    <span className="text-red-600">{incident.incident_feedback.filter((f: any) => f.type === 'reject').length} False</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sources Section - Segregated */}
                {(signals.length > 0) && (
                    <div className="px-6 py-4 space-y-6">
                        {/* Reports Count */}
                        {signals.some((s: any) => s.source === 'user_report') && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                        <AlarmCheck size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-blue-900">User Reports</div>
                                        <div className="text-sm text-blue-700">
                                            {signals.filter((s: any) => s.source === 'user_report').length} verified reports
                                        </div>
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {signals.filter((s: any) => s.source === 'user_report').length}
                                </div>
                            </div>
                        )}

                        {/* Recent News */}
                        {signals.some((s: any) => s.source === 'news') && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    {/* <Newspaper size={16} /> */}
                                    Latest News
                                </h3>
                                <div className="space-y-3">
                                    {signals.filter((s: any) => s.source === 'news').map((signal: any) => (
                                        <a 
                                            key={signal.id} 
                                            href={signal.media_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block bg-white rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="font-medium text-slate-900 line-clamp-2 text-sm mb-1">
                                                        {signal.text}
                                                    </h4>
                                                    <div className="text-xs text-slate-500">
                                                        {new Date(signal.created_at).toLocaleDateString()} • Read more
                                                    </div>
                                                </div>
                                                {signal.media_type === 'image' && (
                                                    <div className="w-16 h-16 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={signal.media_url || '/placeholder.png'} alt="News thumbnail" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Social Media - TikTok Previews */}
                        {signals.some((s: any) => s.source === 'social_media' && s.media_type === 'video') && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <Video size={16} />
                                    Live Updates
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {signals.filter((s: any) => s.source === 'social_media' && s.media_type === 'video').slice(0, 4).map((signal: any) => (
                                        <div key={signal.id} className="relative aspect-[9/16] bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
                                             {/* Video Preview (Thumbnail logic or direct embed) */}
                                             {/* Since we don't have real thumbnail generation, we try to use a placeholder or iframe if safe */}
                                            <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-black/40">
                                                <ExternalLink size={24} />
                                            </div>
                                            <a href={signal.media_url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10" />
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                                <div className="text-xs text-white line-clamp-2 font-medium">
                                                    {signal.text}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* User Comments / Feedback List */}
                {/* {incident.incident_feedback && incident.incident_feedback.length > 0 && (
                     <div className="px-6 py-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Community Updates</h3>
                        <div className="space-y-3">
                            {incident.incident_feedback.map((fb: any) => (
                                <div key={fb.id} className="bg-white rounded-xl border border-slate-200 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full ${fb.type === 'confirm' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className={`text-xs font-semibold uppercase ${fb.type === 'confirm' ? 'text-green-700' : 'text-red-700'}`}>
                                            {fb.type === 'confirm' ? 'Confirmed' : 'False Report'}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-auto">{new Date(fb.created_at).toLocaleTimeString().slice(0,5)}</span>
                                    </div>
                                    {fb.comment && <p className="text-sm text-slate-700">{fb.comment}</p>}
                                </div>
                            ))}
                        </div>
                     </div>
                )} */}

                {/* Safety Measures */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Safety Measures</h3>
                    <Link href={`/guides?type=${incident.event_type}`}>
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <div className="font-semibold">View Safety Guide</div>
                                <div className="text-sm text-white/80">Procedures for {incident.event_type?.replace('_', ' ')}</div>
                            </div>
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <FileDown size={20} />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Emergency Contacts */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Emergency Contacts</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        {[
                            { name: 'Police', phone: '110' },
                            { name: 'Fire Department', phone: '113' },
                            { name: 'Ambulance', phone: '118' },
                            { name: 'BNPB', phone: '117' },
                        ].map((contact, i) => (
                            <a 
                                key={contact.phone}
                                href={`tel:${contact.phone}`}
                                className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${
                                    i > 0 ? 'border-t border-slate-100' : ''
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                                        <Phone size={16} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">{contact.name}</div>
                                        <div className="text-sm text-slate-500">{contact.phone}</div>
                                    </div>
                                </div>
                                <div className="text-blue-600">Call</div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>
        </>
    );
}
