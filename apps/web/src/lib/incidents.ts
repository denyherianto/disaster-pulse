export const INCIDENT_CONFIG = {
    flood: {
        icon: 'flood',
        color: 'blue',
        classes: {
            feed: 'bg-blue-50 border-blue-100 text-blue-500',
            header: 'bg-blue-500',
            mapMarker: 'bg-blue-500'
        }
    },
    earthquake: {
        icon: 'earthquake',
        color: 'amber',
        classes: {
            feed: 'bg-amber-50 border-amber-100 text-amber-500',
            header: 'bg-amber-500',
            mapMarker: 'bg-amber-500'
        }
    },
    fire: {
        icon: 'local_fire_department',
        color: 'red',
        classes: {
            feed: 'bg-red-50 border-red-100 text-red-500',
            header: 'bg-red-500',
            mapMarker: 'bg-red-500'
        }
    },
    landslide: {
        icon: 'landslide',
        color: 'orange',
        classes: {
            feed: 'bg-orange-50 border-orange-100 text-orange-500',
            header: 'bg-orange-500',
            mapMarker: 'bg-orange-500'
        }
    },
    volcano: {
        icon: 'volcano',
        color: 'rose',
        classes: {
            feed: 'bg-rose-50 border-rose-100 text-rose-500',
            header: 'bg-rose-500',
            mapMarker: 'bg-rose-500'
        }
    },
    default: {
        icon: 'warning',
        color: 'slate',
        classes: {
            feed: 'bg-slate-50 border-slate-100 text-slate-400',
            header: 'bg-slate-500',
            mapMarker: 'bg-slate-500'
        }
    }
} as const;

export type IncidentType = keyof typeof INCIDENT_CONFIG;

export const getIncidentConfig = (type: string) => {
    // Handle potential mixed case or variations if needed, but assuming strict types for now
    // Fallback to default if type key doesn't exist
    return INCIDENT_CONFIG[type as IncidentType] || INCIDENT_CONFIG.default;
};

export const getIncidentIconName = (type: string) => getIncidentConfig(type).icon;

/**
 * Returns the color classes for different UI contexts
 * @param type Incident type
 * @param context 'feed' | 'header' | 'mapMarker'
 */
export const getIncidentColorClass = (type: string, context: 'feed' | 'header' | 'mapMarker') => {
    return getIncidentConfig(type).classes[context];
};
