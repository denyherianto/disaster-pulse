'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import L from 'leaflet';
import { useZone } from '@/components/providers/ZoneProvider';

// Fix Leaflet default icon issue in Next.js/Webpack
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

// Inner component to handle map updates based on context
function MapUpdater() {
    const map = useMap();
    const { selectedZone } = useZone();

    useEffect(() => {
        if (selectedZone) {
            map.flyTo([selectedZone.lat, selectedZone.lng], 13);
        }
    }, [selectedZone, map]);

    return null;
}

export default function IncidentMap() {
    // Default to a broader view or specific location (e.g. Jakarta or generic)
    const [center] = useState<[number, number]>([-6.2088, 106.8456]); // Jakarta coordinates for demo
    const [zoom] = useState(11);
    const [isMounted, setIsMounted] = useState(false);

    const { selectedZone } = useZone();

    // Fetch incidents
    const { data: incidents } = useQuery({
        queryKey: ['map-incidents-leaflet', selectedZone?.id],
        queryFn: async () => {
            if (selectedZone) {
                const res = await fetch(`${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`);
                if (!res.ok) throw new Error('Failed to fetch map incidents');
                return res.json() as Promise<Incident[]>;
            } else {
                const res = await fetch(`${API_BASE_URL}/incidents/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180`);
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
             <MapContainer 
                center={center} 
                zoom={zoom} 
                scrollWheelZoom={false} 
                className="w-full h-full"
                attributionControl={false} // Clean look
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater />
                
                {incidents?.map((inc) => (
                    <Marker key={inc.id} position={[inc.lat, inc.lng]}>
                        <Popup>
                            <div className="text-xs">
                                <strong className="capitalize">{inc.type.replace('_', ' ')}</strong>
                                <br />
                                {inc.city}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
