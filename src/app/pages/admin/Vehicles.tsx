import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Car } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, EmptyState } from '@/components/ui/table';
import { mockVehicles } from '@/lib/mock-data';
import { formatStatus } from '@/lib/utils';

export default function Vehicles() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = mockVehicles.filter(v => {
    const matchSearch = search === '' || v.plate.toLowerCase().includes(search.toLowerCase()) || v.brand.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vehicles</h1>
          <p className="text-muted-foreground text-sm mt-1">{mockVehicles.length} vehicles in fleet</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" /> Add Vehicle
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by plate, brand, model..."
            className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'available', 'maintenance', 'rented', 'inactive'].map(s => (
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
              <TableHeaderCell>Plate</TableHeaderCell>
              <TableHeaderCell>Vehicle</TableHeaderCell>
              <TableHeaderCell>Year</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Odometer</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Documents</TableHeaderCell>
              <TableHeaderCell>Driver</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map(vehicle => (
              <TableRow key={vehicle.id} onClick={() => navigate(`/vehicles/${vehicle.id}`)}>
                <TableCell>
                  <span className="font-mono font-semibold text-foreground">{vehicle.plate}</span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                    <p className="text-xs text-muted-foreground">{vehicle.fuel} · {vehicle.color}</p>
                  </div>
                </TableCell>
                <TableCell>{vehicle.year}</TableCell>
                <TableCell><StatusBadge status={vehicle.status} /></TableCell>
                <TableCell>{vehicle.odometer.toLocaleString()} km</TableCell>
                <TableCell>{vehicle.ownerName}</TableCell>
                <TableCell><StatusBadge status={vehicle.documentStatus} /></TableCell>
                <TableCell>
                  {vehicle.assignedDriverName ? (
                    <span className="text-sm">{vehicle.assignedDriverName}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); navigate(`/vehicles/${vehicle.id}`); }}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <EmptyState
            title="No vehicles found"
            description="Try adjusting your search or filters"
            icon={<Car className="w-12 h-12" />}
          />
        )}
      </Card>
    </div>
  );
}
