import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CloudRain, Zap, Flame, Mountain, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';

import { useLanguage } from '@/components/providers/LanguageProvider';

type ReportModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

type IncidentType = 'flood' | 'earthquake' | 'fire' | 'landslide' | 'other';

export default function ReportIncidentModal({ isOpen, onClose }: ReportModalProps) {
    const { t } = useLanguage();
    const [eventType, setEventType] = useState<IncidentType | null>(null);
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const detectLocation = () => {
        setIsLocating(true);
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported');
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsLocating(false);
            },
            (error) => {
                console.error('Geolocation Error:', error);
                let msg = 'Unable to retrieve location';
                if (error.code === 1) msg = 'Location permission denied';
                else if (error.code === 2) msg = 'Position unavailable (try retrying)';
                else if (error.code === 3) msg = 'Location request timed out';
                
                setLocationError(msg);
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    // Get location on open
    useEffect(() => {
        if (isOpen && !location) {
            detectLocation();
        }
    }, [isOpen]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to submit report');
            }
            return res.json();
        },
        onSuccess: () => {
            // Reset and close
            setEventType(null);
            setDescription('');
            onClose();
            // Optionally trigger a toast or refresh
            alert('Report submitted successfully! Thank you for your help.');
        },
        onError: (err) => {
            alert(`Error: ${err.message}`);
        }

    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventType || !description || !location) return;

        mutation.mutate({
            user_id: '00000000-0000-0000-0000-000000000000', // Hardcoded for now per requirements
            event_type: eventType,
            description,
            lat: location.lat,
            lng: location.lng,
            confidence: 'direct_observation' // Default for user reports
        });
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-slate-900">{t('report.title')}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Location Status */}
                    <div className="flex items-center gap-2 text-sm">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${location ? 'bg-green-100 text-green-600' : locationError ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                        </div>
                        <div className="flex-1">
                            {isLocating ? (
                                <p className="text-slate-500">{t('report.location.detecting')}</p>
                            ) : locationError ? (
                                <div className="flex items-center gap-2">
                                    <p className="text-red-500 font-medium">{locationError}</p>
                                    <button 
                                        type="button" 
                                        onClick={detectLocation}
                                        className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md text-slate-600 transition-colors"
                                    >
                                            {t('common.retry')}
                                    </button>
                                </div>
                            ) : (
                                        <p className="text-green-600 font-medium">{t('report.location.detected')}</p>
                            )}
                            {location && <p className="text-[10px] text-slate-400 font-mono">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>}
                        </div>
                    </div>

                    {/* Incident Type Grid */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('report.selectType')}</label>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { id: 'flood', icon: CloudRain, label: 'Flood', color: 'blue' },
                                { id: 'fire', icon: Flame, label: 'Fire', color: 'red' },
                                { id: 'earthquake', icon: Zap, label: 'Quake', color: 'amber' },
                                { id: 'landslide', icon: Mountain, label: 'Slide', color: 'orange' },
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setEventType(type.id as IncidentType)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                        eventType === type.id 
                                            ? `bg-${type.color}-50 border-${type.color}-500 ring-1 ring-${type.color}-500` 
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`${eventType === type.id ? `text-${type.color}-600` : 'text-slate-500'}`}>
                                        <type.icon size={24} />
                                    </div>
                                    <span className={`text-[10px] font-medium ${eventType === type.id ? `text-${type.color}-700` : 'text-slate-600'}`}>
                                        {type.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('report.description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('report.descriptionPlaceholder')}
                            className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-slate-50"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!eventType || !description || !location || mutation.isPending}
                        className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {mutation.isPending ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {t('report.submitting')}
                            </>
                        ) : (
                                t('report.submit')
                        )}
                    </button>
                    {!location && !isLocating && !locationError && (
                        <p className="text-[10px] text-center text-slate-400">{t('report.location.required')}</p>
                    )}
                </form>
            </div>
        </div>,
        document.body
    );
}
