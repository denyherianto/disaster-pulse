'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import JsonViewer from '@/components/admin/JsonViewer';

interface Signal {
  id: string;
  source: string;
  text: string | null;
  lat: number | null;
  lng: number | null;
  event_type: string | null;
  city_hint: string | null;
  status: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  happened_at: string | null;
  raw_payload: any;
}

export default function SignalsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-signals', page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      const res = await fetch(`${API_BASE_URL}/admin/signals?${params}`);
      if (!res.ok) throw new Error('Failed to fetch signals');
      return res.json();
    },
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      className: 'font-mono text-xs w-24',
      render: (row: Signal) => (
        <span className="text-slate-500" title={row.id}>
          {row.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      render: (row: Signal) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
          row.source === 'user_report' ? 'bg-green-100 text-green-700' :
          row.source === 'social_media' || row.source === 'tiktok_ai' ? 'bg-purple-100 text-purple-700' :
          row.source === 'news' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {row.source.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'text',
      header: 'Text',
      className: 'max-w-xs',
      render: (row: Signal) => (
        <span className="text-slate-600 text-xs line-clamp-2" title={row.text || ''}>
          {row.text || <span className="text-slate-400 italic">No text</span>}
        </span>
      ),
    },
    {
      key: 'event_type',
      header: 'Event Type',
      sortable: true,
      render: (row: Signal) => (
        <span className="text-xs font-medium capitalize">
          {row.event_type?.replace('_', ' ') || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Signal) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          row.status === 'processed' ? 'bg-green-100 text-green-700' :
          row.status === 'pending' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'city_hint',
      header: 'City',
      render: (row: Signal) => (
        <span className="text-xs text-slate-600">{row.city_hint || '-'}</span>
      ),
    },
    {
      key: 'coordinates',
      header: 'Lat/Lng',
      render: (row: Signal) => (
        <span className="text-xs font-mono text-slate-500">
          {row.lat && row.lng ? `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}` : '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row: Signal) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Signals Log</h1>
        <p className="text-slate-500 mt-1">Raw signal ingestion data with AI enrichment</p>
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
            {row.text && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Full Text</h4>
                <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                  {row.text}
                </p>
              </div>
            )}
            {row.media_url && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Media</h4>
                <a href={row.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline">
                  {row.media_type}: {row.media_url}
                </a>
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Raw Payload & AI Analysis</h4>
              <JsonViewer data={row.raw_payload} />
            </div>
          </div>
        )}
      />
    </div>
  );
}
