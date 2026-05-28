import { useState } from 'react';
import { Save, Building2, Users, Bell, Shield, Palette, CircleHelp } from 'lucide-react';
import { getHelpUrl } from '@/lib/platformLinks';
import { cn } from '@/lib/utils';
import { CompanyPanel } from '../../../features/settings/CompanyPanel';
import { UsersPanel } from '../../../features/settings/UsersPanel';
import { NotificationsPanel } from '../../../features/settings/NotificationsPanel';
import { SecurityPanel } from '../../../features/settings/SecurityPanel';
import { AppearancePanel } from '../../../features/settings/AppearancePanel';

const TABS = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
] as const;

type Tab = typeof TABS[number]['id'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your company, team, and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={getHelpUrl({ screenCode: 'settings', moduleCode: 'fleetos' })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground"
            aria-label="Settings help"
          >
            <CircleHelp className="w-4 h-4" />
          </a>
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              saved
                ? 'bg-green-500/20 text-green-600 border border-green-500/30'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Nav */}
        <div className="w-52 shrink-0">
          <nav className="space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Panel Content */}
        <div className="flex-1 bg-card border border-border rounded-xl p-6">
          {activeTab === 'company' && <CompanyPanel />}
          {activeTab === 'users' && <UsersPanel />}
          {activeTab === 'notifications' && <NotificationsPanel />}
          {activeTab === 'security' && <SecurityPanel />}
          {activeTab === 'appearance' && <AppearancePanel />}
        </div>
      </div>
    </div>
  );
}
