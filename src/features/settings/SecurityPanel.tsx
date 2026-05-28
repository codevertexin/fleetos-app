import { ExternalLink } from 'lucide-react';
import {
  getAccountUrl,
  getBillingUrl,
  getCurrentAppUrl,
  getLegalUrl,
  getSecurityUrl,
  type LegalPage,
} from '@/lib/platformLinks';

const CORE_ACCOUNT_LINKS = [
  {
    id: 'profile',
    title: 'Personal details',
    description: 'Name, email, and profile information — managed in CodeVertex Auth Core.',
    href: () => getAccountUrl(getCurrentAppUrl()),
  },
  {
    id: 'security',
    title: 'Security settings',
    description: 'Password, two-factor authentication, and active sessions — managed in Auth Core.',
    href: () => getSecurityUrl(getCurrentAppUrl()),
  },
  {
    id: 'billing',
    title: 'Billing & subscription',
    description: 'Plans, invoices, and payment methods — opening Billing Core (integration in progress).',
    href: () => getBillingUrl(getCurrentAppUrl()),
  },
] as const;

const LEGAL_LINKS: { label: string; page: LegalPage }[] = [
  { label: 'Privacy Policy', page: 'privacy' },
  { label: 'Terms of Service', page: 'terms' },
  { label: 'Cookie Policy', page: 'cookies' },
];

function CoreLinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <ExternalLink className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
    </a>
  );
}

/** FleetOS does not manage passwords, 2FA, or sessions locally — Auth Core owns identity. */
export function SecurityPanel() {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-base font-semibold text-foreground">Account & security</h2>
        <p className="text-sm text-muted-foreground mt-1">
          FleetOS uses CodeVertex Auth Core for sign-in, profile, and security. Changes open in a
          secure standalone account experience and return you here when finished.
        </p>
      </div>

      <div className="space-y-2">
        {CORE_ACCOUNT_LINKS.map(link => (
          <CoreLinkCard
            key={link.id}
            title={link.title}
            description={link.description}
            href={link.href()}
          />
        ))}
      </div>

      <hr className="border-border" />

      <div>
        <h2 className="text-base font-semibold text-foreground">Legal documents</h2>
        <p className="text-sm text-muted-foreground mt-1">Hosted on CodeVertex Legal Core.</p>
        <div className="mt-3 space-y-2">
          {LEGAL_LINKS.map(link => (
            <a
              key={link.page}
              href={getLegalUrl(link.page)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {link.label}
              <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden />
            </a>
          ))}
        </div>
      </div>

      {import.meta.env.DEV && (
        <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3">
          Dev only: local password / 2FA / session mocks were removed from production UI. Use Auth
          Core links above.
        </p>
      )}
    </div>
  );
}
