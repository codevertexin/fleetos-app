import { useState } from 'react';
import { Plus, Search, Building2, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';
import { mockContracts } from '@/lib/mock-data';
import { formatDate, formatCurrency, formatStatus } from '@/lib/utils';

const settlementLabels: Record<string, string> = {
  fixed: 'Fixed',
  percent_gross: '% Gross',
  percent_net: '% Net',
  hybrid: 'Hybrid',
  // legacy fallback
  percentage: '% Gross',
};

export default function Contracts() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = mockContracts.filter(c => {
    const matchSearch =
      search === '' ||
      c.partyName.toLowerCase().includes(search.toLowerCase()) ||
      (c.lessorName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.vehiclePlate ?? '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-muted-foreground text-sm mt-1">{mockContracts.length} contracts</p>
        </div>
        <Button><Plus className="w-4 h-4" /> New Contract</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search party, vehicle..."
            className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
        {['all', 'driver', 'rental'].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              typeFilter === t
                ? 'bg-[#00B39A] text-white border-[#00B39A]'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {formatStatus(t)}
          </button>
        ))}
      </div>

      <Card>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Party</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Vehicle</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>Settlement</TableHeaderCell>
              <TableHeaderCell>Amount</TableHeaderCell>
              <TableHeaderCell>Pay Day</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id}>
                {/* Party — show lessor for rental contracts */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {c.type === 'rental' ? (
                      c.lessorType === 'company'
                        ? <Building2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                        : <User className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    ) : null}
                    <div>
                      <div className="font-medium">{c.lessorName ?? c.partyName}</div>
                      {c.lessorName && c.lessorName !== c.partyName && (
                        <div className="text-xs text-muted-foreground">{c.partyName}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{c.type}</TableCell>
                <TableCell>
                  {c.vehiclePlate
                    ? <span className="font-mono text-sm">{c.vehiclePlate}</span>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(c.startDate)} → {formatDate(c.endDate)}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {settlementLabels[c.settlementModel] ?? c.settlementModel}
                  </span>
                </TableCell>
                <TableCell className="font-medium">
                  {c.monthlyFixedAmount
                    ? `${formatCurrency(c.monthlyFixedAmount)}/mo`
                    : c.percentage
                    ? `${c.percentage}%`
                    : c.value
                    ? (c.settlementModel === 'fixed' ? formatCurrency(c.value) : `${c.value}%`)
                    : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.paymentDay ? `Day ${c.paymentDay}` : '—'}
                </TableCell>
                <TableCell><Button size="sm" variant="ghost">View</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
