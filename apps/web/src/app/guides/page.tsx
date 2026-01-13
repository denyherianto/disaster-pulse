'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloudRain, Zap, Flame, Mountain, ChevronLeft, Download, ChevronRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import { API_BASE_URL } from '@/lib/config';

const DISASTER_TYPES = [
    { id: 'all', label: 'All', icon: BookOpen },
    { id: 'flood', label: 'Flood', icon: CloudRain },
    { id: 'earthquake', label: 'Earthquake', icon: Zap },
    { id: 'fire', label: 'Fire', icon: Flame },
    { id: 'landslide', label: 'Landslide', icon: Mountain },
];

// Mock guides data (would come from API)
const mockGuides = [
    {
        id: '1',
        title: 'Flood Safety Guide',
        description: 'Essential steps to stay safe during flood events',
        disaster_type: 'flood',
        pdf_url: null,
    },
    {
        id: '2',
        title: 'Earthquake Safety Guide',
        description: 'What to do before, during, and after an earthquake',
        disaster_type: 'earthquake',
        pdf_url: null,
    },
    {
        id: '3',
        title: 'Fire Emergency Guide',
        description: 'Steps to take during fire emergencies',
        disaster_type: 'fire',
        pdf_url: null,
    },
    {
        id: '4',
        title: 'Landslide Safety Guide',
        description: 'How to prepare for and survive landslides',
        disaster_type: 'landslide',
        pdf_url: null,
    },
    {
        id: '5',
        title: 'Emergency Kit Checklist',
        description: 'Items to prepare for any disaster',
        disaster_type: 'general',
        pdf_url: null,
    },
];

const getIconByType = (type: string) => {
    switch (type) {
        case 'flood': return CloudRain;
        case 'earthquake': return Zap;
        case 'fire': return Flame;
        case 'landslide': return Mountain;
        default: return BookOpen;
    }
};

const getColorByType = (type: string) => {
    switch (type) {
        case 'flood': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'earthquake': return 'bg-amber-50 text-amber-600 border-amber-100';
        case 'fire': return 'bg-red-50 text-red-600 border-red-100';
        case 'landslide': return 'bg-orange-50 text-orange-600 border-orange-100';
        default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
};

export default function GuidesPage() {
    const [typeFilter, setTypeFilter] = useState('all');

    // Fetch guides from API
    const { data: guides = mockGuides, isLoading } = useQuery({
        queryKey: ['guides', typeFilter],
        queryFn: async () => {
            const url = typeFilter === 'all' 
                ? `${API_BASE_URL}/guides` 
                : `${API_BASE_URL}/guides?type=${typeFilter}`;
            const res = await fetch(url);
            if (!res.ok) return mockGuides; // Fallback to mock data
            return res.json();
        },
    });

    const filteredGuides = typeFilter === 'all' 
        ? guides 
        : guides.filter((g: any) => g.disaster_type === typeFilter);

    return (
        <>
            {/* Header */}
            <div className="shrink-0 bg-white z-20 relative border-b border-slate-100">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <Link href="/" className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-lg font-semibold text-slate-900">Safety Guides</h1>
                        <div className="w-8" />
                    </div>

                    {/* Type Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
                        {DISASTER_TYPES.map(type => {
                            const IconComponent = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => setTypeFilter(type.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                        typeFilter === type.id 
                                            ? 'bg-slate-900 text-white' 
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <IconComponent size={16} />
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 pb-24">
                <div className="px-6 py-4">
                    {isLoading ? (
                        <div className="text-center text-slate-400 text-sm py-12">Loading guides...</div>
                    ) : filteredGuides.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-12 border border-dashed border-slate-200 rounded-2xl">
                            No guides found for this category.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredGuides.map((guide: any) => {
                                const IconComponent = getIconByType(guide.disaster_type);
                                const colorClasses = getColorByType(guide.disaster_type);

                                return (
                                    <Link key={guide.id} href={`/guides/${guide.id}`}>
                                        <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-colors cursor-pointer mb-2">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${colorClasses}`}>
                                                    <IconComponent size={22} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-slate-900">{guide.title}</h3>
                                                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{guide.description}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 shrink-0" size={20} />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>
        </>
    );
}
