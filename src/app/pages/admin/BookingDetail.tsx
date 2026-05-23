import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Users, Phone, Mail, CheckCircle, Car, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { mockBookings, mockDrivers, mockVehicles } from '@/lib/mock-data';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignDriverOpen, setAssignDriverOpen] = useState(false);
  const [assignVehicleOpen, setAssignVehicleOpen] = useState(false);
  const booking = mockBookings.find(b => b.id === id);

  if (!booking) return (
    <div className="p-6 text-center py-20">
      <p className="text-muted-foreground">Booking not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/bookings')}>Back</Button>
    </div>
  );

  const statusOrder = ['pending', 'assigned', 'confirmed', 'in_progress', 'completed'];
  const currentIdx = statusOrder.indexOf(booking.status);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/bookings')} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Booking #{booking.id}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-muted-foreground text-sm">Created {formatDate(booking.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {booking.status === 'pending' && (
            <>
              <Button variant="outline" onClick={() => setAssignDriverOpen(true)}><User className="w-4 h-4" /> Assign Driver</Button>
              <Button variant="outline" onClick={() => setAssignVehicleOpen(true)}><Car className="w-4 h-4" /> Assign Vehicle</Button>
            </>
          )}
          {booking.status === 'pending' && <Button variant="destructive" size="sm">Cancel</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route */}
          <Card>
            <CardHeader><CardTitle>Trip Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <div className="w-3 h-3 rounded-full bg-[#00B39A] border-2 border-[#00B39A]/30" />
                  <div className="w-0.5 flex-1 bg-border min-h-8" />
                  <div className="w-3 h-3 rounded-full bg-[#EF4444] border-2 border-[#EF4444]/30" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Pickup</p>
                    <p className="font-medium">{booking.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Dropoff</p>
                    <p className="font-medium">{booking.dropoffAddress}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date/Time</p>
                    <p className="font-medium">{formatDateTime(booking.scheduledAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Passengers</p>
                    <p className="font-medium">{booking.passengerCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Duration</p>
                    <p className="font-medium">{booking.estimatedDuration} min</p>
                  </div>
                </div>
              </div>
              {booking.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{booking.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status timeline */}
          <Card>
            <CardHeader><CardTitle>Status Timeline</CardTitle></CardHeader>
            <CardContent>
              {/* Progress bar */}
              {booking.status !== 'cancelled' && booking.status !== 'rejected' && (
                <div className="flex items-center mb-6">
                  {statusOrder.map((s, i) => (
                    <div key={s} className="flex items-center flex-1 last:flex-none">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i <= currentIdx ? 'bg-[#00B39A] text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {i < currentIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < statusOrder.length - 1 && (
                        <div className={`h-0.5 flex-1 ${i < currentIdx ? 'bg-[#00B39A]' : 'bg-muted'}`} />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {booking.statusHistory.map((sh, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00B39A] mt-2 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={sh.status} />
                        {sh.note && <span className="text-xs text-muted-foreground">— {sh.note}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(sh.timestamp)} {sh.userName && `· ${sh.userName}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold">{booking.customerName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />{booking.customerPhone}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />{booking.customerEmail}
              </div>
            </CardContent>
          </Card>

          {/* Driver */}
          <Card>
            <CardHeader><CardTitle>Driver</CardTitle></CardHeader>
            <CardContent>
              {booking.driverName ? (
                <p className="font-medium">{booking.driverName}</p>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No driver assigned</p>
                  <Button size="sm" className="mt-2" onClick={() => setAssignDriverOpen(true)}>Assign Driver</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle */}
          <Card>
            <CardHeader><CardTitle>Vehicle</CardTitle></CardHeader>
            <CardContent>
              {booking.vehiclePlate ? (
                <p className="font-mono font-semibold">{booking.vehiclePlate}</p>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No vehicle assigned</p>
                  <Button size="sm" className="mt-2" onClick={() => setAssignVehicleOpen(true)}>Assign Vehicle</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price */}
          <Card>
            <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#00B39A]">{formatCurrency(booking.price)}</p>
              <p className="text-xs text-muted-foreground mt-1">Estimated total</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Driver Modal */}
      <Modal open={assignDriverOpen} onClose={() => setAssignDriverOpen(false)} title="Assign Driver" size="md">
        <div className="space-y-2">
          {mockDrivers.filter(d => d.availability === 'available').map(driver => (
            <button key={driver.id} onClick={() => setAssignDriverOpen(false)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left border border-border">
              <div className="w-9 h-9 rounded-full bg-[#1F6A8A]/20 text-[#1F6A8A] flex items-center justify-center text-sm font-bold">
                {driver.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div>
                <p className="font-medium">{driver.name}</p>
                <p className="text-xs text-muted-foreground">{driver.phone} · {driver.assignedVehiclePlate ?? 'No vehicle'}</p>
              </div>
              <StatusBadge status={driver.availability} className="ml-auto" />
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setAssignDriverOpen(false)}>Cancel</Button>
          <Button onClick={() => setAssignDriverOpen(false)}>Confirm Assignment</Button>
        </div>
      </Modal>

      {/* Assign Vehicle Modal */}
      <Modal open={assignVehicleOpen} onClose={() => setAssignVehicleOpen(false)} title="Assign Vehicle" size="md">
        <div className="space-y-2">
          {mockVehicles.filter(v => v.status === 'available' || v.status === 'active').map(vehicle => (
            <button key={vehicle.id} onClick={() => setAssignVehicleOpen(false)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left border border-border">
              <div className="w-9 h-9 rounded-lg bg-[#00B39A]/10 text-[#00B39A] flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <p className="font-mono font-semibold">{vehicle.plate}</p>
                <p className="text-xs text-muted-foreground">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>
              </div>
              <StatusBadge status={vehicle.status} className="ml-auto" />
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setAssignVehicleOpen(false)}>Cancel</Button>
          <Button onClick={() => setAssignVehicleOpen(false)}>Confirm Assignment</Button>
        </div>
      </Modal>
    </div>
  );
}
