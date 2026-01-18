'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  AlertTriangle,
  Brain,
  Sparkles,
  Users,
  CheckCircle2,
  History,
  Bell,
  Video,
  Activity,
  ChevronLeft,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/signals', label: 'Signals', icon: Radio },
  { href: '/admin/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/admin/traces', label: 'AI Traces', icon: Brain },
  { href: '/admin/evaluations', label: 'AI Evaluations', icon: Sparkles },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/verifications', label: 'Verifications', icon: CheckCircle2 },
  { href: '/admin/lifecycle', label: 'Lifecycle', icon: History },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/tiktok', label: 'TikTok Posts', icon: Video },
  { href: '/admin/health', label: 'System Health', icon: Activity },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DP</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm">Disaster Pulse</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer - Back to App */}
      <div className="p-3 border-t border-slate-800">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
          <span>Back to App</span>
        </Link>
      </div>
    </aside>
  );
}
