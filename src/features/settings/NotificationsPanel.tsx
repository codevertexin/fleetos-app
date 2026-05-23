import { useState } from 'react';
import { cn } from '@/lib/utils';

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn('relative rounded-full transition-colors', checked ? 'bg-primary' : 'bg-muted')}
        style={{ width: 40, height: 22 }}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-[18px]',
          )}
        />
      </button>
    </div>
  );
}

export function NotificationsPanel() {
  const [notifs, setNotifs] = useState({
    docExpiry: true,
    contractEnding: true,
    newBooking: true,
    payoutReady: false,
    driverAlert: true,
    emailDigest: false,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Alert Preferences</h2>
      <Toggle
        label="Document Expiry Alerts"
        description="Notify when documents expire or are expiring soon"
        checked={notifs.docExpiry}
        onChange={v => setNotifs(n => ({ ...n, docExpiry: v }))}
      />
      <Toggle
        label="Contract Ending Alerts"
        description="Notify when contracts are ending within 60 days"
        checked={notifs.contractEnding}
        onChange={v => setNotifs(n => ({ ...n, contractEnding: v }))}
      />
      <Toggle
        label="New Booking Notifications"
        description="Notify on new booking creation"
        checked={notifs.newBooking}
        onChange={v => setNotifs(n => ({ ...n, newBooking: v }))}
      />
      <Toggle
        label="Payout Ready"
        description="Notify when payouts are ready to be processed"
        checked={notifs.payoutReady}
        onChange={v => setNotifs(n => ({ ...n, payoutReady: v }))}
      />
      <Toggle
        label="Driver Alerts"
        description="Notify on driver availability changes"
        checked={notifs.driverAlert}
        onChange={v => setNotifs(n => ({ ...n, driverAlert: v }))}
      />
      <hr className="border-border" />
      <h2 className="text-base font-semibold text-foreground">Email Preferences</h2>
      <Toggle
        label="Weekly Email Digest"
        description="Receive a weekly summary of fleet activity"
        checked={notifs.emailDigest}
        onChange={v => setNotifs(n => ({ ...n, emailDigest: v }))}
      />
    </div>
  );
}
