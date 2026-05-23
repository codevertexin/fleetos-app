import { useState } from 'react';
import { Upload, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';
import { mockDocuments } from '@/lib/mock-data';
import { formatDate, getDaysUntil } from '@/lib/utils';

export default function Documents() {
  const [filter, setFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const filtered = mockDocuments.filter(d => {
    const matchStatus = filter === 'all' || d.status === filter;
    const matchEntity = entityFilter === 'all' || d.entityType === entityFilter;
    return matchStatus && matchEntity;
  });

  const expired = mockDocuments.filter(d => d.status === 'expired').length;
  const expiringSoon = mockDocuments.filter(d => d.status === 'expiring_soon').length;
  const valid = mockDocuments.filter(d => d.status === 'valid').length;
  const missing = mockDocuments.filter(d => d.status === 'missing').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">Compliance document tracking</p>
        </div>
        <Button><Upload className="w-4 h-4" /> Upload Document</Button>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Valid', count: valid, icon: CheckCircle, color: '#00B39A', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Expiring Soon', count: expiringSoon, icon: Clock, color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Expired', count: expired, icon: XCircle, color: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Missing', count: missing, icon: AlertTriangle, color: '#6B7280', bg: 'bg-gray-50 dark:bg-gray-900/20' },
        ].map(s => (
          <Card key={s.label} className="cursor-pointer" onClick={() => setFilter(s.label.toLowerCase().replace(' ', '_'))}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${s.bg}`}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {['all', 'valid', 'expiring_soon', 'expired', 'missing'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${filter === s ? 'bg-[#00B39A] text-white border-[#00B39A]' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>
            {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
        <div className="ml-2 flex gap-2">
          {['all', 'vehicle', 'driver'].map(e => (
            <button key={e} onClick={() => setEntityFilter(e)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${entityFilter === e ? 'bg-[#1F6A8A] text-white border-[#1F6A8A]' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Document</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Entity</TableHeaderCell>
              <TableHeaderCell>Entity Type</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Expiry Date</TableHeaderCell>
              <TableHeaderCell>Days Until</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map(doc => {
              const days = doc.expiryDate ? getDaysUntil(doc.expiryDate) : null;
              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell className="text-sm capitalize">{doc.type.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{doc.entityName}</TableCell>
                  <TableCell className="capitalize">{doc.entityType}</TableCell>
                  <TableCell><StatusBadge status={doc.status} /></TableCell>
                  <TableCell>{doc.expiryDate ? formatDate(doc.expiryDate) : '—'}</TableCell>
                  <TableCell>
                    {days !== null ? (
                      <span className={`text-sm font-medium ${days < 0 ? 'text-red-600' : days < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">Upload</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
