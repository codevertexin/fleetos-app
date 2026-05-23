import { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockDrivers, mockVehicles } from '@/lib/mock-data';
import type { DispatchBooking } from '@/lib/mock-data';

interface Props {
  booking: DispatchBooking;
  onClose: () => void;
}

export function AssignModal({ booking, onClose }: Props) {
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const availableDrivers = mockDrivers.filter(d => d.availability === 'available');
  const availableVehicles = mockVehicles.filter(
    v => ['available', 'active'].includes(v.status) && !v.assignedDriverId,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Assign Booking</h2>
            <p className="text-xs text-muted-foreground">
              {booking.customerName} ·{' '}
              {new Date(booking.scheduledAt).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">PICKUP</p>
            <p className="text-sm text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {booking.pickupAddress}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">DROP-OFF</p>
            <p className="text-sm text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              {booking.dropoffAddress}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              ASSIGN DRIVER
            </label>
            <select
              value={selectedDriver}
              onChange={e => setSelectedDriver(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="">Select driver...</option>
              {availableDrivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.assignedVehiclePlate || 'No vehicle'}
                </option>
              ))}
            </select>
            {availableDrivers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No drivers currently available</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              ASSIGN VEHICLE
            </label>
            <select
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="">Select vehicle...</option>
              {availableVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} · {v.plate}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedDriver && !selectedVehicle}
              onClick={onClose}
            >
              Confirm Assignment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
