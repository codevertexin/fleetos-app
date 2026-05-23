import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, MapPin, Fuel, Gauge, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Tabs, useTabs } from '@/components/ui/tabs';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';
import { mockVehicles, mockAssignments, mockExpenses, mockIncomes, mockDocuments } from '@/lib/mock-data';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'notes', label: 'Notes' },
];

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useTabs('overview');
  const vehicle = mockVehicles.find(v => v.id === id);

  if (!vehicle) return (
    <div className="p-6 text-center py-20">
      <p className="text-muted-foreground">Vehicle not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/vehicles')}>Back to Vehicles</Button>
    </div>
  );

  const vehicleAssignments = mockAssignments.filter(a => a.vehicleId === id);
  const vehicleExpenses = mockExpenses.filter(e => e.vehicleId === id);
  const vehicleIncomes = mockIncomes.filter(i => i.vehicleId === id);
  const vehicleDocs = mockDocuments.filter(d => d.entityId === id && d.entityType === 'vehicle');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/vehicles')} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{vehicle.plate}</h1>
            <StatusBadge status={vehicle.status} />
          </div>
          <p className="text-muted-foreground">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>
        </div>
        <Button variant="outline"><Edit2 className="w-4 h-4" /> Edit</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Gauge, label: 'Odometer', value: `${vehicle.odometer.toLocaleString()} km` },
          { icon: Fuel, label: 'Fuel Type', value: vehicle.fuel },
          { icon: User, label: 'Owner', value: vehicle.ownerName },
          { icon: User, label: 'Driver', value: vehicle.assignedDriverName ?? 'Unassigned' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#00B39A]/10">
                  <stat.icon className="w-4 h-4 text-[#00B39A]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-semibold text-sm">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card>
        <div className="px-4 pt-2">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Vehicle Details</h3>
                {[
                  ['VIN', vehicle.vin],
                  ['Color', vehicle.color],
                  ['Year', vehicle.year],
                  ['Fuel', vehicle.fuel],
                  ['Odometer', `${vehicle.odometer.toLocaleString()} km`],
                  ['Owner', vehicle.ownerName],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between text-sm border-b border-border pb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Status</h3>
                <div className="flex justify-between text-sm border-b border-border pb-2">
                  <span className="text-muted-foreground">Vehicle Status</span>
                  <StatusBadge status={vehicle.status} />
                </div>
                <div className="flex justify-between text-sm border-b border-border pb-2">
                  <span className="text-muted-foreground">Document Status</span>
                  <StatusBadge status={vehicle.documentStatus} />
                </div>
                <div className="flex justify-between text-sm border-b border-border pb-2">
                  <span className="text-muted-foreground">Assigned Driver</span>
                  <span className="font-medium">{vehicle.assignedDriverName ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-border pb-2">
                  <span className="text-muted-foreground">Added</span>
                  <span className="font-medium">{formatDate(vehicle.createdAt)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Document</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Expiry</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {vehicleDocs.length === 0 ? (
                  <TableRow><TableCell className="text-center text-muted-foreground py-8" colSpan={5}>No documents</TableCell></TableRow>
                ) : vehicleDocs.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.type.replace(/_/g, ' ')}</TableCell>
                    <TableCell><StatusBadge status={doc.status} /></TableCell>
                    <TableCell>{doc.expiryDate ? formatDate(doc.expiryDate) : '—'}</TableCell>
                    <TableCell><Button size="sm" variant="ghost">Upload</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'assignments' && (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Driver</TableHeaderCell>
                  <TableHeaderCell>Start</TableHeaderCell>
                  <TableHeaderCell>End</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Odometer</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {vehicleAssignments.length === 0 ? (
                  <TableRow><TableCell className="text-center text-muted-foreground py-8">No assignments</TableCell></TableRow>
                ) : vehicleAssignments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.driverName}</TableCell>
                    <TableCell>{formatDateTime(a.startTime)}</TableCell>
                    <TableCell>{a.endTime ? formatDateTime(a.endTime) : '—'}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell>{a.odometerStart ? `${a.odometerStart.toLocaleString()} → ${a.odometerEnd?.toLocaleString() ?? '...'} km` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'expenses' && (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {vehicleExpenses.length === 0 ? (
                  <TableRow><TableCell className="text-center text-muted-foreground py-8">No expenses</TableCell></TableRow>
                ) : vehicleExpenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell>{e.type}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(e.amount)}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'income' && (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {vehicleIncomes.length === 0 ? (
                  <TableRow><TableCell className="text-center text-muted-foreground py-8">No income records</TableCell></TableRow>
                ) : vehicleIncomes.map(i => (
                  <TableRow key={i.id}>
                    <TableCell>{formatDate(i.date)}</TableCell>
                    <TableCell>{i.type}</TableCell>
                    <TableCell>{i.description}</TableCell>
                    <TableCell className="font-medium text-emerald-600">{formatCurrency(i.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'maintenance' && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Maintenance records coming soon.</p>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Add notes about this vehicle..." />
              <Button>Save Notes</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
