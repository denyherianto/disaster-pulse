'use client';

import { Home, Briefcase, Users, Plus, MapPin, X, Globe } from 'lucide-react';
import { useZone } from '@/components/providers/ZoneProvider';
import { useState } from 'react';
import AddZoneDialog from './AddZoneDialog';
import { useLanguage } from '@/components/providers/LanguageProvider';

// Helper to get icon based on label
const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('home')) return <Home size={12} />;
    if (l.includes('office') || l.includes('work')) return <Briefcase size={12} />;
    if (l.includes('parent') || l.includes('family')) return <Users size={12} />;
    return <MapPin size={12} />;
};

export default function ZoneSelector() {
    const { zones, selectedZoneId, setSelectedZoneId, deleteZone } = useZone();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const { t } = useLanguage();

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Delete this zone?')) {
            deleteZone(id);
        }
    };

  return (
      <>
          <section className="px-6 py-4 overflow-x-auto no-scrollbar">
              <div className="flex gap-3 min-w-max">
                  {/* All Indonesia Option */}
                  <div className="relative group">
                      <button
                          onClick={() => setSelectedZoneId('all')}
                          className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full transition-all duration-200 ${selectedZoneId === 'all'
                              ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-100 ring-offset-1'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                      >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedZoneId === 'all' ? 'bg-slate-700' : 'bg-blue-50 text-blue-600'
                              }`}>
                              <Globe size={12} />
                          </div>
                          <span className="text-xs font-medium capitalize">{t('map.filter.allIndonesia')}</span>
                      </button>
                  </div>

                  {zones.map((zone) => {
                      const isActive = zone.id === selectedZoneId;
                      return (
                          <div key={zone.id} className="relative group">
                              <button
                                  onClick={() => setSelectedZoneId(zone.id)}
                                  className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full transition-all duration-200 ${isActive
                                          ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-100 ring-offset-1'
                                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                              >
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isActive ? 'bg-slate-700' : 'bg-indigo-50 text-indigo-600'
                                      }`}>
                                      {getIcon(zone.label)}
                                  </div>
                                <span className="text-xs font-medium capitalize">{zone.label}</span>
                            </button>

                            {/* Delete Button (visible on hover or if active for MVP ease) */}
                            {isActive && (
                                <button
                                    onClick={(e) => handleDelete(e, zone.id)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    );
                })}

                  {/* Add Zone Button */}
                  <button
                      onClick={() => setIsAddOpen(true)}
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
                  >
                      <Plus size={14} />
                  </button>
              </div>
          </section>

          <AddZoneDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      </>
  );
}
