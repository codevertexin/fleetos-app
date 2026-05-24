import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, Download, Plus, User, Building2, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';
import { mockExpenses, mockIncomes, mockPayouts } from '@/lib/mock-data';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';

const recipientTypeConfig: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  driver: { label: 'Driver', color: 'bg-blue-100 text-blue-800', Icon: User },
  owner: { label: 'Owner', color: 'bg-emerald-100 text-emerald-800', Icon: User },
  supplier: { label: 'Supplier', color: 'bg-purple-100 text-purple-800', Icon: Building2 },
};

type FinanceTab = 'expenses' | 'incomes' | 'payouts' | 'import';

const VALID_TABS: FinanceTab[] = ['expenses', 'incomes', 'payouts', 'import'];

function tabFromSearchParams(params: URLSearchParams): FinanceTab {
  const value = params.get('tab');
  return VALID_TABS.includes(value as FinanceTab) ? (value as FinanceTab) : 'expenses';
}

export default function Finance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<FinanceTab>(() => tabFromSearchParams(searchParams));

  const selectTab = (next: FinanceTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'expenses') {
      params.delete('tab');
    } else {
      params.set('tab', next);
    }
    setSearchParams(params, { replace: true });
  };

  const totalExpenses = mockExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncomes = mockIncomes.reduce((s, i) => s + i.amount, 0);
  const totalPayoutsPending = mockPayouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  const TABS: { id: FinanceTab; label: string }[] = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'incomes', label: 'Incomes' },
    { id: 'payouts', label: 'Payouts' },
    { id: 'import', label: 'CSV Import' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-muted-foreground text-sm mt-1">Expenses, incomes, and payouts management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Upload className="w-4 h-4" /> Import CSV</Button>
          <Button variant="outline"><Download className="w-4 h-4" /> Export</Button>
          <Button><Plus className="w-4 h-4" /> Add Record</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/10' },
          { label: 'Total Incomes', value: formatCurrency(totalIncomes), color: '#00B39A', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
          { label: 'Payouts Pending', value: formatCurrency(totalPayoutsPending), color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-900/10' },
        ].map(s => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-border gap-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-[#00B39A] text-[#00B39A]' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <Card>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>Vehicle</TableHeaderCell>
                <TableHeaderCell>Driver</TableHeaderCell>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {mockExpenses.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell className="capitalize">{e.type}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{e.vehiclePlate ? <span className="font-mono">{e.vehiclePlate}</span> : '—'}</TableCell>
                  <TableCell>{e.driverName ?? '—'}</TableCell>
                  <TableCell className="font-medium text-red-600">{formatCurrency(e.amount)}</TableCell>
                  <TableCell><StatusBadge status={e.status} /></TableCell>
                  <TableCell>
                    {e.status === 'pending' && <Button size="sm" variant="outline">Approve</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'incomes' && (
        <Card>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>Vehicle</TableHeaderCell>
                <TableHeaderCell>Driver</TableHeaderCell>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Reference</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {mockIncomes.map(i => (
                <TableRow key={i.id}>
                  <TableCell>{formatDate(i.date)}</TableCell>
                  <TableCell className="capitalize">{i.type}</TableCell>
                  <TableCell>{i.description}</TableCell>
                  <TableCell>{i.vehiclePlate ? <span className="font-mono">{i.vehiclePlate}</span> : '—'}</TableCell>
                  <TableCell>{i.driverName ?? '—'}</TableCell>
                  <TableCell className="font-medium text-emerald-600">{formatCurrency(i.amount)}</TableCell>
                  <TableCell>{i.reference ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'payouts' && (
        <Card>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Recipient</TableHeaderCell>
                <TableHeaderCell>Period</TableHeaderCell>
                <TableHeaderCell>Settlement</TableHeaderCell>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Method</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Processed</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {mockPayouts.map(p => {
                const cfg = recipientTypeConfig[p.recipientType] ?? recipientTypeConfig.driver;
                const Icon = cfg.Icon;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        <span className="font-medium">{p.recipientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.period}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {p.settlementModel
                        ? p.settlementModel.replace('_', ' ')
                        : '—'}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell>{p.processedAt ? formatDate(p.processedAt) : '—'}</TableCell>
                    <TableCell>
                      {p.status === 'pending' && <Button size="sm">Process</Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'import' && (
        <Card>
          <CardHeader><CardTitle>CSV Import</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-[#00B39A]/50 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-semibold">Drop CSV file here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">Supported: expenses, incomes, payouts exports</p>
              <Button variant="outline" className="mt-4">Browse Files</Button>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-semibold mb-2">Expected CSV columns for Expenses:</p>
              <code className="text-xs text-muted-foreground">date, type, description, vehicle_plate, amount, status</code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
