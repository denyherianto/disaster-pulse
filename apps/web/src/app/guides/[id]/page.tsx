'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CloudRain, Zap, Flame, Mountain, ChevronLeft, Download, CheckCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import BottomNav from '@/components/navigation/BottomNav';
import { API_BASE_URL } from '@/lib/config';

// Mock guide data
const mockGuides: Record<string, any> = {
    '1': {
        id: '1',
        title: 'Flood Safety Guide',
        description: 'Essential steps to stay safe during flood events',
        disaster_type: 'flood',
        content: `## Before a Flood
- Know your area's flood risk
- Prepare an emergency kit with food, water, medications
- Create an evacuation plan with your family
- Keep important documents in waterproof containers

## During a Flood
- Move to higher ground immediately if you see rising water
- Never walk or drive through flood waters
- Stay away from power lines and electrical wires
- Listen to emergency broadcasts for updates

## After a Flood
- Return home only when authorities say it is safe
- Clean and disinfect everything that got wet
- Throw away food that has come into contact with flood water
- Watch out for hazards like weakened walls or contaminated water`,
        pdf_url: null,
    },
    '2': {
        id: '2',
        title: 'Earthquake Safety Guide',
        description: 'What to do before, during, and after an earthquake',
        disaster_type: 'earthquake',
        content: `## Before an Earthquake
- Secure heavy furniture to walls
- Identify safe spots in each room (under sturdy tables, against interior walls)
- Create an emergency kit
- Practice DROP, COVER, and HOLD ON drills

## During an Earthquake
- DROP to your hands and knees
- Take COVER under a sturdy desk or table
- HOLD ON until shaking stops
- If outdoors, move away from buildings and power lines

## After an Earthquake
- Check yourself and others for injuries
- Be prepared for aftershocks
- Inspect your home for damage before entering
- Turn off gas if you smell a leak`,
        pdf_url: null,
    },
    '3': {
        id: '3',
        title: 'Fire Emergency Guide',
        description: 'Steps to take during fire emergencies',
        disaster_type: 'fire',
        content: `## Prevention
- Install smoke detectors on every floor
- Never leave cooking unattended
- Keep flammable items away from heat sources
- Have fire extinguishers accessible

## During a Fire
- Alert everyone in the building and get out immediately
- Crawl low under smoke
- Feel doors before opening - if hot, don't open
- Use stairs, never elevators

## After Escaping
- Call emergency services immediately
- Never go back inside a burning building
- Meet at your designated meeting spot
- Get medical attention if needed`,
        pdf_url: null,
    },
    '4': {
        id: '4',
        title: 'Landslide Safety Guide',
        description: 'How to prepare for and survive landslides',
        disaster_type: 'landslide',
        content: `## Warning Signs
- Changes in landscape patterns
- Unusual sounds like cracking trees or boulders knocking
- Increased water flow in streams

## During a Landslide
- Move away from the path of the landslide
- If escape is impossible, curl into a tight ball and protect your head
- Stay alert for additional slides

## After a Landslide
- Stay away from the affected area
- Check for injured or trapped persons without entering the slide area
- Report broken utility lines`,
        pdf_url: null,
    },
    '5': {
        id: '5',
        title: 'Emergency Kit Checklist',
        description: 'Items to prepare for any disaster',
        disaster_type: 'general',
        content: `## Essential Items
- Water (1 gallon per person per day for 3 days)
- Non-perishable food (3-day supply)
- Battery-powered radio
- Flashlight and extra batteries
- First aid kit
- Whistle to signal for help

## Documents
- Copies of important documents in waterproof container
- Cash in small denominations
- Emergency contact list

## Personal Items
- Medications (7-day supply)
- Glasses or contact lenses
- Blankets or sleeping bags
- Change of clothes
- Personal hygiene items`,
        pdf_url: null,
    },
};

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
        case 'flood': return 'bg-blue-500';
        case 'earthquake': return 'bg-amber-500';
        case 'fire': return 'bg-red-500';
        case 'landslide': return 'bg-orange-500';
        default: return 'bg-slate-500';
    }
};

export default function GuideDetailPage() {
    const params = useParams();
    const guideId = params.id as string;
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Fetch guide from API (fallback to mock)
    const { data: guide, isLoading } = useQuery({
        queryKey: ['guide', guideId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/guides/${guideId}`);
            if (!res.ok) return mockGuides[guideId] || null;
            return res.json();
        },
    });

    const handleDownload = async () => {
        setIsDownloading(true);
        
        // Simulate download and save to localStorage
        try {
            const guideData = guide || mockGuides[guideId];
            if (guideData) {
                // Save to localStorage for offline access
                const savedGuides = JSON.parse(localStorage.getItem('savedGuides') || '{}');
                savedGuides[guideId] = {
                    ...guideData,
                    downloadedAt: new Date().toISOString(),
                };
                localStorage.setItem('savedGuides', JSON.stringify(savedGuides));
                setIsDownloaded(true);
            }
        } catch (e) {
            console.error('Download failed:', e);
        } finally {
            setIsDownloading(false);
        }
    };

    // Check if already downloaded
    useState(() => {
        try {
            const savedGuides = JSON.parse(localStorage.getItem('savedGuides') || '{}');
            if (savedGuides[guideId]) {
                setIsDownloaded(true);
            }
        } catch (e) {}
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    const guideData = guide || mockGuides[guideId];

    if (!guideData) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-slate-400 mb-4">Guide not found</div>
                    <Link href="/guides" className="text-blue-600 font-medium">Go back</Link>
                </div>
            </div>
        );
    }

    const IconComponent = getIconByType(guideData.disaster_type);
    const bgColor = getColorByType(guideData.disaster_type);

    return (
        <div className="absolute inset-0 flex flex-col bg-white">
            {/* Header */}
            <div className={`shrink-0 ${bgColor} text-white`}>
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/guides" className="p-2 -ml-2 text-white/80 hover:text-white">
                            <ChevronLeft size={20} />
                        </Link>
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                isDownloaded 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-white text-slate-900 hover:bg-white/90'
                            }`}
                        >
                            {isDownloaded ? (
                                <>
                                    <CheckCircle size={16} />
                                    Saved
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    {isDownloading ? 'Saving...' : 'Save Offline'}
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                            <IconComponent size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{guideData.title}</h1>
                            <p className="text-white/80 text-sm mt-1">{guideData.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white pb-24">
                <div className="px-6 py-6">
                    <div className="prose prose-slate max-w-none">
                        {guideData.content?.split('\n').map((line: string, i: number) => {
                            if (line.startsWith('## ')) {
                                return <h2 key={i} className="text-lg font-semibold text-slate-900 mt-6 mb-3">{line.slice(3)}</h2>;
                            } else if (line.startsWith('- ')) {
                                return <li key={i} className="text-slate-700 ml-4">{line.slice(2)}</li>;
                            } else if (line.trim()) {
                                return <p key={i} className="text-slate-700 mb-2">{line}</p>;
                            }
                            return null;
                        })}
                    </div>
                </div>
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>
        </div>
    );
}
