'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import Link from 'next/link';

interface Incident {
  id: string;
  event_type: string;
  city: string;
  status: string;
  severity: string | null;
  confidence_score: number | null;
  time_start: string;
  time_end: string;
  created_at: string;
  updated_at: string;
  signal_count: number;
  incident_signals: { signal_id: string }[];
  metrics: any;
}

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-incidents', page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      const res = await fetch(`${API_BASE_URL}/admin/incidents?${params}`);
      if (!res.ok) throw new Error('Failed to fetch incidents');
      return res.json();
    },
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      className: 'font-mono text-xs w-24',
      render: (row: Incident) => (
        <Link href={`/incidents/${row.id}`} className="text-blue-600 hover:underline" title={row.id}>
          {row.id.slice(0, 8)}...
        </Link>
      ),
    },
    {
      key: 'event_type',
      header: 'Event Type',
      sortable: true,
      render: (row: Incident) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
          row.event_type === 'flood' ? 'bg-blue-100 text-blue-700' :
          row.event_type === 'earthquake' ? 'bg-orange-100 text-orange-700' :
          row.event_type === 'fire' ? 'bg-red-100 text-red-700' :
          row.event_type === 'landslide' ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {row.event_type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'city',
      header: 'City',
      sortable: true,
      render: (row: Incident) => (
        <span className="text-sm text-slate-700">{row.city}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Incident) => (
        <span className={`text-xs font-bold uppercase tracking-wide ${
          row.status === 'alert' ? 'text-red-600' :
          row.status === 'monitor' ? 'text-amber-600' :
          row.status === 'resolved' ? 'text-green-600' :
          'text-slate-500'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: (row: Incident) => (
        <span className={`w-2 h-2 rounded-full inline-block mr-1 ${
          row.severity === 'high' ? 'bg-red-500' :
          row.severity === 'medium' ? 'bg-amber-500' :
          'bg-green-500'
        }`} />
      ),
    },
    {
      key: 'confidence_score',
      header: 'Confidence',
      sortable: true,
      render: (row: Incident) => (
        <span className="text-xs font-medium">
          {row.confidence_score ? `${Math.round(row.confidence_score * 100)}%` : '-'}
        </span>
      ),
    },
    {
      key: 'signal_count',
      header: 'Signals',
      render: (row: Incident) => (
        <span className="text-xs font-medium text-slate-600">{row.signal_count}</span>
      ),
    },
    {
      key: 'time_range',
      header: 'Time Range',
      render: (row: Incident) => (
        <span className="text-xs text-slate-500">
          {new Date(row.time_start).toLocaleDateString()} - {new Date(row.time_end).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      sortable: true,
      render: (row: Incident) => (
        <span className="text-xs text-slate-500">
          {new Date(row.updated_at).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Incidents Log</h1>
        <p className="text-slate-500 mt-1">All incidents with linked signals and metrics</p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onSort={(key, order) => {
          setSortBy(key);
          setSortOrder(order);
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isLoading={isLoading}
        getRowId={(row) => row.id}
        expandedContent={(row) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Linked Signals ({row.signal_count})</h4>
                <div className="bg-white p-3 rounded-lg border border-slate-200 max-h-40 overflow-auto">
                  {row.incident_signals?.map((s: any) => (
                    <div key={s.signal_id} className="text-xs font-mono text-slate-600 py-0.5">
                      {s.signal_id}
                    </div>
                  ))}
                </div>
              </div>
              {row.metrics && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Metrics</h4>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                    <p>Report Count: <strong>{row.metrics.report_count}</strong></p>
                    <p>Unique Reporters: <strong>{row.metrics.unique_reporters}</strong></p>
                    <p>Verification Count: <strong>{row.metrics.verification_count}</strong></p>
                    <p>Media Count: <strong>{row.metrics.media_count}</strong></p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/traces?incidentId=${row.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                View AI Traces →
              </Link>
              <Link
                href={`/admin/lifecycle?incidentId=${row.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                View Lifecycle →
              </Link>
            </div>
          </div>
        )}
      />
    </div>
  );
}
