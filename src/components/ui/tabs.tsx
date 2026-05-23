import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Tab { id: string; label: string; }
interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-border gap-0', className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange?.(tab.id)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
            activeTab === tab.id
              ? 'border-[#00B39A] text-[#00B39A]'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function useTabs(initial: string) {
  const [activeTab, setActiveTab] = useState(initial);
  return { activeTab, setActiveTab };
}
