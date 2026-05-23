import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, EmptyState } from '@/components/ui/table';
import { mockDrivers } from '@/lib/mock-data';
import { formatDate, formatStatus, getDaysUntil } from '@/lib/utils';

export default function Drivers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = mockDrivers.filter(d => {
    const matchSearch = search === '' || d.name.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search);
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drivers</h1>
          <p className="text-muted-foreground text-sm mt-1">{mockDrivers.length} drivers registered</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" /> Add Driver
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'on_trip', 'available', 'off_duty', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === s
                  ? 'bg-[#00B39A] text-white border-[#00B39A]'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {formatStatus(s)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Driver</TableHeaderCell>
              <TableHeaderCell>Phone</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Availability</TableHeaderCell>
              <TableHeaderCell>Vehicle</TableHeaderCell>
              <TableHeaderCell>License Expiry</TableHeaderCell>
              <TableHeaderCell>TVDE Cert</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map(driver => {
              const licenseDays = getDaysUntil(driver.licenseExpiry);
              const tvdeDays = getDaysUntil(driver.tvdeCertExpiry);
              return (
                <TableRow key={driver.id} onClick={() => navigate(`/drivers/${driver.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1F6A8A]/20 text-[#1F6A8A] flex items-center justify-center text-xs font-bold">
                        {driver.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-xs text-muted-foreground">{driver.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell><StatusBadge status={driver.status} /></TableCell>
                  <TableCell><StatusBadge status={driver.availability} /></TableCell>
                  <TableCell>
                    {driver.assignedVehiclePlate ? (
                      <span className="font-mono text-sm">{driver.assignedVehiclePlate}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={licenseDays < 30 ? 'text-amber-600 font-medium' : licenseDays < 0 ? 'text-red-600 font-medium' : ''}>
                      {formatDate(driver.licenseExpiry)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={tvdeDays < 30 ? 'text-amber-600 font-medium' : tvdeDays < 0 ? 'text-red-600 font-medium' : ''}>
                      {formatDate(driver.tvdeCertExpiry)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">View</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <EmptyState
            title="No drivers found"
            description="Try adjusting your search or filters"
            icon={<Users className="w-12 h-12" />}
          />
        )}
      </Card>
    </div>
  );
}
