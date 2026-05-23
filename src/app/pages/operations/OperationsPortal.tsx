import { useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mockDispatchBookings, mockAlerts } from '@/lib/mock-data';
import { DispatchTab } from '../../../features/operations/DispatchTab';
import { TimelineTab } from '../../../features/operations/TimelineTab';
import { DriversTab } from '../../../features/operations/DriversTab';
import { VehiclesTab } from '../../../features/operations/VehiclesTab';
import { AlertsTab } from '../../../features/operations/AlertsTab';

type Tab = 'dispatch' | 'timeline' | 'drivers' | 'vehicles' | 'alerts';

const tabs: { id: Tab; label: string }[] = [
  { id: 'dispatch', label: 'Dispatch Queue' },
  { id: 'timeline', label: "Today's Timeline" },
  { id: 'drivers', label: 'Driver Availability' },
  { id: 'vehicles', label: 'Vehicle Availability' },
  { id: 'alerts', label: 'Urgent Alerts' },
];

export default function OperationsPortal() {
  const [activeTab, setActiveTab] = useState<Tab>('dispatch');

  const urgentCount = mockAlerts.filter(a => a.severity === 'high' && !a.isRead).length;
  const pendingCount = mockDispatchBookings.filter(b => b.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-20">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Operations Center</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-GB', { dateStyle: 'full' })} · Dispatcher view
            </p>
          </div>
          <div className="flex items-center gap-3">
            {urgentCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />{urgentCount} urgent
              </span>
            )}
            <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> New Booking</Button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="px-6 flex gap-0 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'relative px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              {t.id === 'dispatch' && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs rounded-full bg-amber-500 text-white font-bold">
                  {pendingCount}
                </span>
              )}
              {t.id === 'alerts' && urgentCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs rounded-full bg-red-500 text-white font-bold">
                  {urgentCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        {activeTab === 'dispatch' && <DispatchTab />}
        {activeTab === 'timeline' && <TimelineTab />}
        {activeTab === 'drivers' && <DriversTab />}
        {activeTab === 'vehicles' && <VehiclesTab />}
        {activeTab === 'alerts' && <AlertsTab />}
      </div>
    </div>
  );
}
