import { useState } from 'react';
import { Car, FileText, DollarSign, User, TrendingUp } from 'lucide-react';
import { mockOwnerProfile } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { OverviewTab } from '../../../features/owner-portal/OverviewTab';
import { VehiclesTab } from '../../../features/owner-portal/VehiclesTab';
import { StatementsTab } from '../../../features/owner-portal/StatementsTab';
import { PayoutsTab } from '../../../features/owner-portal/PayoutsTab';
import { DocumentsTab } from '../../../features/owner-portal/DocumentsTab';
import { ProfileTab } from '../../../features/owner-portal/ProfileTab';

type Tab = 'overview' | 'vehicles' | 'statements' | 'payouts' | 'documents' | 'profile';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'vehicles', label: 'Vehicles', icon: <Car className="w-4 h-4" /> },
  { id: 'statements', label: 'Statements', icon: <FileText className="w-4 h-4" /> },
  { id: 'payouts', label: 'Payouts', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
];

export default function OwnerPortal() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-2xl font-bold text-foreground">{mockOwnerProfile.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{mockOwnerProfile.companyName}</p>
        </div>

        {/* Tab Bar */}
        <div className="px-6 flex gap-0 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'vehicles' && <VehiclesTab />}
        {activeTab === 'statements' && <StatementsTab />}
        {activeTab === 'payouts' && <PayoutsTab />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </div>
    </div>
  );
}
