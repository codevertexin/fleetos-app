import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Input, Select, Textarea } from '@/components/ui/input';
import { mockAssignments, mockVehicles, mockDrivers } from '@/lib/mock-data';
import { formatDateTime } from '@/lib/utils';

export default function Assignments() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-muted-foreground text-sm mt-1">Vehicle-driver shift management</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> New Assignment</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Now', value: mockAssignments.filter(a=>a.status==='active').length, color: '#00B39A' },
          { label: 'Scheduled', value: mockAssignments.filter(a=>a.status==='scheduled').length, color: '#22C7D8' },
          { label: 'Completed Today', value: mockAssignments.filter(a=>a.status==='completed').length, color: '#1F6A8A' },
          { label: 'Cancelled', value: mockAssignments.filter(a=>a.status==='cancelled').length, color: '#EF4444' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>All Assignments</CardTitle></CardHeader>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Driver</TableHeaderCell>
              <TableHeaderCell>Vehicle</TableHeaderCell>
              <TableHeaderCell>Start Time</TableHeaderCell>
              <TableHeaderCell>End Time</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Odometer</TableHeaderCell>
              <TableHeaderCell>Fuel</TableHeaderCell>
              <TableHeaderCell>Check-in</TableHeaderCell>
              <TableHeaderCell>Check-out</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {mockAssignments.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.driverName}</TableCell>
                <TableCell><span className="font-mono">{a.vehiclePlate}</span></TableCell>
                <TableCell>{formatDateTime(a.startTime)}</TableCell>
                <TableCell>{a.endTime ? formatDateTime(a.endTime) : '—'}</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell>
                  {a.odometerStart ? (
                    <span className="text-sm">{a.odometerStart.toLocaleString()} → {a.odometerEnd?.toLocaleString() ?? '...'} km</span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  {a.fuelStart ? (
                    <span className="text-sm">{a.fuelStart}% → {a.fuelEnd ?? '...'}%</span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  {a.checkInState ? <StatusBadge status={a.checkInState === 'ok' ? 'valid' : 'expiring_soon'} label={a.checkInState} /> : '—'}
                </TableCell>
                <TableCell>
                  {a.checkOutState ? <StatusBadge status={a.checkOutState === 'ok' ? 'valid' : 'expiring_soon'} label={a.checkOutState} /> : '—'}
                </TableCell>
                <TableCell><Button size="sm" variant="ghost">Details</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create Assignment Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Assignment" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Driver">
              <option value="">Select driver...</option>
              {mockDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select label="Vehicle">
              <option value="">Select vehicle...</option>
              {mockVehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" type="datetime-local" />
            <Input label="End Time" type="datetime-local" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Odometer Start (km)" type="number" placeholder="e.g. 45200" />
            <Input label="Fuel Start (%)" type="number" placeholder="e.g. 80" />
          </div>
          <Textarea label="Notes" placeholder="Any notes for this assignment..." />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={() => setCreateOpen(false)}>Create Assignment</Button>
        </div>
      </Modal>
    </div>
  );
}
