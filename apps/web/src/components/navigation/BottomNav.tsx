'use client';

import Link from 'next/link';
import { Home, Map as MapIcon, Bell, User, BookOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        { label: 'Home', icon: Home, path: '/' },
        { label: 'Alerts', icon: Bell, path: '/alerts' },
        { label: 'Map', icon: MapIcon, path: '/map' },
        { label: 'Guides', icon: BookOpen, path: '/guides' },
        { label: 'Profile', icon: User, path: '/profile' }
    ];

    return (
        <nav className="h-20 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 pb-4">
            {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                    <Link 
                        key={item.label}
                        href={item.path}
                        className="flex flex-col items-center gap-1 min-w-[3rem]"
                    >
                        <item.icon 
                            size={24} 
                            className={`transition-colors duration-200 ${
                                active ? 'text-slate-900 stroke-[2.5px]' : 'text-slate-400 stroke-2 group-hover:text-slate-600'
                            }`} 
                        />
                        <span className={`text-[10px] font-medium transition-colors duration-200 ${
                            active ? 'text-slate-900' : 'text-slate-400'
                        }`}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
