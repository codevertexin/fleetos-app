import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockOwnerStatements } from '@/lib/mock-data';
import { payoutStatusBadge } from './badges';

export function StatementsTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">
          {mockOwnerStatements.length} statements found
        </p>
        <Button variant="outline" size="sm" className="gap-1">
          <Download className="w-3 h-3" /> Export All
        </Button>
      </div>
      {mockOwnerStatements.map(s => (
        <Card key={s.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-foreground">{s.period}</p>
                <p className="text-xs text-muted-foreground">Generated {s.createdAt}</p>
              </div>
              <div className="flex items-center gap-2">
                {payoutStatusBadge(s.payoutStatus)}
                {s.pdfUrl && (
                  <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/40 rounded p-2">
                <p className="text-sm font-semibold text-foreground">
                  €{s.totalIncome.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Income</p>
              </div>
              <div className="bg-muted/40 rounded p-2">
                <p className="text-sm font-semibold text-red-500">
                  -€{s.totalExpenses.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Deductions</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
                <p className="text-sm font-semibold text-emerald-600">
                  €{s.payoutAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Payout</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
