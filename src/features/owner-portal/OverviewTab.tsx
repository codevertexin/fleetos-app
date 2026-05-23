import { Building, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  mockOwnerStatements,
  mockOwnerPayouts,
  mockOwnerVehicles,
} from '@/lib/mock-data';
import { LEGAL_LINKS } from '@/lib/services/legal.service';
import { HELP_ARTICLES } from '@/lib/services/help.service';
import { cn } from '@/lib/utils';
import { payoutStatusBadge, docStatusBadge } from './badges';

export function OverviewTab() {
  const latest = mockOwnerStatements[0];
  const totalEarnings = mockOwnerStatements
    .filter(s => s.payoutStatus === 'paid')
    .reduce((sum, s) => sum + s.payoutAmount, 0);
  const pendingPayout = mockOwnerPayouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Vehicles Owned</p>
            <p className="text-3xl font-bold text-foreground">{mockOwnerVehicles.length}</p>
            <p className="text-xs text-muted-foreground mt-1">In fleet</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">This Month Income</p>
            <p className="text-3xl font-bold text-foreground">
              €{latest.totalIncome.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 mt-1">↑ 8.4% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Pending Payout</p>
            <p className="text-3xl font-bold text-amber-600">€{pendingPayout.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Processing Jul 5</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Earned (YTD)</p>
            <p className="text-3xl font-bold text-foreground">€{totalEarnings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Paid out</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Statement — {latest.period}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">
                €{latest.totalIncome.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Gross Income</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">
                -€{latest.totalExpenses.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Deductions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                €{latest.payoutAmount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Your Payout (80%)</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Payout status</span>
            {payoutStatusBadge(latest.payoutStatus)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {mockOwnerVehicles.map(v => (
              <div key={v.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {v.brand} {v.model} — {v.plate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.assignedDriverName ? `Driver: ${v.assignedDriverName}` : 'No driver assigned'}{' '}
                    · {v.odometer.toLocaleString()} km
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {docStatusBadge(v.documentStatus)}
                  <span
                    className={cn('px-2 py-0.5 rounded-full text-xs font-medium', {
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':
                        v.status === 'active',
                      'bg-amber-100 text-amber-700': v.status === 'maintenance',
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400':
                        v.status === 'inactive',
                    })}
                  >
                    {v.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={HELP_ARTICLES.ownerPortal}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm text-foreground"
            >
              <Building className="w-4 h-4 text-primary" /> Help Center
            </a>
            <a
              href={LEGAL_LINKS.privacyPolicy}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm text-foreground"
            >
              <FileText className="w-4 h-4 text-primary" /> Privacy Policy
            </a>
            <a
              href={LEGAL_LINKS.dpa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm text-foreground"
            >
              <FileText className="w-4 h-4 text-primary" /> Data Agreement
            </a>
            <a
              href={LEGAL_LINKS.termsOfService}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm text-foreground"
            >
              <FileText className="w-4 h-4 text-primary" /> Terms of Service
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
