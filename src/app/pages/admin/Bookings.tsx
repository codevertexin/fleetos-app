import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, EmptyState } from '@/components/ui/table';
import { mockBookings } from '@/lib/mock-data';
import { formatCurrency, formatDateTime, formatStatus } from '@/lib/utils';

const STATUSES = ['all', 'pending', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'];

export default function Bookings() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = mockBookings.filter(b => {
    const matchSearch = search === '' ||
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.pickupAddress.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground text-sm mt-1">{mockBookings.length} total bookings</p>
        </div>
        <Button><Plus className="w-4 h-4" /> New Booking</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, address, ID..."
            className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === s ? 'bg-[#00B39A] text-white border-[#00B39A]' : 'bg-card text-muted-foreground border-border hover:bg-muted'
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
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Pickup</TableHeaderCell>
              <TableHeaderCell>Dropoff</TableHeaderCell>
              <TableHeaderCell>Date/Time</TableHeaderCell>
              <TableHeaderCell>Driver</TableHeaderCell>
              <TableHeaderCell>Pax</TableHeaderCell>
              <TableHeaderCell>Price</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map(booking => (
              <TableRow key={booking.id} onClick={() => navigate(`/bookings/${booking.id}`)}>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">#{booking.id}</span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{booking.customerName}</p>
                    <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm truncate max-w-32">{booking.pickupAddress}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm truncate max-w-32">{booking.dropoffAddress}</p>
                </TableCell>
                <TableCell>{formatDateTime(booking.scheduledAt)}</TableCell>
                <TableCell>
                  {booking.driverName ?? <span className="text-xs text-muted-foreground">Unassigned</span>}
                </TableCell>
                <TableCell>{booking.passengerCount}</TableCell>
                <TableCell className="font-medium">{formatCurrency(booking.price)}</TableCell>
                <TableCell><StatusBadge status={booking.status} /></TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost">View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <EmptyState title="No bookings found" icon={<Calendar className="w-12 h-12" />} />
        )}
      </Card>
    </div>
  );
}
