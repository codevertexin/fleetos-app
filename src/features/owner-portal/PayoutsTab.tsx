import { CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockOwnerPayouts, mockOwnerProfile } from '@/lib/mock-data';
import { payoutStatusBadge } from './badges';

export function PayoutsTab() {
  return (
    <div className="space-y-4">
      <Card className="border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10">
        <CardContent className="p-4 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">IBAN on file</p>
            <p className="text-sm text-muted-foreground font-mono">{mockOwnerProfile.iban}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto shrink-0">
            Update
          </Button>
        </CardContent>
      </Card>

      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {mockOwnerPayouts.map(p => (
          <div key={p.id} className="p-4 bg-card flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">Period {p.period}</p>
              <p className="text-xs text-muted-foreground">
                {p.method}
                {p.reference ? ` · Ref: ${p.reference}` : ''}
              </p>
              {p.processedAt && (
                <p className="text-xs text-muted-foreground">Processed: {p.processedAt}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-foreground">€{p.amount.toLocaleString()}</span>
              {payoutStatusBadge(p.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
