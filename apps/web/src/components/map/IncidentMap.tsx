'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import L from 'leaflet';
import { useZone } from '@/components/providers/ZoneProvider';
import { renderToString } from 'react-dom/server';
import { CloudRain, Zap, Flame, Mountain, AlertTriangle, Eye } from 'lucide-react';

// Fix Leaflet default icon issue
// We are replacing this with custom icons anyway, but good to keep for fallbacks if needed
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

type Incident = {
    id: string;
    lat: number;
    lng: number;
    type: string;
    severity: 'low' | 'medium' | 'high';
    status: string;
    city?: string;
};

// Indonesia center coordinates
const INDONESIA_CENTER: [number, number] = [-2.5489, 118.0149];
const INDONESIA_ZOOM = 5;

// Helper to create custom markers
const createIncidentIcon = (type: string, severity: string) => {
    let IconComponent = Eye;
    let colorClass = 'bg-slate-500';

    // 1. Determine Icon & Color based on Type
    switch (type) {
        case 'flood':
            IconComponent = CloudRain;
            colorClass = 'bg-blue-500';
            break;
        case 'earthquake':
            IconComponent = Zap;
            colorClass = 'bg-amber-500';
            break;
        case 'fire':
            IconComponent = Flame;
            colorClass = 'bg-red-500';
            break;
        case 'landslide':
            IconComponent = Mountain;
            colorClass = 'bg-orange-500';
            break;
        default:
            IconComponent = AlertTriangle;
            colorClass = 'bg-slate-500';
            break;
    }

    // 2. Render Icon to HTML
    const iconHtml = renderToString(<IconComponent color="white" size={20} />);

    // 3. Create DivIcon
    // We add a 'pulse' effect for high severity
    const isHighSeverity = severity === 'high';

    return L.divIcon({
        className: 'custom-div-icon', // We'll need to ensure this class doesn't override too much or is empty
        html: `
            <div class="${colorClass} w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-lg relative ${isHighSeverity ? 'animate-pulse' : ''}">
                ${iconHtml}
                ${isHighSeverity ? `<span class="absolute -top-1 -right-1 flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>` : ''}
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20], // Center anchor
        popupAnchor: [0, -20]
    });
};

/* 
  NOTE: For L.divIcon to work with Tailwind classes properly, 
  Leaflet's default styles shouldn't interfere too much. 
  Usually divIcon creates a simple div.
  The 'animate-pulse' might not work perfectly inside the map pane due to transforming, 
  but standard transitions usually do.
*/

// Inner component to handle map updates based on context
function MapUpdater({ showMyPlaces, zoomLevel = 13 }: { showMyPlaces: boolean, zoomLevel?: number }) {
    const map = useMap();
    const { selectedZone } = useZone();

    useEffect(() => {
        if (showMyPlaces && selectedZone) {
            map.flyTo([selectedZone.lat, selectedZone.lng], zoomLevel);
        } else {
            // Reset to Indonesia view
            map.flyTo(INDONESIA_CENTER, INDONESIA_ZOOM);
        }
    }, [selectedZone, showMyPlaces, map, zoomLevel]);

    return null;
}

interface IncidentMapProps {
    showFilter?: boolean;
    interactive?: boolean;
    defaultShowMyPlaces?: boolean;
    zoomLevel?: number;
}

export default function IncidentMap({
    showFilter = true,
    interactive = true,
    defaultShowMyPlaces = false,
    zoomLevel = 13
}: IncidentMapProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [showMyPlaces, setShowMyPlaces] = useState(defaultShowMyPlaces);

    const { selectedZone, zones } = useZone();

    // Fetch incidents
    const { data: incidents } = useQuery({
        queryKey: ['map-incidents-leaflet', showMyPlaces ? selectedZone?.id : 'all'],
        queryFn: async () => {
            if (showMyPlaces && selectedZone) {
                const res = await fetch(`${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`);
                if (!res.ok) throw new Error('Failed to fetch map incidents');
                return res.json() as Promise<Incident[]>;
            } else {
                // Fetch all Indonesia incidents (bounded by Indonesia coordinates)
                const res = await fetch(`${API_BASE_URL}/incidents/map?minLat=-11&maxLat=6&minLng=95&maxLng=141`);
                if (!res.ok) throw new Error('Failed to fetch map incidents');
                return res.json() as Promise<Incident[]>;
            }
        }
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">Loading Map...</div>;

    return (
        <div className="w-full h-full relative z-0">
            {/* Filter Toggle */}
            {showFilter && (
                <div className="absolute top-4 right-4 z-[1000] bg-white rounded-full shadow-lg border border-slate-200 p-1 flex">
                    <button
                        onClick={() => setShowMyPlaces(false)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!showMyPlaces
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        All Indonesia
                    </button>
                    <button
                        onClick={() => setShowMyPlaces(true)}
                        disabled={zones.length === 0}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${showMyPlaces
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            } ${zones.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        My Places
                    </button>
                </div>
            )}

            <MapContainer 
                center={INDONESIA_CENTER}
                zoom={INDONESIA_ZOOM}
                scrollWheelZoom={interactive}
                dragging={interactive}
                zoomControl={interactive}
                doubleClickZoom={interactive}
                touchZoom={interactive}
                boxZoom={interactive}
                keyboard={interactive} 
                className="w-full h-full"
                attributionControl={false}
                maxBounds={interactive ? [[-15, 90], [10, 145]] : undefined} // Indonesia bounds
                minZoom={4}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater showMyPlaces={showMyPlaces} zoomLevel={zoomLevel} />
                
                {incidents?.map((inc) => (
                    <Marker
                        key={inc.id}
                        position={[inc.lat, inc.lng]}
                        icon={createIncidentIcon(inc.type, inc.severity)}
                    >
                        <Popup>
                            <div className="text-xs">
                                <strong className="capitalize text-sm block mb-1">{inc.type.replace('_', ' ')}</strong>
                                <span className="text-slate-500 mb-2 block">{inc.city}</span>

                                <div className="flex gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${inc.status === 'alert' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {inc.status}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-slate-100 text-slate-600">
                                        {inc.severity}
                                    </span>
                                </div>
                                <div className="mt-2 text-[10px] text-blue-600 underline cursor-pointer">
                                    <a href={`/incidents/${inc.id}`}>View Details</a>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
