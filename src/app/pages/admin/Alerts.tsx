import { useState } from 'react';
import { AlertTriangle, Bell, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockAlerts } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

export default function Alerts() {
  const [filter, setFilter] = useState<'all' | '7' | '15' | '30' | 'expired'>('all');

  const filtered = mockAlerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'expired') return (alert.daysUntil ?? 0) < 0;
    return (alert.daysUntil ?? 999) <= parseInt(filter);
  });

  const unread = mockAlerts.filter(a => !a.isRead).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">{unread} unread alerts</p>
        </div>
        <Button variant="outline"><CheckCircle className="w-4 h-4" /> Mark All Read</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Expired', count: mockAlerts.filter(a => (a.daysUntil ?? 0) < 0).length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: '≤ 7 Days', count: mockAlerts.filter(a => a.daysUntil !== undefined && a.daysUntil >= 0 && a.daysUntil <= 7).length, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { label: '≤ 15 Days', count: mockAlerts.filter(a => a.daysUntil !== undefined && a.daysUntil > 7 && a.daysUntil <= 15).length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: '≤ 30 Days', count: mockAlerts.filter(a => a.daysUntil !== undefined && a.daysUntil > 15 && a.daysUntil <= 30).length, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${s.bg} mb-3`}>
                <AlertTriangle className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[{ id: 'all', label: 'All' }, { id: 'expired', label: 'Expired' }, { id: '7', label: '7 Days' }, { id: '15', label: '15 Days' }, { id: '30', label: '30 Days' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as typeof filter)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${filter === f.id ? 'bg-[#00B39A] text-white border-[#00B39A]' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {filtered.map(alert => (
          <Card key={alert.id} className={`transition-all ${!alert.isRead ? 'border-l-4 border-l-[#00B39A]' : ''}`}>
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl flex-shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
                  alert.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                  alert.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30' :
                  'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <AlertTriangle className={`w-4 h-4 ${
                    alert.severity === 'critical' || alert.severity === 'high' ? 'text-red-600' :
                    alert.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{alert.title}</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      alert.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{alert.severity}</span>
                    {!alert.isRead && <span className="w-2 h-2 rounded-full bg-[#00B39A]" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{alert.entityType}: <strong>{alert.entityName}</strong></span>
                    {alert.daysUntil !== undefined && (
                      <span className={alert.daysUntil < 0 ? 'text-red-600 font-semibold' : alert.daysUntil <= 15 ? 'text-amber-600 font-semibold' : ''}>
                        {alert.daysUntil < 0 ? `${Math.abs(alert.daysUntil)} days overdue` : `${alert.daysUntil} days remaining`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex gap-2">
                  {!alert.isRead && <Button size="sm" variant="ghost">Mark Read</Button>}
                  <Button size="sm" variant="outline">View</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold">No alerts</p>
            <p className="text-sm text-muted-foreground">Everything looks good!</p>
          </div>
        )}
      </div>
    </div>
  );
}
