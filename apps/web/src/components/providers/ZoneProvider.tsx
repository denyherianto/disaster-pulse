'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/components/providers/AuthProvider';

export type Zone = {
    id: string;
    label: string;
    lat: number;
    lng: number;
    radius_m: number;
};

type ZoneContextType = {
    zones: Zone[];
    selectedZoneId: string | null;
    selectedZone: Zone | null;
    setSelectedZoneId: (id: string) => void;
    isLoading: boolean;
    addZone: (payload: { label: string; lat: number; lng: number; radius_m: number }) => Promise<void>;
    deleteZone: (id: string) => Promise<void>;
};

const ZoneContext = createContext<ZoneContextType>({
    zones: [],
    selectedZoneId: null,
    selectedZone: null,
    setSelectedZoneId: () => {},
    isLoading: false,
    addZone: async () => {},
    deleteZone: async () => {},
});

export const useZone = () => useContext(ZoneContext);

export default function ZoneProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user } = useAuth();

    // 1. Fetch Zones
    const { data: zones = [], isLoading } = useQuery({
        queryKey: ['user-zones', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const res = await fetch(`${API_BASE_URL}/user/places?user_id=${user.id}`);
             if (!res.ok) {
                 // Fallback if backend is empty or fails, return empty list or mock default
                 return [];
             }
             return res.json() as Promise<Zone[]>;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    // 2. State for Selection
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

    // 3. Hydrate from LocalStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = window.localStorage.getItem('vigilant_selected_zone');
            if (saved) {
                setSelectedZoneId(saved);
            }
        }
    }, []);

    // 4. Auto-select first zone if none selected and zones exist
    useEffect(() => {
        if (!selectedZoneId && zones.length > 0) {
            setSelectedZoneId(zones[0].id);
        }
    }, [zones, selectedZoneId]);

    // 5. Persist Selection
    const handleSetZone = (id: string) => {
        setSelectedZoneId(id);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('vigilant_selected_zone', id);
        }
    };

    const selectedZone = zones.find(z => z.id === selectedZoneId) || null;

    // Mutation: Add Zone
    const addZone = async (payload: Omit<Zone, 'id' | 'user_id'>) => {
        if (!user?.id) return;
        try {
            const res = await fetch(`${API_BASE_URL}/user/places`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, user_id: user.id })
            });
            if (!res.ok) {
                const err = await res.json();
                console.error('Create Zone Failed', err);
                throw new Error(err.message || 'Failed to create zone');
            }
            // Invalidate/Refetch
            // For MVP simpler to just reload page or rely on react-query invalidation if we had access to queryClient here.
            // But we can just use window.location.reload() for now or assume parent re-renders if we used queryClient.invalidate.
            // Better: use queryClient.invalidateQueries
            window.location.reload(); 
        } catch (error) {
            console.error(error);
        }
    };

    // Mutation: Delete Zone
    const deleteZone = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/user/places/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete zone');
            if (selectedZoneId === id) {
                setSelectedZoneId(null);
                router.push('/'); // Fallback to Home
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <ZoneContext.Provider value={{ zones, selectedZoneId, selectedZone, setSelectedZoneId: handleSetZone, isLoading, addZone, deleteZone }}>
            {children}
        </ZoneContext.Provider>
    );
}

