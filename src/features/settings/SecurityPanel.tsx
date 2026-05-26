import { cn } from '@/lib/utils';
import { getAccountUrl, getBillingUrl, getSecurityUrl } from '@/lib/platformLinks';

function InputField({
  label,
  type = 'text',
}: {
  label: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        className={cn(
          'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors',
        )}
      />
    </div>
  );
}

const SESSIONS = [
  { device: 'Chrome on macOS', location: 'Lisbon, Portugal', time: 'Now (current)', active: true },
  { device: 'Safari on iPhone', location: 'Lisbon, Portugal', time: '2 hours ago', active: false },
];

export function SecurityPanel() {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-foreground">Password</h2>
      <div className="max-w-sm space-y-3">
        <InputField label="Current Password" type="password" />
        <InputField label="New Password" type="password" />
        <InputField label="Confirm New Password" type="password" />
        <button className="w-full px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          Update Password
        </button>
      </div>

      <hr className="border-border" />
      <h2 className="text-base font-semibold text-foreground">Two-Factor Authentication</h2>
      <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-4">
        <div>
          <p className="text-sm font-medium text-foreground">2FA via Authenticator App</p>
          <p className="text-xs text-muted-foreground mt-0.5">Currently disabled</p>
        </div>
        <button className="px-3 py-1.5 border border-border text-sm font-medium rounded-lg hover:bg-muted transition-colors text-foreground">
          Enable
        </button>
      </div>

      <hr className="border-border" />
      <h2 className="text-base font-semibold text-foreground">Active Sessions</h2>
      <div className="space-y-2">
        {SESSIONS.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                {s.device}
                {s.active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.location} · {s.time}
              </p>
            </div>
            {!s.active && (
              <button className="text-xs text-red-500 hover:underline">Revoke</button>
            )}
          </div>
        ))}
      </div>

      <hr className="border-border" />
      <h2 className="text-base font-semibold text-foreground">CodeVertex Account</h2>
      <p className="text-sm text-muted-foreground">
        Profile, security, and billing are managed in CodeVertex Core.
      </p>
      <div className="flex flex-col gap-2 max-w-md">
        {[
          { label: 'Account profile', href: getAccountUrl() },
          { label: 'Security settings', href: getSecurityUrl() },
          { label: 'Billing & subscription', href: getBillingUrl() },
        ].map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
